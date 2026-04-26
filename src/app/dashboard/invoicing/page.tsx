
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, FileText, Save, Loader2, Info, ShieldCheck, CheckCircle, QrCode } from "lucide-react"
import { useFirestore, useUser, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { calculateStampDuty, calculateTVA } from "@/lib/calculations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { generateInvoiceHash } from "@/lib/utils"
import { useSearchParams } from "next/navigation"

export default function InvoicingPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [invoiceNumber, setInvoiceNumber] = React.useState(`FAC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`)
  const [clientId, setClientId] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("Virement")
  const [items, setItems] = React.useState([{ description: "", quantity: 1, unitPrice: 0 }])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user?.uid]);
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants || tenants.length === 0) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const isIFU = currentTenant?.regimeFiscal === "IFU";

  const clientsQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "clients");
  }, [db, currentTenant?.id]);
  const { data: clients } = useCollection(clientsQuery);

  const totals = React.useMemo(() => {
    const ht = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const tva = calculateTVA(ht, "TVA_19", isIFU);
    const stamp = calculateStampDuty(ht + tva, paymentMethod === "Espèces");
    return { ht, tva, stamp, ttc: ht + tva + stamp };
  }, [items, paymentMethod, isIFU]);

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
    const invoiceBaseData = {
      tenantId: currentTenant.id,
      tenantMembers: currentTenant.members,
      clientId,
      invoiceNumber,
      invoiceDate: new Date().toISOString(),
      totalAmountExcludingTax: totals.ht,
      totalTaxAmount: totals.tva,
      totalStampDutyAmount: totals.stamp,
      totalAmountIncludingTax: totals.ttc,
      paymentMethod,
      status: 'Issued',
      createdAt: new Date().toISOString(),
      createdByUserId: user.uid,
      items
    };
    try {
      addDocumentNonBlocking(collection(db, "tenants", currentTenant.id, "invoices"), invoiceBaseData);
      toast({ title: "Facture enregistrée", description: `La facture ${invoiceNumber} est prête.` });
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isTenantsLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-primary">Gestion des Factures</h1>
          <p className="text-muted-foreground">Conformité Loi de Finances 2026.</p>
        </div>
        <Button onClick={handleSaveInvoice} disabled={isSubmitting || !currentTenant} className="bg-primary shadow-lg h-12 px-6">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Générer la Facture
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-md">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-lg">Édition de la Pièce Comptable</CardTitle>
            <CardDescription>Dossier: {currentTenant?.raisonSociale}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Client Destinataire</label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Choisir un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Règlement</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Virement">Virement</SelectItem>
                    <SelectItem value="Espèces">Espèces</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Désignation</TableHead>
                  <TableHead className="w-[100px] text-center">Qté</TableHead>
                  <TableHead className="w-[150px] text-right">P.U (DA)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} /></TableCell>
                    <TableCell><Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value))} /></TableCell>
                    <TableCell><Input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value))} /></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" size="sm" onClick={addItem} className="w-full border-dashed"><Plus className="mr-2 h-4 w-4" /> Ajouter ligne</Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg border-t-4 border-t-primary">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg">Décompte Fiscal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex justify-between text-sm"><span>Total HT</span><span className="font-bold">{totals.ht.toLocaleString()} DA</span></div>
            {!isIFU && <div className="flex justify-between text-sm text-primary"><span>TVA (19%)</span><span className="font-bold">+{totals.tva.toLocaleString()} DA</span></div>}
            {totals.stamp > 0 && <div className="flex justify-between text-sm text-accent"><span>Timbre</span><span className="font-bold">+{totals.stamp.toLocaleString()} DA</span></div>}
            <div className="border-t border-dashed pt-4 flex justify-between items-baseline">
              <span className="text-lg font-black">Net à Payer</span>
              <span className="text-3xl font-black text-primary">{totals.ttc.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
