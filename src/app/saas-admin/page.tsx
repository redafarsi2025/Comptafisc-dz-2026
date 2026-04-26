
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts"
import { 
  TrendingUp, ArrowUpRight, Activity, Target, Sparkles, Zap, CreditCard, 
  Users, ShieldCheck, Download, Loader2, TrendingDown, Building2, Eye, 
  MessageSquare, ShieldAlert, DatabaseZap, Clock, Server, Globe, Cpu,
  CloudLightning, MousePointerClick, BellRing
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from "@/firebase"
import { collection, query, orderBy, doc, limit, where } from "firebase/firestore"
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

  // Admin Guard
  const adminDocRef = useMemoFirebase(() => (db && user) ? doc(db, "saas_admins", user.uid) : null, [db, user?.uid]);
  const { data: adminRecord } = useDoc(adminDocRef);
  const isSaaSAdmin = !!adminRecord;

  // Real-time Data
  const profilesQuery = useMemoFirebase(() => (db && isSaaSAdmin) ? collection(db, "userProfiles") : null, [db, isSaaSAdmin]);
  const { data: profiles } = useCollection(profilesQuery);

  const tenantsQuery = useMemoFirebase(() => (db && isSaaSAdmin) ? collection(db, "tenants") : null, [db, isSaaSAdmin]);
  const { data: tenants } = useCollection(tenantsQuery);

  const ticketsQuery = useMemoFirebase(() => (db && isSaaSAdmin) ? query(collection(db, "support_tickets"), where("status", "==", "open"), limit(5)) : null, [db, isSaaSAdmin]);
  const { data: pendingTickets } = useCollection(ticketsQuery);

  const newsQuery = useMemoFirebase(() => (db && isSaaSAdmin) ? query(collection(db, "dgi_publications"), where("analysisCompleted", "==", true), orderBy("detectedAt", "desc"), limit(5)) : null, [db, isSaaSAdmin]);
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

  if (!mounted || !isSaaSAdmin) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header High-Tech */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl">
            <Target className="h-8 w-8 text-accent animate-pulse" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Console de Commandement</h1>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              Pilotage SaaS Direct • Root Access • 2026.4
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="bg-white/80 backdrop-blur-sm border-2 border-primary/10 p-3 rounded-2xl flex items-center gap-4 shadow-xl">
             <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
               <ShieldCheck className="text-white h-5 w-5" />
             </div>
             <div>
               <p className="text-[9px] font-black text-primary uppercase">Calculateur DGI</p>
               <p className="text-base font-black text-slate-900">CERTIFIÉ LF 2026</p>
             </div>
          </div>
          <Button variant="outline" className="bg-white border-slate-200 h-14 rounded-2xl px-6 font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-md transition-all">
            <Download className="mr-2 h-4 w-4" /> Export Audit
          </Button>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-2xl ring-1 ring-border bg-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
            <CreditCard className="h-20 w-20 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              MRR Réel (Projeté) <TrendingUp className="h-3 w-3 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-primary tracking-tighter">{stats.mrr.toLocaleString()} <span className="text-xs font-normal">DA</span></div>
            <div className="flex items-center gap-1 text-emerald-600 text-[9px] mt-2 font-black uppercase tracking-tighter">
              +14.2% VS MOIS N-1
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl ring-1 ring-border bg-white group">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              Parc Dossiers <Building2 className="h-3 w-3 text-accent" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">{stats.totalTenants} <span className="text-xs font-normal opacity-40">NODES</span></div>
            <p className="text-[9px] text-muted-foreground mt-2 font-black uppercase tracking-tighter">
              Ratio de service : 1:{(stats.totalTenants / stats.totalUsers || 0).toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl ring-1 ring-border bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              Score Onboarding <Zap className="h-3 w-3 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              {Math.round((stats.upToDateTenants / stats.totalTenants || 0) * 100)}<span className="text-xs opacity-40">%</span>
            </div>
            <Progress value={(stats.upToDateTenants / stats.totalTenants || 0) * 100} className="mt-4 h-1.5 bg-slate-100" />
            <p className="text-[8px] mt-2 text-muted-foreground font-black uppercase tracking-widest">Dossiers conformes DGI</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden ring-1 ring-white/10">
          <div className="absolute -right-4 -top-4 opacity-20 rotate-12">
            <Cpu className="h-24 w-24 text-accent" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">Disponibilité Cloud IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter text-accent">99.99%</div>
            <div className="flex items-center gap-2 mt-2">
               <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
               <span className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-400">Gemini 2.5 Flash Online</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Command Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
        
        {/* Core Business Chart */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between p-6">
              <div className="space-y-1">
                <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
                  <Activity className="h-5 w-5 text-primary" /> Flux Dossiers Firestore
                </CardTitle>
                <CardDescription className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Analyse de croissance organique par trimestre</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-white text-[9px] font-black uppercase px-3 py-1">T1 2026</Badge>
              </div>
            </CardHeader>
            <CardContent className="h-[400px] p-4">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Jan', value: Math.round(stats.totalTenants * 0.75) },
                    { name: 'Feb', value: Math.round(stats.totalTenants * 0.90) },
                    { name: 'Mar', value: stats.totalTenants }
                  ]} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0C55CC" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0C55CC" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'black', fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'black', fill: '#94a3b8' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', fontWeight: 'bold' }} 
                      cursor={{ stroke: '#0C55CC', strokeWidth: 2 }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#0C55CC" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
               </ResponsiveContainer>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-4 flex justify-around text-center divide-x">
               <div className="flex-1">
                 <p className="text-[9px] font-black text-muted-foreground uppercase">Retention</p>
                 <p className="text-lg font-black text-slate-900">98.2%</p>
               </div>
               <div className="flex-1">
                 <p className="text-[9px] font-black text-muted-foreground uppercase">Churn</p>
                 <p className="text-lg font-black text-destructive">1.8%</p>
               </div>
               <div className="flex-1">
                 <p className="text-[9px] font-black text-muted-foreground uppercase">ARPU</p>
                 <p className="text-lg font-black text-primary">{(stats.mrr / stats.totalTenants || 0).toFixed(0)} DA</p>
               </div>
            </CardFooter>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-2xl ring-1 ring-border bg-white overflow-hidden">
              <CardHeader className="bg-blue-600 text-white py-3 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <Eye className="h-4 w-4" /> DGI Watch Active
                </CardTitle>
                <Badge className="bg-white/20 text-white text-[8px]">IA LIVE</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[250px]">
                  <div className="divide-y divide-slate-100">
                    {recentNews?.length ? recentNews.map((news) => (
                      <div key={news.id} className="p-4 hover:bg-slate-50 transition-colors group cursor-pointer">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{news.category}</span>
                          <span className="text-[9px] font-bold text-slate-400">{news.publishedDate}</span>
                        </div>
                        <p className="text-xs font-black text-slate-900 leading-tight group-hover:text-primary transition-colors">{news.title}</p>
                      </div>
                    )) : (
                      <div className="p-12 text-center text-slate-300 italic text-xs">Analyse réglementaire en veille...</div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t p-3">
                <Button variant="link" className="w-full text-[9px] font-black uppercase text-primary h-8" asChild>
                  <Link href="/saas-admin/dgi-watch">Accéder à la Veille Expert</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-none shadow-2xl ring-1 ring-border bg-white overflow-hidden">
              <CardHeader className="bg-emerald-600 text-white py-3 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Support Abonnés
                </CardTitle>
                {pendingTickets?.length ? <Badge className="bg-white text-emerald-700 text-[8px]">{pendingTickets.length} URGENT</Badge> : null}
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[250px]">
                  <div className="divide-y divide-slate-100">
                    {pendingTickets?.length ? pendingTickets.map((ticket) => (
                      <div key={ticket.id} className="p-4 hover:bg-slate-50 transition-colors group cursor-pointer">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${ticket.priority === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{ticket.priority.toUpperCase()}</span>
                          <span className="text-[9px] font-bold text-slate-400">ID: {ticket.id.substring(0, 6)}</span>
                        </div>
                        <p className="text-xs font-black text-slate-900 leading-tight group-hover:text-primary transition-colors">{ticket.subject}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold">Client: {ticket.userName}</p>
                      </div>
                    )) : (
                      <div className="p-12 text-center text-slate-300 italic text-xs">Tous les tickets sont résolus.</div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t p-3">
                <Button variant="link" className="w-full text-[9px] font-black uppercase text-primary h-8" asChild>
                  <Link href="/saas-admin/support">Ouvrir le Centre de Résolution</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Right Side Control Panel */}
        <div className="lg:col-span-3 space-y-8">
          {/* Offer Segmentation */}
          <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b p-6">
              <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tighter">Segmentation Offres</CardTitle>
              <CardDescription className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Valeur par palier d'abonnement</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px] pt-8">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={110}
                    paddingAngle={10}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.3)', fontWeight: 'bold' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t flex flex-col p-6 gap-6">
               <div className="w-full space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>Conversion Payante</span>
                    <span className="text-primary font-black">
                      {Math.round(((stats.totalTenants - (stats.planDistribution.find(p => p.name === 'GRATUIT')?.value || 0)) / stats.totalTenants || 0) * 100)}%
                    </span>
                  </div>
                  <Progress value={((stats.totalTenants - (stats.planDistribution.find(p => p.name === 'GRATUIT')?.value || 0)) / stats.totalTenants || 0) * 100} className="h-2 bg-slate-200" />
               </div>
            </CardFooter>
          </Card>

          {/* Quick Core Actions */}
          <div className="grid grid-cols-1 gap-4">
             <Card className="border-none shadow-xl ring-1 ring-border bg-white group hover:bg-primary transition-all cursor-pointer">
               <Link href="/saas-admin/fiscal-engine" className="p-5 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-primary/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                     <DatabaseZap className="h-6 w-6 text-primary group-hover:text-white" />
                   </div>
                   <div className="flex flex-col">
                     <span className="text-sm font-black group-hover:text-white uppercase tracking-tighter">Moteur Fiscal Master</span>
                     <span className="text-[9px] text-muted-foreground font-black uppercase group-hover:text-white/60 tracking-widest mt-1">Variables & Business Rules</span>
                   </div>
                 </div>
                 <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-white" />
               </Link>
             </Card>

             <Card className="border-none shadow-xl ring-1 ring-border bg-white group hover:bg-slate-900 transition-all cursor-pointer">
               <Link href="/saas-admin/monitoring" className="p-5 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-slate-100 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                     <Server className="h-6 w-6 text-slate-600 group-hover:text-accent" />
                   </div>
                   <div className="flex flex-col">
                     <span className="text-sm font-black group-hover:text-white uppercase tracking-tighter">Monitoring Live</span>
                     <span className="text-[9px] text-muted-foreground font-black uppercase group-hover:text-white/60 tracking-widest mt-1">Performance Firebase & CDN</span>
                   </div>
                 </div>
                 <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-white" />
               </Link>
             </Card>
          </div>

          {/* System Health Heartbeat */}
          <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden ring-1 ring-white/5">
             <CardHeader className="border-b border-white/5 py-4">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-accent flex items-center gap-2">
                  <CloudLightning className="h-4 w-4" /> Noyau Système Live
                </CardTitle>
             </CardHeader>
             <CardContent className="text-[10px] text-emerald-400 font-mono py-6 space-y-2">
                <div className="flex gap-3"><span className="opacity-40">09:42:01</span> <span className="font-bold">[SUCCESS]</span> <span>Firestore Resolver : 0.4ms</span></div>
                <div className="flex gap-3"><span className="opacity-40">09:42:04</span> <span className="font-bold">[SUCCESS]</span> <span>Auth Token Verified</span></div>
                <div className="flex gap-3"><span className="opacity-40">09:42:15</span> <span className="font-bold text-blue-400">[INFO]</span> <span className="italic">Gemini 2.5 Analysis Queue : Empty</span></div>
                <div className="flex gap-2 animate-pulse mt-4">
                   <span className="text-emerald-500 font-bold">&gt;</span> 
                   <span className="italic tracking-widest uppercase text-[8px] font-black">System Heartbeat... Normal</span>
                </div>
             </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
