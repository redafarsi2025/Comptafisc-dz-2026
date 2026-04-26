
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Pickaxe, Plus, MapPin, 
  Users, Loader2, Edit3,
  ChevronRight, LayoutGrid
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function BtpProjectsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const projectsQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "projects"), orderBy("createdAt", "desc")) : null
  , [db, tenantId]);
  const { data: projects, isLoading } = useCollection(projectsQuery);

  const averageProgress = React.useMemo(() => {
    if (!projects?.length) return 0;
    const sum = projects.reduce((acc, p) => acc + (p.progress || 0), 0);
    return Math.round(sum / projects.length);
  }, [projects]);

  const totalBudget = React.useMemo(() => {
    if (!projects?.length) return 0;
    return projects.reduce((acc, p) => acc + (p.budget || 0), 0);
  }, [projects]);

  const activeCount = projects?.filter(p => p.status === 'IN_PROGRESS').length || 0;

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase leading-none">
            <Pickaxe className="text-accent h-8 w-8" /> Suivi de Chantiers
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.2em] mt-2">Pilotage opérationnel et financier des projets BTP</p>
        </div>
        <Button className="bg-primary shadow-xl shadow-primary/20 h-11 px-6 rounded-xl font-bold" disabled={!tenantId} asChild>
          <Link href={`/dashboard/btp/projects/manage?tenantId=${tenantId}`}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau Chantier
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Chantiers Actifs</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-black text-primary tracking-tighter">{activeCount} / {projects?.length || 0}</div></CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Avancement Moyen</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-black text-emerald-600 tracking-tighter">{averageProgress}%</div></CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Alertes Délais</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-black text-amber-600 tracking-tighter">0</div></CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center px-6 py-2">
          <div className="absolute top-0 right-0 p-4 opacity-10"><LayoutGrid className="h-16 w-16" /></div>
          <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1 relative">Budget Total Engagé</p>
          <div className="text-2xl font-black text-white relative">{(totalBudget / 1000000).toFixed(1)}M DA</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          <div className="col-span-full py-20 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary opacity-20" />
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Synchronisation du parc chantiers...</p>
          </div>
        ) : !projects?.length ? (
          <Card className="col-span-full border-dashed border-2 py-32 text-center bg-white rounded-3xl shadow-inner">
            <CardContent className="flex flex-col items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                <Pickaxe className="h-10 w-10 text-slate-200" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">Aucun chantier en cours</h3>
                <p className="text-sm text-slate-500">Ouvrez votre premier dossier technique pour lancer le suivi analytique.</p>
              </div>
              <Button className="mt-4 rounded-xl px-8" asChild>
                <Link href={`/dashboard/btp/projects/manage?tenantId=${tenantId}`}>
                  <Plus className="h-4 w-4 mr-2" /> Initialiser un projet
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="group hover:shadow-2xl transition-all border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
              <div className={`h-2 ${project.status === 'COMPLETED' ? 'bg-emerald-500' : project.status === 'ON_HOLD' ? 'bg-amber-500' : 'bg-primary'}`} />
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-primary/20 text-primary">{project.category || 'Bâtiment'}</Badge>
                  <Badge className={`text-white text-[8px] font-black uppercase ${
                    project.status === 'COMPLETED' ? 'bg-emerald-500' : 
                    project.status === 'ON_HOLD' ? 'bg-amber-500' : 
                    'bg-blue-500'
                  }`}>
                    {project.status === 'IN_PROGRESS' ? 'EN EXÉCUTION' : project.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tighter truncate group-hover:text-primary transition-colors">{project.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  <MapPin className="h-3 w-3" /> {project.location || 'Alger, DZ'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">Avancement Physique</span>
                    <span className="text-primary">{project.progress || 0}%</span>
                  </div>
                  <Progress value={project.progress || 0} className="h-1.5 bg-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Budget HT</p>
                    <p className="text-sm font-bold text-slate-900">{project.budget?.toLocaleString()} DA</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Consommé</p>
                    <p className="text-sm font-bold text-amber-600">{project.consumed?.toLocaleString()} DA</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t border-slate-50 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-slate-400" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter truncate w-24">{project.manager || 'Cdt Travaux'}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white border border-transparent hover:border-slate-200" asChild>
                    <Link href={`/dashboard/btp/projects/manage?tenantId=${tenantId}&id=${project.id}`}>
                      <Edit3 className="h-4 w-4 text-slate-400" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-primary hover:bg-white border border-transparent hover:border-slate-200" asChild>
                    <Link href={`/dashboard/btp/projects/${project.id}?tenantId=${tenantId}`}>
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
