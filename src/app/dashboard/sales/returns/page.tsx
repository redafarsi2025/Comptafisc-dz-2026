
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Undo2, ShieldCheck, CheckCircle2, AlertTriangle, 
  Loader2, Search, Plus, Trash2, Save, FileText, ShoppingBag
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export default function CustomerReturnsManagement() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  
  const [newReturn, setNewReturn] = React.useState({
    deliveryRef: "",
    clientName: "",
    date: new Date().toISOString().split('T')[0],
    motif: "NON_CONFORME",
    items: [{ description: "", quantity: 1, unit: "U" }]
  })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const returnsQuery = useMemoFirebase(() => {
    if (!db || !tenantId) return null;
    return query(collection(db, "tenants", tenantId, "customer_returns"), orderBy("date", "desc"));
  }, [db, tenantId]);
  const { data: returns, isLoading } = useCollection(returnsQuery);

  const handleAddReturn = async () => {
    if (!db || !tenantId || !user || !newReturn.deliveryRef) return;
    setIsSaving(true);

    const returnData = {
      ...newReturn,
      status: "RECEIVED",
      tenantId,
      createdAt: new Date().toISOString(),
      createdByUserId: user.uid
    };

    try {
      await addDocumentNonBlocking(collection(db, "tenants", tenantId, "customer_returns"), returnData);
      toast({ title: "Retour Client validé", description: "Le stock a été réintégré." });
      setIsCreateOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Undo2 className="text-accent h-8 w-8" /> Retours Clients (BRC)
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Réintégration Stock & Gestion Litiges Ventes</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary shadow-lg" disabled={!tenantId}><Plus className="mr-2 h-4 w-4" /> Nouveau Retour Client</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Réception d'un Retour Client (BRC)</DialogTitle>
              <DialogDescription>Ce document réintègre les articles en stock et initie le processus d'avoir.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Réf. Bon de Livraison (BL)</Label>
                  <Input value={newReturn.deliveryRef} onChange={e => setNewReturn({...newReturn, deliveryRef: e.target.value})} placeholder="BL-2026-088" />
                </div>
                <div className="grid gap-2">
                  <Label>Nom du Client</Label>
                  <Input value={newReturn.clientName} onChange={e => setNewReturn({...newReturn, clientName: e.target.value})} />
                </div>
              </div>
              <div className="border-t pt-4">
                <Label className="font-bold">Articles retournés</Label>
                {newReturn.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mt-2">
                    <Input className="flex-1" placeholder="Désignation" value={item.description} onChange={e => {
                      const newItems = [...newReturn.items];
                      newItems[idx].description = e.target.value;
                      setNewReturn({...newReturn, items: newItems});
                    }} />
                    <Input className="w-24" type="number" value={item.quantity} onChange={e => {
                      const newItems = [...newReturn.items];
                      newItems[idx].quantity = parseFloat(e.target.value) || 0;
                      setNewReturn({...newReturn, items: newItems});
                    }} />
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                      if (newReturn.items.length > 1) {
                        setNewReturn({...newReturn, items: newReturn.items.filter((_, i) => i !== idx)});
                      }
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="mt-2 border-dashed w-full" onClick={() => setNewReturn({...newReturn, items: [...newReturn.items, { description: "", quantity: 1, unit: "U" }]})}>
                  <Plus className="h-3 w-3 mr-1" /> Ajouter article
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddReturn} disabled={isSaving} className="w-full h-12 text-lg">
                {isSaving ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}
                Valider Réintégration Stock (BRC)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-xl border-none ring-1 ring-border overflow-hidden bg-white">
        <CardHeader className="bg-muted/30 border-b py-4">
          <CardTitle className="text-lg">Registre des Bons de Retour Clients</CardTitle>
          <CardDescription>Entrées en stock pour motifs commerciaux ou techniques.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] uppercase font-black">
                <TableHead>Date / BRC</TableHead>
                <TableHead>Client / Réf BL</TableHead>
                <TableHead className="text-center">Articles</TableHead>
                <TableHead className="text-center">Statut Avoir</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : !returns?.length ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic flex flex-col items-center gap-4">
                  <Undo2 className="h-12 w-12 opacity-10" />
                  <span>Aucun retour client enregistré.</span>
                </TableCell></TableRow>
              ) : (
                returns.map((ret) => (
                  <TableRow key={ret.id} className="hover:bg-muted/5 group">
                    <TableCell className="text-xs font-bold">
                      <div className="flex flex-col">
                        <span>{new Date(ret.date).toLocaleDateString()}</span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase">{ret.id.substring(0, 8)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-bold">{ret.clientName}</span>
                        <span className="text-[9px] text-muted-foreground">Sur BL: {ret.deliveryRef}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">{ret.items?.length || 0} réf(s)</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 text-[8px] animate-pulse">AVOIR À CRÉER</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] text-primary">Générer Avoir</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-4">
        <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold underline uppercase">Note SCF - Réintégration Stock :</p>
          <p>
            Tout retour client validé doit faire l'objet d'une écriture de stock inverse (Débit 3x, Crédit 603) 
            afin de maintenir la valorisation CMUP exacte. L'avoir fiscal doit être émis pour annuler la créance client (411) et la TVA collectée (4457).
          </p>
        </div>
      </div>
    </div>
  )
}
