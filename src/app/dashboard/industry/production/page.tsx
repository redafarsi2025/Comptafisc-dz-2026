
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
  Loader2, ArrowRight, PlayCircle, Filter, Calendar
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function IndustryProductionPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  React.useEffect(() => { setMounted(true) }, [])

  const productionQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "production_orders"), orderBy("createdAt", "desc")) : null
  , [db, tenantId]);
  const { data: orders, isLoading } = useCollection(productionQuery);

  const filteredOrders = React.useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => 
      o.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm]);

  const stats = React.useMemo(() => {
    if (!orders) return { running: 0, planned: 0, completed: 0 };
    return {
      running: orders.filter(o => o.status === 'RUNNING').length,
      planned: orders.filter(o => o.status === 'PLANNED').length,
      completed: orders.filter(o => o.status === 'COMPLETED').length
    };
  }, [orders]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <Factory className="text-accent h-8 w-8" /> Ordres de Fabrication
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Pilotage des lignes de production et flux de stocks</p>
        </div>
        <Button className="bg-primary shadow-xl rounded-xl h-11 px-6 font-bold" disabled={!tenantId} asChild>
          <Link href={`/dashboard/industry/production/new?tenantId=${tenantId}`}>
            <Plus className="mr-2 h-4 w-4" /> Nouvel OF
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg ring-1 ring-border bg-white border-l-4 border-l-blue-500">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">En cours</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-blue-600">{stats.running} OF</div></CardContent>
        </Card>
        <Card className="border-none shadow-lg ring-1 ring-border bg-white border-l-4 border-l-amber-500">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">À démarrer</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-amber-600">{stats.planned}</div></CardContent>
        </Card>
        <Card className="border-none shadow-lg ring-1 ring-border bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Terminés</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-emerald-600">{stats.completed}</div></CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center px-6">
          <Settings className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent animate-spin-slow" />
          <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1 relative">Efficacité Ligne</p>
          <div className="text-2xl font-black text-white relative">94.2%</div>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4 px-6">
          <CardTitle className="text-lg font-black uppercase tracking-tighter">Planning de Production</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Chercher produit, OF..." 
                className="pl-9 h-9 w-64 bg-white text-xs rounded-xl" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl"><Filter className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] uppercase font-black">
                <TableHead className="pl-6">Référence / Date</TableHead>
                <TableHead>Produit Fini</TableHead>
                <TableHead className="text-center">Quantité</TableHead>
                <TableHead className="text-center">Avancement</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic flex flex-col items-center gap-4">
                  <Layers className="h-12 w-12 opacity-10" />
                  <span>Aucun ordre de fabrication enregistré.</span>
                </TableCell></TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/5 group transition-colors">
                    <TableCell className="pl-6 text-xs font-bold">
                      <div className="flex flex-col">
                        <span>{order.orderNumber || `OF-${order.id.substring(0, 6).toUpperCase()}`}</span>
                        <span className="text-[9px] text-muted-foreground font-normal flex items-center gap-1">
                          <Calendar className="h-2 w-2" /> {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-black uppercase text-primary">{order.productName}</TableCell>
                    <TableCell className="text-center font-mono text-xs font-bold">
                      {order.targetQty} <span className="text-[9px] font-normal text-muted-foreground">{order.unit}</span>
                    </TableCell>
                    <TableCell className="text-center">
                       <div className="flex flex-col items-center gap-1">
                         <span className="text-[10px] font-black">{order.progress || 0}%</span>
                         <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full bg-primary" style={{ width: `${order.progress || 0}%` }} />
                         </div>
                       </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={
                        order.status === 'RUNNING' ? 'bg-blue-500' : 
                        order.status === 'COMPLETED' ? 'bg-emerald-500' : 
                        'bg-slate-400'
                      }>
                        {order.status === 'RUNNING' ? 'EN PRODUCTION' : order.status === 'PLANNED' ? 'PLANIFIÉ' : 'TERMINÉ'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-xl" asChild>
                        <Link href={`/dashboard/industry/production/${order.id}?tenantId=${tenantId}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-xl">
        <Settings className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Intelligence Industrielle :</p>
          <p className="opacity-80 italic">
            "Le lancement d'un OF verrouille automatiquement les stocks de matières premières nécessaires (31) pour éviter les ruptures imprévues sur d'autres lignes. La clôture génère l'entrée en stock du produit fini (35) valorisée au PAMP réel."
          </p>
        </div>
      </div>
    </div>
  )
}
