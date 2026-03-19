
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, LineChart, Line
} from "recharts"
import { 
  Activity, Database, Zap, ShieldAlert, 
  Server, Cpu, HardDrive, Thermometer, Clock, AlertTriangle
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

const firestoreUsage = [
  { time: "00:00", reads: 1200, writes: 400 },
  { time: "04:00", reads: 800, writes: 200 },
  { time: "08:00", reads: 4500, writes: 1200 },
  { time: "12:00", reads: 8900, writes: 3100 },
  { time: "16:00", reads: 7200, writes: 2400 },
  { time: "20:00", reads: 3100, writes: 900 },
]

const ocrStats = [
  { day: "Lun", success: 98, error: 2 },
  { day: "Mar", success: 95, error: 5 },
  { day: "Mer", success: 99, error: 1 },
  { day: "Jeu", success: 92, error: 8 },
  { day: "Ven", success: 97, error: 3 },
]

export default function MonitoringPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary flex items-center gap-3">
            <Activity className="text-accent h-10 w-10" /> Santé Système
          </h1>
          <p className="text-muted-foreground mt-1">Surveillance des ressources Firebase, coûts Firestore et performances OCR.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-4 py-2">
            <Server className="h-3 w-3 mr-2" /> Serveurs Opérationnels
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Coût Estimé (Mois)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">42.50 $</div>
            <p className="text-[10px] text-muted-foreground mt-1 italic">Projection Firestore + Storage</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Taux Succès OCR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600">96.4%</div>
            <p className="text-[10px] text-muted-foreground mt-1 italic">Gemini Vision 2.5 Flash</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Latence Moyenne</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600">145ms</div>
            <p className="text-[10px] text-muted-foreground mt-1 italic">API & Firestore Triggers</p>
          </CardContent>
        </Card>
        <Card className="bg-primary text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase opacity-80">Alertes Sécurité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">0</div>
            <p className="text-[10px] mt-2 opacity-70 italic font-medium">Tentatives suspectes (24h)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-md border-none">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Trafic Firestore (Lectures/Écritures)</CardTitle>
            <CardDescription>Visualisation des appels API sur les dernières 24h.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={firestoreUsage}>
                <defs>
                  <linearGradient id="colorReads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="reads" name="Lectures" stroke="hsl(var(--primary))" fill="url(#colorReads)" strokeWidth={3} />
                <Area type="monotone" dataKey="writes" name="Écritures" stroke="#10b981" fill="transparent" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md border-none">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-accent" /> Performance OCR IA</CardTitle>
            <CardDescription>Analyse des erreurs d'extraction documentaire.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ocrStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="success" name="Succès %" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="error" name="Erreur %" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-dashed border-2 border-primary/20">
          <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Quotas Firebase</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold"><span>STOCKAGE (Cloud Storage)</span><span>45%</span></div>
              <Progress value={45} className="h-1.5" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold"><span>AUTH (Users)</span><span>12%</span></div>
              <Progress value={12} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-xl">
          <CardHeader><CardTitle className="text-sm font-bold">Logs d'Erreurs (Sentry)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { time: "10:45", msg: "Hydration failed on /dashboard/accounting", count: 12 },
              { time: "09:12", msg: "Firestore permission denied", count: 2 },
            ].map((l, i) => (
              <div key={i} className="flex justify-between items-center text-[10px] bg-slate-800 p-2 rounded">
                <span className="font-mono text-slate-400">{l.time}</span>
                <span className="font-bold truncate w-40">{l.msg}</span>
                <Badge variant="destructive" className="h-4 text-[8px]">{l.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Rappel Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-amber-700 leading-relaxed italic">
            "La mise à jour du moteur fiscal pour la LF 2026 a généré une hausse de 15% des lectures Firestore. Optimisation des index recommandée pour le prochain sprint."
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
