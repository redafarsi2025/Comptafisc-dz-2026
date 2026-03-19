
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts"
import { 
  TrendingUp, ArrowUpRight, 
  Activity, Target, Sparkles, Zap, CreditCard, 
  Users, UserPlus, ShieldCheck, Download
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const revenueData = [
  { month: "Jan", mrr: 12000, new: 45 },
  { month: "Feb", mrr: 15500, new: 52 },
  { month: "Mar", mrr: 19800, new: 68 },
  { month: "Apr", mrr: 24000, new: 75 },
  { month: "May", mrr: 28500, new: 82 },
  { month: "Jun", mrr: 34200, new: 95 },
]

const planDistribution = [
  { name: 'Gratuit', value: 310, color: '#94a3b8' },
  { name: 'Essentiel', value: 145, color: '#3b82f6' },
  { name: 'PRO', value: 52, color: '#10b981' },
  { name: 'Cabinet', value: 5, color: '#8b5cf6' },
];

export default function AdminDashboard() {
  const currentSubscribers = 512;
  const targetSubscribers = 1000;
  const progress = Math.min(100, (currentSubscribers / targetSubscribers) * 100);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary flex items-center gap-3">
            <Target className="text-accent h-10 w-10" /> Pilotage Exécutif
          </h1>
          <p className="text-muted-foreground mt-1">Données agrégées, croissance SaaS et conformité du parc client.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white border-slate-200"><Download className="mr-2 h-4 w-4" /> Rapport Hebdo</Button>
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center animate-pulse shadow-inner">
              <Sparkles className="text-white h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">KPI Étape 2</p>
              <p className="text-lg font-black text-primary">{currentSubscribers} / {targetSubscribers} Abonnés</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
              MRR (Revenus Mensuels) <CreditCard className="h-3 w-3" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">34,200 DA</div>
            <div className="flex items-center gap-1 text-emerald-600 text-xs mt-2 font-bold">
              <ArrowUpRight className="h-3 w-3" /> +22.4% vs mois dernier
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
              Nouveaux Inscrits <UserPlus className="h-3 w-3" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600">+95</div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">Ce mois (Juin 2026)</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-accent shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
              Taux de Churn <Activity className="h-3 w-3" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-accent">2.1%</div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs mt-2">
              Stable sur le trimestre
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-white border-none shadow-lg overflow-hidden group">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase opacity-80 flex items-center justify-between">
              Conformité e-Fatura <ShieldCheck className="h-3 w-3" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">68%</div>
            <Progress value={68} className="mt-2 bg-white/20 h-1.5" />
            <p className="text-[10px] mt-2 opacity-70 font-medium">Abonnés ayant activé l'API DGI</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-7 gap-8">
        <Card className="md:col-span-4 shadow-md border-none">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Croissance & Revenus</CardTitle>
            <CardDescription>Évolution mensuelle du MRR et de l'acquisition abonnés.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="mrr" name="MRR (DA)" stroke="hsl(var(--primary))" strokeWidth={4} fillOpacity={1} fill="url(#colorMrr)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 shadow-md border-none">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Répartition par Plan</CardTitle>
            <CardDescription>Segmentation de la base utilisateur actuelle.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 pt-0">
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground uppercase tracking-widest">Conversion PRO/CABINET</span>
                <span className="text-primary">11.1%</span>
              </div>
              <Progress value={11.1} className="h-2" />
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
