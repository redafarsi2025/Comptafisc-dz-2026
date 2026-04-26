
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Factory, Plus, Search, Settings, 
  Layers, Package, TrendingUp,
  Activity, Clock, CheckCircle2,
  Loader2, ArrowRight, PlayCircle
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"

export default function IndustryProductionPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const productionQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "production_orders"), orderBy("createdAt", "desc")) : null
  , [db, tenantId]);
  const { data: orders, isLoading } = useCollection(productionQuery);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Factory className="text-accent h-8 w-8" /> Ordres de Fabrication (OF)
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Lancement et suivi des campagnes de production industrielle</p>
        </div>
        <Button className="bg-primary shadow-lg" disabled={!tenantId}>
          <PlayCircle className="mr-2 h-4 w-4" /> Lancer une Campagne
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">En Cours</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-black text-primary">{orders?.filter(o => o.status === 'RUNNING').length || 0} OF</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Planifiés</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-black text-amber-600">3</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Terminés (Mois)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-black text-emerald-600">24</div></CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-lg">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold opacity-70">Rendement Global</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold">92.4%</div></CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">Registre de Production</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher OF, Produit..." className="pl-9 h-9 w-64 bg-white text-xs" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] uppercase font-black">
                <TableHead>N° OF / Date</TableHead>
                <TableHead>Produit à Fabriquer</TableHead>
                <TableHead className="text-center">Quantité</TableHead>
                <TableHead className="text-center">Avancement</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : !orders?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic flex flex-col items-center gap-4">
                  <Layers className="h-12 w-12 opacity-10" />
                  <span>Aucun ordre de fabrication en cours.</span>
                </TableCell></TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/5 group transition-colors">
                    <TableCell className="text-xs font-bold">
                      <div className="flex flex-col">
                        <span>OF-2026-{order.id.substring(0, 4)}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium uppercase">{order.productName}</TableCell>
                    <TableCell className="text-center font-mono text-xs">{order.targetQty} {order.unit}</TableCell>
                    <TableCell className="text-center">
                       <Badge variant="outline" className="text-[9px]">{order.progress || 0}%</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={order.status === 'RUNNING' ? 'bg-blue-500' : 'bg-emerald-500'}>
                        {order.status === 'RUNNING' ? 'EN PRODUCTION' : 'TERMINÉ'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="p-6 bg-slate-900 text-white rounded-2xl flex items-start gap-4 shadow-xl">
        <Settings className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Automatisation des flux de stocks :</p>
          <p className="opacity-80">
            Lors de la clôture d'un OF, le système décrémente automatiquement les stocks de matières premières (31) selon la fiche recette et incrémente le stock de produits finis (35). Les écarts de rendement sont signalés pour analyse de la variance industrielle.
          </p>
        </div>
      </div>
    </div>
  )
}
