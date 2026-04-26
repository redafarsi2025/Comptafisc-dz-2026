
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
  ListChecks, Info, ArrowRight, Gavel, ScanLine, UserGroup, UserCheck
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSearchParams, useParams, useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

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
      toast({ title: "Données sauvegardées", description: `Comptages ${countingMode} synchronisés avec le cloud.` });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleCloseSession = async () => {
    if (!db || !tenantId || !id || !products) return;
    
    const hasUnresolvedMismatches = products.some(p => {
        const val = counts[p.id] || { c1: 0, c2: 0, c3: 0 };
        return val.c1 !== val.c2 && (val.c3 === undefined || val.c3 === null);
    });

    if (hasUnresolvedMismatches) {
        toast({ 
            variant: "destructive", 
            title: "Arbitrage requis", 
            description: "Certaines lignes présentent des écarts C1/C2 non arbitrés." 
        });
        return;
    }

    setIsProcessing(true);
    try {
      const finalResults = products.map(p => {
        const val = counts[p.id] || { c1: 0, c2: 0, c3: 0 };
        const finalQty = (val.c1 === val.c2) ? val.c1 : (val.c3 ?? val.c1);
        return { productId: p.id, finalQty };
      });

      updateDocumentNonBlocking(doc(db, "tenants", tenantId, "inventory_sessions", id as string), {
        status: "CLOSED",
        closedAt: new Date().toISOString(),
        finalResults
      });

      for (const res of finalResults) {
        updateDocumentNonBlocking(doc(db, "tenants", tenantId, "products", res.productId), {
          theoreticalStock: res.finalQty,
          lastInventoryDate: new Date().toISOString()
        });
      }

      toast({ title: "Inventaire Clôturé", description: "Stock réel mis à jour dans le catalogue." });
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
            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest mt-1">Lieu : {session.warehouse} • Mode {countingMode}</p>
          </div>
        </div>
        <div className="flex gap-2">
           {countingMode === 'SUPERVISOR' && (
              <Button variant="outline" size="sm" onClick={() => setShowTheoretical(!showTheoretical)} className="rounded-xl">
                {showTheoretical ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                {showTheoretical ? "Masquer Théorique" : "Aperçu Théorique"}
              </Button>
           )}
          {session.status !== 'CLOSED' && (
            <>
              <Button variant="outline" size="sm" onClick={handleSaveProgress} disabled={isProcessing} className="rounded-xl">
                <Save className="mr-2 h-4 w-4" /> Sauvegarder
              </Button>
              {countingMode === 'SUPERVISOR' && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg rounded-xl font-bold" onClick={handleCloseSession} disabled={isProcessing}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Clôturer l'Inventaire
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
            <Card className="shadow-sm border-none bg-slate-900 text-white rounded-2xl p-1">
               <Tabs value={countingMode} onValueChange={(v) => setCountingMode(v as CountingMode)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-transparent p-1">
                    <TabsTrigger value="C1" className="rounded-xl py-3 data-[state=active]:bg-white data-[state=active]:text-primary font-black text-[10px] uppercase tracking-widest">
                      <Users className="h-3 w-3 mr-2" /> Équipe A (C1)
                    </TabsTrigger>
                    <TabsTrigger value="C2" className="rounded-xl py-3 data-[state=active]:bg-white data-[state=active]:text-primary font-black text-[10px] uppercase tracking-widest">
                      <Users className="h-3 w-3 mr-2" /> Équipe B (C2)
                    </TabsTrigger>
                    <TabsTrigger value="SUPERVISOR" className="rounded-xl py-3 data-[state=active]:bg-white data-[state=active]:text-primary font-black text-[10px] uppercase tracking-widest">
                      <ShieldCheck className="h-3 w-3 mr-2" /> Superviseur
                    </TabsTrigger>
                  </TabsList>
               </Tabs>
            </Card>

            <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4 px-6">
                    <CardTitle className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                      <ScanLine className="h-5 w-5 text-primary" /> 
                      {countingMode === 'SUPERVISOR' ? "Arbitrage des Écarts" : `Saisie du Comptage ${countingMode}`}
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Progression : {progress}%</span>
                      <Progress value={progress} className="w-24 h-1.5" />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/50">
                    <TableRow className="text-[9px] uppercase font-black">
                        <TableHead className="pl-6">Désignation Article</TableHead>
                        {countingMode === 'SUPERVISOR' && showTheoretical && <TableHead className="text-right">Théorique</TableHead>}
                        
                        {(countingMode === 'C1' || countingMode === 'SUPERVISOR') && (
                          <TableHead className="w-[120px] text-center bg-blue-50/50">Saisie C1</TableHead>
                        )}
                        
                        {(countingMode === 'C2' || countingMode === 'SUPERVISOR') && (
                          <TableHead className="w-[120px] text-center bg-emerald-50/50">Saisie C2</TableHead>
                        )}
                        
                        {countingMode === 'SUPERVISOR' && (
                          <TableHead className="w-[120px] text-center bg-amber-50/50">Arbitrage C3</TableHead>
                        )}
                        
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
                            
                            {countingMode === 'SUPERVISOR' && showTheoretical && (
                                <TableCell className="text-right font-mono text-xs font-bold text-slate-400">
                                    {p.theoreticalStock}
                                </TableCell>
                            )}

                            {(countingMode === 'C1' || countingMode === 'SUPERVISOR') && (
                              <TableCell className={countingMode === 'C1' ? 'bg-blue-50/20' : ''}>
                                <Input 
                                    type="number" 
                                    className="h-9 text-center font-black text-sm bg-white rounded-xl border-blue-100" 
                                    value={val.c1 || ""} 
                                    onChange={e => handleUpdateCount(p.id, 'c1', e.target.value)}
                                    disabled={session.status === 'CLOSED' || countingMode === 'SUPERVISOR'}
                                    placeholder="Qté A"
                                />
                              </TableCell>
                            )}

                            {(countingMode === 'C2' || countingMode === 'SUPERVISOR') && (
                              <TableCell className={countingMode === 'C2' ? 'bg-emerald-50/20' : ''}>
                                <Input 
                                    type="number" 
                                    className="h-9 text-center font-black text-sm bg-white rounded-xl border-emerald-100" 
                                    value={val.c2 || ""} 
                                    onChange={e => handleUpdateCount(p.id, 'c2', e.target.value)}
                                    disabled={session.status === 'CLOSED' || countingMode === 'SUPERVISOR'}
                                    placeholder="Qté B"
                                />
                              </TableCell>
                            )}
                            
                            {countingMode === 'SUPERVISOR' && (
                              <TableCell className="bg-amber-50/10">
                                <Input 
                                    type="number" 
                                    className={`h-9 text-center font-black text-sm bg-white rounded-xl transition-all ${hasMismatch ? 'border-amber-500 shadow-md ring-2 ring-amber-100 animate-pulse' : 'opacity-20'}`} 
                                    value={val.c3 ?? ""} 
                                    onChange={e => handleUpdateCount(p.id, 'c3', e.target.value)}
                                    disabled={!hasMismatch || session.status === 'CLOSED'}
                                    placeholder="Final"
                                />
                              </TableCell>
                            )}

                            <TableCell className="text-center pr-6">
                            {countingMode !== 'SUPERVISOR' ? (
                                (countingMode === 'C1' && val.c1 > 0) || (countingMode === 'C2' && val.c2 > 0) ? (
                                  <Badge className="bg-emerald-500 text-[8px] h-4">SAISI</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[8px] h-4">À FAIRE</Badge>
                                )
                            ) : !hasMismatch ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[8px] font-black border-emerald-100">
                                    <CheckCircle2 className="h-2 w-2 mr-1" /> CONFORME
                                </Badge>
                            ) : val.c3 !== undefined && val.c3 !== null ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 text-[8px] font-black border-blue-100">
                                    <Gavel className="h-2 w-2 mr-1" /> ARBITRÉ
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700 text-[8px] font-black border-red-200 animate-pulse">
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
                  <ListChecks className="h-4 w-4 text-primary" /> Instructions Master
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-6">
                {countingMode === 'C1' && (
                  <div className="space-y-4">
                    <p className="text-[11px] font-bold text-primary flex items-center gap-2">
                      <UserCheck className="h-4 w-4" /> MISSION ÉQUIPE A
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                      "Parcourez votre zone assignée. Saisissez chaque quantité physique vue. Ne demandez pas le stock informatique au superviseur."
                    </p>
                  </div>
                )}
                {countingMode === 'C2' && (
                  <div className="space-y-4">
                    <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-2">
                      <UserCheck className="h-4 w-4" /> MISSION ÉQUIPE B
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                      "Effectuez le comptage sans regarder les étiquettes de l'équipe A. Votre saisie doit être totalement indépendante."
                    </p>
                  </div>
                )}
                {countingMode === 'SUPERVISOR' && (
                  <div className="space-y-4">
                    <p className="text-[11px] font-bold text-amber-600 flex items-center gap-2">
                      <Gavel className="h-4 w-4" /> MISSION ARBITRAGE
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                      "Identifiez les lignes rouges (écarts entre A et B). Allez vérifier physiquement ces articles pour saisir la valeur finale en C3."
                    </p>
                  </div>
                )}
             </CardContent>
           </Card>

           <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-xl">
             <ShieldAlert className="h-6 w-6 text-accent shrink-0 mt-1" />
             <div className="text-[11px] leading-relaxed space-y-2">
               <p className="font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                 <Zap className="h-3 w-3" /> Audit-Ready Protocol
               </p>
               <p className="opacity-80 italic">
                 "Cette procédure de double comptage aveugle est la seule reconnue par les commissaires aux comptes pour certifier l'inventaire de fin d'année."
               </p>
             </div>
           </div>

           <Card className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <Calculator className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="text-[10px] text-blue-800 leading-relaxed font-medium">
                  <p className="font-black uppercase tracking-tight mb-1">Impact Clôture :</p>
                  <p>La validation finale écrase le stock théorique et prépare les écritures de variation de stock (PCE 603/72).</p>
                </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  )
}
