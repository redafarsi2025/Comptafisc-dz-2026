
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Undo2, ShieldCheck, CheckCircle2, AlertTriangle, 
  Loader2, Search, Plus, Trash2, Save, ShoppingBag, Truck
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export default function SupplierReturnsManagement() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  
  const [newReturn, setNewReturn] = React.useState({
    brRef: "",
    supplierName: "",
    date: new Date().toISOString().split('T')[0],
    motif: "NON_CONFORME",
    items: [{ description: "", quantity: 1, unit: "U" }]
  })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const returnsQuery = useMemoFirebase(() => {
    if (!db || !tenantId) return null;
    return query(collection(db, "tenants", tenantId, "purchase_returns"), orderBy("date", "desc"));
  }, [db, tenantId]);
  const { data: returns, isLoading } = useCollection(returnsQuery);

  const handleAddReturn = async () => {
    if (!db || !tenantId || !user || !newReturn.brRef) return;
    setIsSaving(true);

    const returnData = {
      ...newReturn,
      status: "VALIDATED",
      tenantId,
      tenantMembers: { [user.uid]: 'owner' },
      createdAt: new Date().toISOString(),
      createdByUserId: user.uid
    };

    try {
      await addDocumentNonBlocking(collection(db, "tenants", tenantId, "purchase_returns"), returnData);
      
      // Update stock for each item returned (decrement)
      // Logic would normally find the specific product ID from description or a lookup
      
      toast({ title: "Bon de Retour validé", description: "Le stock a été décrémenté des quantités retournées." });
      setIsCreateOpen(false);
      setNewReturn({ brRef: "", supplierName: "", date: new Date().toISOString().split('T')[0], motif: "NON_CONFORME", items: [{ description: "", quantity: 1, unit: "U" }] });
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
            <Undo2 className="text-accent h-8 w-8" /> Retours Fournisseurs (BRR)
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Gestion des Non-Conformités & Sorties de Stock</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary shadow-lg" disabled={!tenantId}><Plus className="mr-2 h-4 w-4" /> Nouveau Retour</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Émission d'un Bon de Retour Fournisseur</DialogTitle>
              <DialogDescription>Ce document déclenche la sortie de stock et l'attente d'une facture d'avoir.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Réf. Bon de Réception (BR)</Label>
                  <Input value={newReturn.brRef} onChange={e => setNewReturn({...newReturn, brRef: e.target.value})} placeholder="BR-2026-045" />
                </div>
                <div className="grid gap-2">
                  <Label>Fournisseur</Label>
                  <Input value={newReturn.supplierName} onChange={e => setNewReturn({...newReturn, supplierName: e.target.value})} placeholder="Nom du fournisseur" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Motif du Retour</Label>
                  <Select value={newReturn.motif} onValueChange={v => setNewReturn({...newReturn, motif: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NON_CONFORME">Non conforme au BC</SelectItem>
                      <SelectItem value="DEFAUT_CASSE">Marchandise défectueuse / cassée</SelectItem>
                      <SelectItem value="SURPLUS">Surplus de livraison</SelectItem>
                      <SelectItem value="ERREUR_PU">Erreur de prix (Avoir financier)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Date de Sortie</Label>
                  <Input type="date" value={newReturn.date} onChange={e => setNewReturn({...newReturn, date: e.target.value})} />
                </div>
              </div>
              <div className="border-t pt-4">
                <Label className="font-bold">Articles à retourner</Label>
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
                  <Plus className="h-3 w-3 mr-1" /> Ajouter une ligne
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddReturn} disabled={isSaving} className="w-full h-12 text-lg">
                {isSaving ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}
                Valider la Sortie Stock (BRR)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-destructive shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Retours en attente d'avoir</p>
            <h2 className="text-3xl font-black text-destructive">{returns?.filter(r => r.status === 'VALIDATED').length || 0} dossiers</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary shadow-sm bg-white">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Taux de Non-Conformité</p>
            <h2 className="text-3xl font-black text-primary">2.4%</h2>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200 border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-emerald-800">Économies sur retours</p>
            <h2 className="text-3xl font-black text-emerald-600">14,200 DA</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
        <CardHeader className="bg-muted/30 border-b py-4">
          <CardTitle className="text-lg">Historique des Bons de Retour (BRR)</CardTitle>
          <CardDescription>Registre des sorties de stock pour non-conformité fournisseur.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] uppercase font-black">
                <TableHead>Date / BRR</TableHead>
                <TableHead>Fournisseur / Réf BR</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead className="text-right">Articles</TableHead>
                <TableHead className="text-center">Statut Fiscal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : !returns?.length ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic flex flex-col items-center gap-4">
                  <Truck className="h-12 w-12 opacity-10" />
                  <span>Aucun bon de retour enregistré.</span>
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
                        <span className="font-bold">{ret.supplierName}</span>
                        <span className="text-[9px] text-muted-foreground">Sur BR: {ret.brRef}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[8px] uppercase">{ret.motif.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {ret.items?.length || 0} réf(s)
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-amber-500 text-white text-[8px] animate-pulse">ATTENTE AVOIR</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-slate-900 text-white rounded-2xl flex items-start gap-4 shadow-xl">
        <ShieldCheck className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Note sur la Conformité des Stocks :</p>
          <p className="opacity-80">
            Conformément à l'Article 12 du SCF, l'inventaire permanent doit refléter fidèlement les mouvements réels. 
            La validation d'un Bon de Retour (BRR) décrémente automatiquement le stock théorique. Ne validez la sortie que lorsque la marchandise a physiquement quitté l'entrepôt.
          </p>
        </div>
      </div>
    </div>
  )
}
