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
import { findActivityByNap, NAP_ACTIVITIES } from "@/lib/nap-data"
import { WILAYAS } from "@/lib/wilaya-data"
import { 
  Building2, Save, MapPin, ShieldCheck, Zap, Loader2, Info, Search, Check, Rocket, Landmark, CalendarDays
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { PLANS } from "@/lib/plans"

export default function TenantSettingsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [isSaving, setIsSaving] = React.useState(false)

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  const [formData, setFormData] = React.useState<any>({})
  const [selectedSector, setSelectedSector] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (currentTenant) {
      setFormData(currentTenant)
      const activity = findActivityByNap(currentTenant.activiteNAP);
      if (activity) setSelectedSector(activity.sector);
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

      if (path === "regimeFiscal" && value === "IFU") {
        newData.assujettissementTva = false;
        newData.tauxTvaApplicable = "TVA_EXONERE";
      }

      return newData
    })

    if (path === "activiteNAP") {
      const activity = findActivityByNap(value);
      if (activity) setSelectedSector(activity.sector);
    }
  }

  const handleSave = async () => {
    if (!db || !currentTenant) return
    setIsSaving(true)

    const tenantRef = doc(db, "tenants", currentTenant.id)
    
    try {
      updateDocumentNonBlocking(tenantRef, {
        ...formData,
        updatedAt: new Date().toISOString()
      })
      toast({
        title: "Dossier mis à jour",
        description: "Les variables fiscales et commerciales ont été synchronisées.",
      })
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const sectors = React.useMemo(() => {
    return Array.from(new Set(NAP_ACTIVITIES.map(a => a.sector))).sort();
  }, []);

  const filteredActivities = React.useMemo(() => {
    if (!selectedSector) return [];
    return NAP_ACTIVITIES.filter(a => a.sector === selectedSector).sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedSector]);

  const selectedActivityInfo = React.useMemo(() => {
    return findActivityByNap(formData.activiteNAP || "");
  }, [formData.activiteNAP]);

  if (isTenantsLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (!currentTenant) return <div className="text-center p-12 text-muted-foreground">Aucun dossier actif trouvé.</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-primary">Configuration du Dossier</h1>
          <p className="text-muted-foreground">Paramétrage complet du moteur fiscal conforme à la Nomenclature NAP et Loi 2026.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shadow-lg">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Sauvegarder
        </Button>
      </div>

      <Tabs defaultValue="identification" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto p-1 bg-muted/50">
          <TabsTrigger value="identification" className="py-2 text-xs">Identification</TabsTrigger>
          <TabsTrigger value="contact" className="py-2 text-xs">Contact</TabsTrigger>
          <TabsTrigger value="fiscal" className="py-2 text-xs">Profil Fiscal</TabsTrigger>
          <TabsTrigger value="exemptions" className="py-2 text-xs">Exonérations</TabsTrigger>
          <TabsTrigger value="subscription" className="py-2 text-xs">Abonnement</TabsTrigger>
          <TabsTrigger value="efatura" className="py-2 text-xs">e-Fatura</TabsTrigger>
        </TabsList>

        <TabsContent value="identification" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building2 className="h-5 w-5" />Identification Légale</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Raison Sociale</label>
                <Input value={formData.raisonSociale || ""} onChange={(e) => handleUpdate("raisonSociale", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Forme Juridique</label>
                <Select value={formData.formeJuridique} onValueChange={(v) => handleUpdate("formeJuridique", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["SARL", "SPA", "EI", "SNC", "EURL", "Auto-entrepreneur", "SCP", "Personne physique"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Wilaya de Siège</label>
                <Select value={formData.wilaya || ""} onValueChange={(v) => handleUpdate("wilaya", v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Sélectionner une wilaya" />
                  </SelectTrigger>
                  <SelectContent>
                    {WILAYAS.map(w => (
                      <SelectItem key={w.code} value={w.code}>{w.code} - {w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Ville / Commune</label>
                <Input value={formData.ville || ""} onChange={(e) => handleUpdate("ville", e.target.value)} placeholder="Ex: Chéraga" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">NIF (15 chiffres)</label>
                <Input value={formData.nif || ""} onChange={(e) => handleUpdate("nif", e.target.value)} maxLength={15} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">NIN (Obligatoire 2026)</label>
                <Input placeholder="Numéro d'Identification Nationale" value={formData.nin || ""} onChange={(e) => handleUpdate("nin", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Date de début d'activité</Label>
                <Input type="date" value={formData.debutActivite || ""} onChange={(e) => handleUpdate("debutActivite", e.target.value)} />
                <p className="text-[10px] text-muted-foreground italic">Crucial pour la Déclaration d'Existence (G8).</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Informations de Contact</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Email Professionnel</label>
                <Input type="email" value={formData.email || ""} onChange={(e) => handleUpdate("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Téléphone</label>
                <Input value={formData.tel || ""} onChange={(e) => handleUpdate("tel", e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase">Adresse Complète</label>
                <Input value={formData.adresse || ""} onChange={(e) => handleUpdate("adresse", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary"><Zap className="h-5 w-5" />Profil Fiscal (Moteur 2026)</CardTitle>
              <CardDescription>Adaptation dynamique des seuils IFU (8M DA) et Auto-entrepreneur (5M DA).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Régime Fiscal</label>
                  <Select value={formData.regimeFiscal} onValueChange={(v) => handleUpdate("regimeFiscal", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IFU">IFU (Impôt Forfaitaire Unique)</SelectItem>
                      <SelectItem value="REGIME_REEL_SIMPLIFIE">Réel Simplifié</SelectItem>
                      <SelectItem value="REGIME_REEL">Régime du Réel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Activité Mixte ?</label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox id="isMixedActivity" checked={formData.isMixedActivity} onCheckedChange={(v) => handleUpdate("isMixedActivity", !!v)} />
                    <Label htmlFor="isMixedActivity" className="text-sm font-normal">Calcul au prorata du CA par activité (Art. 282sexies)</Label>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-background border rounded-lg space-y-4">
                <h4 className="text-sm font-bold flex items-center gap-2"><Search className="h-4 w-4 text-primary" /> Aide à la recherche d'activité (NAP)</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">1. Choisir le Secteur</label>
                    <Select value={selectedSector || ""} onValueChange={(v) => setSelectedSector(v)}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un secteur" /></SelectTrigger>
                      <SelectContent>
                        {sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">2. Choisir l'Activité</label>
                    <Select 
                      disabled={!selectedSector} 
                      onValueChange={(v) => handleUpdate("activiteNAP", v)}
                      value={formData.activiteNAP}
                    >
                      <SelectTrigger><SelectValue placeholder="Sélectionner votre métier" /></SelectTrigger>
                      <SelectContent>
                        {filteredActivities.map(a => (
                          <SelectItem key={a.code} value={a.code}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {selectedActivityInfo && (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3">
                  <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                    <Info className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-emerald-800">{selectedActivityInfo.label}</p>
                    <div className="mt-1 flex gap-4 text-xs text-emerald-700">
                      <p>NAP : <span className="font-bold">{selectedActivityInfo.code}</span></p>
                      <p>Taux IFU : <span className="font-bold">{formData.formeJuridique === "Auto-entrepreneur" ? "0.5%" : (selectedActivityInfo.sector === "SERVICES" ? "12%" : "5%")}</span></p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exemptions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary"><Rocket className="h-5 w-5" />Exonérations Temporaires (LF 2026)</CardTitle>
              <CardDescription>Gérez vos périodes de grâce fiscale (Startup, ANADE, ANGEM).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 border rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold">Label "Start-up"</Label>
                    <Switch id="startup-toggle" checked={formData.isStartup} onCheckedChange={(v) => handleUpdate("isStartup", v)} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Exonération IFU de 4 ans + 1 an si renouvellement (Art. 100 LF 2026).</p>
                  {formData.isStartup && (
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Date d'obtention du label</Label>
                      <Input type="date" value={formData.startupLabelDate || ""} onChange={(e) => handleUpdate("startupLabelDate", e.target.value)} />
                    </div>
                  )}
                </div>

                <div className="p-4 border rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold">Dispositif ANADE/ANGEM/CNAC</Label>
                    <Switch id="job-sponsor-toggle" checked={formData.isJobSponsor} onCheckedChange={(v) => handleUpdate("isJobSponsor", v)} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Exonération de 3 ans (6 ans en zone à promouvoir) (Art. 20 LF 2024).</p>
                  {formData.isJobSponsor && (
                    <div className="flex items-center space-x-2">
                      <Checkbox id="isPromoteZone" checked={formData.isPromoteZone} onCheckedChange={(v) => handleUpdate("isPromoteZone", !!v)} />
                      <Label htmlFor="isPromoteZone" className="text-xs font-normal">Implanté en zone à promouvoir</Label>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <Landmark className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <p className="font-bold">Important :</p>
                  Les exonérations IFU ne sont pas applicables aux activités via plates-formes numériques soumises à la retenue à la source de 5%.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Votre Plan Actuel</CardTitle>
                  <CardDescription>Gérez votre engagement et vos capacités.</CardDescription>
                </div>
                <Badge className="text-lg py-1 px-4 bg-primary/10 text-primary border-primary/20" variant="outline">
                  {formData.plan || "GRATUIT"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-4 bg-muted/20 rounded-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Expiration</p>
                  <p className="text-sm font-bold">{formData.subscription?.dateExpiration?.split('T')[0] || "Permanent"}</p>
                </div>
                <div className="p-4 bg-muted/20 rounded-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Utilisateurs</p>
                  <p className="text-sm font-bold">1 / {PLANS.find(p => p.id === (formData.plan || 'GRATUIT'))?.limits.users}</p>
                </div>
                <div className="p-4 bg-muted/20 rounded-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Stockage</p>
                  <p className="text-sm font-bold">45 MB / {PLANS.find(p => p.id === (formData.plan || 'GRATUIT'))?.limits.storage}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
