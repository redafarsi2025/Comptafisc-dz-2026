
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, Plus, Search, 
  Target, Phone, Mail, 
  Calendar, ArrowRight,
  TrendingUp, Star, Loader2, Sparkles
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"

export default function CrmDashboardPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const opportunitiesQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "opportunities"), orderBy("updatedAt", "desc")) : null
  , [db, tenantId]);
  const { data: leads, isLoading } = useCollection(opportunitiesQuery);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Target className="text-accent h-8 w-8" /> Pipeline Commercial
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Gestion de la relation client et prospection stratégique</p>
        </div>
        <Button className="bg-primary shadow-lg" disabled={!tenantId}>
          <Plus className="mr-2 h-4 w-4" /> Nouvelle Opportunité
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden p-6 flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="h-12 w-12 text-accent" /></div>
          <p className="text-[10px] font-black uppercase text-accent tracking-widest mb-1">Valeur du Pipeline</p>
          <h2 className="text-3xl font-black">15.2M DA</h2>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Prospects Chauds</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-blue-600">8</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Taux de Signature</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-emerald-600">22%</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Devis en attente</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-amber-600">14</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Kanban-like simple columns simulation */}
        {['QUALIFICATION', 'PROPOSITION', 'NÉGOCIATION', 'SIGNATURE'].map((stage) => (
          <div key={stage} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{stage}</h3>
              <Badge variant="secondary" className="text-[8px] h-4">
                {leads?.filter(l => l.stage === stage).length || 0}
              </Badge>
            </div>
            <div className="space-y-4">
               {isLoading ? (
                 <div className="h-20 bg-muted/20 animate-pulse rounded-xl" />
               ) : !leads?.length ? (
                 stage === 'QUALIFICATION' && <div className="p-4 border-2 border-dashed rounded-2xl text-center text-[10px] text-muted-foreground">Aucun lead</div>
               ) : (
                 leads.filter(l => l.stage === stage).map((lead) => (
                   <Card key={lead.id} className="border-none shadow-md ring-1 ring-border hover:ring-primary/30 transition-all cursor-pointer group">
                     <CardContent className="p-4 space-y-3">
                       <div className="flex justify-between items-start">
                         <h4 className="text-xs font-black uppercase tracking-tight truncate w-32">{lead.companyName}</h4>
                         <Star className={`h-3 w-3 ${lead.isHot ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                       </div>
                       <p className="text-[10px] text-muted-foreground font-bold">{lead.dealValue?.toLocaleString()} DA</p>
                       <div className="flex items-center gap-2 text-[8px] text-slate-400 mt-2">
                          <Phone className="h-2 w-2" /> {lead.contactPhone || 'N/A'}
                       </div>
                     </CardContent>
                     <CardFooter className="p-2 border-t bg-slate-50 flex justify-end">
                       <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100"><ArrowRight className="h-3 w-3" /></Button>
                     </CardFooter>
                   </Card>
                 ))
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
