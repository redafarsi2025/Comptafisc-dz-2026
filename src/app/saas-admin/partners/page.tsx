"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Briefcase, Plus, Search, TrendingUp, Handshake, Star, 
  Users, Layers, ArrowUpRight, Calculator, ShieldCheck,
  Target, Zap, Landmark, Loader2
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"

export default function ResellerPartners() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  React.useEffect(() => { setMounted(true) }, [])

  // On considère comme "Partenaires" les tenants ayant le plan CABINET
  const partnersQuery = useMemoFirebase(() => 
    db ? query(collection(db, "tenants"), where("plan", "==", "CABINET")) : null
  , [db]);
  const { data: partners, isLoading } = useCollection(partnersQuery);

  const allTenantsQuery = useMemoFirebase(() => db ? collection(db, "tenants") : null, [db]);
  const { data: allTenants } = useCollection(allTenantsQuery);

  // Simulation de calcul de portée indirecte (combien de dossiers par cabinet)
  const partnersStats = React.useMemo(() => {
    if (!partners || !allTenants) return [];
    return partners.map(p => {
      // Dans un cas réel, on compterait les dossiers liés par un champ 'managedByCabinetId'
      // Ici on simule une portée basée sur l'ancienneté du compte
      const reach = Math.floor(Math.random() * 40) + 10; 
      const health = 80 + Math.random() * 20;
      return { ...p, reach, health };
    }).sort((a, b) => b.reach - a.reach);
  }, [partners, allTenants]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <Handshake className="text-accent h-10 w-10" /> Gestion Partenariats
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Programme d'acquisition indirecte & Réseau de distribution</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-2xl border-slate-200 bg-white font-bold h-11 px-6 shadow-sm">
            Exporter le réseau
          </Button>
          <Button className="bg-primary shadow-xl shadow-primary/20 rounded-2xl h-11 px-8 font-black uppercase text-[10px] tracking-widest">
            <Plus className="mr-2 h-4 w-4" /> Recruter un Cabinet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-primary relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Portée Indirecte (Reach)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary tracking-tighter">
              {partnersStats.reduce((acc, curr) => acc + curr.reach, 0)} Dossiers
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest flex items-center gap-1">
              <Users className="h-3 w-3 text-primary" /> Clients gérés par les Cabinets
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Taux de Rétention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 tracking-tighter">98.4%</div>
            <div className="mt-3 space-y-1">
              <Progress value={98.4} className="h-1.5 bg-slate-100" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">CAC Indirect</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600 tracking-tighter">0.00 DA</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest italic">Coût d'acquisition via Cabinet</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <Landmark className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1 relative">Statut Stratégique</p>
           <div className="text-lg font-black text-white relative uppercase italic tracking-tighter">Dominance Marché</div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-2 shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
          <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Répertoire des Cabinets Partenaires</CardTitle>
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Surveillance de l'apport d'affaires par cabinet</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Chercher un cabinet..." 
                className="pl-10 h-10 w-64 rounded-2xl bg-white border-slate-200" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 px-8">Cabinet / Raison Sociale</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-center">Reach (Clients)</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-center">Score Qualité</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-right px-8">Status Stratégique</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></TableCell></TableRow>
                ) : partnersStats.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">Aucun partenaire Cabinet détecté.</TableCell></TableRow>
                ) : partnersStats.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50 transition-colors group h-20">
                    <TableCell className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 uppercase tracking-tight">{p.raisonSociale}</span>
                        <span className="text-[9px] font-mono font-bold text-slate-400">NIF: {p.nif || '---'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-6">
                       <Badge className="bg-primary text-white rounded-lg font-black text-xs h-7 px-4">
                         {p.reach} dossiers
                       </Badge>
                    </TableCell>
                    <TableCell className="py-6">
                       <div className="flex flex-col items-center gap-1.5">
                          <span className="text-[10px] font-black text-emerald-600">{Math.round(p.health)}/100</span>
                          <Progress value={p.health} className="w-16 h-1 bg-slate-100" />
                       </div>
                    </TableCell>
                    <TableCell className="text-right px-8 py-6">
                      <div className="flex items-center justify-end gap-2 text-amber-500 font-black text-[10px] uppercase italic">
                         <Star className="h-4 w-4 fill-current" /> Partenaire Gold
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-xl rounded-3xl p-6 relative overflow-hidden group">
            <Sparkles className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent group-hover:scale-110 transition-transform" />
            <CardHeader className="p-0 mb-6">
               <CardTitle className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                 <Zap className="h-4 w-4" /> Insight Business
               </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-6">
               <p className="text-sm font-medium leading-relaxed opacity-80 italic">
                 "Offrir le plan CABINET gratuitement vous a permis d'acquérir **{partnersStats.reduce((acc, curr) => acc + curr.reach, 0)} entreprises** indirectement ce mois-ci, sans coût publicitaire (CAC = 0)."
               </p>
               <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">Ratio de Levier</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-3xl font-black text-accent">1:25</span>
                     <span className="text-[9px] font-bold text-slate-400">1 Cabinet = 25 Clients</span>
                  </div>
               </div>
            </CardContent>
          </Card>

          <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-4">
             <Info className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
             <div className="text-[11px] text-blue-900 leading-relaxed font-medium">
               <p className="font-bold uppercase tracking-tight mb-1">Stratégie "Loss Leader" :</p>
               <p className="opacity-80 italic">
                 Le plan CABINET est votre produit d'appel. Votre bénéfice n'est pas le prix de l'abonnement du comptable, mais la **masse de données** et la **visibilité** au cœur de l'écosystème financier algérien.
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
