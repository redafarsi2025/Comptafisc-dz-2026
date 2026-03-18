"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle2, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, BadgeCheck } from "lucide-react"

const healthData = [
  { name: "Compliant", value: 85, color: "hsl(var(--primary))" },
  { name: "Risk", value: 15, color: "hsl(var(--destructive))" },
]

const monthlyData = [
  { month: "Jan", revenue: 450000, expenses: 320000 },
  { month: "Feb", revenue: 520000, expenses: 310000 },
  { month: "Mar", revenue: 480000, expenses: 350000 },
  { month: "Apr", revenue: 610000, expenses: 400000 },
  { month: "May", revenue: 590000, expenses: 380000 },
  { month: "Jun", revenue: 650000, expenses: 410000 },
]

export default function DashboardOverview() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Tableau de bord</h1>
        <p className="text-muted-foreground">Bienvenue Ahmed. Voici l'état de votre conformité fiscale aujourd'hui.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA Mensuel</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">650,000 DZD</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-emerald-500 flex items-center">
                <ArrowUpRight className="h-3 w-3" /> +12%
              </span>
              par rapport au mois dernier
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TVA à décaisser (Est.)</CardTitle>
            <Wallet className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">123,500 DZD</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Échéance G50 le 20/07
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salariés Actifs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Toutes les déclarations CNAS à jour</p>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score de Santé Fiscale</CardTitle>
            <BadgeCheck className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92/100</div>
            <Progress value={92} className="mt-2 bg-white/20" />
            <p className="text-xs mt-2 opacity-90">Excellente conformité (Zone Verte)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Flux de Trésorerie & Marges</CardTitle>
            <CardDescription>Visualisation des revenus et dépenses HT sur les 6 derniers mois.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenus" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Dépenses" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Alertes de Conformité</CardTitle>
            <CardDescription>Détections automatiques du moteur fiscal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Timbre Fiscal Manquant</p>
                <p className="text-xs text-muted-foreground">3 factures en espèces sans timbre de 1% (LF 2024 Art 12).</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-600">Calcul TAP à vérifier</p>
                <p className="text-xs text-muted-foreground">La réfaction de 25% n'est pas appliquée sur le dossier 2.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-600">Archivage SHA-256</p>
                <p className="text-xs text-muted-foreground">Toutes les pièces de Mai ont été scellées et archivées.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
