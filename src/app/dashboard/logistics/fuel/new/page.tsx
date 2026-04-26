
/**
 * @fileOverview Formulaire de saisie d'un ticket carburant.
 */

"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, limit, doc, getDocs, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Fuel, Save, ChevronLeft, Loader2, 
  Droplets, Gauge, ShieldCheck, MapPin,
  CalendarDays, Zap, Info, Calculator, Receipt
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { calculateFuelEfficiency } from "@/lib/calculations"

export default function NewFuelEntryPage() {
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
    liters: 0,
    totalAmount: 0,
    gasStation: "NAFTAL",
    documentRef: "",
    fuelType: "DIESEL",
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

  const handleSave = async () => {
    if (!db || !tenantId || !user || !formData.vehicleId || formData.liters <= 0) {
      toast({ variant: "destructive", title: "Champs requis", description: "Veuillez sélectionner un véhicule et saisir les litres." });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Chercher le dernier plein de ce véhicule pour l'efficience
      const lastFuelQuery = query(
        collection(db, "tenants", tenantId, "fuel_logs"),
        where("vehicleId", "==", formData.vehicleId),
        orderBy("date", "desc"),
        orderBy("odometer", "desc"),
        limit(1)
      );
      const lastSnap = await getDocs(lastFuelQuery);
      
      let efficiency = 0;
      if (!lastSnap.empty) {
        const lastLog = lastSnap.docs[0].data();
        efficiency = calculateFuelEfficiency(formData.liters, formData.odometer, lastLog.odometer);
      }

      // 2. Enregistrer le log
      const logData = {
        ...formData,
        vehicleName: selectedVehicle?.name || "",
        vehiclePlate: selectedVehicle?.plate || "",
        efficiency,
        tenantId,
        createdAt: new Date().toISOString(),
        createdByUserId: user.uid
      };

      await addDocumentNonBlocking(collection(db, "tenants", tenantId, "fuel_logs"), logData);

      // 3. Mettre à jour l'odomètre du véhicule (Technique)
      if (formData.odometer > (selectedVehicle?.currentOdometer || 0)) {
        await addDocumentNonBlocking(doc(db, "tenants", tenantId, "vehicles", formData.vehicleId), {
           currentOdometer: formData.odometer,
           updatedAt: new Date().toISOString()
        });
      }

      toast({ title: "Ticket enregistré", description: `Plein de ${formData.liters}L pour ${selectedVehicle?.plate}.` });
      router.push(`/dashboard/logistics/fuel?tenantId=${tenantId}`);
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
            <Link href={`/dashboard/logistics/fuel?tenantId=${tenantId}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">Saisie Carburant</h1>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Ticket de pompe & Index Odomètre</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer le Plein
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-border rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Droplets className="h-4 w-4 text-primary" /> Détails de l'approvisionnement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Véhicule*</Label>
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
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Date du plein</Label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-11 rounded-xl" />
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
                      onChange={e => setFormData({...formData, odometer: parseFloat(e.target.value) || 0})}
                      className="h-11 pl-10 rounded-xl font-black"
                      placeholder={selectedVehicle?.currentOdometer?.toString() || "0"}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Station / Lieu</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      value={formData.gasStation} 
                      onChange={e => setFormData({...formData, gasStation: e.target.value})}
                      className="h-11 pl-10 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none ring-1 ring-border rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Données du Ticket (TTC)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Volume (Litres)*</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={formData.liters || ""} 
                      onChange={e => setFormData({...formData, liters: parseFloat(e.target.value) || 0})}
                      className="h-12 text-xl font-black rounded-xl border-primary/20 bg-primary/5 text-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Montant Total TTC (DA)*</Label>
                    <Input 
                      type="number" 
                      value={formData.totalAmount || ""} 
                      onChange={e => setFormData({...formData, totalAmount: parseFloat(e.target.value) || 0})}
                      className="h-12 text-xl font-black rounded-xl"
                    />
                  </div>
               </div>
               <div className="flex flex-col justify-center gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Prix au litre calculé</p>
                    <p className="text-lg font-black text-slate-900">
                      {formData.liters > 0 ? (formData.totalAmount / formData.liters).toFixed(2) : "0.00"} <span className="text-[10px] font-normal opacity-50">DA/L</span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Référence Ticket / Facture</Label>
                    <Input value={formData.documentRef} onChange={e => setFormData({...formData, documentRef: e.target.value})} placeholder="N° Bon" className="rounded-xl h-10" />
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden relative">
            <Calculator className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
            <CardHeader className="bg-primary/20 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent">Analyse Analytique</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-[11px] leading-relaxed opacity-80 italic">
                "La validation de ce ticket affectera automatiquement la charge (Compte 606) au véhicule 
                <strong className="text-white ml-1">[{selectedVehicle?.plate || '...'}]</strong> dans vos rapports de rentabilité."
              </p>
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase">
                  <ShieldCheck className="h-4 w-4" /> Traçabilité ODO active
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border border-amber-200 rounded-3xl p-6 shadow-inner">
             <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="text-[10px] text-amber-800 leading-relaxed font-medium">
                  <p className="font-black uppercase tracking-tight mb-1">Attention Odomètre :</p>
                  <p>L'odomètre saisi doit être supérieur à **{selectedVehicle?.currentOdometer || 0} KM** pour un calcul d'efficience correct.</p>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
