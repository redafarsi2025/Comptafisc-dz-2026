
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, limit, doc } from "firebase/firestore"
import { findActivityByNap, NAP_ACTIVITIES } from "@/lib/nap-data"
import { 
  Building2, Save, MapPin, CreditCard, ShieldCheck, Zap, Loader2, Info, Search, Check, Star
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

      // Règle IFU : Pas de TVA
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
          <p className="text-muted-foreground">Paramétrage complet du moteur fiscal conforme à la Nomenclature NAP.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shadow-lg">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Sauvegarder
        </Button>
      </div>

      <Tabs defaultValue="fiscal" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto p-1 bg-muted/50">
          <TabsTrigger value="identification" className="py-2 text-xs">Identification</TabsTrigger>
          <TabsTrigger value="contact" className="py-2 text-xs">Contact</TabsTrigger>
          <TabsTrigger value="fiscal" className="py-2 text-xs">Profil Fiscal</TabsTrigger>
          <TabsTrigger value="subscription" className="py-2 text-xs">Abonnement</TabsTrigger>
          <TabsTrigger value="efatura" className="py-2 text-xs">e-Fatura</TabsTrigger>
          <TabsTrigger value="audit" className="py-2 text-xs">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="identification" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building2 className="h-5 w-5" />Identification Légale</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Raison Sociale</label>
                <Input value={formData.raisonSociale || ""} onChange={(e) => handleUpdate("raisonSociale", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Forme Juridique</label>
                <Select value={formData.formeJuridique} onValueChange={(v) => handleUpdate("formeJuridique", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["SARL", "SPA", "EI", "SNC", "EURL", "Auto-entrepreneur", "Personne physique"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">NIF (15 chiffres)</label>
                <Input value={formData.nif || ""} onChange={(e) => handleUpdate("nif", e.target.value)} maxLength={15} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Registre Commerce</label>
                <Input placeholder="WW/YY/BXXXXXX" value={formData.registreCommerce || ""} onChange={(e) => handleUpdate("registreCommerce", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary"><Zap className="h-5 w-5" />Profil Fiscal (Moteur de calcul)</CardTitle>
              <CardDescription>Le régime IFU désactive automatiquement la TVA.</CardDescription>
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
                  <label className="text-xs font-bold uppercase">Code NAP Direct (Optionnel)</label>
                  <div className="relative">
                    <Input 
                      value={formData.activiteNAP || ""} 
                      onChange={(e) => handleUpdate("activiteNAP", e.target.value)} 
                      placeholder="Ex: 6201, 4711..." 
                      className="pr-10"
                    />
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-background border rounded-lg space-y-4">
                <h4 className="text-sm font-bold flex items-center gap-2"><Search className="h-4 w-4 text-primary" /> Aide à la recherche d'activité</h4>
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
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-emerald-800">{selectedActivityInfo.label}</p>
                      <Badge className="bg-emerald-600">NAP {selectedActivityInfo.code}</Badge>
                    </div>
                    <div className="mt-1 flex gap-4 text-xs text-emerald-700">
                      <p>Secteur : <span className="font-semibold">{selectedActivityInfo.sector}</span></p>
                      <p>Taux TAP : <span className="font-bold">{(selectedActivityInfo.tapRate * 100).toFixed(2)}%</span></p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="tva" 
                    checked={formData.assujettissementTva} 
                    disabled={formData.regimeFiscal === "IFU"}
                    onCheckedChange={(c) => handleUpdate("assujettissementTva", !!c)} 
                  />
                  <label htmlFor="tva" className={`text-sm font-medium leading-none ${formData.regimeFiscal === "IFU" ? "text-muted-foreground" : "cursor-pointer"}`}>
                    Assujetti à la TVA {formData.regimeFiscal === "IFU" && "(Non applicable en IFU)"}
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Taux TVA par défaut</label>
                  <Select 
                    value={formData.tauxTvaApplicable} 
                    disabled={formData.regimeFiscal === "IFU"}
                    onValueChange={(v) => handleUpdate("tauxTvaApplicable", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TVA_19">Taux Normal (19%)</SelectItem>
                      <SelectItem value="TVA_9">Taux Réduit (9%)</SelectItem>
                      <SelectItem value="TVA_EXONERE">Exonéré (0%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <div className="grid grid-cols-1 gap-8">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PLANS.filter(p => p.id !== 'CABINET').map((plan) => (
                <Card key={plan.id} className={`flex flex-col border-2 ${formData.plan === plan.id ? 'border-primary bg-primary/5' : 'border-transparent'}`}>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm font-bold">{plan.name}</CardTitle>
                      {formData.plan === plan.id && <Badge className="bg-primary text-white"><Check className="h-3 w-3 mr-1" /> Actif</Badge>}
                    </div>
                    <div className="text-2xl font-black mt-2">{plan.price} DA</div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2 text-xs">
                      {plan.categories.flatMap(c => c.features).slice(0, 4).map((f, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span>{f.name}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant={formData.plan === plan.id ? "outline" : "default"} 
                      className="w-full"
                      disabled={formData.plan === plan.id}
                    >
                      {formData.plan === plan.id ? "Plan Actuel" : "Changer de Plan"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5" />Coordonnées & Contact</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Téléphone</label>
                  <Input value={formData.telephone || ""} onChange={(e) => handleUpdate("telephone", e.target.value)} placeholder="+213..." />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Wilaya</label>
                  <Input value={formData.adresse?.wilaya || ""} onChange={(e) => handleUpdate("adresse.wilaya", e.target.value)} placeholder="Ex: 16 - Alger" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Adresse du siège</label>
                <Input value={formData.adresse?.rue || ""} onChange={(e) => handleUpdate("adresse.rue", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efatura" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Facturation Électronique</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox id="efatura" checked={formData.efatura?.active} onCheckedChange={(c) => handleUpdate("efatura.active", !!c)} />
                <label htmlFor="efatura" className="text-sm font-medium">Activer la connexion API e-Fatura DGI (Expérimental)</label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
