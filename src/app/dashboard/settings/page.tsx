
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
  HardHat, Store, Briefcase, Factory, Gavel, Users, GraduationCap, FileText, Globe, Rocket
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
      toast({ title: "Configuration Master mise à jour", description: "Les variables RH et fiscales ont été synchronisées." });
    } finally { setIsSaving(false); }
  }

  if (isTenantsLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-primary flex items-center gap-2 uppercase tracking-tighter">Configuration Master</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Contrôle des variables du noyau SaaS ComptaFisc-DZ</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shadow-xl bg-primary h-11 px-8 rounded-xl font-bold">
          {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer le profil
        </Button>
      </div>

      <Tabs defaultValue="identification" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50 rounded-2xl">
          <TabsTrigger value="identification" className="py-3 text-xs font-bold rounded-xl">Identification</TabsTrigger>
          <TabsTrigger value="fiscal" className="py-3 text-xs font-bold rounded-xl">Profil Fiscal</TabsTrigger>
          <TabsTrigger value="expert" className="py-3 text-xs font-bold rounded-xl">Variables BTP/Indus</TabsTrigger>
          <TabsTrigger value="social" className="py-3 text-xs font-bold rounded-xl">Point Indiciaire & RH</TabsTrigger>
        </TabsList>

        <TabsContent value="identification" className="mt-6 space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Identification Légale</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8 pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Raison Sociale</Label>
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
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Wilaya</Label>
                    <Select value={formData.wilaya || "16"} onValueChange={(v) => handleUpdate("wilaya", v)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {WILAYAS.map(w => <SelectItem key={w.code} value={w.code}>{w.code} - {w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Adresse Siège Social</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input value={formData.adresse || ""} onChange={(e) => handleUpdate("adresse", e.target.value)} className="pl-10 h-11 rounded-xl" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">NIF (15 chiffres)</Label>
                    <Input value={formData.nif || ""} onChange={(e) => handleUpdate("nif", e.target.value)} maxLength={15} className="h-11 rounded-xl font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">N.I.S</Label>
                    <Input value={formData.nis || ""} onChange={(e) => handleUpdate("nis", e.target.value)} className="h-11 rounded-xl font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Registre Commerce (RC)</Label>
                    <Input value={formData.rc || ""} onChange={(e) => handleUpdate("rc", e.target.value)} className="h-11 rounded-xl font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Article d'Imposition (AI)</Label>
                    <Input value={formData.ai || ""} onChange={(e) => handleUpdate("ai", e.target.value)} className="h-11 rounded-xl font-mono" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1 flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Date début d'activité (G8)</Label>
                  <Input type="date" value={formData.debutActivite || ""} onChange={(e) => handleUpdate("debutActivite", e.target.value)} className="h-11 rounded-xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-6 space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Gavel className="h-4 w-4 text-primary" /> Régime & Assujettissement</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Régime Fiscal Principal</Label>
                  <Select value={formData.regimeFiscal || "REGIME_REEL"} onValueChange={(v) => handleUpdate("regimeFiscal", v)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REGIME_REEL">Régime du Réel (G50 Mensuel)</SelectItem>
                      <SelectItem value="IFU">IFU (Impôt Forfaitaire Unique)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Secteur d'Activité</Label>
                  <Select value={formData.secteurActivite || "SERVICES"} onValueChange={(v) => handleUpdate("secteurActivite", v)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMMERCE">🛒 Commerce & Négoce</SelectItem>
                      <SelectItem value="BTP">🏗 BTP & Chantier</SelectItem>
                      <SelectItem value="INDUSTRIE">🏭 Industrie & Production</SelectItem>
                      <SelectItem value="SERVICES">💼 Services & Conseil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-6">
                <div className="p-4 bg-muted/20 rounded-2xl border border-dashed space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Assujetti à la TVA</Label>
                      <p className="text-[10px] text-muted-foreground">Active les colonnes TVA dans les journaux.</p>
                    </div>
                    <Switch 
                      checked={formData.assujettissementTva} 
                      onCheckedChange={(v) => handleUpdate("assujettissementTva", v)} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-2">Label Startup <Rocket className="h-3 w-3 text-emerald-500" /></Label>
                      <p className="text-[10px] text-muted-foreground">Exonération IBS/IFU pendant 4 ans.</p>
                    </div>
                    <Switch 
                      checked={formData.isStartup} 
                      onCheckedChange={(v) => handleUpdate("isStartup", v)} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expert" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><HardHat className="h-4 w-4 text-primary" /> Spécificités BTP</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Taux Retenue de Garantie (%)</Label>
                  <Input 
                    type="number" 
                    value={formData.btpConfig?.defaultWarrantyRate || 5} 
                    onChange={(e) => handleUpdate("btpConfig.defaultWarrantyRate", parseFloat(e.target.value))} 
                    className="h-11 rounded-xl"
                  />
                  <p className="text-[10px] text-muted-foreground italic">Standard Algérie : 5% sur chaque décompte.</p>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="cacobatph" 
                    checked={formData.btpConfig?.cacobatphActive} 
                    onCheckedChange={(v) => handleUpdate("btpConfig.cacobatphActive", !!v)} 
                  />
                  <Label htmlFor="cacobatph" className="text-xs font-bold">Assujetti CACOBATPH (CP & CI)</Label>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Factory className="h-4 w-4 text-primary" /> Spécificités Industrie</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Méthode de Valorisation Stock</Label>
                  <Select value={formData.industryConfig?.valuationMethod || "CMUP"} onValueChange={(v) => handleUpdate("industryConfig.valuationMethod", v)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CMUP">CMUP (Coût Moyen Pondéré)</SelectItem>
                      <SelectItem value="FIFO">FIFO (Premier entré, premier sorti)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="auto-of" 
                    checked={formData.industryConfig?.autoOfEnabled} 
                    onCheckedChange={(v) => handleUpdate("industryConfig.autoOfEnabled", !!v)} 
                  />
                  <Label htmlFor="auto-of" className="text-xs font-bold">Lancement OF auto sur commande client</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="social" className="mt-6 space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Moteur de Paie Indiciaire</CardTitle>
            </CardHeader>
            <CardContent className="pt-8 grid md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Valeur du point indiciaire (DA)</Label>
                  <div className="relative">
                    <Zap className="absolute left-3 top-3.5 h-4 w-4 text-accent" />
                    <Input 
                      type="number" 
                      value={formData.iepPointValue || 45} 
                      onChange={(e) => handleUpdate("iepPointValue", parseFloat(e.target.value))} 
                      className="h-12 pl-10 text-lg font-black rounded-xl border-primary/20 bg-primary/5 text-primary focus-visible:ring-primary"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Cette valeur multiplie l'indice de chaque salarié pour générer le salaire de base.</p>
                </div>
                
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-emerald-800">Verrouillage SNMG 2026</p>
                    <p className="text-[9px] text-emerald-600">Le système bloque automatiquement toute paie inférieure à 24 000 DA.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Primes Activées (Conventions)</p>
                <div className="grid grid-cols-2 gap-4">
                  {["Panier", "Transport", "Nuisance", "Zone", "Risque"].map(p => (
                    <div key={p} className="flex items-center space-x-2 p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                      <Checkbox 
                        id={`p-${p}`} 
                        checked={formData.socialConfig?.[p]} 
                        onCheckedChange={(v) => handleUpdate(`socialConfig.${p}`, !!v)} 
                      />
                      <label htmlFor={`p-${p}`} className="text-xs font-bold cursor-pointer uppercase tracking-tighter">{p}</label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-xl">
        <Info className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Note sur la Gouvernance des Données :</p>
          <p className="opacity-80">
            La modification du **Régime Fiscal** ou de la **Valeur du Point** impacte rétroactivement les calculs non validés. 
            Assurez-vous de clôturer vos écritures mensuelles avant tout changement structurel majeur. Toute modification est tracée dans l'historique d'audit du Command Center.
          </p>
        </div>
      </div>
    </div>
  )
}
