"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Plus, Trash2, FileText, Save, Loader2, Info, ShieldCheck, 
  CheckCircle, QrCode, Truck, MapPin, Navigation, TrendingUp, Calculator
} from "lucide-react"
import { useFirestore, useUser, addDocumentNonBlocking, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, where, limit, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { calculateStampDuty, calculateTVA } from "@/lib/calculations"
import { Badge } from "@/components/ui/badge"
import { useSearchParams, useRouter } from "next/navigation"

export default function InvoicingPage() {
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [invoiceNumber, setInvoiceNumber] = React.useState(`FAC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`)
  const [clientId, setClientId] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("Virement")
  const [items, setItems] = React.useState([{ description: "", quantity: 1, unitPrice: 0 }])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Transport Specific States
  const [selectedVehicleId, setSelectedVehicleId] = React.useState("")
  const [missionRoute, setMissionRoute] = React.useState({ from: "", to: "" })

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

  const isTransport = currentTenant?.secteurActivite === "TRANSPORT";
  const isIFU = currentTenant?.regimeFiscal === "IFU";

  const clientsQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "clients");
  }, [db, currentTenant?.id]);
  const { data: clients } = useCollection(clientsQuery);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !isTransport) return null;
    return collection(db, "tenants", currentTenant.id, "vehicles");
  }, [db, currentTenant?.id, isTransport]);
  const { data: vehicles } = useCollection(vehiclesQuery);

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

    if (isTransport && !selectedVehicleId) {
      toast({ variant: "destructive", title: "Véhicule requis", description: "Pour le secteur transport, vous devez assigner un véhicule à la facture pour le suivi analytique." });
      return;
    }

    setIsSubmitting(true);
    const selectedVehicle = vehicles?.find(v => v.id === selectedVehicleId);
    
    const invoiceBaseData = {
      tenantId: currentTenant.id,
      tenantMembers: currentTenant.members,
      clientId,
      clientName: clients?.find(c => c.id === clientId)?.name || "",
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
      items,
      // Transport Metadata
      vehicleId: selectedVehicleId,
      vehiclePlate: selectedVehicle?.plate || "",
      missionRoute: isTransport ? missionRoute : null,
      isTransportInvoice: isTransport
    };

    try {
      // 1. Enregistrer la facture
      const invoiceDoc = await addDocumentNonBlocking(collection(db, "tenants", currentTenant.id, "invoices"), invoiceBaseData);

      // 2. Générer l'écriture comptable (706 au lieu de 700 pour transport)
      const journalEntriesRef = collection(db, "tenants", currentTenant.id, "journal_entries");
      const revenueAccount = isTransport ? "706" : "700";
      const revenueAccountName = isTransport ? "Prestations de services (Transport)" : "Ventes de marchandises";

      const entryData = {
        tenantId: currentTenant.id,
        entryDate: new Date().toISOString(),
        description: `FACTURE ${invoiceNumber} - ${invoiceBaseData.clientName} ${isTransport ? '[' + selectedVehicle?.plate + ']' : ''}`,
        documentReference: invoiceNumber,
        journalType: "VENTES",
        status: 'Validated',
        createdAt: new Date().toISOString(),
        createdByUserId: user.uid,
        tenantMembers: currentTenant.members,
        lines: [
          { accountCode: "411", accountName: "Clients", debit: totals.ttc, credit: 0 },
          { accountCode: revenueAccount, accountName: revenueAccountName, debit: 0, credit: totals.ht, projectId: selectedVehicleId },
          { accountCode: "4457", accountName: "TVA collectée", debit: 0, credit: totals.tva }
        ]
      };

      if (totals.stamp > 0) {
        entryData.lines.push({ accountCode: "442", accountName: "État - Droits de timbre", debit: 0, credit: totals.stamp });
      }

      await addDocumentNonBlocking(journalEntriesRef, entryData);

      // 3. Générer l'écriture analytique si transport
      if (isTransport && selectedVehicleId) {
        const analyticEntriesRef = collection(db, "tenants", currentTenant.id, "ecrituresAnalytiques");
        await addDocumentNonBlocking(analyticEntriesRef, {
            ecritureGLId: "", // Sera lié via trigger ou batch
            journalCode: "VENTES",
            dateEcriture: new Date().toISOString(),
            compteCode: "706",
            compteLibelle: "Prestations Transport",
            classeCompte: "7",
            debit: 0,
            credit: totals.ht,
            montantNet: totals.ht,
            libelle: `REVENU VEHICULE ${selectedVehicle?.plate} - ${invoiceBaseData.clientName}`,
            periode: new Date().toISOString().substring(0, 7),
            exercice: new Date().getFullYear().toString(),
            origine: "FACTURE",
            ventilations: [{
              sectionId: selectedVehicleId,
              sectionCode: selectedVehicle?.plate || "",
              sectionLibelle: selectedVehicle?.name || "",
              axeId: "VEH_AXE", // ID fixe ou récupéré de l'axe VEH
              axeCode: "VEH",
              pourcentage: 100,
              montant: totals.ht
            }],
            ventilationComplete: true,
            createdAt: new Date().toISOString(),
            createdBy: user.uid
        });
      }

      toast({ title: "Facture et Écritures validées", description: `Le CA de ${totals.ht.toLocaleString()} DA a été imputé au véhicule.` });
      router.push(`/dashboard/accounting/journal?tenantId=${currentTenant.id}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isTenantsLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-primary uppercase tracking-tighter">Facturation {isTransport ? 'Transport' : 'Client'}</h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
            {isTransport ? 'Émission de Lettre de Voiture & Facture Prestation' : 'Gestion des ventes conforme SCF'}
          </p>
        </div>
        <Button onClick={handleSaveInvoice} disabled={isSubmitting || !currentTenant} className="bg-primary shadow-xl h-12 px-8 rounded-xl font-bold">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
          Valider & Comptabiliser
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b p-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Identification de la Pièce</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-1">Client Destinataire*</label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger className="h-11 rounded-xl bg-white">
                      <SelectValue placeholder="Choisir un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 px-1">Mode de Règlement</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Virement">Virement Bancaire</SelectItem>
                      <SelectItem value="Chèque">Chèque</SelectItem>
                      <SelectItem value="Espèces">Espèces (Timbre requis)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isTransport && (
                <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-6 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Contexte Logistique (Analytique)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-blue-800">Véhicule Assigné*</label>
                      <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                        <SelectTrigger className="h-9 bg-white text-xs"><SelectValue placeholder="Sélectionner unité" /></SelectTrigger>
                        <SelectContent>
                          {vehicles?.map(v => <SelectItem key={v.id} value={v.id}>{v.plate} - {v.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-blue-800">Départ</label>
                      <div className="relative">
                        <MapPin className="absolute left-2 top-2.5 h-3 w-3 text-slate-400" />
                        <Input value={missionRoute.from} onChange={e => setMissionRoute({...missionRoute, from: e.target.value})} className="h-9 pl-7 bg-white text-xs" placeholder="Ville" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-blue-800">Arrivée</label>
                      <div className="relative">
                        <Navigation className="absolute left-2 top-2.5 h-3 w-3 text-slate-400" />
                        <Input value={missionRoute.to} onChange={e => setMissionRoute({...missionRoute, to: e.target.value})} className="h-9 pl-7 bg-white text-xs" placeholder="Ville" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest">Détail des Prestations</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem} className="h-8 rounded-lg text-[10px] font-black uppercase border-primary/20 text-primary">
                <Plus className="mr-1 h-3 w-3" /> Ajouter Ligne
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="text-[10px] uppercase font-black border-b">
                    <TableHead className="pl-6">Désignation de la prestation</TableHead>
                    <TableHead className="text-center w-[100px]">Quantité</TableHead>
                    <TableHead className="text-right w-[150px]">Prix Unit. HT</TableHead>
                    <TableHead className="text-right pr-6 w-[150px]">Total HT</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx} className="h-16 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6"><Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder={isTransport ? "Transport de marchandises..." : "Désignation..."} className="h-9 rounded-lg border-slate-200 text-xs" /></TableCell>
                      <TableCell><Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value))} className="h-9 rounded-lg text-center font-bold text-xs" /></TableCell>
                      <TableCell><Input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value))} className="h-9 rounded-lg text-right font-mono font-bold text-xs" /></TableCell>
                      <TableCell className="text-right pr-6 font-mono font-black text-primary text-xs">{(item.quantity * item.unitPrice).toLocaleString()} DA</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-slate-300 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden relative">
            <Calculator className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
            <CardHeader className="bg-primary/20 border-b border-white/5 p-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Décompte Fiscal SCF</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold opacity-60 uppercase tracking-tighter">
                  <span>Total Hors Taxes</span>
                  <span>{totals.ht.toLocaleString()} DA</span>
                </div>
                {!isIFU && (
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-400 uppercase tracking-tighter">
                    <span>TVA (19%)</span>
                    <span>+{totals.tva.toLocaleString()} DA</span>
                  </div>
                )}
                {totals.stamp > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-amber-500 uppercase tracking-tighter">
                    <span>Droit de Timbre</span>
                    <span>+{totals.stamp.toLocaleString()} DA</span>
                  </div>
                )}
              </div>
              
              <div className="pt-8 border-t border-white/10">
                <div className="flex justify-between items-baseline">
                   <p className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">Net à Encaisser</p>
                   <span className="text-4xl font-black text-white">{totals.ttc.toLocaleString()} <span className="text-xs font-normal opacity-50">DA</span></span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-white/5 p-4 border-t border-white/5 flex justify-center">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] font-black uppercase tracking-widest h-6 px-4">
                <ShieldCheck className="h-3 w-3 mr-2" /> Certifié Conforme LF 2026
              </Badge>
            </CardFooter>
          </Card>

          <Card className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 relative overflow-hidden shadow-inner">
             <ShieldCheck className="absolute -right-4 -bottom-4 h-20 w-20 opacity-10 text-emerald-600" />
             <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-2">
               <TrendingUp className="h-4 w-4" /> Intelligence Analytique
             </h4>
             <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
              "La validation de cette facture alimente instantanément le CA du véhicule concerné. Le système pourra ainsi générer votre balance analytique par unité d'œuvre."
             </p>
          </Card>

          <div className="p-6 bg-slate-100 rounded-3xl border border-slate-200">
             <div className="flex items-center gap-2 mb-3">
               <Info className="h-4 w-4 text-primary" />
               <span className="text-[10px] font-black uppercase text-primary tracking-widest">Conseil Master Node</span>
             </div>
             <p className="text-[11px] text-slate-500 italic leading-relaxed">
               "Pour le transport, l'Article 706 du SCF est le compte de référence. Assurez-vous que le matricule du véhicule est mentionné sur la facture pour éviter tout rejet lors d'un audit de déductibilité des charges liées (Gasoil)."
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
