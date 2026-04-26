"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Truck, Plus, Search, Filter, 
  Loader2, Printer, CheckCircle2,
  ArrowRight, FileText, Layout
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import { isToday, parseISO } from "date-fns"

export default function DeliveryNotesManagement() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const deliveryQuery = useMemoFirebase(() => {
    if (!db || !tenantId) return null;
    return query(collection(db, "tenants", tenantId, "delivery_notes"), orderBy("date", "desc"));
  }, [db, tenantId]);
  const { data: deliveries, isLoading } = useCollection(deliveryQuery);

  const stats = React.useMemo(() => {
    if (!deliveries) return { today: 0, toInvoice: 0, serviceRate: 100 };
    
    const todayCount = deliveries.filter(d => d.date && isToday(parseISO(d.date))).length;
    const toInvoiceCount = deliveries.filter(d => !d.isInvoiced).length;
    const invoicedCount = deliveries.filter(d => d.isInvoiced).length;
    const rate = deliveries.length > 0 ? (invoicedCount / deliveries.length) * 100 : 100;

    return {
      today: todayCount,
      toInvoice: toInvoiceCount,
      serviceRate: Math.round(rate)
    };
  }, [deliveries]);

  const filteredDeliveries = React.useMemo(() => {
    if (!deliveries) return [];
    return deliveries.filter(del => 
      del.deliveryNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      del.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [deliveries, searchTerm]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Truck className="text-accent h-8 w-8" /> Bons de Livraison (BL)
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Preuve de transfert de propriété et base de facturation.</p>
        </div>
        <Button className="bg-primary shadow-lg rounded-xl h-11 px-6 font-bold" disabled={!tenantId}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau BL
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-primary shadow-sm bg-white">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Livraisons du jour</p>
            <h2 className="text-3xl font-black text-primary">{stats.today} BL</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">À Facturer</p>
            <h2 className="text-3xl font-black text-amber-600">{stats.toInvoice} dossiers</h2>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200 border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-emerald-800">Taux de facturation</p>
            <h2 className="text-3xl font-black text-emerald-600">{stats.serviceRate}%</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-muted/30 border-b flex flex-col md:flex-row items-center justify-between py-4 px-6 gap-4">
          <CardTitle className="text-lg font-black uppercase tracking-tighter">Registre des Expéditions</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher BL, Client..." 
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
              <TableRow className="text-[10px] uppercase font-black px-6">
                <TableHead className="pl-6">N° BL / Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-center">Articles</TableHead>
                <TableHead className="text-center">Statut Facturation</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredDeliveries.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic flex flex-col items-center gap-4">
                  <Truck className="h-12 w-12 opacity-10" />
                  <span className="text-xs uppercase font-black">Aucun bon de livraison enregistré.</span>
                </TableCell></TableRow>
              ) : (
                filteredDeliveries.map((del) => (
                  <TableRow key={del.id} className="hover:bg-muted/5 group transition-colors h-16">
                    <TableCell className="text-xs font-bold pl-6">
                      <div className="flex flex-col">
                        <span>{del.deliveryNumber}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">{del.date}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium uppercase">{del.clientName}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[9px] font-black">{del.items?.length || 0} RÉF(S)</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "text-[8px] font-black uppercase h-5",
                        del.isInvoiced ? "bg-emerald-500" : "bg-amber-500"
                      )}>
                        {del.isInvoiced ? "FACTURÉ" : "À FACTURER"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary"><Printer className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary"><FileText className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
