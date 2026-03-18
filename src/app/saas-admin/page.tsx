
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from "recharts"
import { 
  TrendingUp, ArrowUpRight, 
  Activity, Target, Sparkles, Zap, CreditCard
} from "lucide-react"
import { Progress } from "@/components/ui/progress"

const revenueData = [
  { month: "Jan", mrr: 12000 },
  { month: "Feb", mrr: 15500 },
  { month: "Mar", mrr: 19800 },
  { month: "Apr", mrr: 24000 },
  { month: "May", mrr: 28500 },
  { month: "Jun", mrr: 34200 },
]

export default function AdminDashboard() {
  const currentSubscribers = 512;
  const targetSubscribers = 500;
  const progress = Math.min(100, (currentSubscribers / targetSubscribers) * 100);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary flex items-center gap-3">
            <Target className="text-accent h-10 w-10" /> Pilotage Revenus
          </h1>
          <p className="text-muted-foreground mt-1">Surveillance en temps réel du MRR et de la croissance SaaS 2026.</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center animate-pulse shadow-inner">
            <Sparkles className="text-white h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">KPI Étape 2 Atteint</p>
            <p className="text-xl font-black text-primary">{currentSubscribers} / {targetSubscribers} Abonnés</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">MRR (Mensuel Récurrent)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">34,200 DA</div>
            <div className="flex items-center gap-1 text-emerald-600 text-xs mt-2 font-bold">
              <ArrowUpRight className="h-3 w-3" /> +22.4% vs mois dernier
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">ARR (Annuel Récurrent)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">410,400 DA</div>
            <div className="flex items-center gap-1 text-primary text-xs mt-2 font-bold">
              <TrendingUp className="h-3 w-3" /> Projection optimiste
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-accent shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Taux de Churn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-accent">2.1%</div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs mt-2">
              Stable sur le trimestre
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase opacity-80">LTV Segment PRO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">125,000 DA</div>
            <p className="text-[10px] mt-2 font-medium opacity-70 italic">Valeur vie client estimée</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-7 gap-6">
        <Card className="md:col-span-4 shadow-md border-none">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Croissance du Chiffre d'Affaires</CardTitle>
            <CardDescription>Données agrégées sur le premier semestre 2026.</CardDescription>
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
            <CardTitle>Objectifs Commerciaux</CardTitle>
            <CardDescription>Suivi de l'acquisition abonnés.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-muted-foreground">Progression KPI Étape 2</span>
                <span className="text-primary">{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold">Plan PRO Dominant</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">65% des nouveaux abonnés ont choisi le plan PRO ce mois-ci.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded bg-emerald-100 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold">Automatisation Rapport</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Rapport mensuel envoyé à {currentSubscribers} clients PRO.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
