
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts"
import { 
  CreditCard, TrendingUp, ArrowUpRight, Zap
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

const planStats = [
  { name: "Gratuit", value: 310, color: "#94a3b8" },
  { name: "Essentiel", value: 145, color: "#3b82f6" },
  { name: "PRO", value: 52, color: "#10b981" },
  { name: "Cabinet", value: 5, color: "#8b5cf6" },
]

const revenueHistory = [
  { date: "Jan", revenue: 290000 },
  { date: "Feb", revenue: 345000 },
  { date: "Mar", revenue: 410400 },
]

export default function SubscriptionsAdmin() {
  const totalSubscribers = planStats.reduce((acc, curr) => acc + curr.value, 0);
  const paidSubscribers = planStats.filter(p => p.name !== "Gratuit").reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary flex items-center gap-3">
            <CreditCard className="text-accent h-10 w-10" /> Abonnements
          </h1>
          <p className="text-muted-foreground mt-1">Analyse de la monétisation et santé du catalogue.</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-4 py-2 font-bold text-sm">
          Taux Conversion : {((paidSubscribers / totalSubscribers) * 100).toFixed(1)}%
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-md border-none">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">MRR Actuel</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">410,400 DA</div>
            <div className="flex items-center gap-1 text-emerald-600 text-xs mt-2 font-bold"><ArrowUpRight className="h-3 w-3" /> +18.5%</div>
          </CardContent>
        </Card>
        {["ESSENTIEL", "PRO", "CABINET"].map((p) => (
          <Card key={p} className="shadow-md border-none">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{p}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-black">{planStats.find(s => s.name.toUpperCase() === p)?.value || 0}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-7 gap-6">
        <Card className="md:col-span-4 shadow-md border-none">
          <CardHeader className="bg-muted/30 border-b"><CardTitle>Revenus Récurrents</CardTitle></CardHeader>
          <CardContent className="h-[350px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="revenue" name="Revenus (DA)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 shadow-md border-none">
          <CardHeader className="bg-muted/30 border-b"><CardTitle>Répartition du Parc</CardTitle></CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={planStats} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {planStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <CardContent className="pt-0">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div><p className="text-sm font-bold text-primary">Churn Rate PRO : 1.2%</p><p className="text-[10px] text-muted-foreground italic">Excellente rétention ce mois.</p></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
