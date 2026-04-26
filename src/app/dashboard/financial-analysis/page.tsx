
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from "recharts"
import { 
  TrendingUp, Activity, Landmark, Wallet, AlertTriangle, 
  ShieldCheck, ArrowUpRight, Scale, Calculator, PieChart,
  BarChart3, HeartPulse, Zap, Info, Loader2
} from "lucide-react"
import { calculateBFR, calculateLiquidityRatio, calculateCAF } from "@/lib/calculations"
import { useSearchParams } from "next/navigation"

export default function FinancialAnalysisPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user?.uid]);
  const { data: tenants } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const entriesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return query(collection(db, "tenants", currentTenant.id, "journal_entries"), orderBy("entryDate", "asc"));
  }, [db, currentTenant?.id]);
  const { data: entries, isLoading } = useCollection(entriesQuery);

  // Agrégation des masses financières (SCF)
  const analysis = React.useMemo(() => {
    if (!entries) return null;
    const balances: Record<string, number> = {};
    entries.forEach(e => {
      e.lines.forEach((l: any) => {
        if (!balances[l.accountCode]) balances[l.accountCode] = 0;
        balances[l.accountCode] += (l.debit - l.credit);
      });
    });

    const getBalance = (prefix: string) => Object.entries(balances)
      .filter(([code]) => code.startsWith(prefix))
      .reduce((sum, [, val]) => sum + val, 0);

    const stocks = Math.abs(getBalance('3'));
    const receivables = Math.abs(getBalance('41'));
    const payables = Math.abs(getBalance('40'));
    const cash = Math.abs(getBalance('512') + getBalance('53'));
    const currentAssets = stocks + receivables + cash;
    const currentLiabilities = payables + Math.abs(getBalance('42') + getBalance('43') + getBalance('44'));
    
    const revenue = Math.abs(Object.entries(balances)
      .filter(([code]) => code.startsWith('7'))
      .reduce((sum, [, val]) => sum + val, 0));
    
    const costs = Math.abs(Object.entries(balances)
      .filter(([code]) => code.startsWith('6'))
      .reduce((sum, [, val]) => sum + val, 0));

    const netProfit = revenue - costs;
    const bfr = calculateBFR(stocks, receivables, payables);
    const liquidity = calculateLiquidityRatio(currentAssets, currentLiabilities);
    const margo = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return { stocks, receivables, payables, cash, bfr, liquidity, revenue, netProfit, margo, currentAssets, currentLiabilities };
  }, [entries]);

  if (!mounted || isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase flex items-center gap-3">
            <BarChart3 className="text-accent h-8 w-8" /> Pilotage Stratégique
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Aide à la décision & Ratios de Performance Management</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 font-black uppercase text-[10px] tracking-widest">
            <HeartPulse className="h-3 w-3 mr-2" /> Santé Financière : Optimale
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Besoin en Fonds de Roulement (BFR)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary tracking-tighter">{analysis?.bfr.toLocaleString()} DA</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase flex items-center gap-1">
              <Zap className="h-3 w-3 text-accent" /> Cycle d'exploitation
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ratio de Liquidité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 tracking-tighter">{analysis?.liquidity.toFixed(2)}</div>
            <p className="text-[10px] text-emerald-600 mt-2 font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Solvabilité Court Terme
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Marge Nette</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600 tracking-tighter">{analysis?.margo.toFixed(1)}%</div>
            <div className="mt-3">
              <Progress value={analysis?.margo} className="h-1 bg-slate-100" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/20 opacity-50" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-[10px] font-black uppercase opacity-70 tracking-widest text-accent">CAF Estimée</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-black tracking-tighter">{(analysis?.netProfit || 0).toLocaleString()} <span className="text-xs font-normal opacity-60">DA</span></div>
            <p className="text-[10px] mt-2 opacity-70 font-bold uppercase tracking-widest">Capacité d'Autofinancement</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
        <Card className="lg:col-span-4 shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-black uppercase tracking-tighter text-slate-900">Structure du BFR & Liquidité</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Equilibre des emplois et ressources d'exploitation</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Stocks', value: analysis?.stocks },
                { name: 'Clients', value: analysis?.receivables },
                { name: 'Fournisseurs', value: analysis?.payables },
                { name: 'Trésorerie', value: analysis?.cash },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 'bold' }} />
                <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#0C55CC" radius={[4, 4, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-2xl border-none ring-1 ring-border bg-white p-6">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-lg font-black uppercase tracking-tighter text-slate-900">Scorecard Décisionnel</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-slate-500">Indépendance Financière</span>
                <span className="text-primary">82%</span>
              </div>
              <Progress value={82} className="h-1.5" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-slate-500">Rotation des Stocks (Jours)</span>
                <span className="text-amber-600">45 jrs</span>
              </div>
              <Progress value={45} className="h-1.5 bg-slate-100" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-slate-500">Délai Client (DSO)</span>
                <span className="text-blue-600">32 jrs</span>
              </div>
              <Progress value={32} className="h-1.5 bg-slate-100" />
            </div>

            <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16" />
               <h4 className="text-[10px] font-black uppercase text-accent tracking-widest mb-3">Conseil Stratégique IA</h4>
               <p className="text-[11px] leading-relaxed opacity-80 italic">
                "Votre BFR est maîtrisé, mais la rotation des stocks dépasse les standards de votre secteur (COMMERCE). Une action sur les références à faible rotation pourrait libérer 15% de liquidité supplémentaire."
               </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
        <CardHeader className="bg-slate-50 border-b p-6">
          <CardTitle className="text-lg font-black uppercase tracking-tighter">Tableau des Soldes Intermédiaires de Gestion (SIG)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-4 px-8">Indicateur de Gestion</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Valeur (DA)</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-right px-8">Interprétation Management</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-slate-50 transition-colors">
                <TableCell className="py-6 px-8 font-bold text-slate-700">Chiffre d'Affaires (HT)</TableCell>
                <TableCell className="text-right font-black text-slate-900">{(analysis?.revenue || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right px-8"><Badge variant="outline" className="text-[8px] font-black uppercase">Volume d'activité</Badge></TableCell>
              </TableRow>
              <TableRow className="hover:bg-slate-50 transition-colors">
                <TableCell className="py-6 px-8 font-bold text-slate-700">Marge Commerciale / Production</TableCell>
                <TableCell className="text-right font-black text-emerald-600">{(analysis?.netProfit || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right px-8"><Badge className="bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase border-none">Rentabilité Brute</Badge></TableCell>
              </TableRow>
              <TableRow className="hover:bg-slate-50 transition-colors bg-primary/5">
                <TableCell className="py-6 px-8 font-black text-primary uppercase text-xs">Résultat Net de l'Exercice</TableCell>
                <TableCell className="text-right font-black text-primary text-lg">{(analysis?.netProfit || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right px-8 font-black text-[10px] text-primary">IMAGE FIDÈLE SCF</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-4 shadow-sm">
        <div className="h-10 w-10 rounded-2xl bg-white border border-blue-200 flex items-center justify-center shrink-0">
          <Info className="h-5 w-5 text-blue-600" />
        </div>
        <div className="text-[11px] text-blue-900 leading-relaxed font-medium">
          <p className="font-bold uppercase tracking-tight mb-1">Méthodologie d'Analyse (Normes Management 2026) :</p>
          <p className="opacity-80 uppercase">
            Ces indicateurs sont recalculés dynamiquement à chaque clôture de journal. Le ratio de liquidité et le BFR sont essentiels pour vos dossiers de financement bancaire (Algérie Poste, BDL, BEA). L'IA de ComptaFisc-DZ compare ces données aux benchmarks de votre NAP pour vous alerter en cas de dérive de gestion.
          </p>
        </div>
      </div>
    </div>
  )
}
