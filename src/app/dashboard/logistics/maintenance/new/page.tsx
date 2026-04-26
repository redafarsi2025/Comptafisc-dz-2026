
/**
 * @fileOverview Formulaire de saisie d'une intervention de maintenance.
 */

"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, doc, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  Wrench, Save, ChevronLeft, Loader2, 
  Settings, Gauge, ShieldCheck, User,
  CalendarDays, Zap, Info, Calculator, Receipt, Landmark
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

const MAINTENANCE_TYPES = [
  "VIDANGE / FILTRES",
  "PNEUMATIQUES",
  "FREINAGE",
  "SUSPENSION / AMORTISSEURS",
  "DISTRIBUTION / MOTEUR",
  "ÉLECTRICITÉ / ÉCLAIRAGE",
  "CLIMATISATION",
  "ÉCHAPPEMENT",
  "AUTRE INTERVENTION"
];

export default function NewMaintenanceEntryPage() {
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const [formData, setFormData] = React.useState({
    vehicleId: "",
    date: new Date().toISOString().split('T')[0],
    odometer: 0,
    type: "VIDANGE / FILTRES",
    provider: "",
    documentRef: "",
    totalAmount: 0,
    nextMaintenanceOdo: 0,
    description: "",
    isComptabilise: false
  })

  React.useEffect(() => { setMounted(true) }, [])

  // Charger les véhicules pour la sélection
  const vehiclesQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "vehicles"), where("status", "==", "ACTIVE")) : null
  , [db, tenantId]);
  const { data: vehicles } = useCollection(vehiclesQuery);

  const selectedVehicle = React.useMemo(() => 
    vehicles?.find(v => v.id === formData.vehicleId)
  , [vehicles, formData.vehicleId]);

  // Suggérer le prochain odomètre pour la vidange (+10 000 km par défaut)
  React.useEffect(() => {
    if (formData.type.includes("VIDANGE") && formData.odometer > 0 && formData.nextMaintenanceOdo === 0) {
      setFormData(prev => ({ ...prev, nextMaintenanceOdo: formData.odometer + 10000 }));
    }
  }, [formData.type, formData.odometer]);

  const handleSave = async () => {
    if (!db || !tenantId || !user || !formData.vehicleId || formData.odometer <= 0) {
      toast({ variant: "destructive", title: "Champs requis", description: "Veuillez sélectionner un véhicule et saisir le kilométrage." });
      return;
    }

    setIsSaving(true);
    try {
      const logData = {
        ...formData,
        vehicleName: selectedVehicle?.name || "",
        vehiclePlate: selectedVehicle?.plate || "",
        tenantId,
        createdAt: new Date().toISOString(),
        createdByUserId: user.uid
      };

      await addDocumentNonBlocking(collection(db, "tenants", tenantId, "maintenance_logs"), logData);

      // Mettre à jour l'odomètre "technique" du véhicule s'il est plus récent
      if (formData.odometer > (selectedVehicle?.currentOdometer || 0)) {
        updateDocumentNonBlocking(doc(db, "tenants", tenantId, "vehicles", formData.vehicleId), {
           currentOdometer: formData.odometer,
           updatedAt: new Date().toISOString()
        });
      }

      toast({ title: "Intervention enregistrée", description: `Le carnet d'entretien de ${selectedVehicle?.plate} a été mis à jour.` });
      router.push(`/dashboard/logistics/maintenance?tenantId=${tenantId}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/logistics/maintenance?tenantId=${tenantId}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">Saisie Maintenance</h1>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Mise à jour du carnet technique de l'unité</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer l'Intervention
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" /> Configuration de l'acte
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Véhicule concerné*</Label>
                  <Select value={formData.vehicleId} onValueChange={v => setFormData({...formData, vehicleId: v})}>
                    <SelectTrigger className="h-11 rounded-xl bg-white shadow-sm">
                      <SelectValue placeholder="Choisir une unité" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name} ({v.plate})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Type d'intervention</Label>
                  <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                    <SelectTrigger className="h-11 rounded-xl bg-white shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAINTENANCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Index Odomètre (KM)*</Label>
                  <div className="relative">
                    <Gauge className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      type="number" 
                      value={formData.odometer || ""} 
                      onChange={e => setFormData({...formData, odometer: parseInt(e.target.value) || 0})}
                      className="h-11 pl-10 rounded-xl font-black"
                      placeholder={selectedVehicle?.currentOdometer?.toString() || "0"}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Date d'intervention</Label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-11 rounded-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Facturation & Prestataire
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Nom du Garage / Fournisseur</Label>
                  <Input value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})} placeholder="Ex: Sarl Renault Service" className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Montant Total TTC (DA)</Label>
                  <Input 
                    type="number" 
                    value={formData.totalAmount || ""} 
                    onChange={e => setFormData({...formData, totalAmount: parseFloat(e.target.value) || 0})}
                    className="h-11 text-lg font-black rounded-xl border-primary/20 bg-primary/5 text-primary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Description des travaux effectués</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Détaillez les pièces changées ou les réparations faites..."
                  className="min-h-[100px] rounded-xl"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden relative">
            <Calculator className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
            <CardHeader className="bg-primary/20 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent">Planification Préventive</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-accent">Prochaine Échéance (KM Cible)</Label>
                <div className="relative">
                   <Zap className="absolute left-3 top-3 h-4 w-4 text-accent" />
                   <Input 
                    type="number" 
                    value={formData.nextMaintenanceOdo || ""} 
                    onChange={e => setFormData({...formData, nextMaintenanceOdo: parseInt(e.target.value) || 0})}
                    className="bg-white/5 border-white/10 text-white h-12 text-xl font-black rounded-xl pl-10 focus-visible:ring-accent"
                   />
                </div>
                <p className="text-[9px] opacity-60 italic">Le système vous alertera à l'approche de cet index.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 shadow-inner">
             <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[10px] text-emerald-800 leading-relaxed font-medium">
                  <p className="font-black uppercase tracking-tight mb-1">Impact Analytique :</p>
                  <p>La validation de cette fiche alimente automatiquement l'historique technique du véhicule <strong>{selectedVehicle?.plate || '...'}</strong> pour le calcul de son coût de revient.</p>
                </div>
             </div>
          </Card>

          <div className="p-6 bg-blue-50 border border-blue-200 rounded-3xl flex items-start gap-3">
             <Info className="h-5 w-5 text-blue-600 shrink-0" />
             <p className="text-[10px] text-blue-900 leading-relaxed italic">
               Assurez-vous de conserver la facture originale pour la déductibilité de la TVA sur les pièces de rechange et la main d'œuvre (Compte 615).
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
