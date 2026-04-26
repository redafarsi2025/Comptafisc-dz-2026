
"use client"

import * as React from "react"
import { useFirestore, useUser, useDoc, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  Pickaxe, Save, ChevronLeft, Loader2, 
  MapPin, CalendarDays, Users, TrendingUp, 
  Calculator, ShieldCheck, Briefcase, AlertTriangle
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { WILAYAS } from "@/lib/wilaya-data"

export default function ManageBtpProjectPage() {
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const projectId = searchParams.get('id')
  const [mounted, setMounted] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const [formData, setFormData] = React.useState({
    name: "",
    category: "Bâtiment",
    location: "Alger",
    wilaya: "16",
    manager: "",
    clientRef: "",
    budget: 0,
    consumed: 0,
    progress: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    status: "IN_PROGRESS",
    description: ""
  })

  React.useEffect(() => { setMounted(true) }, [])

  // Charger les données si on est en mode édition
  const projectRef = useMemoFirebase(() => 
    (db && tenantId && projectId) ? doc(db, "tenants", tenantId, "projects", projectId) : null
  , [db, tenantId, projectId]);
  const { data: existingProject, isLoading: isProjectLoading } = useDoc(projectRef);

  React.useEffect(() => {
    if (existingProject) {
      setFormData({
        name: existingProject.name || "",
        category: existingProject.category || "Bâtiment",
        location: existingProject.location || "Alger",
        wilaya: existingProject.wilaya || "16",
        manager: existingProject.manager || "",
        clientRef: existingProject.clientRef || "",
        budget: existingProject.budget || 0,
        consumed: existingProject.consumed || 0,
        progress: existingProject.progress || 0,
        startDate: existingProject.startDate || "",
        endDate: existingProject.endDate || "",
        status: existingProject.status || "IN_PROGRESS",
        description: existingProject.description || ""
      });
    }
  }, [existingProject]);

  const handleSave = async () => {
    if (!db || !tenantId || !user || !formData.name) {
      toast({ variant: "destructive", title: "Champs requis", description: "Veuillez donner un nom au projet." });
      return;
    }

    setIsSaving(true);
    const projectsColRef = collection(db, "tenants", tenantId, "projects");

    try {
      if (projectId) {
        // Mode Édition
        updateDocumentNonBlocking(doc(db, "tenants", tenantId, "projects", projectId), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        toast({ title: "Projet mis à jour", description: `Les modifications pour "${formData.name}" ont été enregistrées.` });
      } else {
        // Mode Création
        await addDocumentNonBlocking(projectsColRef, {
          ...formData,
          tenantId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdByUserId: user.uid
        });
        toast({ title: "Projet créé", description: `Le nouveau chantier "${formData.name}" a été initialisé.` });
      }
      router.push(`/dashboard/btp/projects?tenantId=${tenantId}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur de sauvegarde" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted || isProjectLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/btp/projects?tenantId=${tenantId}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">
              {projectId ? "Modifier le Chantier" : "Nouveau Projet BTP"}
            </h1>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">Fiche Technique & Financière</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer le Dossier
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" /> Identification du Projet
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Nom de l'opération / Titre du Chantier*</Label>
                  <Input 
                    placeholder="Ex: Construction 120 Logements Promotionnels" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Catégorie de Marché</Label>
                  <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                    <SelectTrigger className="h-11 rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bâtiment">Bâtiment (Habitation)</SelectItem>
                      <SelectItem value="Génie Civil">Génie Civil / Ouvrages</SelectItem>
                      <SelectItem value="Hydraulique">Hydraulique</SelectItem>
                      <SelectItem value="Travaux Publics">Travaux Publics (Routes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Référence Client / Marché</Label>
                  <Input 
                    placeholder="Ex: Marché N° 2026/045" 
                    value={formData.clientRef}
                    onChange={e => setFormData({...formData, clientRef: e.target.value})}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Localisation & Équipe
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Wilaya</Label>
                  <Select value={formData.wilaya} onValueChange={v => setFormData({...formData, wilaya: v})}>
                    <SelectTrigger className="h-11 rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WILAYAS.map(w => <SelectItem key={w.code} value={w.code}>{w.code} - {w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Chef de Projet / Conducteur</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Nom du responsable" 
                      value={formData.manager}
                      onChange={e => setFormData({...formData, manager: e.target.value})}
                      className="h-11 pl-10 rounded-xl"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Adresse ou Site Précis</Label>
                <Input 
                  placeholder="Ex: Cité 500 logts, Lot 14" 
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  className="h-11 rounded-xl"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Détails Techniques
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Note / Descriptif des travaux</Label>
                  <Textarea 
                    placeholder="Description sommaire du projet..." 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="min-h-[120px] rounded-2xl bg-slate-50 border-slate-100"
                  />
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden relative">
            <Calculator className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
            <CardHeader className="bg-primary/20 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent">Suivi Financier HT</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase opacity-60">Budget Total HT (DA)</Label>
                  <Input 
                    type="number" 
                    value={formData.budget || ""}
                    onChange={e => setFormData({...formData, budget: parseFloat(e.target.value) || 0})}
                    className="bg-white/5 border-white/10 text-white h-12 text-xl font-black rounded-xl focus-visible:ring-accent"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase opacity-60">Consommé Estimé HT (DA)</Label>
                  <Input 
                    type="number" 
                    value={formData.consumed || ""}
                    onChange={e => setFormData({...formData, consumed: parseFloat(e.target.value) || 0})}
                    className="bg-white/5 border-white/10 text-white h-12 text-xl font-black rounded-xl focus-visible:ring-accent"
                  />
                </div>
              </div>
              
              <div className="pt-6 border-t border-white/10">
                <div className="flex justify-between items-center mb-2">
                   <Label className="text-[10px] font-black uppercase text-accent">Avancement Physique (%)</Label>
                   <span className="text-xl font-black">{formData.progress}%</span>
                </div>
                <Input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={formData.progress} 
                  onChange={e => setFormData({...formData, progress: parseInt(e.target.value)})}
                  className="h-2 accent-accent cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Planning Prévisionnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase flex items-center gap-1"><CalendarDays className="h-3 w-3 text-primary" /> Date de début</Label>
                <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase flex items-center gap-1"><CalendarDays className="h-3 w-3 text-primary" /> Fin estimée</Label>
                <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2 pt-2">
                <Label className="text-[10px] font-black uppercase">Statut Global</Label>
                <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">En attente / Étude</SelectItem>
                    <SelectItem value="IN_PROGRESS">En Cours (Exécution)</SelectItem>
                    <SelectItem value="ON_HOLD">En Arrêt / Suspendu</SelectItem>
                    <SelectItem value="COMPLETED">Livré / Clôturé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm">
            <CardContent className="pt-6 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="text-[10px] text-emerald-800 leading-relaxed font-medium">
                <p className="font-black uppercase tracking-tight mb-1">Impact Comptable :</p>
                <p>La création de ce projet permet de ventiler vos écritures de classe 6 (Achats de matériaux) par centre de coût analytique.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
