
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from "recharts"
import { 
  TrendingUp, Users, CreditCard, ArrowUpRight, ArrowDownRight, 
  Activity, Target, Sparkles, Zap
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

const revenueData = [
  { month: "Jan", mrr: 12000, subscribers: 310 },
  { month: "Feb", mrr: 15500, subscribers: 345 },
  { month: "Mar", mrr: 19800, subscribers: 390 },
  { month: "Apr", mrr: 24000, subscribers: 420 },
  { month: "May", mrr: 28500, subscribers: 465 },
  { month: "Jun", mrr: 34200, subscribers: 512 },
]

const churnData = [
  { segment: "Essentiel", value: 4.2 },
  { segment: "PRO", value: 1.8 },
]

export default function AdminDashboard() {
  const currentSubscribers = 512;
  const targetSubscribers = 500;
  const progress = Math.min(100, (currentSubscribers / targetSubscribers) * 100);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3">
            <Target className="text-primary h-10 w-10" /> Dashboard Revenus
          </h1>
          <p className="text-slate-400 mt-1">Surveillance en temps réel du MRR et de la croissance SaaS 2026.</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center animate-pulse">
            <Sparkles className="text-white h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">KPI Validation Étape 2</p>
            <p className="text-xl font-black text-white">{currentSubscribers} / {targetSubscribers} Abonnés</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">MRR (Monthly Recurring)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">34,200 DA</div>
            <div className="flex items-center gap-1 text-emerald-500 text-xs mt-2">
              <ArrowUpRight className="h-3 w-3" /> +22.4% vs mois dernier
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">ARR (Annual Recurring)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">410,400 DA</div>
            <div className="flex items-center gap-1 text-emerald-500 text-xs mt-2">
              <TrendingUp className="h-3 w-3" /> Projection fin d'année
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">Churn Rate Moyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">2.1%</div>
            <div className="flex items-center gap-1 text-slate-500 text-xs mt-2">
              Stable sur 3 mois
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-white border-none shadow-xl shadow-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase opacity-80">LTV par Segment PRO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">125,000 DA</div>
            <p className="text-[10px] mt-2 font-medium opacity-70">Valeur vie client moyenne</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-7 gap-6">
        <Card className="md:col-span-4 bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Croissance MRR & Abonnés</CardTitle>
            <CardDescription className="text-slate-500">Données agrégées sur le premier semestre 2026.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', color: '#f8fafc' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Area type="monotone" dataKey="mrr" name="MRR (DA)" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorMrr)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Objectif KPI Étape 2</CardTitle>
            <CardDescription className="text-slate-500">Acquisition de 500 abonnés payants.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-medium">Progression Globale</span>
                <span className="text-white font-bold">{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-3 bg-slate-800" />
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center shrink-0">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Plan PRO Dominant</p>
                  <p className="text-xs text-slate-500">65% des nouveaux abonnés ont choisi le plan PRO ce mois-ci.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Automatisation Rapport</p>
                  <p className="text-xs text-slate-500">Premier rapport mensuel envoyé automatiquement à {currentSubscribers} clients PRO.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
