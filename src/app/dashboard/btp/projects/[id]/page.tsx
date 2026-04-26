
"use client"

import * as React from "react"
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { doc, arrayUnion } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Pickaxe, ChevronLeft, CalendarDays, 
  MapPin, Users, TrendingUp, Calculator, 
  ShieldCheck, AlertTriangle, Clock, History,
  FileText, HardHat, Loader2, Edit3, CheckCircle2, Plus, 
  Save, Trash2
} from "lucide-react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"

export default function ProjectDetailPage() {
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const { id } = useParams()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isEventDialogOpen, setIsEventDialogOpen] = React.useState(false)
  const [isAddingEvent, setIsAddingEvent] = React.useState(false)
  
  const [newEvent, setNewEvent] = React.useState({
    title: "",
    date: new Date().toISOString().split('T')[0],
    description: ""
  })

  React.useEffect(() => { setMounted(true) }, [])

  const projectRef = useMemoFirebase(() => 
    (db && tenantId && id) ? doc(db, "tenants", tenantId, "projects", id as string) : null
  , [db, tenantId, id]);
  const { data: project, isLoading } = useDoc(projectRef);

  const handleAddTimelineEvent = async () => {
    if (!db || !tenantId || !id || !newEvent.title) return;
    setIsAddingEvent(true);
    
    try {
      const eventWithMeta = {
        ...newEvent,
        id: `ev_${Date.now()}`,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid
      };

      await updateDocumentNonBlocking(doc(db, "tenants", tenantId, "projects", id as string), {
        timeline: arrayUnion(eventWithMeta),
        updatedAt: new Date().toISOString()
      });

      toast({ title: "Jalon ajouté", description: `L'étape "${newEvent.title}" a été ajoutée à la chronologie.` });
      setIsEventDialogOpen(false);
      setNewEvent({ title: "", date: new Date().toISOString().split('T')[0], description: "" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'ajouter l'événement." });
    } finally {
      setIsAddingEvent(false);
    }
  };

  if (!mounted || isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>
  if (!project) return <div className="p-20 text-center space-y-4">
    <p className="text-muted-foreground italic">Projet introuvable.</p>
    <Button variant="outline" asChild><Link href={`/dashboard/btp/projects?tenantId=${tenantId}`}>Retour aux chantiers</Link></Button>
  </div>

  const remainingBudget = (project.budget || 0) - (project.consumed || 0);
  const consumptionRate = project.budget > 0 ? (project.consumed / project.budget) * 100 : 0;

  // Tri de la chronologie par date décroissante
  const sortedTimeline = [...(project.timeline || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/btp/projects?tenantId=${tenantId}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-primary uppercase tracking-tighter">{project.name}</h1>
              <Badge className={
                project.status === 'COMPLETED' ? 'bg-emerald-500' : 
                project.status === 'ON_HOLD' ? 'bg-amber-500' : 
                'bg-blue-500'
              }>
                {project.status === 'IN_PROGRESS' ? 'EN EXÉCUTION' : project.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {project.location || 'Alger, DZ'} • Réf: {project.clientRef || project.id.substring(0,8)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl h-11 px-6 font-bold" asChild>
            <Link href={`/dashboard/btp/projects/manage?tenantId=${tenantId}&id=${id}`}>
              <Edit3 className="mr-2 h-4 w-4" /> Modifier la fiche
            </Link>
          </Button>
          <Button className="bg-primary shadow-xl h-11 px-6 rounded-xl font-bold">
            <FileText className="mr-2 h-4 w-4" /> Rapport de Situation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <div className="absolute top-0 right-0 p-4 opacity-10"><Calculator className="h-16 w-16" /></div>
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Budget Alloué HT</p>
           <h2 className="text-3xl font-black">{project.budget?.toLocaleString()} DA</h2>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Dépenses Consommées</p>
           <h2 className="text-2xl font-black text-amber-600">{project.consumed?.toLocaleString()} DA</h2>
           <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase">
              <span className="opacity-60">Taux conso.</span>
              <span className={consumptionRate > 90 ? 'text-destructive' : 'text-amber-600'}>{consumptionRate.toFixed(1)}%</span>
           </div>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Budget Restant</p>
           <h2 className="text-2xl font-black text-emerald-600">{remainingBudget.toLocaleString()} DA</h2>
        </Card>
        <Card className="bg-primary text-white border-none shadow-xl p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-black opacity-70 mb-1">Avancement Physique</p>
           <h2 className="text-3xl font-black">{project.progress}%</h2>
           <Progress value={project.progress} className="h-1.5 bg-white/20 mt-2" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Chronologie du Chantier
              </CardTitle>
              <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5">
                    <Plus className="h-3 w-3 mr-1" /> Ajouter un Jalon
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouvelle Étape du Chantier</DialogTitle>
                    <DialogDescription>Ajoutez un jalon marquant l'avancement physique ou administratif.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Titre de l'étape</Label>
                      <Input 
                        placeholder="Ex: Coulage dalle R+1" 
                        value={newEvent.title}
                        onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Date</Label>
                      <Input 
                        type="date" 
                        value={newEvent.date}
                        onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Description (Optionnelle)</Label>
                      <Textarea 
                        placeholder="Détails techniques ou remarques..." 
                        value={newEvent.description}
                        onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddTimelineEvent} disabled={isAddingEvent || !newEvent.title} className="w-full">
                      {isAddingEvent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Enregistrer le Jalon
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {sortedTimeline.length > 0 ? sortedTimeline.map((ev, idx) => (
                  <div key={ev.id || idx} className="relative flex items-center justify-between md:justify-start md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      {idx === 0 ? <Clock className="h-5 w-5 text-blue-500" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white group-hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-slate-900 text-xs">{ev.title}</div>
                        <time className="font-mono text-[9px] text-primary">{ev.date}</time>
                      </div>
                      <div className="text-[11px] text-slate-500 italic">{ev.description || "Aucun détail saisi."}</div>
                    </div>
                  </div>
                )) : (
                  <div className="relative flex items-center justify-between md:justify-start md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-slate-900 text-xs">Ouverture du chantier</div>
                        <time className="font-mono text-[9px] text-primary">{project.startDate}</time>
                      </div>
                      <div className="text-[11px] text-slate-500 italic">Initialisation du dossier technique et base de vie.</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Documents & PV Techniques
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y">
                  <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center"><FileText className="h-4 w-4 text-blue-600" /></div>
                        <div>
                          <p className="text-xs font-bold">Marché_Signé_Final.pdf</p>
                          <p className="text-[9px] text-muted-foreground uppercase">Marché Public • 4.2 MB</p>
                        </div>
                     </div>
                     <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold">Télécharger</Button>
                  </div>
                  <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center"><ShieldCheck className="h-4 w-4 text-emerald-600" /></div>
                        <div>
                          <p className="text-xs font-bold">Assurance_Décennale.pdf</p>
                          <p className="text-[9px] text-muted-foreground uppercase">Conformité • 1.1 MB</p>
                        </div>
                     </div>
                     <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold">Télécharger</Button>
                  </div>
               </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-3 flex justify-center">
               <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-primary h-8"><Plus className="h-3 w-3 mr-2" /> Ajouter un document</Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-white border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden">
             <CardHeader className="bg-slate-50 border-b">
               <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-widest">Informations Équipe</CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Chef de Projet</p>
                    <p className="text-sm font-bold text-slate-900">{project.manager || 'Non assigné'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                   <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
                    <HardHat className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Secteur / Métier</p>
                    <p className="text-sm font-bold text-slate-900">{project.category || 'Général'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                   <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                    <CalendarDays className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Échéance prévue</p>
                    <p className="text-sm font-bold text-slate-900">{project.endDate || 'Non définie'}</p>
                  </div>
                </div>
             </CardContent>
          </Card>

          <Card className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 relative overflow-hidden">
             <ShieldCheck className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 text-emerald-600" />
             <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2">Expertise BTP ComptaFisc</h4>
             <p className="text-[11px] text-emerald-700 leading-relaxed italic">
              "Toutes les dépenses liées à ce chantier (BC matériaux, Frais de personnel) sont automatiquement isolées pour calculer votre marge par projet en fin d'exercice."
             </p>
          </Card>

          <div className="p-4 bg-slate-900 rounded-2xl text-white">
             <div className="flex items-center justify-between mb-4">
               <span className="text-[10px] font-black uppercase text-accent tracking-widest">Alerte Proximité</span>
               <AlertTriangle className="h-4 w-4 text-amber-500" />
             </div>
             <p className="text-[11px] opacity-70 leading-relaxed">
               L'avancement financier ({consumptionRate.toFixed(1)}%) dépasse l'avancement physique ({project.progress}%). Surveillance recommandée des approvisionnements sur site.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
