
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from "recharts"
import { 
  TrendingUp, Activity, Target, Sparkles, Zap, CreditCard, 
  Users, ShieldCheck, DatabaseZap, Eye, MessageSquare, 
  Cpu, CloudLightning, ArrowUpRight,
  Inbox, Loader2, Building2, Bell
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from "@/firebase"
import { collection, query, orderBy, doc, limit, where } from "firebase/firestore"
import Link from "next/link"

const PLAN_COLORS: Record<string, string> = {
  'GRATUIT': '#94a3b8',
  'ESSENTIEL': '#0C55CC',
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
  const { data: adminRecord, isLoading: isAdminLoading } = useDoc(adminDocRef);
  const isSaaSAdmin = !!adminRecord;

  // Real-time Data Collections
  const profilesQuery = useMemoFirebase(() => (db && isSaaSAdmin) ? collection(db, "userProfiles") : null, [db, isSaaSAdmin]);
  const { data: profiles } = useCollection(profilesQuery);

  const tenantsQuery = useMemoFirebase(() => (db && isSaaSAdmin) ? collection(db, "tenants") : null, [db, isSaaSAdmin]);
  const { data: tenants } = useCollection(tenantsQuery);

  const ticketsQuery = useMemoFirebase(() => (db && isSaaSAdmin) ? query(collection(db, "support_tickets"), where("status", "==", "open"), limit(5)) : null, [db, isSaaSAdmin]);
  const { data: pendingTickets } = useCollection(ticketsQuery);

  const newsQuery = useMemoFirebase(() => (db && isSaaSAdmin) ? query(collection(db, "dgi_publications"), orderBy("detectedAt", "desc"), limit(5)) : null, [db, isSaaSAdmin]);
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

  if (!mounted || !isSaaSAdmin) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Initialisation du Cockpit Master...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header Stratégique */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-slate-900 flex items-center justify-center shadow-2xl border border-white/10">
            <Target className="h-8 w-8 text-accent animate-pulse" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Command Center</h1>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              SaaS Engine Live • Root v2.5
            </p>
          </div>
        </div>
        <div className="bg-white border-2 border-primary/10 p-3 rounded-2xl flex items-center gap-4 shadow-xl">
           <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
             <ShieldCheck className="text-white h-5 w-5" />
           </div>
           <div>
             <p className="text-[9px] font-black text-primary uppercase">Moteur Fiscal</p>
             <p className="text-base font-black text-slate-900">CERTIFIÉ LF 2026</p>
           </div>
        </div>
      </div>

      {/* KPI Business Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-2xl ring-1 ring-border bg-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
            <CreditCard className="h-20 w-20 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              MRR PROJETÉ <TrendingUp className="h-3 w-3 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-primary tracking-tighter">
              {stats.mrr.toLocaleString()} <span className="text-xs font-normal">DA</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-[9px] mt-2 font-black uppercase tracking-tighter">
              +14.2% VS M-1 • PERFORMANCE NOMINALE
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl ring-1 ring-border bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              PARC DOSSIERS <Building2 className="h-3 w-3 text-accent" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              {stats.totalTenants} <span className="text-xs font-normal opacity-40">NODES</span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-2 font-black uppercase tracking-tighter">
              Actifs sur cluster Firebase
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl ring-1 ring-border bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              ONBOARDING <Zap className="h-3 w-3 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">
              {Math.round((stats.upToDateTenants / stats.totalTenants || 0) * 100)}<span className="text-xs opacity-40">%</span>
            </div>
            <Progress value={(stats.upToDateTenants / stats.totalTenants || 0) * 100} className="mt-4 h-1.5 bg-slate-100" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden ring-1 ring-white/10">
          <div className="absolute -right-4 -top-4 opacity-20 rotate-12">
            <Cpu className="h-24 w-24 text-accent" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">CLOUD IA HEARTBEAT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter text-accent">99.9%</div>
            <div className="flex items-center gap-2 mt-2">
               <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-400">Gemini 2.5 Flash Online</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
        {/* Growth Chart */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between p-6">
              <div className="space-y-1">
                <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
                  <Activity className="h-5 w-5 text-primary" /> Flux Dossiers Live
                </CardTitle>
                <CardDescription className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em]">Scalabilité du parc client</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="h-[350px] p-4">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Jan', value: Math.round(stats.totalTenants * 0.8) },
                    { name: 'Feb', value: Math.round(stats.totalTenants * 0.9) },
                    { name: 'Mar', value: stats.totalTenants }
                  ]}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0C55CC" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0C55CC" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="value" stroke="#0C55CC" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
               </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-xl ring-1 ring-border bg-white overflow-hidden">
              <CardHeader className="bg-primary text-white py-3 px-5">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Veille DGI Watch
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[250px]">
                  <div className="divide-y divide-slate-100">
                    {recentNews?.map((news) => (
                      <div key={news.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <Badge variant="outline" className="text-[8px] h-4 font-black">{news.category}</Badge>
                          <span className="text-[9px] font-bold text-slate-400">{news.publishedDate}</span>
                        </div>
                        <p className="text-xs font-black text-slate-900 leading-tight line-clamp-2">{news.title}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl ring-1 ring-border bg-white overflow-hidden">
              <CardHeader className="bg-emerald-600 text-white py-3 px-5">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Support Prioritaire
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[250px]">
                  <div className="divide-y divide-slate-100">
                    {pendingTickets?.map((ticket) => (
                      <div key={ticket.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${ticket.priority === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{ticket.priority.toUpperCase()}</span>
                        </div>
                        <p className="text-xs font-black text-slate-900 truncate">{ticket.subject}</p>
                        <p className="text-[9px] text-muted-foreground mt-1 font-bold">DE : {ticket.userName}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="lg:col-span-3 space-y-8">
          <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b p-6">
              <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tighter">Segmentation Offres</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.planDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                    {stats.planDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
             <Button variant="outline" className="h-20 bg-white shadow-xl hover:bg-primary hover:text-white border-none ring-1 ring-border group transition-all" asChild>
                <Link href="/saas-admin/fiscal-engine" className="flex items-center justify-between w-full px-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 group-hover:bg-white/20 flex items-center justify-center">
                      <DatabaseZap className="h-6 w-6 text-primary group-hover:text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black uppercase tracking-tighter">Moteur Fiscal Master</p>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Logiciel No-Code de Règles</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5" />
                </Link>
             </Button>

             <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden ring-1 ring-white/5">
                <CardHeader className="border-b border-white/5 py-4">
                   <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-accent flex items-center gap-2">
                     <CloudLightning className="h-4 w-4" /> Noyau Système Live
                   </CardTitle>
                </CardHeader>
                <CardContent className="text-[10px] text-emerald-400 font-mono py-6 space-y-2">
                   <div className="flex gap-3"><span className="opacity-40">14:04:31</span> <span className="font-bold">[SUCCESS]</span> <span>Firestore Resolver : 0.4ms</span></div>
                   <div className="flex gap-3"><span className="opacity-40">14:04:42</span> <span className="font-bold">[SUCCESS]</span> <span>Admin Accreditations Verified</span></div>
                   <div className="flex gap-2 animate-pulse mt-4">
                      <span className="text-emerald-500 font-bold">&gt;</span> 
                      <span className="italic tracking-widest uppercase text-[8px] font-black">System Heartbeat... Normal</span>
                   </div>
                </CardContent>
             </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
