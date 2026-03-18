
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
import { findActivityByNap } from "@/lib/nap-data"
import { 
  Building2, Save, MapPin, CreditCard, ShieldCheck, Zap, Loader2, Info
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

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

  const selectedActivity = React.useMemo(() => {
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

      <Tabs defaultValue="identification" className="w-full">
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
              <CardDescription>Données pilotant l'intelligence fiscale du dossier.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
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
                <label className="text-xs font-bold uppercase">Code NAP (Nomenclature)</label>
                <Input 
                  value={formData.activiteNAP || ""} 
                  onChange={(e) => handleUpdate("activiteNAP", e.target.value)} 
                  placeholder="Ex: 6201, 4711..." 
                />
                {selectedActivity ? (
                  <div className="mt-2 p-2 bg-emerald-50 rounded border border-emerald-100 flex items-start gap-2">
                    <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-emerald-700">
                      <p className="font-bold">{selectedActivity.label}</p>
                      <p>Secteur: {selectedActivity.sector} | Taux TAP: <span className="font-bold">{(selectedActivity.tapRate * 100).toFixed(2)}%</span></p>
                    </div>
                  </div>
                ) : formData.activiteNAP && (
                  <p className="text-[10px] text-destructive mt-1">Code NAP inconnu. Taux sectoriel par défaut appliqué.</p>
                )}
              </div>
              <div className="flex items-center space-x-2 pt-4">
                <Checkbox 
                  id="tva" 
                  checked={formData.assujettissementTva} 
                  onCheckedChange={(c) => handleUpdate("assujettissementTva", !!c)} 
                />
                <label htmlFor="tva" className="text-sm font-medium leading-none cursor-pointer">Assujetti à la TVA</label>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Taux TVA par défaut</label>
                <Select value={formData.tauxTvaApplicable} onValueChange={(v) => handleUpdate("tauxTvaApplicable", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TVA_19">Taux Normal (19%)</SelectItem>
                    <SelectItem value="TVA_9">Taux Réduit (9%)</SelectItem>
                    <SelectItem value="TVA_EXONERE">Exonéré (0%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5" />Plan & Abonnement</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Plan actuel :</span>
                <Badge className="ml-2">{formData.plan || "GRATUIT"}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Expiration :</span>
                <span className="ml-2 font-mono">{formData.subscription?.dateExpiration?.split('T')[0] || "N/A"}</span>
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
                <label htmlFor="efatura" className="text-sm font-medium">Activer la connexion API e-Fatura DGI</label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
