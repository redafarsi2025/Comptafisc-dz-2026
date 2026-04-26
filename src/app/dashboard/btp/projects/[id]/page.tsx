"use client"

import * as React from "react"
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { doc, arrayUnion, collection, query, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Pickaxe, ChevronLeft, CalendarDays, 
  MapPin, Users, TrendingUp, Calculator, 
  ShieldCheck, AlertTriangle, Clock, History,
  FileText, HardHat, Loader2, Edit3, CheckCircle2, Plus, 
  Save, Trash2, PieChart, ArrowUpRight, ArrowDownRight, Wallet, Link2, Search, Link2Off, Info
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
  const { id } = useParams()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isEventDialogOpen, setIsEventDialogOpen] = React.useState(false)
  const [isAddingEvent, setIsAddingEvent] = React.useState(false)
  const [isLinking, setIsLinking] = React.useState<string | null>(null)
  
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

  // ANALYTIQUE : Charger TOUTES les écritures pour le rapprochement
  const allEntriesQuery = useMemoFirebase(() => {
    if (!db || !tenantId) return null;
    return query(collection(db, "tenants", tenantId, "journal_entries"));
  }, [db, tenantId]);
  const { data: allEntries, isLoading: isEntriesLoading } = useCollection(allEntriesQuery);

  const { linkedEntries, unlinkedEntries, analyticMetrics } = React.useMemo(() => {
    const linked: any[] = [];
    const unlinked: any[] = [];
    let charges = 0;
    let revenus = 0;

    if (!allEntries || !id) return { 
      linkedEntries: [], 
      unlinkedEntries: [], 
      analyticMetrics: { charges: 0, revenus: 0, marge: 0, tauxMarge: 0 } 
    };

    allEntries.forEach(entry => {
      let isLinkedToThisProject = false;
      let hasUnlinkedPotential = false;

      entry.lines.forEach((line: any) => {
        if (line.projectId === id) {
          isLinkedToThisProject = true;
          if (line.accountCode.startsWith('6')) charges += (line.debit - line.credit);
          if (line.accountCode.startsWith('7')) revenus += (line.credit - line.debit);
        } else if (!line.projectId || line.projectId === "") {
          // Candidat potentiel si c'est une charge ou produit et que ce n'est pas lié
          if (line.accountCode.startsWith('6') || line.accountCode.startsWith('7')) {
            hasUnlinkedPotential = true;
          }
        }
      });

      if (isLinkedToThisProject) linked.push(entry);
      else if (hasUnlinkedPotential) unlinked.push(entry);
    });

    return { 
      linkedEntries: linked,
      unlinkedEntries: unlinked,
      analyticMetrics: { 
        charges, 
        revenus, 
        marge: revenus - charges,
        tauxMarge: revenus > 0 ? ((revenus - charges) / revenus) * 100 : 0
      }
    };
  }, [allEntries, id]);

  const handleLinkEntry = async (entryId: string) => {
    if (!db || !tenantId || !id) return;
    setIsLinking(entryId);
    
    try {
      const entry = allEntries?.find(e => e.id === entryId);
      if (!entry) return;

      const updatedLines = entry.lines.map((l: any) => ({
        ...l,
        projectId: (l.accountCode.startsWith('6') || l.accountCode.startsWith('7')) ? id : (l.projectId || "")
      }));

      await updateDocumentNonBlocking(doc(db, "tenants", tenantId, "journal_entries", entryId), {
        lines: updatedLines,
        updatedAt: new Date().toISOString()
      });

      toast({ title: "Écriture liée", description: "La pièce comptable a été affectée au projet." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur de liaison" });
    } finally {
      setIsLinking(null);
    }
  };

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
          <Button className="bg-primary shadow-xl h-11 px-6 rounded-xl font-bold" asChild>
            <Link href={`/dashboard/btp/projects/${id}/report?tenantId=${tenantId}`}>
              <FileText className="mr-2 h-4 w-4" /> Rapport de Situation
            </Link>
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
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Dépenses Réelles (Journal)</p>
           <h2 className="text-2xl font-black text-amber-600">{analyticMetrics.charges.toLocaleString()} DA</h2>
           <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase">
              <span className="opacity-60">Consommation Analytique</span>
              <span className={analyticMetrics.charges > (project.budget || 0) ? 'text-destructive' : 'text-amber-600'}>
                {project.budget > 0 ? ((analyticMetrics.charges / project.budget) * 100).toFixed(1) : 0}%
              </span>
           </div>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Marge Réelle Chantier</p>
           <h2 className={`text-2xl font-black ${analyticMetrics.marge >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
             {analyticMetrics.marge.toLocaleString()} DA
           </h2>
           <p className="text-[9px] font-bold text-slate-400 mt-1">Rentabilité : {analyticMetrics.tauxMarge.toFixed(1)}%</p>
        </Card>
        <Card className="bg-primary text-white border-none shadow-xl p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-black opacity-70 mb-1">Avancement Physique</p>
           <h2 className="text-3xl font-black">{project.progress}%</h2>
           <Progress value={project.progress} className="h-1.5 bg-white/20 mt-2" />
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-2xl h-auto mb-8">
          <TabsTrigger value="overview" className="py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-widest">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="conciliation" className="py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-widest relative">
            Conciliation Analytique
            {unlinkedEntries.length > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-white rounded-full flex items-center justify-center text-[10px] border-2 border-background animate-pulse">{unlinkedEntries.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-primary" /> Ventilation Analytique SCF
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b pb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center"><ArrowUpRight className="h-5 w-5 text-blue-600" /></div>
                            <div><p className="text-xs font-black uppercase">Ventes (Situations)</p><p className="text-[10px] text-slate-400 font-bold">Produits Classe 7</p></div>
                          </div>
                          <span className="text-lg font-black text-blue-600">+{analyticMetrics.revenus.toLocaleString()} DA</span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center"><ArrowDownRight className="h-5 w-5 text-red-600" /></div>
                            <div><p className="text-xs font-black uppercase">Charges Directes</p><p className="text-[10px] text-slate-400 font-bold">Achats Classe 6</p></div>
                          </div>
                          <span className="text-lg font-black text-red-600">-{analyticMetrics.charges.toLocaleString()} DA</span>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <p className="text-sm font-black uppercase tracking-tighter">Résultat de Chantier HT</p>
                          <Badge className={`h-8 px-4 text-sm font-black ${analyticMetrics.marge >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {analyticMetrics.marge.toLocaleString()} DA
                          </Badge>
                        </div>
                      </div>
                      <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden flex flex-col justify-center">
                        <ShieldCheck className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 text-accent" />
                        <h4 className="text-[10px] font-black text-accent uppercase tracking-widest mb-4">Note Master Analytique</h4>
                        <p className="text-[11px] leading-relaxed italic opacity-80">
                          "Votre marge est calculée par rapprochement des comptes de produits (701) et charges (60/61/62) tagués avec cet ID Projet. L'écart entre l'avancement physique ({project.progress}%) et la marge comptable ({analyticMetrics.tauxMarge.toFixed(1)}%) indique votre niveau d'efficience réelle."
                        </p>
                      </div>
                  </div>
                </CardContent>
              </Card>

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
                      <div className="py-12 text-center text-muted-foreground italic text-xs">
                        Aucun jalon enregistré pour ce chantier.
                      </div>
                    )}
                  </div>
                </CardContent>
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
                </CardContent>
              </Card>

              <Card className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 relative overflow-hidden">
                <ShieldCheck className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 text-emerald-600" />
                <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2">Expertise BTP ComptaFisc</h4>
                <p className="text-[11px] text-emerald-700 leading-relaxed italic">
                  "La ventilation analytique permet d'isoler les coûts réels et de justifier vos situations auprès du Maître d'Ouvrage."
                </p>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="conciliation" className="animate-in fade-in duration-500 space-y-6">
          <Card className="border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-amber-50 border-b border-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black uppercase text-amber-900 flex items-center gap-2">
                    <Link2 className="h-5 w-5" /> Rapprochement Analytique Master
                  </CardTitle>
                  <CardDescription className="text-amber-700 text-xs font-medium">
                    Détection des écritures orphelines pouvant appartenir à ce projet (Classe 6 et 7).
                  </CardDescription>
                </div>
                <Badge className="bg-amber-200 text-amber-900 border-none font-black">{unlinkedEntries.length} ÉCRITURES À LIER</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="text-[10px] uppercase font-black">
                    <TableHead className="pl-6">Date / Réf</TableHead>
                    <TableHead>Libellé Écriture</TableHead>
                    <TableHead className="text-right">Montant HT</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isEntriesLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="animate-spin h-6 w-6 mx-auto text-amber-500" /></TableCell></TableRow>
                  ) : unlinkedEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20">
                        <div className="flex flex-col items-center gap-2 opacity-30">
                          <Link2Off className="h-12 w-12" />
                          <p className="text-xs font-bold uppercase">Aucune écriture orpheline détectée.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    unlinkedEntries.map((entry) => {
                      const amountHT = entry.lines.reduce((s: number, l: any) => 
                        (l.accountCode.startsWith('6') || l.accountCode.startsWith('7')) ? s + Math.abs(l.debit - l.credit) : s, 0
                      );
                      return (
                        <TableRow key={entry.id} className="hover:bg-amber-50/30 group">
                          <TableCell className="pl-6 text-xs font-mono">
                            <div className="flex flex-col">
                              <span>{new Date(entry.entryDate).toLocaleDateString()}</span>
                              <span className="text-[9px] text-muted-foreground uppercase">{entry.documentReference}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{entry.description}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">{amountHT.toLocaleString()} DA</TableCell>
                          <TableCell className="text-center">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-[9px] font-black uppercase border-amber-200 text-amber-700 hover:bg-amber-50"
                              onClick={() => handleLinkEntry(entry.id)}
                              disabled={isLinking === entry.id}
                            >
                              {isLinking === entry.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Link2 className="h-3 w-3 mr-1" />}
                              Lier au projet
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4">
            <Info className="h-6 w-6 text-accent shrink-0" />
            <div className="text-[11px] leading-relaxed opacity-80 italic">
              "L'outil de conciliation recherche les écritures de charges (Classe 6) et de revenus (Classe 7) dont le champ 'projectId' est vide. En liant ces écritures, vous mettez à jour votre marge analytique sans avoir à ressaisir votre comptabilité."
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
