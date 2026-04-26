
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
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
import { toast } from "@/hooks/use-toast"

export default function DeliveryNotesManagement() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const deliveryQuery = useMemoFirebase(() => {
    if (!db || !tenantId) return null;
    return query(collection(db, "tenants", tenantId, "delivery_notes"), orderBy("date", "desc"));
  }, [db, tenantId]);
  const { data: deliveries, isLoading } = useCollection(deliveryQuery);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Truck className="text-accent h-8 w-8" /> Bons de Livraison (BL)
          </h1>
          <p className="text-muted-foreground font-medium">Preuve de transfert de propriété et base de facturation.</p>
        </div>
        <Button className="bg-primary shadow-lg" disabled={!tenantId}><Plus className="mr-2 h-4 w-4" /> Nouveau BL</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-primary shadow-sm bg-white">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Livraisons du jour</p>
            <h2 className="text-3xl font-black text-primary">8 BL</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">À Facturer</p>
            <h2 className="text-3xl font-black text-amber-600">12 dossiers</h2>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200 border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-emerald-800">Taux de service</p>
            <h2 className="text-3xl font-black text-emerald-600">98.5%</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">Registre des Expéditions</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher BL, Client..." className="pl-9 h-9 w-64 bg-white text-xs" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] uppercase font-black">
                <TableHead>N° BL / Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-center">Articles</TableHead>
                <TableHead className="text-center">Statut Facturation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : !deliveries?.length ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic flex flex-col items-center gap-4">
                  <Truck className="h-12 w-12 opacity-10" />
                  <span>Aucun bon de livraison enregistré.</span>
                </TableCell></TableRow>
              ) : (
                deliveries.map((del) => (
                  <TableRow key={del.id} className="hover:bg-muted/5">
                    <TableCell className="text-xs font-bold">
                      <div className="flex flex-col">
                        <span>{del.deliveryNumber}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">{del.date}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{del.clientName}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="text-[9px]">{del.items?.length || 0} réf(s)</Badge></TableCell>
                    <TableCell className="text-center">
                      <Badge className={del.isInvoiced ? "bg-emerald-500" : "bg-amber-500"}>
                        {del.isInvoiced ? "FACTURÉ" : "À FACTURER"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Printer className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary"><FileText className="h-4 w-4" /></Button>
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
