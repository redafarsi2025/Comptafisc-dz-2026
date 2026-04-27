"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { WILAYAS } from "@/lib/wilaya-data"
import { 
  Building2, Save, ShieldCheck, Loader2, Info, Landmark, Zap, Briefcase, GraduationCap, Gavel, Truck, FlaskConical
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import { useLocale } from "@/context/LocaleContext"
import { cn } from "@/lib/utils"

export default function TenantSettingsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { t, isRtl } = useLocale()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [isSaving, setIsSaving] = React.useState(false)

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants || tenants.length === 0) return null;
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
      toast({ title: "Configuration mise à jour", description: "Les modifications ont été enregistrées." });
    } finally { setIsSaving(false); }
  }

  if (isTenantsLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 text-start">
          <h1 className="text-3xl font-black text-primary flex items-center gap-2 uppercase tracking-tighter">
            {t.Settings.master_config}
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">{t.Settings.governance}</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shadow-xl bg-primary h-11 px-8 rounded-xl font-bold">
          {isSaving ? <Loader2 className={cn(isRtl ? "ms-2" : "me-2", "h-4 w-4 animate-spin")} /> : <Save className={cn(isRtl ? "ms-2" : "me-2", "h-4 w-4")} />}
          {t.Common.save}
        </Button>
      </div>

      <Tabs defaultValue="identification" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50 rounded-2xl">
          <TabsTrigger value="identification" className="py-3 text-xs font-bold rounded-xl">{t.Settings.legal_id}</TabsTrigger>
          <TabsTrigger value="fiscal" className="py-3 text-xs font-bold rounded-xl">{t.Settings.fiscal_profile}</TabsTrigger>
          <TabsTrigger value="expert" className="py-3 text-xs font-bold rounded-xl">Modules Secteurs</TabsTrigger>
          <TabsTrigger value="social" className="py-3 text-xs font-bold rounded-xl">Social & RH</TabsTrigger>
        </TabsList>

        <TabsContent value="identification" className="mt-6 space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 text-start">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> {t.Settings.legal_id}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8 pt-6">
              <div className="space-y-4">
                <div className="space-y-2 text-start">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.Settings.raison_sociale}</Label>
                  <Input value={formData.raisonSociale || ""} onChange={(e) => handleUpdate("raisonSociale", e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-start">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.Settings.forme_juridique}</Label>
                    <Select value={formData.formeJuridique || "SARL"} onValueChange={(v) => handleUpdate("formeJuridique", v)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["SARL", "SPA", "EURL", "SNC", "EI", "Auto-entrepreneur"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 text-start">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.Settings.wilaya}</Label>
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
                  <div className="space-y-2 text-start">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.Settings.nif}</Label>
                    <Input value={formData.nif || ""} onChange={(e) => handleUpdate("nif", e.target.value)} maxLength={20} className="h-11 rounded-xl font-mono font-bold" />
                  </div>
                  <div className="space-y-2 text-start">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.Settings.nis}</Label>
                    <Input value={formData.nis || ""} onChange={(e) => handleUpdate("nis", e.target.value)} className="h-11 rounded-xl font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-start">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.Settings.rc}</Label>
                    <Input value={formData.rc || ""} onChange={(e) => handleUpdate("rc", e.target.value)} className="h-11 rounded-xl font-mono" />
                  </div>
                  <div className="space-y-2 text-start">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.Settings.fiscal_article}</Label>
                    <Input value={formData.articleImposition || ""} onChange={(e) => handleUpdate("articleImposition", e.target.value)} className="h-11 rounded-xl font-mono" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-6 space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b text-start">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Gavel className="h-4 w-4 text-primary" /> {t.Settings.fiscal_profile}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
              <div className="space-y-6 text-start">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">{t.Settings.regime}</Label>
                  <Select value={formData.regimeFiscal || "REGIME_REEL"} onValueChange={(v) => handleUpdate("regimeFiscal", v)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REGIME_REEL">Régime du Réel (Jibayatic Obligatoire)</SelectItem>
                      <SelectItem value="IFU">IFU (Impôt Forfaitaire Unique)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">{t.Settings.sector}</Label>
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
                <CardHeader className="bg-blue-50 border-b border-blue-100 text-start">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Truck className="h-4 w-4 text-blue-600" /> Options Transport</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4 text-start">
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
            <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b text-start">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Paramètres Métier</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4 text-start">
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
            <CardHeader className="bg-primary/5 border-b border-primary/10 text-start">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Noyau RH</CardTitle>
            </CardHeader>
            <CardContent className="pt-8 grid md:grid-cols-2 gap-10">
              <div className="space-y-6 text-start">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Valeur du point indiciaire (DA)</Label>
                  <div className="relative">
                    <Zap className={cn("absolute top-3.5 h-4 w-4 text-accent", isRtl ? "right-3" : "left-3")} />
                    <Input type="number" value={formData.iepPointValue || 45} onChange={(e) => handleUpdate("iepPointValue", parseFloat(e.target.value))} className={cn("h-12 text-lg font-black rounded-xl border-primary/20 bg-primary/5 text-primary", isRtl ? "pr-10" : "pl-10")} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-xl">
        <Info className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2 text-start">
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
