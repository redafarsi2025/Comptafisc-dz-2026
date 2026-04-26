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
  Gauge, Activity, Loader2, Plus, ArrowRight, ShieldCheck
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function LogisticsDashboard() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  // ANALYTIQUE : Charger les dépenses par véhicule
  const entriesQuery = useMemoFirebase(() => 
    (db && tenantId) ? collection(db, "tenants", tenantId, "ecrituresAnalytiques") : null
  , [db, tenantId]);
  const { data: ecritures, isLoading } = useCollection(entriesQuery);

  if (!mounted) return null;

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
          <Button className="bg-primary shadow-xl h-11 px-6 rounded-xl font-bold">
            <Plus className="mr-2 h-4 w-4" /> Nouveau Véhicule
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl p-6 relative overflow-hidden flex flex-col justify-center">
           <div className="absolute top-0 right-0 p-4 opacity-10"><Gauge className="h-16 w-16" /></div>
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Coût au Kilomètre (Moyen)</p>
           <h2 className="text-3xl font-black">124.50 <span className="text-xs font-normal opacity-50">DA/KM</span></h2>
        </Card>
        
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Consommation Carburant</p>
           <h2 className="text-2xl font-black text-amber-600">1,240 L</h2>
           <p className="text-[9px] text-muted-foreground mt-1 uppercase font-bold">Mois de Février 2026</p>
        </Card>

        <Card className="border-l-4 border-l-primary shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Taux de Disponibilité</p>
           <h2 className="text-2xl font-black text-primary">92%</h2>
           <Progress value={92} className="h-1.5 mt-2" />
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 border border-l-4 border-l-emerald-500 p-6 flex items-center gap-4">
           <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
             <ShieldCheck className="h-6 w-6 text-emerald-600" />
           </div>
           <div>
             <p className="text-[10px] font-black text-emerald-800 uppercase leading-tight">Conformité</p>
             <p className="text-[11px] text-emerald-600 font-medium">Assurances & Contrôles OK</p>
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-xl border-none ring-1 ring-border rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b p-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest">Analyse de Rentabilité par Unité</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y">
                {[
                  { id: '1', name: 'CAMION RENAULT K440', plate: '01234-122-16', rev: 450000, cost: 120000, health: 85 },
                  { id: '2', name: 'TRACTEUR VOLVO FH', plate: '55643-124-31', rev: 620000, cost: 185000, health: 92 },
                  { id: '3', name: 'BUS HYUNDAI COUNTY', plate: '99812-115-09', rev: 280000, cost: 95000, health: 45 },
                ].map((v) => (
                  <div key={v.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Truck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-slate-900">{v.name}</p>
                        <p className="text-[9px] font-mono text-slate-400 font-bold uppercase">{v.plate}</p>
                      </div>
                    </div>
                    <div className="flex gap-12 items-center">
                       <div className="text-right">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Marge Nette</p>
                          <p className="text-sm font-black text-emerald-600">+{(v.rev - v.cost).toLocaleString()} DA</p>
                       </div>
                       <div className="w-24 space-y-1">
                          <div className="flex justify-between text-[8px] font-black uppercase">
                            <span>État</span>
                            <span className={v.health < 50 ? 'text-red-500' : 'text-emerald-500'}>{v.health}%</span>
                          </div>
                          <Progress value={v.health} className={cn("h-1", v.health < 50 ? "bg-red-100" : "bg-emerald-100")} />
                       </div>
                       <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                         <ArrowRight className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
           <Card className="bg-white border-none shadow-xl ring-1 ring-border rounded-2xl overflow-hidden">
             <CardHeader className="bg-amber-50 border-b border-amber-100 p-4">
                <CardTitle className="text-[10px] font-black uppercase text-amber-800 tracking-widest flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Maintenance à prévoir
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border space-y-3">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase">Vidange TRK-01</span>
                      <Badge className="bg-red-500 text-[8px] h-4">URGENT</Badge>
                   </div>
                   <p className="text-[10px] text-muted-foreground italic">Dépassement de 500 KM détecté via carnet de bord.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border space-y-3">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase">Assurance BUS-01</span>
                      <Badge variant="outline" className="text-[8px] h-4">J-12 JOURS</Badge>
                   </div>
                </div>
             </CardContent>
           </Card>

           <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4">
             <Activity className="h-6 w-6 text-accent shrink-0 mt-1" />
             <div className="text-[11px] leading-relaxed opacity-80 italic">
               "L'intégration analytique lie chaque ticket de carburant et chaque facture de pièce de rechange au véhicule concerné. Vous disposez d'un compte d'exploitation réel par unité de transport."
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}
