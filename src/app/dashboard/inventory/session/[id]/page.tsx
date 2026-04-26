
"use client"

import * as React from "react"
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  ClipboardCheck, Loader2, ShieldCheck, CheckCircle2, 
  AlertTriangle, Calculator, FileText, ChevronLeft,
  Save, Zap, Users, ShieldAlert, Eye, EyeOff, Scale,
  ListChecks, Info, ArrowRight, Gavel, ScanLine, UserCheck, Search, Filter,
  Settings2, PackageX, History, TrendingDown, TrendingUp, Landmark, AlertCircle, Printer
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSearchParams, useParams, useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { cn } from "@/lib/utils"

type CountingMode = 'C1' | 'C2' | 'SUPERVISOR';

export default function InventorySessionDetail() {
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const { id } = useParams()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [showTheoretical, setShowTheoretical] = React.useState(false)
  const [countingMode, setCountingMode] = React.useState<CountingMode>('SUPERVISOR')
  const [searchTerm, setSearchTerm] = React.useState("")

  React.useEffect(() => { setMounted(true) }, [])

  const sessionRef = useMemoFirebase(() => 
    (db && tenantId && id) ? doc(db, "tenants", tenantId, "inventory_sessions", id as string) : null
  , [db, tenantId, id]);
  const { data: session, isLoading: isSessionLoading } = useDoc(sessionRef);

  const productsQuery = useMemoFirebase(() => 
    (db && tenantId) ? collection(db, "tenants", tenantId, "products") : null
  , [db, tenantId]);
  const { data: products, isLoading: isProductsLoading } = useCollection(productsQuery);

  const [counts, setCounts] = React.useState<Record<string, { c1: number; c2: number; c3?: number; status?: string; note?: string }>>({})

  React.useEffect(() => {
    if (session?.counts) {
      const countsMap: Record<string, any> = {};
      session.counts.forEach((c: any) => {
        countsMap[c.productId] = { c1: c.c1 || 0, c2: c.c2 || 0, c3: c.c3, status: c.status || 'GOOD', note: c.note || '' };
      });
      setCounts(countsMap);
    }
  }, [session]);

  const handleUpdateCount = (productId: string, field: string, val: any) => {
    setCounts(prev => ({
      ...prev,
      [productId]: { ...(prev[productId] || { c1: 0, c2: 0, status: 'GOOD' }), [field]: val }
    }));
  }

  const handleSaveProgress = async () => {
    if (!db || !tenantId || !id || !session) return;
    setIsProcessing(true);

    const countsList = Object.entries(counts).map(([pid, val]) => ({
      productId: pid,
      c1: val.c1,
      c2: val.c2,
      c3: val.c3 || 0,
      status: val.status,
      note: val.note,
      countedAt: new Date().toISOString()
    }));

    try {
      await updateDocumentNonBlocking(doc(db, "tenants", tenantId, "inventory_sessions", id as string), {
        counts: countsList,
        updatedAt: new Date().toISOString(),
        status: session.status === "DRAFT" ? "IN_PROGRESS" : session.status
      });
      toast({ title: "Synchronisation Cloud", description: "Les données de comptage ont été persistées." });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleCloseSession = async () => {
    if (!db || !tenantId || !id || !products) return;
    
    const hasUnresolvedMismatches = products.some(p => {
        const val = counts[p.id] || { c1: 0, c2: 0, c3: undefined };
        return val.c1 !== val.c2 && (val.c3 === undefined || val.c3 === null);
    });

    if (hasUnresolvedMismatches) {
        toast({ 
            variant: "destructive", 
            title: "Arbitrage SCF requis", 
            description: "Certaines lignes présentent des écarts de double comptage non résolus." 
        });
        return;
    }

    setIsProcessing(true);
    try {
      const finalResults = products.map(p => {
        const val = counts[p.id] || { c1: 0, c2: 0, c3: undefined, status: 'GOOD' };
        const finalQty = (val.c1 === val.c2) ? val.c1 : (val.c3 ?? val.c1);
        return { productId: p.id, finalQty, status: val.status };
      });

      await updateDocumentNonBlocking(doc(db, "tenants", tenantId, "inventory_sessions", id as string), {
        status: "CLOSED",
        closedAt: new Date().toISOString(),
        finalResults
      });

      for (const res of finalResults) {
        await updateDocumentNonBlocking(doc(db, "tenants", tenantId, "products", res.productId), {
          theoreticalStock: res.finalQty,
          physicalStatus: res.status,
          lastInventoryDate: new Date().toISOString()
        });
      }

      toast({ title: "Inventaire Certifié", description: "Stock réel mis à jour et prêt pour l'image fidèle du bilan." });
      router.push(`/dashboard/inventory?tenantId=${tenantId}`);
    } finally {
      setIsProcessing(false);
    }
  }

  const filteredProducts = React.useMemo(() => {
    if (!products) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const stats = React.useMemo(() => {
    if (!products) return { mrr: 0, mali: 0, boni: 0, progress: 0, itemsWithDepreciation: 0 };
    let mali = 0;
    let boni = 0;
    let depCount = 0;
    const countedCount = Object.keys(counts).length;

    products.forEach(p => {
        const val = counts[p.id] || { c1: 0, c2: 0, c3: undefined, status: 'GOOD' };
        const real = (val.c1 === val.c2) ? val.c1 : (val.c3 ?? val.c1);
        const diff = real - (p.theoreticalStock || 0);
        const cost = p.costPrice || p.purchasePrice || 0;
        
        if (diff > 0) boni += (diff * cost);
        if (diff < 0) mali += (Math.abs(diff) * cost);
        if (val.status !== 'GOOD') depCount++;
    });

    return {
        mali, boni,
        itemsWithDepreciation: depCount,
        progress: Math.round((countedCount / products.length) * 100)
    };
  }, [products, counts]);

  if (isSessionLoading || isProductsLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
  if (!session) return <div className="p-20 text-center">Session non trouvée.</div>

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER PROFESSIONNEL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href={`/dashboard/inventory?tenantId=${tenantId}`}><ChevronLeft className="h-5 w-5" /></Link></Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-primary tracking-tighter uppercase">{session.name}</h1>
              <Badge className={cn("font-black text-[9px]", session.status === 'CLOSED' ? "bg-emerald-500" : "bg-primary")}>
                {session.status === 'CLOSED' ? 'SESSION CLÔTURÉE' : 'EN COURS D\'EXÉCUTION'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest mt-1 flex items-center gap-2">
              <Landmark className="h-3 w-3" /> Art. 10 Code de Commerce • Phase : {countingMode}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {session.status !== 'CLOSED' && (
            <>
              <Button variant="outline" size="sm" onClick={handleSaveProgress} disabled={isProcessing} className="rounded-xl h-10 px-6 font-bold shadow-sm">
                <Save className="mr-2 h-4 w-4" /> Sauvegarder
              </Button>
              {countingMode === 'SUPERVISOR' && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-6" onClick={handleCloseSession} disabled={isProcessing}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Certifier & Clôturer
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* PHASE DE PREPARATION (Visible uniquement au début ou par le superviseur) */}
      {session.status !== 'CLOSED' && countingMode === 'SUPERVISOR' && (
        <Card className="bg-white border-2 border-primary/10 shadow-xl rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-4 print:hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10 p-6 flex flex-row items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Settings2 className="h-6 w-6 text-white" />
                </div>
                <div>
                   <CardTitle className="text-lg font-black uppercase tracking-tighter">Préparation du Chantier d'Inventaire</CardTitle>
                   <CardDescription className="text-xs font-bold uppercase text-slate-400">Émission des supports de comptage à l'aveugle</CardDescription>
                </div>
             </div>
             <Button onClick={() => window.print()} className="bg-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest h-11 px-8">
               <Printer className="mr-2 h-4 w-4" /> Imprimer les fiches vierges
             </Button>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-primary border-b pb-2">Protocole de Préparation</h4>
                <ul className="space-y-3">
                   <li className="flex items-start gap-3 text-xs">
                     <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                     <p><span className="font-bold">Arrêt des flux :</span> Assurez-vous qu'aucun Bon de Livraison ou de Réception n'est validé durant le comptage.</p>
                   </li>
                   <li className="flex items-start gap-3 text-xs">
                     <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                     <p><span className="font-bold">Balisage :</span> Les zones de l'entrepôt doivent être identifiées physiquement avant de distribuer les fiches.</p>
                   </li>
                </ul>
             </div>
             <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
                <Info className="h-6 w-6 text-blue-600 shrink-0" />
                <p className="text-[11px] leading-relaxed text-blue-900 font-medium">
                  "L'impression des fiches vierges ne contient aucune donnée de stock informatique. C'est le prérequis pour un **audit à l'aveugle** exigé par le commissariat aux comptes."
                </p>
             </div>
          </CardContent>
        </Card>
      )}

      {/* TERMINAUX DE SAISIE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 print:hidden">
        <div className="lg:col-span-3 space-y-6">
            <Card className="shadow-sm border-none bg-slate-100 rounded-3xl p-1">
               <Tabs value={countingMode} onValueChange={(v) => setCountingMode(v as CountingMode)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-transparent p-1 h-auto gap-1">
                    <TabsTrigger value="C1" className="rounded-2xl py-3 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg font-black text-[10px] uppercase tracking-widest transition-all">
                      <UserCheck className="h-4 w-4 mr-2" /> Équipe A (C1)
                    </TabsTrigger>
                    <TabsTrigger value="C2" className="rounded-2xl py-3 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg font-black text-[10px] uppercase tracking-widest transition-all">
                      <UserCheck className="h-4 w-4 mr-2" /> Équipe B (C2)
                    </TabsTrigger>
                    <TabsTrigger value="SUPERVISOR" className="rounded-2xl py-3 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg font-black text-[10px] uppercase tracking-widest transition-all">
                      <ShieldCheck className="h-4 w-4 mr-2" /> Superviseur
                    </TabsTrigger>
                  </TabsList>
               </Tabs>
            </Card>

            <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
                <CardHeader className="bg-muted/30 border-b flex flex-col md:flex-row items-center justify-between py-4 px-6 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <ScanLine className="h-5 w-5 text-primary" /> 
                      </div>
                      <CardTitle className="text-lg font-black uppercase tracking-tighter">
                        {countingMode === 'SUPERVISOR' ? "Audit & Rapprochement" : `Saisie Mobile Équipe ${countingMode === 'C1' ? 'A' : 'B'}`}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                        <Input 
                          placeholder="Code ou nom..." 
                          className="pl-8 h-9 text-[10px] w-48 rounded-xl bg-white"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Avancement : {stats.progress}%</span>
                        <Progress value={stats.progress} className="w-24 h-1.5" />
                      </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50">
                    <TableRow className="text-[9px] uppercase font-black border-b h-12">
                        <TableHead className="pl-6">Article</TableHead>
                        {countingMode === 'SUPERVISOR' && (
                            <>
                              <TableHead className="text-center bg-blue-50/50">C1 (A)</TableHead>
                              <TableHead className="text-center bg-emerald-50/50">C2 (B)</TableHead>
                              <TableHead className="text-center bg-amber-100/50 border-x border-amber-200">Arbitrage (C3)</TableHead>
                              <TableHead className="text-center">État Physique</TableHead>
                            </>
                        )}
                        {countingMode !== 'SUPERVISOR' && (
                            <TableHead className="w-[250px] text-center bg-primary/5">Qté Comptée (Aveugle)</TableHead>
                        )}
                        <TableHead className="text-center pr-6">Verdict</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredProducts.map((p) => {
                        const val = counts[p.id] || { c1: 0, c2: 0, c3: undefined, status: 'GOOD', note: '' };
                        const hasMismatch = val.c1 !== val.c2;
                        
                        return (
                        <TableRow key={p.id} className="hover:bg-muted/5 group transition-colors h-24">
                            <TableCell className="pl-6">
                              <div className="flex flex-col">
                                <span className="font-black text-xs uppercase text-slate-900">{p.name}</span>
                                <span className="text-[9px] font-mono text-muted-foreground uppercase">{p.code} • {p.unit}</span>
                                <span className="text-[8px] font-bold text-primary uppercase mt-1 flex items-center gap-1"><MapPin className="h-2 w-2" /> {p.locationBin || 'Non localisé'}</span>
                              </div>
                            </TableCell>
                            
                            {countingMode === 'SUPERVISOR' ? (
                                <>
                                  <TableCell className="text-center font-mono font-bold text-xs text-blue-600">{val.c1}</TableCell>
                                  <TableCell className="text-center font-mono font-bold text-xs text-emerald-600">{val.c2}</TableCell>
                                  <TableCell className="text-center bg-amber-50/30 border-x border-amber-100">
                                     <Input 
                                        type="number" 
                                        className={cn(
                                          "h-10 text-center font-black text-sm bg-white rounded-lg mx-auto w-24 shadow-sm",
                                          hasMismatch && (val.c3 === undefined) ? "border-amber-500 animate-pulse ring-2 ring-amber-100" : "border-slate-200"
                                        )} 
                                        value={val.c3 ?? ""} 
                                        onChange={e => handleUpdateCount(p.id, 'c3', parseFloat(e.target.value))}
                                        disabled={!hasMismatch || session.status === 'CLOSED'}
                                        placeholder="Final"
                                     />
                                  </TableCell>
                                  <TableCell className="text-center">
                                      <Select value={val.status} onValueChange={v => handleUpdateCount(p.id, 'status', v)} disabled={session.status === 'CLOSED'}>
                                        <SelectTrigger className="h-8 text-[9px] font-bold w-32 mx-auto"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="GOOD">Bon état</SelectItem>
                                          <SelectItem value="DAMAGED">Endommagé (39)</SelectItem>
                                          <SelectItem value="OBSOLETE">Obsolète (39)</SelectItem>
                                          <SelectItem value="EXPIRED">Périmé (REBUT)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                  </TableCell>
                                </>
                            ) : (
                                <TableCell className="bg-primary/5">
                                   <div className="flex items-center justify-center gap-3">
                                     <Input 
                                        type="number" 
                                        className="h-14 text-center font-black text-2xl bg-white rounded-2xl border-primary/30 focus:ring-primary/40 w-40 shadow-inner" 
                                        value={countingMode === 'C1' ? val.c1 : val.c2} 
                                        onChange={e => handleUpdateCount(p.id, countingMode === 'C1' ? 'c1' : 'c2', parseFloat(e.target.value) || 0)}
                                        disabled={session.status === 'CLOSED'}
                                        placeholder="0"
                                     />
                                     <span className="text-[10px] font-black text-slate-400 uppercase">{p.unit}</span>
                                   </div>
                                </TableCell>
                            )}

                            <TableCell className="text-center pr-6">
                              {countingMode !== 'SUPERVISOR' ? (
                                  (countingMode === 'C1' ? val.c1 > 0 : val.c2 > 0) ? (
                                    <Badge className="bg-emerald-500 h-6 text-[8px] font-black tracking-widest">ENREGISTRÉ</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[8px] text-slate-300 border-dashed animate-pulse">ATTENTE</Badge>
                                  )
                              ) : !hasMismatch ? (
                                  <div className="flex flex-col items-center">
                                     <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                     <span className="text-[8px] font-black text-emerald-600 uppercase mt-1">Conforme</span>
                                  </div>
                              ) : val.c3 !== undefined && val.c3 !== null ? (
                                  <div className="flex flex-col items-center">
                                     <Gavel className="h-5 w-5 text-blue-500" />
                                     <span className="text-[8px] font-black text-blue-600 uppercase mt-1">Arbitré</span>
                                  </div>
                              ) : (
                                  <div className="flex flex-col items-center animate-pulse">
                                     <AlertTriangle className="h-5 w-5 text-red-500" />
                                     <span className="text-[8px] font-black text-red-600 uppercase mt-1">Écart</span>
                                  </div>
                              )}
                            </TableCell>
                        </TableRow>
                        );
                    })}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
           <Card className="bg-white border-none shadow-xl ring-1 ring-border rounded-3xl overflow-hidden">
             <CardHeader className="bg-slate-900 text-white p-4">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-accent" /> Séparation des Tâches
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                    <p className="text-[11px] font-bold">Rôle Actif : {countingMode}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                      {countingMode === 'SUPERVISOR' 
                        ? "Le superviseur certifie les données et tranche en cas de litige entre les deux équipes de comptage."
                        : "Votre terminal est isolé. Vous n'avez pas accès aux inventaires théoriques ni aux saisies de l'autre équipe."}
                    </p>
                </div>

                <div className="pt-6 border-t border-slate-50 space-y-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contrôle Interne</p>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold">Geler les stocks</Label>
                            <Badge className="bg-emerald-500 h-4 text-[7px]">OUI</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold">Voir Stock Informatique</Label>
                            <Switch checked={showTheoretical} onCheckedChange={setShowTheoretical} disabled={countingMode !== 'SUPERVISOR'} />
                        </div>
                    </div>
                </div>
             </CardContent>
           </Card>

           <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-xl">
             <ShieldAlert className="h-6 w-6 text-accent shrink-0 mt-1" />
             <div className="text-[11px] leading-relaxed space-y-2">
               <p className="font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                 <Landmark className="h-3 w-3" /> Conseil SCF
               </p>
               <p className="opacity-80 italic italic">
                 "Tout manquant (Mali) doit être documenté par un PV. Sans ce document, l'administration fiscale peut réintégrer la perte dans votre résultat imposable."
               </p>
             </div>
           </div>
        </div>
      </div>

      {/* EDITION IMPRIMABLE (Cachée à l'écran, visible à l'impression) */}
      <div className="hidden print:block p-12 bg-white text-black font-body">
         <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-8">
            <div>
               <h1 className="text-2xl font-bold uppercase">Fiche d'Inventaire Physique - {countingMode}</h1>
               <p className="text-sm font-bold">Dossier : {session.name}</p>
               <p className="text-sm">Date : {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
               <p className="text-xs uppercase font-bold">Système Certifié SCF</p>
               <p className="text-[10px]">ComptaFisc-DZ v2.6</p>
            </div>
         </div>

         <table className="w-full border-collapse border border-black text-xs">
            <thead>
               <tr className="bg-slate-100">
                  <th className="border border-black p-2 text-left">Code Article</th>
                  <th className="border border-black p-2 text-left">Désignation</th>
                  <th className="border border-black p-2 text-center">Unité</th>
                  <th className="border border-black p-2 text-center">Localisation</th>
                  <th className="border border-black p-2 w-32 text-center">Qté Comptée</th>
                  <th className="border border-black p-2 text-center">État du bien</th>
               </tr>
            </thead>
            <tbody>
               {products?.map((p) => (
                  <tr key={p.id}>
                     <td className="border border-black p-2 font-mono">{p.code}</td>
                     <td className="border border-black p-2 font-bold uppercase">{p.name}</td>
                     <td className="border border-black p-2 text-center">{p.unit}</td>
                     <td className="border border-black p-2 text-center">{p.locationBin || '---'}</td>
                     <td className="border border-black p-2"></td>
                     <td className="border border-black p-2"></td>
                  </tr>
               ))}
            </tbody>
         </table>

         <div className="mt-20 grid grid-cols-2 gap-20">
            <div className="border-t border-black pt-4">
               <p className="text-xs font-bold uppercase">Visa Compteur (Équipe {countingMode})</p>
            </div>
            <div className="border-t border-black pt-4 text-right">
               <p className="text-xs font-bold uppercase">Visa Superviseur d'Inventaire</p>
            </div>
         </div>
         <p className="mt-12 text-[8px] text-center italic">Document de preuve légale - Article 10 du Code de Commerce Algérien.</p>
      </div>
    </div>
  )
}

function MapPin(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.74a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
