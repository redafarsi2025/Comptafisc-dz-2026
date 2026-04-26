
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, limit, doc } from "firebase/firestore"
import { WILAYAS } from "@/lib/wilaya-data"
import { 
  Building2, Save, MapPin, ShieldCheck, Zap, Loader2, Info, Landmark, CalendarDays,
  HardHat, Store, Briefcase, Factory, Gavel, Users, GraduationCap, FileText, Globe, Rocket, Truck, FlaskConical, Fingerprint
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useSearchParams } from "next/navigation"
import { PAYROLL_CONSTANTS } from "@/lib/calculations"

export default function TenantSettingsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [isSaving, setIsSaving] = React.useState(false)

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const [formData, setFormData] = React.useState<any>({})

  React.useEffect(() => {
    if (currentTenant) {
      setFormData(currentTenant)
    }
  }, [currentTenant])

  const handleUpdate = (path: string, value: any) => {
    const keys = path.split('.')
    setFormData((prev: any) => {
      const newData = { ...prev }
      let current = newData
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  const handleSave = async () => {
    if (!db || !currentTenant) return
    setIsSaving(true)
    try {
      updateDocumentNonBlocking(doc(db, "tenants", currentTenant.id), {
        ...formData,
        updatedAt: new Date().toISOString()
      })
      toast({ title: "Configuration Master mise à jour", description: "Les variables métier ont été synchronisées aux normes 2026." });
    } finally { setIsSaving(false); }
  }

  if (isTenantsLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-primary flex items-center gap-2 uppercase tracking-tighter">Configuration Master</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Gouvernance du dossier • Standard NIF 20 Digits Active</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shadow-xl bg-primary h-11 px-8 rounded-xl font-bold">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer le profil
        </Button>
      </div>

      <Tabs defaultValue="identification" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50 rounded-2xl">
          <TabsTrigger value="identification" className="py-3 text-xs font-bold rounded-xl">Identification</TabsTrigger>
          <TabsTrigger value="fiscal" className="py-3 text-xs font-bold rounded-xl">Profil Fiscal</TabsTrigger>
          <TabsTrigger value="expert" className="py-3 text-xs font-bold rounded-xl">Modules Secteurs</TabsTrigger>
          <TabsTrigger value="social" className="py-3 text-xs font-bold rounded-xl">Social & RH</TabsTrigger>
        </TabsList>

        <TabsContent value="identification" className="mt-6 space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Identification Légale</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8 pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Raison Sociale (Officielle)</Label>
                  <Input value={formData.raisonSociale || ""} onChange={(e) => handleUpdate("raisonSociale", e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Forme Juridique</Label>
                    <Select value={formData.formeJuridique || "SARL"} onValueChange={(v) => handleUpdate("formeJuridique", v)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["SARL", "SPA", "EURL", "SNC", "EI", "Auto-entrepreneur"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Wilaya du siège</Label>
                    <Select value={formData.wilaya || "16"} onValueChange={(v) => handleUpdate("wilaya", v)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {WILAYAS.map(w => <SelectItem key={w.code} value={w.code}>{w.code} - {w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">NIF (20 chiffres 2026)</Label>
                    <Input value={formData.nif || ""} onChange={(e) => handleUpdate("nif", e.target.value)} maxLength={20} className="h-11 rounded-xl font-mono font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">NIS (Dématérialisé)</Label>
                    <Input value={formData.nis || ""} onChange={(e) => handleUpdate("nis", e.target.value)} className="h-11 rounded-xl font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Registre Commerce</Label>
                    <Input value={formData.rc || ""} onChange={(e) => handleUpdate("rc", e.target.value)} className="h-11 rounded-xl font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Article d'Imposition</Label>
                    <Input value={formData.articleImposition || ""} onChange={(e) => handleUpdate("articleImposition", e.target.value)} className="h-11 rounded-xl font-mono" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-6 space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Gavel className="h-4 w-4 text-primary" /> Régime & Secteur</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Régime Fiscal Principal</Label>
                  <Select value={formData.regimeFiscal || "REGIME_REEL"} onValueChange={(v) => handleUpdate("regimeFiscal", v)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REGIME_REEL">Régime du Réel (Jibayatic Obligatoire)</SelectItem>
                      <SelectItem value="IFU">IFU (Impôt Forfaitaire Unique)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Secteur Stratégique</Label>
                  <Select value={formData.secteurActivite || "SERVICES"} onValueChange={(v) => handleUpdate("secteurActivite", v)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMMERCE">🛒 Commerce & Négoce</SelectItem>
                      <SelectItem value="BTP">🏗 BTPH (Chantiers)</SelectItem>
                      <SelectItem value="TRANSPORT">🚚 Transport & Logistique</SelectItem>
                      <SelectItem value="INDUSTRIE">🏭 Agroalimentaire / Industrie</SelectItem>
                      <SelectItem value="SANTE">🏥 Santé (Pharmacie/Clinique)</SelectItem>
                      <SelectItem value="SERVICES">💼 Services & Conseil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expert" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-8">
            {formData.secteurActivite === "TRANSPORT" && (
              <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden bg-white">
                <CardHeader className="bg-blue-50 border-b border-blue-100">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Truck className="h-4 w-4 text-blue-600" /> Options Transport</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Activer Rentabilité par Véhicule</Label>
                    <Switch checked={true} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Alertes Agréments Wilayas</Label>
                    <Switch checked={formData.transportConfig?.permitAlerts} onCheckedChange={(v) => handleUpdate("transportConfig.permitAlerts", v)} />
                  </div>
                </CardContent>
              </Card>
            )}

            {formData.secteurActivite === "SANTE" && (
              <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden bg-white">
                <CardHeader className="bg-emerald-50 border-b border-emerald-100">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><FlaskConical className="h-4 w-4 text-emerald-600" /> Options Santé</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Gestion des Lots & Péremption</Label>
                    <Switch checked={true} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Registre des Psychotropes</Label>
                    <Switch checked={formData.healthConfig?.psychoRegistry} onCheckedChange={(v) => handleUpdate("healthConfig.psychoRegistry", v)} />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Paramètres Métier</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="startup" checked={formData.isStartup} onCheckedChange={(v) => handleUpdate("isStartup", !!v)} />
                  <Label htmlFor="startup" className="text-xs font-bold">Label Startup (Exonéré IBS/IFU)</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="social" className="mt-6 space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Noyau RH</CardTitle>
            </CardHeader>
            <CardContent className="pt-8 grid md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Valeur du point indiciaire (DA)</Label>
                  <div className="relative">
                    <Zap className="absolute left-3 top-3.5 h-4 w-4 text-accent" />
                    <Input type="number" value={formData.iepPointValue || 45} onChange={(e) => handleUpdate("iepPointValue", parseFloat(e.target.value))} className="h-12 pl-10 text-lg font-black rounded-xl border-primary/20 bg-primary/5 text-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-xl">
        <Info className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Gouvernance Numérique 2026 :</p>
          <p className="opacity-80">
            L'interopérabilité avec **Jibayatic** et l'**ONS** repose sur l'exactitude de vos identifiants (NIF à 20 chiffres, NIS dématérialisé). 
            Le système vérifie la structure de ces codes pour éviter tout rejet lors de vos télé-déclarations.
          </p>
        </div>
      </div>
    </div>
  )
}
