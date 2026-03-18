
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, FileText, Save, Loader2 } from "lucide-react"
import { useFirestore, useUser, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { calculateStampDuty, calculateTVA } from "@/lib/calculations"

export default function InvoicingPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [invoiceNumber, setInvoiceNumber] = React.useState(`FAC-${new Date().getFullYear()}-001`)
  const [clientId, setClientId] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("Virement")
  const [items, setItems] = React.useState([{ description: "", quantity: 1, unitPrice: 0 }])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Fetch active tenant
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  // Fetch clients for the active tenant with security filter
  const clientsQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "clients"),
      where(`tenantMembers.${user.uid}`, "!=", null)
    );
  }, [db, currentTenant, user]);
  const { data: clients } = useCollection(clientsQuery);

  const totals = React.useMemo(() => {
    const ht = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const tva = calculateTVA(ht);
    const stamp = calculateStampDuty(ht + tva, paymentMethod === "Espèces");
    return { ht, tva, stamp, ttc: ht + tva + stamp };
  }, [items, paymentMethod]);

  const addItem = () => setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[idx] as any)[field] = value;
    setItems(newItems);
  };

  const handleSaveInvoice = async () => {
    if (!db || !user || !currentTenant || !clientId) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un client." });
      return;
    }

    setIsSubmitting(true);
    const invoiceData = {
      tenantId: currentTenant.id,
      clientId,
      invoiceNumber,
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      totalAmountExcludingTax: totals.ht,
      totalTaxAmount: totals.tva,
      totalStampDutyAmount: totals.stamp,
      totalAmountIncludingTax: totals.ttc,
      paymentMethod,
      status: 'Issued',
      createdAt: new Date().toISOString(),
      createdByUserId: user.uid,
      tenantMembers: currentTenant.members,
      items: items.map(item => ({
        ...item,
        taxAmount: calculateTVA(item.quantity * item.unitPrice),
        lineTotalExcludingTax: item.quantity * item.unitPrice,
        lineTotalIncludingTax: (item.quantity * item.unitPrice) * 1.19
      }))
    };

    try {
      addDocumentNonBlocking(collection(db, "tenants", currentTenant.id, "invoices"), invoiceData);
      toast({ title: "Facture enregistrée", description: `La facture ${invoiceNumber} est prête.` });
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Gestion des Factures</h1>
          <p className="text-muted-foreground">Émission de factures conformes à la LF 2026 (Timbre & TVA).</p>
        </div>
        <Button onClick={handleSaveInvoice} disabled={isSubmitting || !currentTenant} className="bg-primary">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Générer la Facture
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Détails de la facture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Client</label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    {!clients?.length && <SelectItem value="none" disabled>Aucun client trouvé</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mode de paiement</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Virement">Virement Bancaire</SelectItem>
                    <SelectItem value="Chèque">Chèque</SelectItem>
                    <SelectItem value="Espèces">Espèces (Applique le Timbre)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Désignation</TableHead>
                  <TableHead className="w-[100px]">Qté</TableHead>
                  <TableHead className="w-[150px]">Prix Unitaire</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Service ou Produit" /></TableCell>
                    <TableCell><Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value))} /></TableCell>
                    <TableCell><Input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value))} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" size="sm" onClick={addItem}><Plus className="mr-2 h-4 w-4" /> Ajouter une ligne</Button>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Récapitulatif Fiscal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total HT</span>
              <span className="font-semibold">{totals.ht.toLocaleString()} DZD</span>
            </div>
            <div className="flex justify-between text-sm text-primary">
              <span className="text-muted-foreground">TVA (19%)</span>
              <span className="font-semibold">+{totals.tva.toLocaleString()} DZD</span>
            </div>
            <div className="flex justify-between text-sm text-accent">
              <span className="text-muted-foreground">Droit de Timbre</span>
              <span className="font-semibold">+{totals.stamp.toLocaleString()} DZD</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-xl font-bold">
              <span>Total TTC</span>
              <span className="text-primary">{totals.ttc.toLocaleString()} DZD</span>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-[10px] text-muted-foreground">Conforme aux dispositions de la Loi de Finances Algérienne en vigueur.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
