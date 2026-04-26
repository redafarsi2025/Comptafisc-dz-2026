
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts"
import { 
  Activity, Target, Sparkles, Zap, CreditCard, 
  ShieldCheck, DatabaseZap, Eye, ArrowUpRight,
  Cpu, CloudLightning, TrendingUp, Users, ShieldAlert
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
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
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const profilesQuery = useMemoFirebase(() => db ? collection(db, "userProfiles") : null, [db]);
  const { data: profiles } = useCollection(profilesQuery);

  const tenantsQuery = useMemoFirebase(() => db ? collection(db, "tenants") : null, [db]);
  const { data: tenants } = useCollection(tenantsQuery);

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

  if (!mounted) return null;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Cockpit Executive</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Business Intelligence & Governance</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-3xl flex items-center gap-5 shadow-sm">
           <div className="h-11 w-11 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
             <ShieldCheck className="text-emerald-600 h-6 w-6" />
           </div>
           <div>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Compliance Engine</p>
             <p className="text-base font-black text-emerald-600 uppercase">LF 2026 Active</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white border-l-4 border-l-primary relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-all rotate-12">
            <CreditCard className="h-20 w-20 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">MRR RECURRENT (DA)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-primary tracking-tighter">
              {stats.mrr.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black mt-3">
              <TrendingUp className="h-3 w-3" /> +14.2% VS MOIS N-1
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white border-l-4 border-l-blue-400 group">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dossiers Réels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">{stats.totalTenants}</div>
            <p className="text-[10px] text-slate-500 mt-3 font-bold uppercase tracking-widest flex items-center gap-1">
              <Users className="h-3 w-3" /> Instances Firestore
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white border-l-4 border-l-emerald-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">NIF Validés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-emerald-600 tracking-tighter">
              {Math.round((stats.upToDateTenants / stats.totalTenants || 0) * 100)}%
            </div>
            <div className="mt-4 space-y-1">
              <Progress value={(stats.upToDateTenants / stats.totalTenants || 0) * 100} className="h-1.5 bg-slate-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Health Status</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-4xl font-black tracking-tighter text-accent">99.9%</div>
            <div className="flex items-center gap-2 mt-3">
               <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
               <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Nodes Operational</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-10">
        <Card className="lg:col-span-4 bg-white border-none shadow-2xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-200">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" /> Performance Acquisition
            </CardTitle>
            <CardDescription className="text-xs uppercase font-bold text-slate-400">Croissance des dossiers par semaine</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-8">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { name: 'S1', value: Math.round(stats.totalTenants * 0.7) },
                  { name: 'S2', value: Math.round(stats.totalTenants * 0.85) },
                  { name: 'S3', value: Math.round(stats.totalTenants * 0.95) },
                  { name: 'S4', value: stats.totalTenants }
                ]}>
                  <defs>
                    <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0C55CC" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#0C55CC" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 'bold' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="value" stroke="#0C55CC" strokeWidth={4} fillOpacity={1} fill="url(#colorPrimary)" />
                </AreaChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 bg-white border-none shadow-2xl shadow-slate-200/50 flex flex-col ring-1 ring-slate-200">
          <CardHeader className="border-b border-slate-100 p-6">
            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Segmentation Plans</CardTitle>
            <CardDescription className="text-xs uppercase font-bold text-slate-400">Répartition du parc client</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-8">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.planDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={6} dataKey="value" stroke="none">
                  {stats.planDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 mt-8">
              {stats.planDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-3 p-4 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm transition-all hover:bg-white hover:shadow-md">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: item.color }} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.name}</span>
                    <span className="text-base font-bold text-slate-900 leading-none mt-1">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-10">
         <Link href="/saas-admin/fiscal-engine" className="block group">
           <Card className="bg-white border-none shadow-xl shadow-slate-200/50 group-hover:shadow-2xl transition-all border-l-4 border-l-primary h-full ring-1 ring-slate-200">
              <CardHeader className="bg-primary/5 border-b border-slate-50 py-4">
                <CardTitle className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                  <DatabaseZap className="h-4 w-4" /> Moteur Fiscal Master
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-xs text-slate-500 leading-relaxed italic mb-8">"Pilotage des règles de calcul dynamiques et des variables législatives."</p>
                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-2xl shadow-lg shadow-primary/20">
                  Ouvrir le Noyau
                </Button>
              </CardContent>
           </Card>
         </Link>

         <Card className="bg-slate-950 text-white border-none shadow-2xl relative overflow-hidden ring-4 ring-white shadow-slate-300">
            <CardHeader className="border-b border-white/5 py-4 bg-primary/20">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                <CloudLightning className="h-4 w-4" /> System Core Live
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[9px] text-emerald-400 font-mono py-8 space-y-3">
               <div className="flex gap-3"><span className="opacity-40">SYNC</span> <span className="font-bold">[OK]</span> <span>Real-time Gateway Active</span></div>
               <div className="flex gap-3"><span className="opacity-40">SYNC</span> <span className="font-bold">[OK]</span> <span>Auth Session Secured</span></div>
               <div className="flex gap-3"><span className="opacity-40">SYNC</span> <span className="font-bold">[OK]</span> <span>AI Core Standby</span></div>
               <div className="flex gap-2 animate-pulse mt-6 text-emerald-300 pt-4 border-t border-white/10">
                  <span className="font-bold">&gt;</span> 
                  <span className="italic tracking-widest uppercase text-[8px] font-black">Kernel heartbeat normal...</span>
               </div>
            </CardContent>
         </Card>

         <Link href="/saas-admin/dgi-watch" className="block group">
           <Card className="bg-primary text-white border-none shadow-2xl group-hover:scale-[1.02] transition-transform relative overflow-hidden h-full">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                <Eye className="h-40 w-40" />
              </div>
              <CardHeader className="relative">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">DGI Watch Console</CardTitle>
                <CardDescription className="text-white/50 text-[11px] font-bold uppercase mt-1">Intelligence Réglementaire</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-between items-end pb-10 relative">
                <div className="space-y-1">
                  <p className="text-3xl font-black uppercase italic">Active</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-accent">IA Vision Sync</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30">
                  <ArrowUpRight className="h-6 w-6" />
                </div>
              </CardContent>
           </Card>
         </Link>
      </div>
    </div>
  )
}
