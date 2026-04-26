
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
  ListChecks, Info, ArrowRight, Gavel
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useSearchParams, useParams, useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

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

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const sessionRef = useMemoFirebase(() => 
    (db && tenantId && id) ? doc(db, "tenants", tenantId, "inventory_sessions", id as string) : null
  , [db, tenantId, id]);
  const { data: session, isLoading: isSessionLoading } = useDoc(sessionRef);

  const productsQuery = useMemoFirebase(() => 
    (db && tenantId) ? collection(db, "tenants", tenantId, "products") : null
  , [db, tenantId]);
  const { data: products, isLoading: isProductsLoading } = useCollection(productsQuery);

  const [counts, setCounts] = React.useState<Record<string, { c1: number; c2: number; c3?: number }>>({})

  React.useEffect(() => {
    if (session?.counts) {
      const countsMap: Record<string, any> = {};
      session.counts.forEach((c: any) => {
        countsMap[c.productId] = { c1: c.c1 || 0, c2: c.c2 || 0, c3: c.c3 };
      });
      setCounts(countsMap);
    }
  }, [session]);

  const handleUpdateCount = (productId: string, field: 'c1' | 'c2' | 'c3', val: string) => {
    const numVal = parseFloat(val) || 0;
    setCounts(prev => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: numVal }
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
      countedAt: new Date().toISOString()
    }));

    try {
      updateDocumentNonBlocking(doc(db, "tenants", tenantId, "inventory_sessions", id as string), {
        counts: countsList,
        updatedAt: new Date().toISOString(),
        status: session.status === "DRAFT" ? "IN_PROGRESS" : session.status
      });
      toast({ title: "Données sauvegardées", description: "Comptages C1/C2 synchronisés." });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleCloseSession = async () => {
    if (!db || !tenantId || !id || !products) return;
    
    // Vérifier que tous les écarts ont un arbitrage
    const hasUnresolvedMismatches = products.some(p => {
        const val = counts[p.id] || { c1: 0, c2: 0, c3: 0 };
        return val.c1 !== val.c2 && (val.c3 === undefined || val.c3 === null);
    });

    if (hasUnresolvedMismatches) {
        toast({ 
            variant: "destructive", 
            title: "Arbitrage requis", 
            description: "Certaines lignes présentent des écarts C1/C2 non arbitrés en colonne C3." 
        });
        return;
    }

    setIsProcessing(true);
    try {
      const finalCountsList = products.map(p => {
        const val = counts[p.id] || { c1: 0, c2: 0, c3: 0 };
        const finalQty = (val.c1 === val.c2) ? val.c1 : (val.c3 ?? val.c1);
        return { productId: p.id, finalQty };
      });

      updateDocumentNonBlocking(doc(db, "tenants", tenantId, "inventory_sessions", id as string), {
        status: "CLOSED",
        closedAt: new Date().toISOString(),
        finalResults: finalCountsList
      });

      for (const res of finalCountsList) {
        updateDocumentNonBlocking(doc(db, "tenants", tenantId, "products", res.productId), {
          theoreticalStock: res.finalQty,
          lastInventoryDate: new Date().toISOString()
        });
      }

      toast({ title: "Inventaire Clôturé", description: "Stock réel mis à jour via protocole C1/C2/C3." });
      router.push(`/dashboard/inventory?tenantId=${tenantId}`);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isSessionLoading || isProductsLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
  if (!session) return <div className="p-20 text-center">Session non trouvée.</div>

  const progress = products ? Math.round((Object.keys(counts).length / (products.length || 1)) * 100) : 0;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href={`/dashboard/inventory?tenantId=${tenantId}`}><ChevronLeft className="h-5 w-5" /></Link></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-primary tracking-tighter uppercase">{session.name}</h1>
              <Badge className={session.status === 'CLOSED' ? "bg-emerald-500" : "bg-primary/10 text-primary border-primary/20"}>
                {session.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest mt-1">Lieu : {session.warehouse} • Protocole Triple Comptage</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTheoretical(!showTheoretical)} className="rounded-xl">
            {showTheoretical ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showTheoretical ? "Masquer Théorique" : "Aperçu Théorique"}
          </Button>
          {session.status !== 'CLOSED' && (
            <>
              <Button variant="outline" size="sm" onClick={handleSaveProgress} disabled={isProcessing} className="rounded-xl">
                <Save className="mr-2 h-4 w-4" /> Sauvegarder
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg rounded-xl font-bold" onClick={handleCloseSession} disabled={isProcessing}>
                <ShieldCheck className="mr-2 h-4 w-4" /> Clôturer & Valider
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm border-t-4 border-t-primary bg-white">
                <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Progression Saisie</CardTitle></CardHeader>
                <CardContent>
                    <div className="text-2xl font-black">{progress}%</div>
                    <Progress value={progress} className="h-1.5 mt-2" />
                </CardContent>
                </Card>
                
                <Card className="md:col-span-2 bg-slate-900 text-white border-none shadow-xl flex items-center p-6 gap-6 relative overflow-hidden">
                <Scale className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
                <div className="h-12 w-12 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0">
                    <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                    <h4 className="font-bold text-sm uppercase tracking-tight text-accent">Audit à l'aveugle activé</h4>
                    <p className="text-[11px] opacity-70 leading-relaxed italic">
                    Conformément au SCF, les équipes A et B ne doivent pas connaître le stock théorique. 
                    En cas d'écart (**C1 ≠ C2**), l'arbitrage (**C3**) est obligatoire pour la certification.
                    </p>
                </div>
                </Card>
            </div>

            <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4 px-6">
                    <CardTitle className="text-lg font-black uppercase tracking-tighter">Feuille de Saisie Comparative</CardTitle>
                    <Badge variant="outline" className="bg-white border-primary/20 text-primary text-[8px] font-black tracking-widest">MODE PRODUCTION</Badge>
                </CardHeader>
                <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/50">
                    <TableRow className="text-[9px] uppercase font-black">
                        <TableHead className="pl-6">Désignation Article</TableHead>
                        {showTheoretical && <TableHead className="text-right">Théorique</TableHead>}
                        <TableHead className="w-[110px] text-center bg-blue-50/50">Équipe A (C1)</TableHead>
                        <TableHead className="w-[110px] text-center bg-emerald-50/50">Équipe B (C2)</TableHead>
                        <TableHead className="w-[110px] text-center bg-amber-50/50">Arbitrage (C3)</TableHead>
                        <TableHead className="text-center pr-6">Statut</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isProductsLoading ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
                    ) : products?.map((p) => {
                        const val = counts[p.id] || { c1: 0, c2: 0, c3: undefined };
                        const hasMismatch = val.c1 !== val.c2;
                        const isResolved = !hasMismatch || (val.c3 !== undefined && val.c3 !== null);
                        
                        return (
                        <TableRow key={p.id} className="hover:bg-muted/5 group transition-colors">
                            <TableCell className="pl-6">
                            <div className="flex flex-col">
                                <span className="font-bold text-xs uppercase text-slate-900">{p.name}</span>
                                <span className="text-[9px] font-mono text-muted-foreground uppercase">{p.code} • {p.unit}</span>
                            </div>
                            </TableCell>
                            {showTheoretical && (
                                <TableCell className="text-right font-mono text-xs font-bold text-slate-400">
                                    {p.theoreticalStock}
                                </TableCell>
                            )}
                            <TableCell className="bg-blue-50/10">
                            <Input 
                                type="number" 
                                className="h-8 text-center font-black text-sm bg-white rounded-lg border-blue-100" 
                                value={val.c1 || ""} 
                                onChange={e => handleUpdateCount(p.id, 'c1', e.target.value)}
                                disabled={session.status === 'CLOSED'}
                            />
                            </TableCell>
                            <TableCell className="bg-emerald-50/10">
                            <Input 
                                type="number" 
                                className="h-8 text-center font-black text-sm bg-white rounded-lg border-emerald-100" 
                                value={val.c2 || ""} 
                                onChange={e => handleUpdateCount(p.id, 'c2', e.target.value)}
                                disabled={session.status === 'CLOSED'}
                            />
                            </TableCell>
                            <TableCell className="bg-amber-50/10">
                            <Input 
                                type="number" 
                                className={`h-8 text-center font-black text-sm bg-white rounded-lg transition-all ${hasMismatch ? 'border-amber-500 shadow-md ring-2 ring-amber-100' : 'opacity-20'}`} 
                                value={val.c3 ?? ""} 
                                onChange={e => handleUpdateCount(p.id, 'c3', e.target.value)}
                                disabled={!hasMismatch || session.status === 'CLOSED'}
                                placeholder={hasMismatch ? "Arbitrage" : ""}
                            />
                            </TableCell>
                            <TableCell className="text-center pr-6">
                            {!hasMismatch ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[8px] font-black border-emerald-100">
                                    <CheckCircle2 className="h-2 w-2 mr-1" /> CONFORME
                                </Badge>
                            ) : val.c3 !== undefined && val.c3 !== null ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 text-[8px] font-black border-blue-100">
                                    <Gavel className="h-2 w-2 mr-1" /> ARBITRÉ
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 text-[8px] font-black border-amber-200 animate-pulse">
                                    <AlertTriangle className="h-2 w-2 mr-1" /> ÉCART
                                </Badge>
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
           <Card className="bg-white border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden">
             <CardHeader className="bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" /> Guide de Procédure
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shrink-0">1</div>
                        <div>
                            <p className="text-[11px] font-bold uppercase text-slate-900 leading-none">Premier Comptage (C1)</p>
                            <p className="text-[10px] text-muted-foreground mt-1">L'équipe A parcourt les rayons et saisit les quantités réelles.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shrink-0">2</div>
                        <div>
                            <p className="text-[11px] font-bold uppercase text-slate-900 leading-none">Second Comptage (C2)</p>
                            <p className="text-[10px] text-muted-foreground mt-1">L'équipe B effectue le même travail sans voir les résultats de A.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">3</div>
                        <div>
                            <p className="text-[11px] font-bold uppercase text-slate-900 leading-none">Arbitrage des Écarts</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Le superviseur intervient sur les lignes orange pour le comptage final (C3).</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 border-t pt-4">
                        <div className="h-5 w-5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">4</div>
                        <div>
                            <p className="text-[11px] font-bold uppercase text-emerald-700 leading-none">Validation SCF</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Le stock théorique est aligné sur le réel pour le bilan final.</p>
                        </div>
                    </div>
                </div>
             </CardContent>
           </Card>

           <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-xl">
             <ShieldAlert className="h-6 w-6 text-accent shrink-0 mt-1" />
             <div className="text-[11px] leading-relaxed space-y-2">
               <p className="font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                 <Zap className="h-3 w-3" /> Impact Réglementaire
               </p>
               <p className="opacity-80 italic">
                 "Tout écart entre le stock comptable et le stock physique au 31 décembre doit être justifié par un PV d'inventaire annexé à la liasse fiscale G4."
               </p>
             </div>
           </div>

           <Card className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <Calculator className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="text-[10px] text-blue-800 leading-relaxed font-medium">
                  <p className="font-black uppercase tracking-tight mb-1">Règle de Valorisation :</p>
                  <p>La clôture génère automatiquement l'ajustement du compte 603 (Variation de stock) pour équilibrer votre TCR.</p>
                </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  )
}
