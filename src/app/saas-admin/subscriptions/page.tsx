
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts"
import { 
  CreditCard, TrendingUp, Users, ArrowUpRight, 
  ShieldCheck, Zap, Layers, Calculator
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PLANS } from "@/lib/plans"

const planStats = [
  { name: "Gratuit", value: 310, color: "#64748b" },
  { name: "Essentiel", value: 145, color: "#2563eb" },
  { name: "PRO", value: 52, color: "#059669" },
  { name: "Cabinet", value: 5, color: "#7c3aed" },
]

const revenueHistory = [
  { date: "Oct", revenue: 180000 },
  { date: "Nov", revenue: 210000 },
  { date: "Dec", revenue: 245000 },
  { date: "Jan", revenue: 290000 },
  { date: "Feb", revenue: 345000 },
  { date: "Mar", revenue: 410400 },
]

export default function SubscriptionsAdmin() {
  const totalSubscribers = planStats.reduce((acc, curr) => acc + curr.value, 0);
  const paidSubscribers = planStats.filter(p => p.name !== "Gratuit").reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-8 text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black flex items-center gap-3">
            <CreditCard className="text-primary h-10 w-10" /> Abonnements & Plans
          </h1>
          <p className="text-slate-400 mt-1">Analyse de la monétisation et de la santé du catalogue offre.</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 px-4 py-2">
            Conversion Payante : {((paidSubscribers / totalSubscribers) * 100).toFixed(1)}%
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Revenus Mensuels (MRR)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">410,400 DA</div>
            <div className="flex items-center gap-1 text-emerald-500 text-xs mt-2">
              <ArrowUpRight className="h-3 w-3" /> +18.5% ce mois
            </div>
          </CardContent>
        </Card>
        {PLANS.filter(p => p.id !== 'CABINET').map((plan) => (
          <Card key={plan.id} className="bg-slate-950 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Abonnés {plan.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-white">
                {planStats.find(s => s.name.toUpperCase() === plan.name.toUpperCase())?.value || 0}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">Segment {plan.id}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-7 gap-6">
        <Card className="md:col-span-4 bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">Histogramme des Revenus (6 mois)</CardTitle>
            <CardDescription className="text-slate-500">Croissance du chiffre d'affaires récurrent.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', color: '#f8fafc' }}
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                />
                <Bar dataKey="revenue" name="Revenus (DA)" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Répartition du Parc</CardTitle>
            <CardDescription className="text-slate-500">Volume par type de plan.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {planStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', color: '#f8fafc' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <CardContent className="pt-0 space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold">Churn Rate (PRO)</p>
                  <p className="text-[10px] text-slate-500">Stable à 1.2% - Excellente rétention.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">Modules Add-ons les plus vendus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900">
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">IA Conseil Fiscal</span>
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30">124 abonnés</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900">
              <div className="flex items-center gap-3">
                <Layers className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">e-Fatura Avancé</span>
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30">89 abonnés</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900">
              <div className="flex items-center gap-3">
                <Calculator className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">Connexion Bancaire</span>
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30">42 abonnés</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-950 border-slate-800 border-dashed">
          <CardHeader>
            <CardTitle className="text-slate-400">Note de Pilotage Commercial</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500 leading-relaxed italic">
            La croissance du segment PRO est le moteur principal du MRR (65% de la valeur totale). 
            Focus sur l'upsell du plan ESSENTIEL vers PRO via les rapports de gestion automatisés. 
            Le plan CABINET doit être surveillé pour les besoins d'onboarding spécifique (on-site).
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
