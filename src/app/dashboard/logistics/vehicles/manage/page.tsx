
"use client"

import * as React from "react"
import { useFirestore, useUser, useDoc, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useCollection, setDocumentNonBlocking } from "@/firebase"
import { collection, doc, query, where, getDocs, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { 
  Truck, Save, ChevronLeft, Loader2, 
  Settings, Gauge, ShieldCheck, User,
  CalendarDays, Zap, Info, AlertTriangle,
  Database, Fingerprint, Banknote, Calculator
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function ManageVehiclePage() {
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const vehicleId = searchParams.get('id')
  const [mounted, setMounted] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [syncWithAssets, setSyncWithAssets] = React.useState(true)

  const [formData, setFormData] = React.useState({
    name: "",
    plate: "",
    brand: "",
    model: "",
    year: new Date().getFullYear().toString(),
    vin: "",
    status: "ACTIVE",
    health: 100,
    currentOdometer: 0,
    driverName: "",
    notes: "",
    // Financial fields for Asset Registry
    acquisitionValue: 0,
    acquisitionDate: new Date().toISOString().split('T')[0],
    amortizationRate: 20,
    assetId: ""
  })

  React.useEffect(() => { setMounted(true) }, [])

  // Charger les données si on est en mode édition
  const vehicleRef = useMemoFirebase(() => 
    (db && tenantId && vehicleId) ? doc(db, "tenants", tenantId, "vehicles", vehicleId) : null
  , [db, tenantId, vehicleId]);
  const { data: existingVehicle, isLoading: isVehicleLoading } = useDoc(vehicleRef);

  // Charger l'axe analytique VEH pour la synchronisation
  const axesQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "axesAnalytiques"), where("code", "==", "VEH"), limit(1)) : null
  , [db, tenantId]);
  const { data: axes } = useCollection(axesQuery);

  React.useEffect(() => {
    if (existingVehicle) {
      setFormData({
        name: existingVehicle.name || "",
        plate: existingVehicle.plate || "",
        brand: existingVehicle.brand || "",
        model: existingVehicle.model || "",
        year: existingVehicle.year || "",
        vin: existingVehicle.vin || "",
        status: existingVehicle.status || "ACTIVE",
        health: existingVehicle.health || 100,
        currentOdometer: existingVehicle.currentOdometer || 0,
        driverName: existingVehicle.driverName || "",
        notes: existingVehicle.notes || "",
        acquisitionValue: existingVehicle.acquisitionValue || 0,
        acquisitionDate: existingVehicle.acquisitionDate || new Date().toISOString().split('T')[0],
        amortizationRate: existingVehicle.amortizationRate || 20,
        assetId: existingVehicle.assetId || ""
      });
      if (existingVehicle.assetId) setSyncWithAssets(true);
    }
  }, [existingVehicle]);

  const handleSave = async () => {
    if (!db || !tenantId || !user || !formData.name || !formData.plate) {
      toast({ variant: "destructive", title: "Champs requis", description: "Veuillez renseigner le nom et l'immatriculation." });
      return;
    }

    setIsSaving(true);
    const vehiclesColRef = collection(db, "tenants", tenantId, "vehicles");
    const sectionsColRef = collection(db, "tenants", tenantId, "sectionsAnalytiques");
    const assetsColRef = collection(db, "tenants", tenantId, "assets");

    try {
      let finalVehicleId = vehicleId;
      let finalAssetId = formData.assetId;

      // 1. GESTION DE L'ACTIF (COMPTABILITÉ CLASSE 2)
      if (syncWithAssets && formData.acquisitionValue > 0) {
        if (finalAssetId) {
          // Update existing asset
          await updateDocumentNonBlocking(doc(assetsColRef, finalAssetId), {
            designation: formData.name,
            code: formData.plate,
            acquisitionValue: formData.acquisitionValue,
            acquisitionDate: formData.acquisitionDate,
            amortizationRate: formData.amortizationRate,
            category: "2182", // Matériel de transport
            updatedAt: new Date().toISOString()
          });
        } else {
          // Create new asset
          const assetDocRef = await addDocumentNonBlocking(assetsColRef, {
            designation: formData.name,
            code: formData.plate,
            acquisitionValue: formData.acquisitionValue,
            acquisitionDate: formData.acquisitionDate,
            serviceDate: formData.acquisitionDate,
            amortizationRate: formData.amortizationRate,
            category: "2182",
            residualValue: 0,
            physicalStatus: "GOOD",
            physicalLocation: "Dépôt Flotte",
            createdAt: new Date().toISOString(),
            createdByUserId: user.uid
          });
          finalAssetId = assetDocRef?.id || "";
        }
      }

      // 2. SAUVEGARDE DU VÉHICULE
      const vehicleData = {
        ...formData,
        assetId: finalAssetId,
        updatedAt: new Date().toISOString()
      };

      if (vehicleId) {
        updateDocumentNonBlocking(doc(vehiclesColRef, vehicleId), vehicleData);
      } else {
        const vDocRef = await addDocumentNonBlocking(vehiclesColRef, {
          ...vehicleData,
          tenantId,
          createdAt: new Date().toISOString(),
          createdByUserId: user.uid
        });
        finalVehicleId = vDocRef?.id;
      }

      // 3. SYNCHRONISATION ANALYTIQUE (AXE VEH)
      if (axes && axes.length > 0 && (finalVehicleId || vehicleId)) {
        const axeVEH = axes[0];
        const existingSectionQuery = query(sectionsColRef, where("code", "==", formData.plate), where("axeId", "==", axeVEH.id));
        const sectionSnap = await getDocs(existingSectionQuery);

        if (sectionSnap.empty) {
          await addDocumentNonBlocking(sectionsColRef, {
            axeId: axeVEH.id,
            axeCode: axeVEH.code,
            axeLibelle: axeVEH.libelle,
            code: formData.plate,
            libelle: formData.name,
            actif: true,
            vehicleId: finalVehicleId || vehicleId,
            createdAt: new Date().toISOString()
          });
        } else {
          updateDocumentNonBlocking(doc(sectionsColRef, sectionSnap.docs[0].id), {
            libelle: formData.name,
            actif: formData.status === "ACTIVE"
          });
        }
      }

      toast({ title: "Véhicule & Actif enregistrés", description: "La fiche technique et comptable a été mise à jour." });
      router.push(`/dashboard/logistics?tenantId=${tenantId}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur de sauvegarde" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted || isVehicleLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/logistics?tenantId=${tenantId}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">
              {vehicleId ? "Modifier l'Unité" : "Nouveau Véhicule"}
            </h1>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">Fiche Technique & Analytique Flotte</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer le Véhicule
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-primary" /> Identification de l'unité
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Désignation interne*</Label>
                  <Input 
                    placeholder="Ex: Camion Renault K440 - A" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Immatriculation*</Label>
                  <Input 
                    placeholder="Ex: 01234-122-16" 
                    value={formData.plate}
                    onChange={e => setFormData({...formData, plate: e.target.value})}
                    className="h-11 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Marque</Label>
                  <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="Renault" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Modèle</Label>
                  <Input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="K440" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Année</Label>
                  <Input value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} placeholder="2024" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Statut</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Actif / En service</SelectItem>
                      <SelectItem value="MAINTENANCE">En Maintenance</SelectItem>
                      <SelectItem value="REPAIR">En Panne</SelectItem>
                      <SelectItem value="OUT">Hors Flotte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* VOLET FINANCIER SCF */}
          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-primary/5 border-b border-primary/10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Banknote className="h-4 w-4" /> Paramètres Financiers (SCF)
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Synchronisation automatique avec le Registre des Actifs</CardDescription>
              </div>
              <Switch checked={syncWithAssets} onCheckedChange={setSyncWithAssets} />
            </CardHeader>
            <CardContent className={cn("pt-6 space-y-6 transition-opacity", !syncWithAssets && "opacity-40 pointer-events-none")}>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Valeur d'Acquisition HT (DA)</Label>
                    <Input 
                      type="number"
                      value={formData.acquisitionValue || ""}
                      onChange={e => setFormData({...formData, acquisitionValue: parseFloat(e.target.value) || 0})}
                      className="h-11 rounded-xl font-black text-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Date d'Acquisition</Label>
                    <Input 
                      type="date"
                      value={formData.acquisitionDate}
                      onChange={e => setFormData({...formData, acquisitionDate: e.target.value})}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Taux d'Amort. (SCF)</Label>
                    <div className="relative">
                      <Input 
                        type="number"
                        value={formData.amortizationRate}
                        onChange={e => setFormData({...formData, amortizationRate: parseFloat(e.target.value) || 20})}
                        className="h-11 rounded-xl pr-10"
                      />
                      <span className="absolute right-3 top-3 text-[10px] font-black text-slate-400">%</span>
                    </div>
                  </div>
               </div>
               <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-emerald-800 leading-relaxed font-medium">
                    "En activant la synchronisation, ce véhicule sera comptabilisé en <strong>Compte 2182 (Matériel de transport)</strong>. Le système calculera automatiquement ses dotations aux amortissements."
                  </p>
               </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" /> Données d'exploitation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Kilométrage Actuel (KM)</Label>
                    <div className="relative">
                      <Gauge className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        type="number"
                        value={formData.currentOdometer || ""}
                        onChange={e => setFormData({...formData, currentOdometer: parseInt(e.target.value) || 0})}
                        className="h-11 pl-10 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Chauffeur Principal</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="Nom du conducteur" 
                        value={formData.driverName}
                        onChange={e => setFormData({...formData, driverName: e.target.value})}
                        className="h-11 pl-10 rounded-xl"
                      />
                    </div>
                  </div>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">N° de Châssis (VIN)</Label>
                  <Input 
                    placeholder="Saisissez le VIN complet..." 
                    value={formData.vin}
                    onChange={e => setFormData({...formData, vin: e.target.value})}
                    className="h-11 rounded-xl font-mono uppercase"
                  />
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden relative">
            <Database className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
            <CardHeader className="bg-primary/20 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent">Intégration Analytique</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-[11px] leading-relaxed opacity-80">
                La validation de ce véhicule créera automatiquement un centre de coût analytique 
                <strong className="text-white ml-1">[{formData.plate || 'MATRICULE'}]</strong>.
              </p>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                 <div className="flex justify-between items-center text-[9px] font-black uppercase">
                    <span className="text-slate-400">Santé de l'unité</span>
                    <span className="text-accent">{formData.health}%</span>
                 </div>
                 <Input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={formData.health} 
                  onChange={e => setFormData({...formData, health: parseInt(e.target.value)})}
                  className="h-1.5 accent-accent cursor-pointer"
                />
              </div>
            </CardContent>
            <CardFooter className="bg-white/5 p-4 border-t border-white/5">
               <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase">
                 <ShieldCheck className="h-4 w-4" /> Synchronisation Active
               </div>
            </CardFooter>
          </Card>

          <Card className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
             <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="text-[10px] text-blue-800 leading-relaxed font-medium">
                  <p className="font-black uppercase tracking-tight mb-1">Impact Reporting :</p>
                  <p>En liant vos tickets de gasoil à ce véhicule dans le journal, vous obtiendrez son coût de revient exact par kilomètre parcouru.</p>
                </div>
             </div>
          </Card>

          {formData.health < 40 && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-pulse">
               <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
               <p className="text-[10px] text-red-700 font-bold uppercase leading-tight">Alerte : Maintenance critique requise</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
