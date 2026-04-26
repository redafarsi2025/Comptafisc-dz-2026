
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Pickaxe, Plus, Search, MapPin, 
  Calendar, Users, HardHat, TrendingUp,
  Clock, CheckCircle2, AlertTriangle, Loader2
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"

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

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Pickaxe className="text-accent h-8 w-8" /> Suivi de Chantiers
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Pilotage opérationnel et financier des projets BTP</p>
        </div>
        <Button className="bg-primary shadow-lg" disabled={!tenantId}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau Chantier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Chantiers Actifs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-black text-primary">{projects?.length || 0}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Avancement Moyen</CardHeader>
          <CardContent><div className="text-2xl font-black text-emerald-600">64%</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Alertes Délais</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-black text-amber-600">2</div></CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-lg">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold opacity-70">Budget Engagé Total</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold">45.2M DA</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
        ) : !projects?.length ? (
          <Card className="col-span-full border-dashed border-2 py-20 text-center bg-muted/10">
            <p className="text-muted-foreground italic">Aucun chantier en cours de suivi.</p>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="group hover:shadow-2xl transition-all border-none ring-1 ring-border overflow-hidden bg-white">
              <div className="h-2 bg-primary" />
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest">{project.category || 'Bâtiment'}</Badge>
                  <Badge className="bg-emerald-500 text-white text-[8px]">EN COURS</Badge>
                </div>
                <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tighter truncate">{project.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 text-[10px] font-medium">
                  <MapPin className="h-3 w-3" /> {project.location || 'Alger, DZ'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span className="text-slate-500">Avancement Physique</span>
                    <span className="text-primary">{project.progress || 0}%</span>
                  </div>
                  <Progress value={project.progress || 0} className="h-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Budget</p>
                    <p className="text-sm font-bold">{project.budget?.toLocaleString()} DA</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Consommé</p>
                    <p className="text-sm font-bold text-amber-600">{project.consumed?.toLocaleString()} DA</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t p-3 flex justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-slate-400" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase">{project.manager || 'Cdt Travaux'}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest">
                  Accéder au dossier <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
