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
  Settings2, PackageX, History, TrendingDown, TrendingUp, Landmark, AlertCircle
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

type InventoryPhase = 'PREPARATION' | 'COUNTING' | 'RECONCILIATION' | 'CLOSED';
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                <Save className="mr-2 h-4 w-4" /> Sauvegarder ma session
              </Button>
              {countingMode === 'SUPERVISOR' && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-6" onClick={handleCloseSession} disabled={isProcessing}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Certifier & Clôturer l'Inventaire
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* KPI RECONCILIATION (Uniquement Superviseur) */}
      {countingMode === 'SUPERVISOR' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-500">
           <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-destructive">
             <CardHeader className="pb-1"><CardTitle className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Mali d'inventaire (Charges)</CardTitle></CardHeader>
             <CardContent><div className="text-2xl font-black text-destructive">-{stats.mali.toLocaleString()} DA</div></CardContent>
           </Card>
           <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-emerald-500">
             <CardHeader className="pb-1"><CardTitle className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Boni d'inventaire (Produits)</CardTitle></CardHeader>
             <CardContent><div className="text-2xl font-black text-emerald-600">+{stats.boni.toLocaleString()} DA</div></CardContent>
           </Card>
           <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-amber-500">
             <CardHeader className="pb-1"><CardTitle className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Dépréciations à constater (39)</CardTitle></CardHeader>
             <CardContent><div className="text-2xl font-black text-amber-600">{stats.itemsWithDepreciation} articles</div></CardContent>
           </Card>
           <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center px-6">
              <Calculator className="absolute -right-4 -top-4 h-16 w-16 opacity-10 text-accent" />
              <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-1">Impact Résultat Net</p>
              <div className="text-xl font-black">{(stats.boni - stats.mali).toLocaleString()} DA</div>
           </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
            {/* TERMINAUX DE SAISIE */}
            <Card className="shadow-sm border-none bg-slate-100 rounded-3xl p-1">
               <Tabs value={countingMode} onValueChange={(v) => setCountingMode(v as CountingMode)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-transparent p-1 h-auto gap-1">
                    <TabsTrigger value="C1" className="rounded-2xl py-3 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg font-black text-[10px] uppercase tracking-widest transition-all">
                      <UserCheck className="h-4 w-4 mr-2" /> Terminal Équipe A
                    </TabsTrigger>
                    <TabsTrigger value="C2" className="rounded-2xl py-3 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg font-black text-[10px] uppercase tracking-widest transition-all">
                      <UserCheck className="h-4 w-4 mr-2" /> Terminal Équipe B
                    </TabsTrigger>
                    <TabsTrigger value="SUPERVISOR" className="rounded-2xl py-3 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg font-black text-[10px] uppercase tracking-widest transition-all">
                      <ShieldCheck className="h-4 w-4 mr-2" /> Superviseur SCF
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
                      <div>
                        <CardTitle className="text-lg font-black uppercase tracking-tighter">
                          {countingMode === 'SUPERVISOR' ? "Audit & Rapprochement SCF" : `Session de Saisie ${countingMode}`}
                        </CardTitle>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {countingMode === 'C1' ? 'Premier comptage indépendant' : countingMode === 'C2' ? 'Second comptage indépendant' : 'Comparaison, arbitrage et identification des dépréciations'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                        <Input 
                          placeholder="Chercher par code ou nom..." 
                          className="pl-8 h-9 text-[10px] w-48 rounded-xl bg-white"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Progression : {stats.progress}%</span>
                        <Progress value={stats.progress} className="w-24 h-1.5" />
                      </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50">
                    <TableRow className="text-[9px] uppercase font-black border-b h-12">
                        <TableHead className="pl-6">Désignation de l'Article</TableHead>
                        {countingMode === 'SUPERVISOR' && (
                            <>
                              <TableHead className="text-center bg-blue-50/50">C1 (Équipe A)</TableHead>
                              <TableHead className="text-center bg-emerald-50/50">C2 (Équipe B)</TableHead>
                              <TableHead className="text-center bg-amber-100/50 border-x border-amber-200">Arbitrage (C3)</TableHead>
                              <TableHead className="text-center">État Physique</TableHead>
                            </>
                        )}
                        {countingMode !== 'SUPERVISOR' && (
                            <TableHead className="w-[200px] text-center bg-primary/10">Quantité Réelle Comptée</TableHead>
                        )}
                        <TableHead className="text-center pr-6">Verdict</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredProducts.map((p) => {
                        const val = counts[p.id] || { c1: 0, c2: 0, c3: undefined, status: 'GOOD', note: '' };
                        const hasMismatch = val.c1 !== val.c2;
                        
                        return (
                        <TableRow key={p.id} className="hover:bg-muted/5 group transition-colors h-20">
                            <TableCell className="pl-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-xs uppercase text-slate-900 truncate w-48">{p.name}</span>
                                <span className="text-[9px] font-mono text-muted-foreground uppercase">{p.code} • {p.unit}</span>
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
                                          "h-9 text-center font-black text-xs bg-white rounded-lg mx-auto w-24",
                                          hasMismatch && (val.c3 === undefined) ? "border-amber-500 animate-pulse ring-2 ring-amber-100" : "border-slate-200 opacity-30"
                                        )} 
                                        value={val.c3 ?? ""} 
                                        onChange={e => handleUpdateCount(p.id, 'c3', e.target.value)}
                                        disabled={!hasMismatch || session.status === 'CLOSED'}
                                        placeholder="Décider"
                                     />
                                  </TableCell>
                                  <TableCell className="text-center">
                                      <Select 
                                        value={val.status} 
                                        onValueChange={v => handleUpdateCount(p.id, 'status', v)}
                                        disabled={session.status === 'CLOSED'}
                                      >
                                        <SelectTrigger className="h-8 text-[9px] font-bold w-28 mx-auto">
                                          <SelectValue />
                                        </SelectTrigger>
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
                                   <div className="flex items-center justify-center gap-2">
                                     <Input 
                                        type="number" 
                                        className="h-12 text-center font-black text-lg bg-white rounded-xl border-primary/20 focus:ring-primary/40 w-32 shadow-inner" 
                                        value={countingMode === 'C1' ? val.c1 : val.c2} 
                                        onChange={e => handleUpdateCount(p.id, countingMode === 'C1' ? 'c1' : 'c2', e.target.value)}
                                        disabled={session.status === 'CLOSED'}
                                        placeholder="0"
                                     />
                                     <span className="text-[10px] font-black text-slate-300 uppercase">{p.unit}</span>
                                   </div>
                                </TableCell>
                            )}

                            <TableCell className="text-center pr-6">
                              {countingMode !== 'SUPERVISOR' ? (
                                  (countingMode === 'C1' ? val.c1 > 0 : val.c2 > 0) ? (
                                    <Badge className="bg-emerald-500 h-5 text-[8px] font-black">SAISI</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[8px] text-slate-300 border-dashed">À COMPTER</Badge>
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
                                     <span className="text-[8px] font-black text-red-600 uppercase mt-1">Écart A/B</span>
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

        {/* SIDEBAR PROTOCOLE */}
        <div className="space-y-6">
           <Card className="bg-white border-none shadow-xl ring-1 ring-border rounded-3xl overflow-hidden">
             <CardHeader className="bg-slate-900 text-white p-4">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-accent" /> Protocole Légal Algérien
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-primary border-b pb-2 flex justify-between items-center">
                      Phase Actuelle <ArrowRight className="h-3 w-3" />
                    </h4>
                    {countingMode === 'C1' && (
                        <div className="space-y-3">
                           <p className="text-[11px] font-bold">Équipe de Premier Comptage (A)</p>
                           <p className="text-[10px] text-muted-foreground leading-relaxed italic">"Interdiction formelle d'accéder aux données comptables pour garantir l'indépendance de l'inventaire physique."</p>
                           <Badge variant="outline" className="text-[8px] bg-blue-50 text-blue-700">ISOLEMENT ACTIF</Badge>
                        </div>
                    )}
                    {countingMode === 'C2' && (
                        <div className="space-y-3">
                           <p className="text-[11px] font-bold">Équipe de Second Comptage (B)</p>
                           <p className="text-[10px] text-muted-foreground leading-relaxed italic">"Cette double vérification à l'aveugle est exigée par le SCF pour certifier l'existence réelle des stocks de classe 3."</p>
                           <Badge variant="outline" className="text-[8px] bg-emerald-50 text-emerald-700">VERIFICATION ACTIVE</Badge>
                        </div>
                    )}
                    {countingMode === 'SUPERVISOR' && (
                        <div className="space-y-3">
                           <p className="text-[11px] font-bold">Supervision & Arbitrage (C3)</p>
                           <p className="text-[10px] text-muted-foreground leading-relaxed italic">"En cas d'écart entre A et B, le superviseur doit imposer la quantité réelle après contre-visite physique."</p>
                           <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600" />
                              <span className="text-[9px] font-black text-amber-800 uppercase">Écarts détectés : {products?.filter(p => (counts[p.id]?.c1 || 0) !== (counts[p.id]?.c2 || 0)).length}</span>
                           </div>
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t border-slate-50 space-y-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Options Avancées</p>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold">Arrêt des mouvements</Label>
                            <Badge className="bg-emerald-500 h-4 text-[7px]">ACTIVÉ</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold">Afficher Stock Informatique</Label>
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
                 <Landmark className="h-3 w-3" /> Note d'Audit SCF
               </p>
               <p className="opacity-80 italic">
                 "Tout Mali d'inventaire important (Compte 657) doit être justifié par un PV de constatation pour être déductible de votre résultat fiscal."
               </p>
             </div>
           </div>

           <Card className="border-dashed border-2 p-6 flex flex-col items-center text-center gap-4 bg-muted/10">
              <FileText className="h-10 w-10 text-primary opacity-20" />
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500">Impression Fiches</p>
                <p className="text-[9px] text-muted-foreground mt-1">Générez les fiches de comptage vierges pour les équipes terrain.</p>
              </div>
              <Button variant="outline" size="sm" className="w-full rounded-xl text-[9px] font-black uppercase">Télécharger Fiches (PDF)</Button>
           </Card>
        </div>
      </div>
    </div>
  )
}
