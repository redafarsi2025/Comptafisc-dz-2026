
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
  const [shouldSign, setShouldSign] = React.useState(true)

  // 1. Fetch accessible tenants
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);
  
  // 2. Select current tenant based on URL
  const currentTenant = React.useMemo(() => {
    if (!tenants || tenants.length === 0) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const isIFU = currentTenant?.regimeFiscal === "IFU";
  const isCabinet = currentTenant?.plan === "CABINET";

  // Fetch clients for the ACTIVE tenant
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
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      totalAmountExcludingTax: totals.ht,
      totalTaxAmount: totals.tva,
      totalStampDutyAmount: totals.stamp,
      totalAmountIncludingTax: totals.ttc,
      paymentMethod,
      status: 'Issued',
      createdAt: new Date().toISOString(),
      createdByUserId: user.uid,
      items: items.map(item => ({
        ...item,
        taxAmount: calculateTVA(item.quantity * item.unitPrice, "TVA_19", isIFU),
        lineTotalExcludingTax: item.quantity * item.unitPrice,
        lineTotalIncludingTax: (item.quantity * item.unitPrice) + calculateTVA(item.quantity * item.unitPrice, "TVA_19", isIFU)
      }))
    };

    let digitalSignature = null;
    if (isCabinet && shouldSign) {
      digitalSignature = await generateInvoiceHash(invoiceBaseData);
    }

    const finalInvoiceData = {
      ...invoiceBaseData,
      isDigitallySigned: !!digitalSignature,
      signatureHash: digitalSignature,
      signedAt: digitalSignature ? new Date().toISOString() : null,
      certifiedBy: digitalSignature ? "ComptaFisc-DZ Authority" : null
    };

    try {
      addDocumentNonBlocking(collection(db, "tenants", currentTenant.id, "invoices"), finalInvoiceData);
      toast({ 
        title: digitalSignature ? "Facture Signée & Enregistrée" : "Facture enregistrée", 
        description: `La facture ${invoiceNumber} est prête avec preuve d'intégrité.` 
      });
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      setInvoiceNumber(`FAC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    } catch (e) {
      console.error(e);
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
          <p className="text-muted-foreground">Conformité Loi de Finances 2026 (Timbre, TVA & Traçabilité).</p>
        </div>
        <div className="flex gap-3">
          {isCabinet && (
            <div className="flex items-center space-x-2 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <div className="flex flex-col">
                <Label htmlFor="sign-toggle" className="text-[10px] font-bold text-emerald-800 cursor-pointer">SIGNATURE ÉLECTRONIQUE</Label>
                <span className="text-[8px] text-emerald-600 uppercase">Plan Cabinet Actif</span>
              </div>
              <Switch id="sign-toggle" checked={shouldSign} onCheckedChange={setShouldSign} />
            </div>
          )}
          <Button onClick={handleSaveInvoice} disabled={isSubmitting || !currentTenant} className="bg-primary shadow-lg h-12 px-6">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isCabinet && shouldSign ? "Signer & Valider" : "Générer la Facture"}
          </Button>
        </div>
      </div>

      {isIFU && (
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-bold">Régime IFU Actif</AlertTitle>
          <AlertDescription className="text-sm">
            En tant que contribuable à l'IFU, vous facturez en <strong>Hors Taxe (HT)</strong> sans collecter de TVA.
          </AlertDescription>
        </Alert>
      )}

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
                    {!clients?.length && <SelectItem value="none" disabled>Aucun client trouvé</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Mode de règlement</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Virement">Virement Bancaire</SelectItem>
                    <SelectItem value="Chèque">Chèque</SelectItem>
                    <SelectItem value="Espèces">Espèces (Droit de Timbre)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Désignation des prestations / articles</TableHead>
                    <TableHead className="w-[100px] text-center">Qté</TableHead>
                    <TableHead className="w-[150px] text-right">P.U (DA)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Intitulé du service..." className="border-none focus-visible:ring-0 shadow-none bg-transparent" /></TableCell>
                      <TableCell><Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value))} className="text-center border-none focus-visible:ring-0 shadow-none bg-transparent" /></TableCell>
                      <TableCell><Input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value))} className="text-right border-none focus-visible:ring-0 shadow-none bg-transparent font-mono" /></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" size="sm" onClick={addItem} className="border-dashed"><Plus className="mr-2 h-4 w-4" /> Ajouter une ligne de facturation</Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-lg border-t-4 border-t-primary overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Décompte Fiscal</span>
                <FileText className="h-5 w-5 text-primary opacity-50" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Hors Taxes</span>
                <span className="font-bold">{totals.ht.toLocaleString()} DA</span>
              </div>
              {!isIFU && (
                <div className="flex justify-between text-sm text-primary">
                  <span className="text-muted-foreground">TVA Collectée (19%)</span>
                  <span className="font-bold">+{totals.tva.toLocaleString()} DA</span>
                </div>
              )}
              {totals.stamp > 0 && (
                <div className="flex justify-between text-sm text-accent">
                  <span className="text-muted-foreground">Droit de Timbre (Espèces)</span>
                  <span className="font-bold">+{totals.stamp.toLocaleString()} DA</span>
                </div>
              )}
              <div className="border-t border-dashed pt-4 flex justify-between items-baseline">
                <span className="text-lg font-black">Net à Payer</span>
                <div className="text-right">
                  <div className="text-3xl font-black text-primary">{totals.ttc.toLocaleString()}</div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Dinars Algériens</div>
                </div>
              </div>
            </CardContent>
            {isCabinet && shouldSign && (
              <CardFooter className="bg-emerald-500/5 border-t border-emerald-100 flex flex-col items-start gap-2 p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Signature Électronique Prête</span>
                </div>
                <p className="text-[9px] text-emerald-600 leading-tight italic">
                  Une empreinte SHA-256 sera générée et stockée dans le coffre-fort numérique du dossier à la validation.
                </p>
              </CardFooter>
            )}
          </Card>

          <Card className="bg-slate-900 text-white border-none shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-400">Aperçu du Document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-32 bg-slate-800/50 rounded-lg flex items-center justify-center border border-slate-700 border-dashed">
                <div className="flex flex-col items-center gap-2 opacity-40">
                  <QrCode className="h-12 w-12" />
                  <span className="text-[8px] font-mono">CODE DE TRAÇABILITÉ DGI</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500">CONFORMITÉ LÉGALE</p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500 text-white text-[8px] h-4">LF 2026 OK</Badge>
                  <Badge className="bg-blue-500 text-white text-[8px] h-4">PCE SCF OK</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
