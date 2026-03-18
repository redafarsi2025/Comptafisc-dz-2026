
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
import { 
  Building2, Save, Fingerprint, MapPin, Phone, Globe, Loader2, 
  Briefcase, FileText, CreditCard, ShieldCheck, Zap 
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

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

  if (isTenantsLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (!currentTenant) return <div className="text-center p-12 text-muted-foreground">Aucun dossier actif trouvé.</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-primary">Configuration du Dossier</h1>
          <p className="text-muted-foreground">Paramétrage complet du moteur fiscal DzairCompta.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shadow-lg">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Sauvegarder les changements
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
                <Input value={formData.nif || ""} onChange={(e) => handleUpdate("nif", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Registre Commerce</label>
                <Input placeholder="WW/YY/BXXXXXX" value={formData.registreCommerce || ""} onChange={(e) => handleUpdate("registreCommerce", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Article Imposition</label>
                <Input value={formData.articleImposition || ""} onChange={(e) => handleUpdate("articleImposition", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Date Création (CNRC)</label>
                <Input type="date" value={formData.dateCreation?.split('T')[0] || ""} onChange={(e) => handleUpdate("dateCreation", new Date(e.target.value).toISOString())} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5" />Coordonnées & Contact</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1 space-y-2">
                  <label className="text-xs font-bold uppercase">Wilaya</label>
                  <Input value={formData.adresse?.wilaya || ""} onChange={(e) => handleUpdate("adresse.wilaya", e.target.value)} placeholder="Ex: 16 - Alger" />
                </div>
                <div className="md:col-span-1 space-y-2">
                  <label className="text-xs font-bold uppercase">Commune</label>
                  <Input value={formData.adresse?.commune || ""} onChange={(e) => handleUpdate("adresse.commune", e.target.value)} />
                </div>
                <div className="md:col-span-1 space-y-2">
                  <label className="text-xs font-bold uppercase">Rue / Adresse</label>
                  <Input value={formData.adresse?.rue || ""} onChange={(e) => handleUpdate("adresse.rue", e.target.value)} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Téléphone</label>
                  <Input value={formData.telephone || ""} onChange={(e) => handleUpdate("telephone", e.target.value)} placeholder="+213..." />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Email Pro</label>
                  <Input value={formData.email || ""} onChange={(e) => handleUpdate("email", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary"><Zap className="h-5 w-5" />Profil Fiscal (Moteur de calcul)</CardTitle>
              <CardDescription>Données critiques déterminant le régime G50/G12/IBS.</CardDescription>
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
              <div className="flex items-center space-x-2 pt-8">
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
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Périodicité Déclaration</label>
                <Select value={formData.periodiciteDeclaration} onValueChange={(v) => handleUpdate("periodiciteDeclaration", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MENSUEL">Mensuel (G50)</SelectItem>
                    <SelectItem value="TRIMESTRIEL">Trimestriel</SelectItem>
                    <SelectItem value="ANNUEL">Annuel (G12)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Code NAP (Nomenclature)</label>
                <Input value={formData.activiteNAP || ""} onChange={(e) => handleUpdate("activiteNAP", e.target.value)} placeholder="Détermine le taux TAP" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Secteur Activité</label>
                <Select value={formData.secteurActivite} onValueChange={(v) => handleUpdate("secteurActivite", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["COMMERCE", "PRODUCTION", "SERVICES", "BTP", "AGRICULTURE"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5" />Plan & Abonnement</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Plan DzairCompta</label>
                <Input value={formData.plan || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Statut Abonnement</label>
                <Input value={formData.subscription?.statut || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Date Expiration</label>
                <Input value={formData.subscription?.dateExpiration || ""} disabled className="bg-muted" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efatura" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Facturation Électronique</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 pt-4">
                <Checkbox 
                  id="efatura" 
                  checked={formData.efatura?.active} 
                  onCheckedChange={(c) => handleUpdate("efatura.active", !!c)} 
                />
                <label htmlFor="efatura" className="text-sm font-medium leading-none">Connexion API DGI active</label>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Préfixe Factures</label>
                <Input value={formData.efatura?.prefixeFacture || ""} onChange={(e) => handleUpdate("efatura.prefixeFacture", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card className="bg-muted/30">
            <CardHeader><CardTitle className="text-lg">Méta & Audit</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Créé le :</span>
                <p className="font-mono">{formData.createdAt}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Dernière mise à jour :</span>
                <p className="font-mono">{formData.updatedAt}</p>
              </div>
              <div className="flex items-center space-x-2 pt-4">
                <Checkbox id="onboarding" checked={formData.onboardingComplete} disabled />
                <label htmlFor="onboarding" className="text-xs font-bold uppercase">Onboarding Complété</label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
