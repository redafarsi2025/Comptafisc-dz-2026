
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, limit, doc } from "firebase/firestore"
import { Building2, Save, Fingerprint, MapPin, Phone, Globe, Loader2, Briefcase, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function TenantSettingsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [isSaving, setIsSaving] = React.useState(false)

  // Fetch current tenant
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  const [formData, setFormData] = React.useState({
    name: "",
    nif: "",
    rc: "",
    address: "",
    phoneNumber: "",
    email: "",
    activityType: "",
    taxRegime: "Réel"
  })

  // Pre-fill form when tenant is loaded
  React.useEffect(() => {
    if (currentTenant) {
      setFormData({
        name: currentTenant.name || "",
        nif: currentTenant.nif || "",
        rc: currentTenant.rc || "",
        address: currentTenant.address || "",
        phoneNumber: currentTenant.phoneNumber || "",
        email: currentTenant.email || "",
        activityType: currentTenant.activityType || "",
        taxRegime: currentTenant.taxRegime || "Réel"
      })
    }
  }, [currentTenant])

  const handleSave = async () => {
    if (!db || !currentTenant) return
    setIsSaving(true)

    const tenantRef = doc(db, "tenants", currentTenant.id)
    
    try {
      updateDocumentNonBlocking(tenantRef, {
        ...formData,
        lastFiscalHealthUpdate: new Date().toISOString()
      })
      toast({
        title: "Paramètres mis à jour",
        description: "Les informations de votre dossier ont été enregistrées avec succès.",
      })
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isTenantsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!currentTenant) {
    return (
      <div className="text-center p-12">
        <p className="text-muted-foreground">Aucun dossier actif trouvé. Veuillez en créer un dans la barre latérale.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-primary">Paramètres du Dossier</h1>
        <p className="text-muted-foreground">Identifiants fiscaux, commerciaux et régime d'imposition.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Informations Générales
          </CardTitle>
          <CardDescription>Ces données apparaissent sur vos factures et déclarations G50/G12.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom de l'entité</label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="Ex: SARL Alga Compta"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email de contact</label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-9"
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  placeholder="contact@entreprise.dz"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                Type d'Activité <Briefcase className="h-3 w-3" />
              </label>
              <Input 
                value={formData.activityType} 
                onChange={(e) => setFormData({...formData, activityType: e.target.value})} 
                placeholder="Ex: Prestations de services, Commerce..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                Régime d'Imposition <FileText className="h-3 w-3" />
              </label>
              <Select 
                value={formData.taxRegime} 
                onValueChange={(val) => setFormData({...formData, taxRegime: val as any})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir le régime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Réel">Régime du Réel (G50 Mensuel)</SelectItem>
                  <SelectItem value="IFU">IFU (Impôt Forfaitaire Unique)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                NIF <Fingerprint className="h-3 w-3" />
              </label>
              <Input 
                value={formData.nif} 
                onChange={(e) => setFormData({...formData, nif: e.target.value})} 
                placeholder="Numéro d'Identification Fiscale"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Registre du Commerce (RC)</label>
              <Input 
                value={formData.rc} 
                onChange={(e) => setFormData({...formData, rc: e.target.value})} 
                placeholder="Ex: 16/00-1234567B22"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Adresse Siège Social <MapPin className="h-3 w-3" />
            </label>
            <Input 
              value={formData.address} 
              onChange={(e) => setFormData({...formData, address: e.target.value})} 
              placeholder="Adresse complète"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Téléphone <Phone className="h-3 w-3" />
            </label>
            <Input 
              value={formData.phoneNumber} 
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} 
              placeholder="021 XX XX XX"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/20 flex justify-end p-6">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Enregistrer les modifications
          </Button>
        </CardFooter>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-amber-800 text-sm">Note sur l'Intégrité</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-700 text-xs">
            Le changement de régime fiscal (Réel vers IFU ou inversement) modifie les formulaires de déclaration disponibles. Assurez-vous de valider ce choix avec un conseiller fiscal.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
