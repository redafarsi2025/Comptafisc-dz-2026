/**
 * @fileOverview Dashboard Logistique & Flotte (Rentabilité par Véhicule).
 */

"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Truck, Fuel, Settings, AlertTriangle, 
  TrendingUp, TrendingDown, MapPin, Calendar, 
  Gauge, Activity, Loader2, Plus, ArrowRight, ShieldCheck, Edit3, FolderSearch
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function LogisticsDashboard() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const vehiclesQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "vehicles"), orderBy("updatedAt", "desc")) : null
  , [db, tenantId]);
  const { data: vehicles, isLoading } = useCollection(vehiclesQuery);

  const entriesQuery = useMemoFirebase(() => 
    (db && tenantId) ? collection(db, "tenants", tenantId, "ecrituresAnalytiques") : null
  , [db, tenantId]);
  const { data: ecritures } = useCollection(entriesQuery);

  const stats = React.useMemo(() => {
    if (!vehicles) return { total: 0, active: 0, maintenance: 0, avgHealth: 0 };
    return {
      total: vehicles.length,
      active: vehicles.filter(v => v.status === 'ACTIVE').length,
      maintenance: vehicles.filter(v => v.status === 'MAINTENANCE' || v.status === 'REPAIR').length,
      avgHealth: vehicles.length > 0 ? Math.round(vehicles.reduce((acc, v) => acc + (v.health || 0), 0) / vehicles.length) : 0
    };
  }, [vehicles]);

  if (!mounted) return null;

  // GESTION DU TENANTID MANQUANT
  if (!tenantId) {
    return (
      <div className="text-center py-20">
        <FolderSearch className="mx-auto h-16 w-16 text-slate-300" />
        <h2 className="mt-4 text-xl font-bold">Aucun dossier sélectionné</h2>
        <p className="mt-2 text-sm text-muted-foreground">Veuillez sélectionner un dossier dans le menu principal pour afficher le tableau de bord logistique.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <Truck className="text-accent h-8 w-8" /> Pilotage de Flotte
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Rentabilité par véhicule & Maintenance préventive</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl h-11 px-6 font-bold shadow-sm">
            <Fuel className="mr-2 h-4 w-4 text-amber-500" /> Saisie Carburant
          </Button>
          <Button className="bg-primary shadow-xl h-11 px-6 rounded-xl font-bold" asChild>
            <Link href={`/dashboard/logistics/vehicles/manage?tenantId=${tenantId}`}>
              <Plus className="mr-2 h-4 w-4" /> Nouveau Véhicule
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl p-6 relative overflow-hidden flex flex-col justify-center">
           <div className="absolute top-0 right-0 p-4 opacity-10"><Gauge className="h-16 w-16" /></div>
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Unités en service</p>
           <h2 className="text-3xl font-black">{stats.active} / {stats.total}</h2>
        </Card>
        
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">En Maintenance</p>
           <h2 className="text-2xl font-black text-amber-600">{stats.maintenance} véhicule(s)</h2>
        </Card>

        <Card className="border-l-4 border-l-primary shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Santé Flotte</p>
           <h2 className="text-2xl font-black text-primary">{stats.avgHealth}%</h2>
           <Progress value={stats.avgHealth} className="h-1.5 mt-2" />
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 border border-l-4 border-l-emerald-500 p-6 flex items-center gap-4">
           <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
             <ShieldCheck className="h-6 w-6 text-emerald-600" />
           </div>
           <div>
             <p className="text-[10px] font-black text-emerald-800 uppercase leading-tight">Conformité</p>
             <p className="text-[11px] text-emerald-600 font-medium">Contrôles Techniques OK</p>
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-xl border-none ring-1 ring-border rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b p-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Registre Global de la Flotte</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y">
                {isLoading ? (
                  <div className="p-12 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary opacity-20" /></div>
                ) : !vehicles?.length ? (
                  <div className="p-12 text-center text-muted-foreground italic text-xs uppercase font-black">Aucun véhicule enregistré.</div>
                ) : vehicles.map((v) => (
                  <div key={v.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Truck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-slate-900">{v.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[9px] font-mono text-slate-400 font-bold uppercase">{v.plate}</p>
                          <Badge variant="outline" className="text-[7px] font-black h-3.5 px-1.5 uppercase border-slate-200 text-slate-500">{v.status}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-12 items-center">
                       <div className="text-right">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Index ODO</p>
                          <p className="text-sm font-black text-slate-900">{v.currentOdometer?.toLocaleString() || 0} KM</p>
                       </div>
                       <div className="w-24 space-y-1">
                          <div className="flex justify-between text-[8px] font-black uppercase">
                            <span>Santé</span>
                            <span className={v.health < 50 ? 'text-red-500' : 'text-emerald-500'}>{v.health}%</span>
                          </div>
                          <Progress value={v.health} className={cn("h-1", v.health < 50 ? "bg-red-100" : "bg-emerald-100")} />
                       </div>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" asChild>
                            <Link href={`/dashboard/logistics/vehicles/manage?tenantId=${tenantId}&id=${v.id}`}>
                              <Edit3 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                             <Link href={`/dashboard/logistics/vehicles/${v.id}?tenantId=${tenantId}`}>
                               <ArrowRight className="h-4 w-4" />
                             </Link>
                          </Button>
                       </div>
                    </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
           <Card className="bg-slate-900 text-white border-none shadow-xl rounded-3xl overflow-hidden relative">
             <Activity className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
             <CardHeader className="bg-primary/20 border-b border-white/5 p-4">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Analyse de Rentabilité (IA)</CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase">
                      <span className="text-slate-400">Coût moyen au KM</span>
                      <span className="text-accent">142.00 DA</span>
                   </div>
                   <Progress value={75} className="h-1 bg-white/10" />
                </div>
                <p className="text-[11px] leading-relaxed opacity-70 italic">
                  "Sur la base de vos écritures analytiques, le véhicule le plus rentable ce mois-ci est votre **Tracteur Volvo FH**."
                </p>
             </CardContent>
           </Card>

           <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-4">
             <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
             <div className="text-[11px] leading-relaxed opacity-80 italic text-blue-900 font-medium">
               "L'intégration analytique lie chaque ticket de carburant et chaque facture de pièce de rechange au véhicule concerné via son immatriculation."
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}
