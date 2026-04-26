
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
  HardHat, Store, Briefcase, Factory, Gavel, HandCoins, Users, GraduationCap
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
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
    <div className="max-w-5xl mx-auto space-y-6">
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
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Raison Sociale</Label>
                <Input value={formData.raisonSociale || ""} onChange={(e) => handleUpdate("raisonSociale", e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">NIF (15 chiffres)</Label>
                <Input value={formData.nif || ""} onChange={(e) => handleUpdate("nif", e.target.value)} maxLength={15} className="h-11 rounded-xl font-mono" />
              </div>
            </CardContent>
          </Card>
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
    </div>
  )
}
