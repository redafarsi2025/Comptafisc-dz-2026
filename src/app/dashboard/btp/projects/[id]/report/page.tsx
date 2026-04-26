"use client"

import * as React from "react"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Pickaxe, Printer, ChevronLeft, MapPin, 
  CalendarDays, Calculator, ShieldCheck, 
  Clock, History, FileText, Landmark, Loader2 
} from "lucide-react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import Link from "next/link"

export default function ProjectReportPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { id } = useParams()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const projectRef = useMemoFirebase(() => 
    (db && tenantId && id) ? doc(db, "tenants", tenantId, "projects", id as string) : null
  , [db, tenantId, id]);
  const { data: project, isLoading } = useDoc(projectRef);

  if (!mounted || isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>
  if (!project) return <div className="p-20 text-center">Projet introuvable.</div>

  const remainingBudget = (project.budget || 0) - (project.consumed || 0);
  const consumptionRate = project.budget > 0 ? (project.consumed / project.budget) * 100 : 0;
  const sortedTimeline = [...(project.timeline || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 print:p-0 print:space-y-4">
      {/* Header - Hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/btp/projects/${id}?tenantId=${tenantId}`}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Imprimer le Rapport
          </Button>
        </div>
      </div>

      {/* Official Report Document */}
      <div className="bg-white p-8 md:p-12 shadow-2xl border ring-1 ring-slate-200 rounded-3xl print:shadow-none print:border-none print:ring-0">
        
        {/* Document Header */}
        <div className="flex flex-col md:flex-row justify-between items-start border-b pb-8 mb-8 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg">
                <Pickaxe className="text-white h-5 w-5" />
              </div>
              <span className="text-xl font-black text-primary uppercase tracking-tighter">ComptaFisc-DZ</span>
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Rapport de Situation</h1>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="text-right space-y-1">
            <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase text-[10px]">Document Interne n°{id.substring(0,6)}</Badge>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-2 italic">Certifié conforme aux règles SCF</p>
          </div>
        </div>

        {/* Project Identity */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Identification du Chantier</h3>
            <div className="space-y-2">
              <p className="text-lg font-black text-primary uppercase leading-tight">{project.name}</p>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <MapPin className="h-3 w-3 text-slate-400" /> {project.location || 'Alger, DZ'}
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <Landmark className="h-3 w-3 text-slate-400" /> Marché : {project.clientRef || 'N/A'}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Planning & Équipe</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[8px] font-black uppercase text-slate-400">Date de début</p>
                <p className="text-xs font-bold">{project.startDate || 'Non spécifiée'}</p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase text-slate-400">Fin prévisionnelle</p>
                <p className="text-xs font-bold">{project.endDate || 'Non spécifiée'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[8px] font-black uppercase text-slate-400">Responsable Technique</p>
                <p className="text-xs font-bold">{project.manager || 'À définir'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Financial Summary */}
        <section className="mb-12">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2 mb-6">Bilan Financier du Projet (HT)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Budget Total Alloué</p>
              <p className="text-2xl font-black text-slate-900">{project.budget?.toLocaleString()} DA</p>
            </div>
            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-center">
              <p className="text-[8px] font-black uppercase text-amber-600 mb-1">Dépenses Consommées</p>
              <p className="text-2xl font-black text-amber-600">{project.consumed?.toLocaleString()} DA</p>
              <p className="text-[10px] font-bold text-amber-500 mt-1">{consumptionRate.toFixed(1)}% du budget</p>
            </div>
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
              <p className="text-[8px] font-black uppercase text-emerald-600 mb-1">Solde Restant</p>
              <p className="text-2xl font-black text-emerald-600">{remainingBudget.toLocaleString()} DA</p>
            </div>
          </div>
        </section>

        {/* Progress Analysis */}
        <section className="mb-12">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2 mb-6">Indice d'Avancement Physique</h3>
          <div className="space-y-4">
             <div className="flex justify-between items-end">
               <div className="space-y-1">
                 <p className="text-4xl font-black text-primary tracking-tighter">{project.progress}%</p>
                 <p className="text-[10px] font-bold uppercase text-slate-400">Pourcentage d'exécution certifié</p>
               </div>
               <div className="text-right">
                 {consumptionRate > project.progress ? (
                   <div className="flex items-center gap-1 text-destructive font-black text-[10px] uppercase">
                     <AlertTriangle className="h-3 w-3" /> Surconsommation budgétaire
                   </div>
                 ) : (
                   <div className="flex items-center gap-1 text-emerald-600 font-black text-[10px] uppercase">
                     <CheckCircle2 className="h-3 w-3" /> Maîtrise des coûts
                   </div>
                 )}
               </div>
             </div>
             <Progress value={project.progress} className="h-3 bg-slate-100" />
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-12">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2 mb-6">Journal des Jalons Techniques</h3>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="text-[9px] uppercase font-black">
                <TableHead className="w-1/4">Date de l'événement</TableHead>
                <TableHead>Désignation du Jalon</TableHead>
                <TableHead>Observations / Remarques</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTimeline.length > 0 ? sortedTimeline.map((ev) => (
                <TableRow key={ev.id} className="text-xs">
                  <TableCell className="font-mono text-slate-500">{new Date(ev.date).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className="font-bold uppercase tracking-tight">{ev.title}</TableCell>
                  <TableCell className="italic text-slate-500">{ev.description || "Aucun commentaire particulier."}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">Aucun jalon enregistré pour ce projet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>

        {/* Footer / Signatures */}
        <section className="mt-20 pt-8 border-t border-dashed border-slate-300">
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-16">
              <p className="text-[9px] font-black uppercase text-slate-400">Visa Chef de Projet</p>
              <div className="border-b w-full" />
            </div>
            <div className="space-y-16 text-right">
              <p className="text-[9px] font-black uppercase text-slate-400">Visa Direction Financière / DAF</p>
              <div className="border-b w-full ml-auto" />
            </div>
          </div>
          <div className="mt-12 text-center">
            <p className="text-[8px] text-slate-400 font-medium italic">
              Ce document a été généré via ComptaFisc-DZ v2.6. Toute modification manuelle invalide la certification logicielle.
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}
