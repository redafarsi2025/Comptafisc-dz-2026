
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  FileSearch, Plus, Search, Filter, 
  Loader2, Printer, Send, History, CheckCircle2,
  ArrowRight, Landmark, ShoppingBag
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export default function PurchaseOrdersManagement() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !tenantId) return null;
    return query(collection(db, "tenants", tenantId, "purchase_orders"), orderBy("date", "desc"));
  }, [db, tenantId]);
  const { data: orders, isLoading } = useCollection(ordersQuery);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <FileSearch className="text-accent h-8 w-8" /> Bons de Commande (BC)
          </h1>
          <p className="text-muted-foreground font-medium">Contrat d'engagement fournisseur et base du contrôle fiscal.</p>
        </div>
        <Button className="bg-primary shadow-lg" disabled={!tenantId}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau Bon de Commande
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Commandes en cours</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-black text-primary">{orders?.filter(o => o.status === 'VALIDATED').length || 0}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">En attente réception</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-black text-amber-600">8 dossiers</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Budget engagé TTC</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-black text-emerald-600">1.2M DA</div></CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-lg">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold opacity-70">Statut Fournisseurs</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> 100% NIF Validés</div></CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-none ring-1 ring-border overflow-hidden bg-white">
        <CardHeader className="bg-muted/20 border-b flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">Registre des Engagements</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Réf BC, Fournisseur..." className="pl-9 h-9 w-64 bg-white text-xs" />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9"><Filter className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] uppercase font-black">
                <TableHead>Référence / Date</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead className="text-right">Total HT</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
                <TableHead className="text-center">Statut Flux</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : !orders?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic flex flex-col items-center gap-4">
                  <ShoppingBag className="h-12 w-12 opacity-10" />
                  <span>Aucun bon de commande enregistré.</span>
                </TableCell></TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/5 group">
                    <TableCell className="text-xs font-bold">
                      <div className="flex flex-col">
                        <span>{order.orderNumber}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">{order.date}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{order.supplierName}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{order.totalHT.toLocaleString()} DA</TableCell>
                    <TableCell className="text-right font-black text-xs text-primary">{order.totalTTC.toLocaleString()} DA</TableCell>
                    <TableCell className="text-center">
                      <Badge className={
                        order.status === 'VALIDATED' ? 'bg-blue-500' : 
                        order.status === 'RECEIVED' ? 'bg-emerald-500' : 
                        'bg-slate-500'
                      }>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Printer className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary"><Send className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowRight className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-slate-900 text-white rounded-2xl flex items-start gap-4 shadow-xl">
        <Landmark className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Note sur le Contrôle Interne :</p>
          <p className="opacity-80">
            Un Bon de Commande validé ne peut plus être modifié. Toute modification de quantité ou de prix doit faire l'objet d'un avenant ou d'une annulation du bon initial avec motif documenté. 
            C'est le document pivot qui permet de justifier la déduction de TVA lors du rapprochement facture.
          </p>
        </div>
      </div>
    </div>
  )
}
