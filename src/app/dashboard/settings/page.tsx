
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
  Building2, Save, MapPin, ShieldCheck, Zap, Loader2, Info, Search, Check, Rocket, Landmark, CalendarDays,
  HardHat, Store, Briefcase, Factory, Gavel, HandCoins, Users
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { PLANS } from "@/lib/plans"
import { useSearchParams } from "next/navigation"

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
        description: "Les variables de pilotage ont été synchronisées avec le moteur DSL.",
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

  if (isTenantsLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (!currentTenant) return <div className="text-center p-12 text-muted-foreground">Aucun dossier actif trouvé.</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-primary uppercase tracking-tighter">Configuration Master</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Alimentation des variables du Jumeau Numérique</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shadow-xl bg-primary h-11 px-8 rounded-xl font-bold">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer les modifications
        </Button>
      </div>

      <Tabs defaultValue="identification" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/50 rounded-2xl">
          <TabsTrigger value="identification" className="py-3 text-xs font-bold rounded-xl">Identification</TabsTrigger>
          <TabsTrigger value="fiscal" className="py-3 text-xs font-bold rounded-xl">Profil Fiscal</TabsTrigger>
          <TabsTrigger value="expert" className="py-3 text-xs font-bold rounded-xl">Variables Expert</TabsTrigger>
          <TabsTrigger value="social" className="py-3 text-xs font-bold rounded-xl">Paramètres Sociaux</TabsTrigger>
        </TabsList>

        <TabsContent value="identification" className="mt-6 space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Identification Légale</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8 pt-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Raison Sociale</Label>
                <Input value={formData.raisonSociale || ""} onChange={(e) => handleUpdate("raisonSociale", e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Forme Juridique</Label>
                <Select value={formData.formeJuridique} onValueChange={(v) => handleUpdate("formeJuridique", v)}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["SARL", "SPA", "EI", "SNC", "EURL", "Auto-entrepreneur"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Wilaya de Siège</Label>
                <Select value={formData.wilaya || ""} onValueChange={(v) => handleUpdate("wilaya", v)}>
                  <SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {WILAYAS.map(w => <SelectItem key={w.code} value={w.code}>{w.code} - {w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">NIF (15 chiffres)</Label>
                <Input value={formData.nif || ""} onChange={(e) => handleUpdate("nif", e.target.value)} maxLength={15} className="h-11 rounded-xl font-mono" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-6 space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2"><Gavel className="h-4 w-4" /> Régime & Exonérations</CardTitle>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Régime Fiscal</Label>
                    <Select value={formData.regimeFiscal} onValueChange={(v) => handleUpdate("regimeFiscal", v)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IFU">IFU (Impôt Forfaitaire Unique)</SelectItem>
                        <SelectItem value="REGIME_REEL_SIMPLIFIE">Réel Simplifié</SelectItem>
                        <SelectItem value="REGIME_REEL">Régime du Réel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <Switch checked={formData.isStartup} onCheckedChange={(v) => handleUpdate("isStartup", v)} />
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold">Label Startup (Ministère)</Label>
                      <p className="text-[10px] text-muted-foreground">Exonération totale IFU/IBS (Art. 100 LF 2026).</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <Switch checked={formData.isJobSponsor} onCheckedChange={(v) => handleUpdate("isJobSponsor", v)} />
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold">Dispositif ANADE / CNAC</Label>
                      <p className="text-[10px] text-muted-foreground">Exonération d'impôts sur les bénéfices (3 à 6 ans).</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <Switch checked={formData.isGrandSud} onCheckedChange={(v) => handleUpdate("isGrandSud", v)} />
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-blue-800">Zone Grand Sud (Abattement 50%)</Label>
                      <p className="text-[10px] text-blue-600">Réduction automatique de 50% de l'IBS et IRG (Art. 120 CIDTA).</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expert" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden">
               <CardHeader className="bg-slate-50 border-b">
                 <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                   <HardHat className="h-4 w-4 text-primary" /> Paramètres BTP
                 </CardTitle>
               </CardHeader>
               <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Taux de Retenue de Garantie (%)</Label>
                    <Select value={formData.btpRetentionRate || "5"} onValueChange={(v) => handleUpdate("btpRetentionRate", v)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5% (Taux Standard)</SelectItem>
                        <SelectItem value="10">10% (Taux Exceptionnel)</SelectItem>
                        <SelectItem value="0">0% (Pas de retenue)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="btpAnalytic" checked={formData.btpAnalytic} onCheckedChange={(v) => handleUpdate("btpAnalytic", !!v)} />
                    <Label htmlFor="btpAnalytic" className="text-xs">Isolation des stocks par chantier (Analytique)</Label>
                  </div>
               </CardContent>
            </Card>

            <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden">
               <CardHeader className="bg-slate-50 border-b">
                 <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                   <Factory className="h-4 w-4 text-primary" /> Paramètres Industriels
                 </CardTitle>
               </CardHeader>
               <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Méthode de Valorisation</Label>
                    <Select value={formData.stockValuation || "CMUP"} onValueChange={(v) => handleUpdate("stockValuation", v)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CMUP">CMUP (Moyen Pondéré)</SelectItem>
                        <SelectItem value="FIFO">FIFO (Premier Entré/Sorti)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-xl text-[10px] text-primary leading-relaxed italic">
                    "La méthode CMUP est celle recommandée par le SCF pour une vision fidèle de la marge industrielle."
                  </div>
               </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="social" className="mt-6 space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Politique Sociale</CardTitle>
            </CardHeader>
            <CardContent className="pt-8 grid md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Valeur Point Indiciaire IEP</Label>
                  <Input type="number" value={formData.iepPointValue || "0"} onChange={(e) => handleUpdate("iepPointValue", e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Appliquer SNMG 2026</Label>
                    <p className="text-[9px] text-muted-foreground">Blocage automatique des salaires &lt; 24 000 DA.</p>
                  </div>
                  <Switch checked={true} disabled />
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Primes Conventionnelles Actives</p>
                <div className="grid grid-cols-2 gap-4">
                  {["Panier", "Transport", "Nuisance", "Zone", "Risque", "Responsabilité"].map(p => (
                    <div key={p} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`p-${p}`} 
                        checked={formData.socialConfig?.[p]} 
                        onCheckedChange={(v) => handleUpdate(`socialConfig.${p}`, !!v)} 
                      />
                      <label htmlFor={`p-${p}`} className="text-xs cursor-pointer">{p}</label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-2xl relative overflow-hidden">
        <Zap className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
        <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
          <ShieldCheck className="h-6 w-6 text-accent" />
        </div>
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-black text-accent uppercase tracking-widest">Isolation du Noyau Master :</p>
          <p className="opacity-80 font-medium">
            Toutes les variables configurées ici sont injectées en temps réel dans le pipeline de calcul **Master DSL**. 
            Toute modification de profil (ex: passage au Grand Sud) entraînera une mise à jour immédiate de vos prochaines déclarations G50 et simulateurs RH.
          </p>
        </div>
      </div>
    </div>
  )
}
