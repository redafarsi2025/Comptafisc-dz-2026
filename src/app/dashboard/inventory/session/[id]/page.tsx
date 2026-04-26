
"use client"

import * as React from "react"
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc, getDocs } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  ClipboardCheck, Loader2, ShieldCheck, CheckCircle2, 
  AlertTriangle, Calculator, FileText, ChevronLeft,
  Save, Play, Ban, Sparkles, Zap
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

  const [counts, setCounts] = React.useState<Record<string, number>>({})

  React.useEffect(() => {
    if (session?.counts) {
      const countsMap: Record<string, number> = {};
      session.counts.forEach((c: any) => countsMap[c.productId] = c.physicalQuantity);
      setCounts(countsMap);
    }
  }, [session]);

  const handleUpdateCount = (productId: string, val: string) => {
    setCounts(prev => ({ ...prev, [productId]: parseFloat(val) || 0 }));
  }

  const handleSaveProgress = async () => {
    if (!db || !tenantId || !id || !session) return;
    setIsProcessing(true);

    const countsList = Object.entries(counts).map(([pid, qty]) => ({
      productId: pid,
      physicalQuantity: qty,
      countedAt: new Date().toISOString(),
      countedBy: user?.uid
    }));

    try {
      await updateDocumentNonBlocking(doc(db, "tenants", tenantId, "inventory_sessions", id as string), {
        counts: countsList,
        updatedAt: new Date().toISOString(),
        status: session.status === "DRAFT" ? "IN_PROGRESS" : session.status
      });
      toast({ title: "Progrès sauvegardé", description: "Le comptage a été mis à jour." });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleReconcile = async () => {
    if (!db || !tenantId || !id) return;
    setIsProcessing(true);
    try {
      await updateDocumentNonBlocking(doc(db, "tenants", tenantId, "inventory_sessions", id as string), {
        status: "RECONCILIATION",
        reconciledAt: new Date().toISOString()
      });
      toast({ title: "Passage au Rapprochement", description: "Vérifiez les écarts avant clôture." });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleCloseSession = async () => {
    if (!db || !tenantId || !id || !products) return;
    setIsProcessing(true);
    try {
      // 1. Clôturer la session
      await updateDocumentNonBlocking(doc(db, "tenants", tenantId, "inventory_sessions", id as string), {
        status: "CLOSED",
        closedAt: new Date().toISOString()
      });

      // 2. Mettre à jour les stocks réels dans le catalogue
      for (const p of products) {
        const physical = counts[p.id] ?? p.theoreticalStock;
        if (physical !== p.theoreticalStock) {
          await updateDocumentNonBlocking(doc(db, "tenants", tenantId, "products", p.id), {
            theoreticalStock: physical,
            lastInventoryDate: new Date().toISOString()
          });
        }
      }

      toast({ title: "Inventaire Clôturé", description: "Le catalogue stock a été mis à jour selon le comptage physique." });
      router.push(`/dashboard/inventory?tenantId=${tenantId}`);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isSessionLoading || isProductsLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto" /></div>
  if (!session) return <div className="p-20 text-center">Session non trouvée.</div>

  const progress = Math.round((Object.keys(counts).length / (products?.length || 1)) * 100);
  const totalVariance = products?.reduce((sum, p) => {
    const physical = counts[p.id] ?? 0;
    return sum + (physical - p.theoreticalStock) * p.cmup;
  }, 0) || 0;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href={`/dashboard/inventory?tenantId=${tenantId}`}><ChevronLeft className="h-5 w-5" /></Link></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-primary">{session.name}</h1>
              <Badge>{session.status}</Badge>
            </div>
            <p className="text-muted-foreground text-xs">{session.warehouse} • {new Date(session.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {session.status !== 'CLOSED' && (
            <>
              <Button variant="outline" onClick={handleSaveProgress} disabled={isProcessing}>
                <Save className="mr-2 h-4 w-4" /> Sauvegarder
              </Button>
              {session.status === 'IN_PROGRESS' ? (
                <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleReconcile}>
                  <Calculator className="mr-2 h-4 w-4" /> Rapprocher
                </Button>
              ) : (
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCloseSession}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Clôturer & MAJ Stock
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase font-bold text-muted-foreground">Progression</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{progress}%</div>
            <Progress value={progress} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card className="md:col-span-1 shadow-sm border-l-4 border-l-primary">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase font-bold text-muted-foreground">Écart Total (Valorisé)</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-black ${totalVariance < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {totalVariance.toLocaleString()} DA
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 bg-slate-900 text-white border-none shadow-xl relative overflow-hidden">
          <Zap className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase font-bold opacity-70">Aide Vision IA</CardTitle></CardHeader>
          <CardContent>
            <p className="text-[11px] leading-relaxed italic opacity-90">
              "Utilisez l'application mobile pour scanner les codes-barres. Gemini détectera automatiquement les anomalies d'inventaire basées sur vos factures d'achat récentes."
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-t-4 border-t-primary overflow-hidden">
        <CardHeader className="bg-muted/20 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Feuille de Comptage Physique</CardTitle>
            <Badge variant="outline" className="bg-white">Zone : Rayonnage Central</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Stock Théorique</TableHead>
                <TableHead className="w-[150px] text-center">Quantité Physique</TableHead>
                <TableHead className="text-right">Écart</TableHead>
                <TableHead className="text-right">Valorisation Écart</TableHead>
                <TableHead className="text-center">Alerte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((p) => {
                const physical = counts[p.id] ?? 0;
                const variance = physical - p.theoreticalStock;
                const valVariance = variance * p.cmup;
                const isCounting = session.status === "IN_PROGRESS" || session.status === "DRAFT";
                return (
                  <TableRow key={p.id} className="hover:bg-muted/5">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs">{p.name}</span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase">{p.code} • {p.unit}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs opacity-60">{p.theoreticalStock}</TableCell>
                    <TableCell className="text-center">
                      <Input 
                        type="number" 
                        className="h-8 text-center font-bold text-sm bg-white" 
                        value={counts[p.id] ?? ""} 
                        onChange={e => handleUpdateCount(p.id, e.target.value)}
                        disabled={session.status === 'CLOSED'}
                      />
                    </TableCell>
                    <TableCell className={`text-right font-mono text-xs font-bold ${variance < 0 ? 'text-destructive' : variance > 0 ? 'text-emerald-600' : ''}`}>
                      {variance > 0 ? '+' : ''}{variance}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">{valVariance.toLocaleString()} DA</TableCell>
                    <TableCell className="text-center">
                      {Math.abs(variance) > (p.theoreticalStock * 0.1) && variance !== 0 ? (
                        <Badge className="bg-destructive h-4 text-[8px]">ÉCART ÉLEVÉ</Badge>
                      ) : variance !== 0 ? (
                        <Badge variant="outline" className="h-4 text-[8px] text-amber-600 border-amber-200">À VÉRIFIER</Badge>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="flex justify-center p-8">
        <Button variant="outline" className="border-dashed border-2 px-12 py-8 flex flex-col gap-2 h-auto text-muted-foreground">
          <FileText className="h-8 w-8" />
          <span>Générer PV d'Inventaire (Signé)</span>
        </Button>
      </div>
    </div>
  )
}
