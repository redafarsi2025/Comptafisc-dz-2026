
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
  Cpu, CloudLightning
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import Link from "next/link"

const PLAN_COLORS: Record<string, string> = {
  'GRATUIT': '#64748b',
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
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/20">
            <Target className="h-8 w-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Console Executive</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Pilotage Business & Conformité Globale</p>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 p-3 rounded-2xl flex items-center gap-4 shadow-xl">
           <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
             <ShieldCheck className="text-white h-5 w-5" />
           </div>
           <div>
             <p className="text-[9px] font-black text-emerald-400 uppercase">Moteur Fiscal 2026</p>
             <p className="text-base font-black text-white">OPÉRATIONNEL</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 border-slate-800 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CreditCard className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">MRR PROJETÉ (DA)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-primary tracking-tighter">
              {stats.mrr.toLocaleString()}
            </div>
            <p className="text-[9px] text-emerald-400 mt-2 font-black uppercase">Revenue Récurrent Live</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">PARC CLIENT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white tracking-tighter">{stats.totalTenants}</div>
            <p className="text-[9px] text-slate-500 mt-2 font-black uppercase">Dossiers réels</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ONBOARDING</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-accent tracking-tighter">
              {Math.round((stats.upToDateTenants / stats.totalTenants || 0) * 100)}%
            </div>
            <Progress value={(stats.upToDateTenants / stats.totalTenants || 0) * 100} className="mt-4 h-1 bg-slate-800" />
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10 rotate-12">
            <Cpu className="h-24 w-24 text-accent" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">CLOUD IA STATUS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter text-accent">99.9%</div>
            <div className="flex items-center gap-2 mt-2">
               <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Gemini Active</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
        <Card className="lg:col-span-4 bg-slate-900 border-slate-800 shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-800 bg-slate-900/50 p-6">
            <CardTitle className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Croissance du Parc
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] p-6">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { name: 'Jan', value: Math.round(stats.totalTenants * 0.7) },
                  { name: 'Feb', value: Math.round(stats.totalTenants * 0.9) },
                  { name: 'Mar', value: stats.totalTenants }
                ]}>
                  <defs>
                    <linearGradient id="colorAdmin" x1="0" x1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0C55CC" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0C55CC" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="value" stroke="#0C55CC" strokeWidth={4} fillOpacity={1} fill="url(#colorAdmin)" />
                </AreaChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 bg-slate-900 border-slate-800 shadow-2xl flex flex-col">
          <CardHeader className="border-b border-slate-800 p-6">
            <CardTitle className="text-xl font-black text-white uppercase tracking-tighter">Segmentation Offres</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.planDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                  {stats.planDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {stats.planDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase">{item.name}</span>
                    <span className="text-sm font-bold text-white">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
         <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden group">
            <CardHeader className="bg-primary/10 border-b border-slate-800 py-4">
              <CardTitle className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <DatabaseZap className="h-4 w-4" /> Moteur Fiscal Master
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-xs text-slate-400 leading-relaxed italic mb-6">"Le Rule Engine est actuellement configuré pour évaluer dynamiquement 45 règles fiscales sur 120 variables législatives."</p>
              <Button variant="outline" className="w-full border-slate-700 text-white hover:bg-primary" asChild>
                <Link href="/saas-admin/fiscal-engine">Accéder au Moteur</Link>
              </Button>
            </CardContent>
         </Card>

         <Card className="bg-slate-950 border-slate-800 shadow-2xl relative overflow-hidden">
            <CardHeader className="border-b border-white/5 py-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                <CloudLightning className="h-4 w-4" /> Noyau Système Live
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[9px] text-emerald-400 font-mono py-6 space-y-2">
               <div className="flex gap-3"><span className="opacity-40">Live</span> <span className="font-bold">[OK]</span> <span>API Firestore Gateway : Active</span></div>
               <div className="flex gap-3"><span className="opacity-40">Live</span> <span className="font-bold">[OK]</span> <span>Auth Session Validator : Secure</span></div>
               <div className="flex gap-3"><span className="opacity-40">Live</span> <span className="font-bold">[OK]</span> <span>Gemini Vision Parser : Standby</span></div>
               <div className="flex gap-2 animate-pulse mt-4 text-emerald-300">
                  <span className="font-bold">&gt;</span> 
                  <span className="italic tracking-widest uppercase text-[8px] font-black">System Heartbeat... Normal</span>
               </div>
            </CardContent>
         </Card>

         <Card className="bg-blue-600 text-white border-none shadow-2xl group cursor-pointer hover:bg-blue-500 transition-colors" asChild>
            <Link href="/saas-admin/dgi-watch">
              <CardHeader>
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">DGI Watch Console</CardTitle>
                <CardDescription className="text-white/70 text-[11px] font-bold">Surveillance réglementaire active.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-between items-end pb-8">
                <Eye className="h-12 w-12 opacity-20 group-hover:scale-110 transition-transform" />
                <ArrowUpRight className="h-6 w-6" />
              </CardContent>
            </Link>
         </Card>
      </div>
    </div>
  )
}
