
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
  Save, Zap, Users, ShieldAlert, Eye, EyeOff, Scale
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href={`/dashboard/inventory?tenantId=${tenantId}`}><ChevronLeft className="h-5 w-5" /></Link></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-primary">{session.name}</h1>
              <Badge className="bg-primary/10 text-primary border-primary/20">{session.status}</Badge>
            </div>
            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">{session.warehouse} • Protocole 3-Comptages</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTheoretical(!showTheoretical)}>
            {showTheoretical ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showTheoretical ? "Masquer Théorique" : "Aperçu Théorique"}
          </Button>
          {session.status !== 'CLOSED' && (
            <>
              <Button variant="outline" size="sm" onClick={handleSaveProgress} disabled={isProcessing}>
                <Save className="mr-2 h-4 w-4" /> Sauvegarder C1/C2
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCloseSession} disabled={isProcessing}>
                <ShieldCheck className="mr-2 h-4 w-4" /> Clôturer & Valider
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 shadow-sm border-t-4 border-t-primary">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Progression Saisie</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{progress}%</div>
            <Progress value={progress} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card className="md:col-span-3 bg-slate-900 text-white border-none shadow-xl flex items-center p-6 gap-6 relative overflow-hidden">
          <Scale className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
          <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Audit à l'aveugle activé</h4>
            <p className="text-[11px] opacity-70 leading-relaxed max-w-xl">
              Conformément à la procédure d'audit SCF, les équipes A et B ne voient pas le stock théorique. 
              En cas d'écart (C1 ≠ C2), le champ **C3 (Arbitrage)** est requis pour la validation finale.
            </p>
          </div>
        </Card>
      </div>

      <Card className="shadow-lg border-t-4 border-t-primary overflow-hidden">
        <CardHeader className="bg-muted/20 border-b">
          <CardTitle className="text-lg">Feuille de Saisie Comparative</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Désignation Article</TableHead>
                {showTheoretical && <TableHead className="text-right">Théorique</TableHead>}
                <TableHead className="w-[120px] text-center bg-blue-50/50">Équipe A (C1)</TableHead>
                <TableHead className="w-[120px] text-center bg-emerald-50/50">Équipe B (C2)</TableHead>
                <TableHead className="w-[120px] text-center bg-amber-50/50">Arbitrage (C3)</TableHead>
                <TableHead className="text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((p) => {
                const val = counts[p.id] || { c1: 0, c2: 0, c3: 0 };
                const hasMismatch = val.c1 !== val.c2;
                return (
                  <TableRow key={p.id} className="hover:bg-muted/5 group">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs">{p.name}</span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase">{p.code} • {p.unit}</span>
                      </div>
                    </TableCell>
                    {showTheoretical && <TableCell className="text-right font-mono text-xs opacity-60">{p.theoreticalStock}</TableCell>}
                    <TableCell className="bg-blue-50/10">
                      <Input 
                        type="number" 
                        className="h-8 text-center font-bold text-sm bg-white" 
                        value={val.c1 || ""} 
                        onChange={e => handleUpdateCount(p.id, 'c1', e.target.value)}
                        disabled={session.status === 'CLOSED'}
                      />
                    </TableCell>
                    <TableCell className="bg-emerald-50/10">
                      <Input 
                        type="number" 
                        className="h-8 text-center font-bold text-sm bg-white" 
                        value={val.c2 || ""} 
                        onChange={e => handleUpdateCount(p.id, 'c2', e.target.value)}
                        disabled={session.status === 'CLOSED'}
                      />
                    </TableCell>
                    <TableCell className="bg-amber-50/10">
                      <Input 
                        type="number" 
                        className={`h-8 text-center font-bold text-sm bg-white ${hasMismatch ? 'border-amber-500 shadow-sm shadow-amber-200' : 'opacity-30'}`} 
                        value={val.c3 || ""} 
                        onChange={e => handleUpdateCount(p.id, 'c3', e.target.value)}
                        disabled={!hasMismatch || session.status === 'CLOSED'}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {!hasMismatch ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[8px]">C1 = C2 OK</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 text-[8px] animate-pulse">ÉCART C1/C2</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-4">
        <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <p className="font-bold underline uppercase">Règle de Clôture SCF :</p>
          <p>
            La clôture de l'inventaire fige les quantités et met à jour automatiquement le catalogue. 
            Les écarts identifiés lors du rapprochement doivent faire l'objet d'un procès-verbal (PV) d'inventaire signé par les membres de la commission et annexé à la liasse G4.
          </p>
        </div>
      </div>
    </div>
  )
}
