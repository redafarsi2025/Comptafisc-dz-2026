"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { 
  Calculator, TrendingUp, HeartPulse, Zap, ShieldCheck, 
  ArrowRight, Info, AlertTriangle, Scale, Target, 
  Users, Banknote, Sparkles, TrendingDown, Loader2
} from "lucide-react"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell
} from "recharts"
import { calculateRHMetrics, PAYROLL_CONSTANTS } from "@/lib/calculations"
import { useSearchParams } from "next/navigation"

export default function RHSimulatorPage() {
  const [brut, setBrut] = React.useState(100000)
  const [primes, setPrimes] = React.useState(10000)
  const [avantages, setAvantages] = React.useState(5000)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const metrics = React.useMemo(() => {
    return calculateRHMetrics({ brut, primes, avantages });
  }, [brut, primes, avantages]);

  const rangeData = React.useMemo(() => {
    const data = [];
    const start = Math.max(PAYROLL_CONSTANTS.SNMG, brut - 50000);
    const end = brut + 100000;
    const step = 10000;
    
    for (let b = start; b <= end; b += step) {
      const m = calculateRHMetrics({ brut: b, primes, avantages });
      data.push({
        label: `${Math.round(b/1000)}k`,
        net: m.net,
        cost: m.cost,
        irg: m.irg
      });
    }
    return data;
  }, [brut, primes, avantages]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <Calculator className="text-accent h-8 w-8" /> Simulateur RH Stratégique
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Pilotage des coûts de recrutement et d'augmentation (LF 2026)</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 px-4 py-2 font-black uppercase text-[10px] tracking-widest">
            <ShieldCheck className="h-3 w-3 mr-2" /> Moteur LF 2026 Actif
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PANEL CONTROLES */}
        <Card className="lg:col-span-1 border-none shadow-2xl ring-1 ring-border bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Zap className="h-4 w-4" /> Paramètres d'entrée
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-10">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                <Label>Salaire de base (Brut)</Label>
                <span className="text-primary font-black text-sm">{brut.toLocaleString()} DA</span>
              </div>
              <Slider 
                min={24000} 
                max={500000} 
                step={1000} 
                value={[brut]} 
                onValueChange={(v) => setBrut(v[0])}
                className="py-4"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                <Label>Primes Imposables</Label>
                <span className="text-slate-900 font-bold">{primes.toLocaleString()} DA</span>
              </div>
              <Slider 
                min={0} 
                max={100000} 
                step={1000} 
                value={[primes]} 
                onValueChange={(v) => setPrimes(v[0])}
                className="py-4"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                <Label>Avantages (Non-imposables)</Label>
                <span className="text-emerald-600 font-bold">{avantages.toLocaleString()} DA</span>
              </div>
              <Slider 
                min={0} 
                max={50000} 
                step={500} 
                value={[avantages]} 
                onValueChange={(v) => setAvantages(v[0])}
                className="py-4"
              />
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
               <h4 className="text-[10px] font-black text-primary uppercase flex items-center gap-2">
                 <Target className="h-3 w-3" /> Optimisation SEAD
               </h4>
               <p className="text-[11px] text-primary/70 leading-relaxed italic">
                 "Une augmentation de {Math.round(brut * 0.1).toLocaleString()} DA de brut coûtera {Math.round(brut * 0.1 * 1.26).toLocaleString()} DA à l'entreprise."
               </p>
            </div>
          </CardContent>
        </Card>

        {/* PANEL RESULTATS */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-900 text-white border-none shadow-xl p-6 flex flex-col justify-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Banknote className="h-16 w-16" /></div>
               <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Coût Total Employeur</p>
               <h2 className="text-3xl font-black tracking-tighter">{Math.round(metrics.cost).toLocaleString()} <span className="text-xs font-normal opacity-50">DA</span></h2>
            </Card>
            <Card className="border-l-4 border-l-emerald-500 shadow-xl bg-white p-6 flex flex-col justify-center">
               <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">Net à Payer (Salarié)</p>
               <h2 className="text-2xl font-black text-emerald-600 tracking-tighter">{Math.round(metrics.net).toLocaleString()} <span className="text-xs font-normal opacity-50">DA</span></h2>
               <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-emerald-500 uppercase">
                  <TrendingUp className="h-3 w-3" /> Efficience : {metrics.ratio.toFixed(1)}%
               </div>
            </Card>
            <Card className="border-l-4 border-l-amber-500 shadow-xl bg-white p-6 flex flex-col justify-center">
               <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">Poids Fiscal (IRG)</p>
               <h2 className="text-2xl font-black text-amber-600 tracking-tighter">{Math.round(metrics.irg).toLocaleString()} <span className="text-xs font-normal opacity-50">DA</span></h2>
            </Card>
          </div>

          <Card className="shadow-2xl border-none ring-1 ring-border bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tighter text-slate-900">Analyse de Sensibilité</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Évolution Coût vs Net sur une plage de +/- 100k DA</CardDescription>
              </div>
              <Badge variant="secondary" className="h-6 text-[9px] font-black uppercase">Mode Dynamique</Badge>
            </CardHeader>
            <CardContent className="h-[350px] p-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rangeData}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0C55CC" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0C55CC" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 'bold' }} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" />
                  <Area type="monotone" dataKey="cost" name="Coût Employeur" stroke="#0C55CC" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                  <Area type="monotone" dataKey="net" name="Salaire Net" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-8">
             <div className="p-6 bg-blue-50 border border-blue-200 rounded-3xl flex items-start gap-4">
                <div className="h-10 w-10 rounded-2xl bg-white border border-blue-200 flex items-center justify-center shrink-0 shadow-sm">
                  <Info className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-[11px] text-blue-900 leading-relaxed font-medium">
                  <p className="font-bold uppercase tracking-tight mb-1">Impact Charges Patronales :</p>
                  <p className="opacity-80">
                    Chaque augmentation de 1 DA de salaire brut génère automatiquement 0.26 DA de charges patronales CNAS. L'ERP ComptaFisc-DZ intègre cette dérive pour votre prévisionnel de trésorerie.
                  </p>
                </div>
             </div>

             <Card className="bg-slate-900 text-white border-none shadow-xl rounded-3xl p-6 relative overflow-hidden">
                <Sparkles className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 text-accent" />
                <h4 className="text-[10px] font-black uppercase text-accent tracking-widest mb-3 flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4" /> Analyse Stratégique SEAD
                </h4>
                <p className="text-[11px] leading-relaxed opacity-80 italic">
                  "Pour optimiser l'attractivité sans exploser les charges, privilégiez l'augmentation des indemnités de transport et de panier (non imposables) plutôt que le salaire de base si celui-ci dépasse déjà le SNMG."
                </p>
             </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function BrainCircuit(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5V3" />
      <path d="M5 12H3" />
      <path d="M21 12h-2" />
      <path d="M12 21v-2" />
      <path d="m16.95 7.05 1.41-1.41" />
      <path d="m5.64 18.36 1.41-1.41" />
      <path d="m18.36 18.36-1.41-1.41" />
      <path d="m7.05 7.05-1.41-1.41" />
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    </svg>
  )
}
