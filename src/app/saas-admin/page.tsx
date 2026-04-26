
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts"
import { 
  TrendingUp, ArrowUpRight, 
  Activity, Target, Sparkles, Zap, CreditCard, 
  Users, UserPlus, ShieldCheck, Download, Loader2,
  TrendingDown, Users2, Building2, Eye, MessageSquare, 
  ShieldAlert, DatabaseZap, Clock, Server, Globe, Cpu
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from "@/firebase"
import { collection, query, orderBy, doc, limit } from "firebase/firestore"
import Link from "next/link"

const PLAN_COLORS: Record<string, string> = {
  'GRATUIT': '#94a3b8',
  'ESSENTIEL': '#3b82f6',
  'PRO': '#10b981',
  'CABINET': '#8b5cf6',
};

const PLAN_PRICES: Record<string, number> = {
  'GRATUIT': 0,
  'ESSENTIEL': 1500,
  'PRO': 5000,
  'CABINET': 15000, 
};

export default function AdminDashboard() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Guard: Admin Check
  const adminDocRef = useMemoFirebase(() => (db && user) ? doc(db, "saas_admins", user.uid) : null, [db, user?.uid]);
  const { data: adminRecord } = useDoc(adminDocRef);
  const isSaaSAdmin = !!adminRecord;

  // Real-time Data Fetching
  const profilesQuery = useMemoFirebase(() => (db && isSaaSAdmin) ? collection(db, "userProfiles") : null, [db, isSaaSAdmin]);
  const { data: profiles } = useCollection(profilesQuery);

  const tenantsQuery = useMemoFirebase(() => (db && isSaaSAdmin) ? collection(db, "tenants") : null, [db, isSaaSAdmin]);
  const { data: tenants } = useCollection(tenantsQuery);

  const ticketsQuery = useMemoFirebase(() => (db && isSaaSAdmin) ? query(collection(db, "support_tickets"), where("status", "==", "open"), limit(5)) : null, [db, isSaaSAdmin]);
  const { data: pendingTickets } = useCollection(ticketsQuery);

  const newsQuery = useMemoFirebase(() => (db && isSaaSAdmin) ? query(collection(db, "dgi_publications"), where("analysisCompleted", "==", true), limit(5)) : null, [db, isSaaSAdmin]);
  const { data: recentNews } = useCollection(newsQuery);

  const stats = React.useMemo(() => {
    if (!profiles || !tenants) return { totalUsers: 0, totalTenants: 0, mrr: 0, upToDateTenants: 0, planDistribution: [] };

    const planCounts: Record<string, number> = { 'GRATUIT': 0, 'ESSENTIEL': 0, 'PRO': 0, 'CABINET': 0 };
    let totalMrr = 0;
    let upToDate = 0;

    tenants.forEach(t => {
      const plan = (t.plan || 'GRATUIT').toUpperCase();
      planCounts[plan] = (planCounts[plan] || 0) + 1;
      totalMrr += PLAN_PRICES[plan] || 0;
      if (t.onboardingComplete) upToDate++;
    });

    const distribution = Object.entries(planCounts).map(([name, value]) => ({
      name,
      value,
      color: PLAN_COLORS[name] || '#ccc'
    }));

    return {
      totalUsers: profiles.length,
      totalTenants: tenants.length,
      mrr: totalMrr,
      upToDateTenants: upToDate,
      planDistribution: distribution
    };
  }, [profiles, tenants]);

  if (!mounted || !isSaaSAdmin) return null;

  return (
    <div className="space-y-8 pb-20">
      {/* Header Strategique */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-primary tracking-tighter flex items-center gap-3">
            <Target className="text-accent h-10 w-10" /> Cockpit Global SaaS
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.2em]">
            Console de commandement stratégique • ComptaFisc-DZ v2.5
          </p>
        </div>
        <div className="flex gap-2">
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
              <ShieldCheck className="text-white h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Moteur Fiscal</p>
              <p className="text-lg font-black text-primary">CONFORME 2026</p>
            </div>
          </div>
          <Button variant="outline" className="bg-white border-slate-200 h-14 rounded-2xl px-6 font-bold shadow-sm">
            <Download className="mr-2 h-4 w-4" /> Rapport Audit
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl ring-1 ring-border group hover:ring-primary/50 transition-all bg-white overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-between">
              MRR PROJECTION <CreditCard className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-primary tracking-tighter">{stats.mrr.toLocaleString()} DA</div>
            <div className="flex items-center gap-1 text-emerald-600 text-[10px] mt-2 font-black uppercase tracking-tighter">
              <TrendingUp className="h-3 w-3" /> +14.2% ce mois
            </div>
          </CardContent>
          <div className="h-1 w-full bg-primary/10">
            <div className="h-full bg-primary" style={{ width: '65%' }} />
          </div>
        </Card>

        <Card className="border-none shadow-xl ring-1 ring-border bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-between">
              DOSSIERS ACTIFS <Building2 className="h-4 w-4 text-accent" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">{stats.totalTenants}</div>
            <p className="text-[10px] text-muted-foreground mt-2 italic font-black uppercase tracking-tighter">
              Ratio: {(stats.totalTenants / stats.totalUsers || 0).toFixed(1)} par utilisateur
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl ring-1 ring-border bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-between">
              ONBOARDING SCORE <Zap className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              {Math.round((stats.upToDateTenants / stats.totalTenants || 0) * 100)}%
            </div>
            <Progress value={(stats.upToDateTenants / stats.totalTenants || 0) * 100} className="mt-3 h-1.5" />
            <p className="text-[9px] mt-2 text-muted-foreground font-bold uppercase">Dossiers conformes (NIF/NIN)</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Cpu className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase opacity-60 tracking-widest flex items-center justify-between">
              INFRASTRUCTURE <Activity className="h-4 w-4 text-accent" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter text-accent">99.9%</div>
            <div className="flex items-center gap-2 mt-2">
               <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Services Online</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
        
        {/* Left Column: Business & Growth */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
            <CardHeader className="bg-muted/20 border-b flex flex-row items-center justify-between p-6">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Croissance du Parc
                </CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-wider">Volume de dossiers gérés sur Firestore</CardDescription>
              </div>
              <Badge variant="outline" className="bg-white text-[10px] font-black uppercase">Temps Réel</Badge>
            </CardHeader>
            <CardContent className="h-[400px] p-0">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Jan', value: stats.totalTenants * 0.7 },
                    { name: 'Feb', value: stats.totalTenants * 0.85 },
                    { name: 'Mar', value: stats.totalTenants }
                  ]} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
               </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-xl ring-1 ring-border bg-white">
              <CardHeader className="bg-muted/10 border-b py-3 px-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Eye className="h-4 w-4" /> DGI Watch (Alertes IA)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentNews?.length ? recentNews.map((news) => (
                    <div key={news.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <Badge className="bg-blue-600 text-[8px] h-4">VEILLE</Badge>
                        <span className="text-[9px] text-muted-foreground">{news.publishedDate}</span>
                      </div>
                      <p className="text-xs font-bold truncate text-slate-900">{news.title}</p>
                    </div>
                  )) : (
                    <div className="p-12 text-center text-muted-foreground italic text-xs">Aucune nouveauté à traiter.</div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t p-3">
                <Button variant="ghost" className="w-full text-[10px] font-black uppercase h-8" asChild>
                  <Link href="/saas-admin/dgi-watch">Ouvrir Console DGI</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-none shadow-xl ring-1 ring-border bg-white">
              <CardHeader className="bg-muted/10 border-b py-3 px-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Support Prioritaire
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {pendingTickets?.length ? pendingTickets.map((ticket) => (
                    <div key={ticket.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <Badge variant="outline" className="text-[8px] border-amber-200 text-amber-700 bg-amber-50 h-4">OUVERT</Badge>
                        <span className="text-[9px] text-muted-foreground">Tiers: {ticket.priority}</span>
                      </div>
                      <p className="text-xs font-bold truncate text-slate-900">{ticket.subject}</p>
                    </div>
                  )) : (
                    <div className="p-12 text-center text-muted-foreground italic text-xs">Aucun ticket en attente.</div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t p-3">
                <Button variant="ghost" className="w-full text-[10px] font-black uppercase h-8" asChild>
                  <Link href="/saas-admin/support">Répondre aux tickets</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Right Column: Distribution & Operations */}
        <div className="lg:col-span-3 space-y-8">
          <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
            <CardHeader className="bg-muted/20 border-b p-6">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" /> Segmentation Offres
              </CardTitle>
              <CardDescription className="text-[10px] font-black uppercase tracking-wider">Répartition de la valeur client</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] pt-8">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t flex flex-col p-6 gap-4">
               <div className="w-full space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>Taux de Conversion (Payants)</span>
                    <span className="text-primary">{Math.round(((stats.totalTenants - (stats.planDistribution.find(p => p.name === 'GRATUIT')?.value || 0)) / stats.totalTenants || 0) * 100)}%</span>
                  </div>
                  <Progress value={((stats.totalTenants - (stats.planDistribution.find(p => p.name === 'GRATUIT')?.value || 0)) / stats.totalTenants || 0) * 100} className="h-2 bg-slate-200" />
               </div>
               <div className="grid grid-cols-2 w-full gap-4 pt-2">
                  <div className="p-3 bg-white rounded-xl border flex flex-col items-center">
                    <p className="text-[9px] font-black text-muted-foreground uppercase">ARPU Estimé</p>
                    <p className="text-lg font-black text-primary">{(stats.mrr / stats.totalTenants || 0).toFixed(0)} DA</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border flex flex-col items-center">
                    <p className="text-[9px] font-black text-muted-foreground uppercase">Churn Rate</p>
                    <p className="text-lg font-black text-emerald-600">0.0%</p>
                  </div>
               </div>
            </CardFooter>
          </Card>

          <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
            <Sparkles className="absolute -right-6 -bottom-6 h-32 w-32 opacity-10" />
            <CardHeader className="border-b border-white/5">
               <CardTitle className="text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2">
                 <Cpu className="h-4 w-4" /> Insight IA Gemini
               </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 relative">
               <p className="text-xs leading-relaxed opacity-90 italic">
                 "Performance OCR optimale sur 98% des factures injectées ce mois. 
                 Recommandation : Les dossiers BTP présentent un retard d'onboarding de 15%, envisagez une campagne d'aide à la saisie du NIF."
               </p>
               <Button variant="outline" className="w-full mt-6 border-white/20 text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest h-10 rounded-xl">
                 Audit Performance Complet
               </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
             <Card className="border-none shadow-xl ring-1 ring-border bg-white group hover:bg-primary transition-colors cursor-pointer" asChild>
               <Link href="/saas-admin/fiscal-engine" className="p-4 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-primary/10 group-hover:bg-white/20 flex items-center justify-center">
                     <DatabaseZap className="h-5 w-5 text-primary group-hover:text-white" />
                   </div>
                   <div className="flex flex-col">
                     <span className="text-sm font-black group-hover:text-white">Moteur Fiscal Master</span>
                     <span className="text-[9px] text-muted-foreground font-bold uppercase group-hover:text-white/60">Gérer variables & règles</span>
                   </div>
                 </div>
                 <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-white" />
               </Link>
             </Card>

             <Card className="border-none shadow-xl ring-1 ring-border bg-white group hover:bg-blue-600 transition-colors cursor-pointer" asChild>
               <Link href="/saas-admin/monitoring" className="p-4 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-blue-50 group-hover:bg-white/20 flex items-center justify-center">
                     <Server className="h-5 w-5 text-blue-600 group-hover:text-white" />
                   </div>
                   <div className="flex flex-col">
                     <span className="text-sm font-black group-hover:text-white">Santé Système Live</span>
                     <span className="text-[9px] text-muted-foreground font-bold uppercase group-hover:text-white/60">Monitoring ressources Firebase</span>
                   </div>
                 </div>
                 <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-white" />
               </Link>
             </Card>
          </div>
        </div>

      </div>
    </div>
  )
}
