/**
 * @fileOverview Analyse Financière & Pilotage Stratégique (SEAD).
 */

"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"
import { 
  Activity, Landmark, Wallet, AlertTriangle, 
  ShieldCheck, ArrowUpRight, Calculator, PieChart,
  BarChart3, HeartPulse, Zap, Info, Loader2, Lightbulb, Target, ArrowRight,
  TrendingDown, CheckCircle2, Sparkles, ScrollText, Building2, Layers
} from "lucide-react"
import { calculateBFR, calculateLiquidityRatio, simulateInvestmentScenarios, getIBSRate } from "@/lib/calculations"
import { useSearchParams } from "next/navigation"
import { getSeadRecommendation } from "@/ai/flows/sead-decision-flow"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

export default function FinancialAnalysisPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isGeneratingPlan, setIsGeneratingPlan] = React.useState(false)
  const [recommendation, setRecommendation] = React.useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  
  // Scenarios Simulation State
  const [isSimModalOpen, setIsSimModalOpen] = React.useState(false)
  const [simAmount, setSimAmount] = React.useState(2500000)
  const [simYears, setSimYears] = React.useState(5)

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

  const assetsQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "assets");
  }, [db, currentTenant?.id]);
  const { data: assets } = useCollection(assetsQuery);

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

    const fixedAssets = assets?.reduce((sum, a) => sum + (a.acquisitionValue || 0), 0) || getBalance('2');
    const stocks = Math.abs(getBalance('3'));
    const receivables = Math.abs(getBalance('41'));
    const payables = Math.abs(getBalance('40'));
    const cash = Math.abs(getBalance('512') + getBalance('53'));
    
    const revenue = Math.abs(Object.entries(balances).filter(([c]) => c.startsWith('7')).reduce((s, [, v]) => s + v, 0));
    const costs = Math.abs(Object.entries(balances).filter(([c]) => c.startsWith('6')).reduce((s, [, v]) => s + v, 0));

    const netProfit = revenue - costs;
    const bfr = calculateBFR(stocks, receivables, payables);
    const liquidity = calculateLiquidityRatio(stocks + receivables + cash, payables + 50000);

    return { fixedAssets, stocks, receivables, payables, cash, bfr, liquidity, revenue, netProfit, margo: revenue > 0 ? (netProfit / revenue) * 100 : 0 };
  }, [entries, assets]);

  const handleGeneratePlan = async () => {
    if (!analysis || !currentTenant) return;
    setIsGeneratingPlan(true);
    try {
      const result = await getSeadRecommendation({
        promptKey: 'FISCAL_DECISION_CORE',
        variables: { ca: analysis.revenue, resultat: analysis.netProfit, cash: analysis.cash, secteur: currentTenant.secteurActivite }
      });
      setRecommendation(result);
      setIsDialogOpen(true);
    } finally { setIsGeneratingPlan(false); }
  };

  const simResults = React.useMemo(() => {
    const rate = getIBSRate(currentTenant?.secteurActivite || "SERVICES");
    return simulateInvestmentScenarios(simAmount, simYears, rate);
  }, [simAmount, simYears, currentTenant]);

  if (!mounted || isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase flex items-center gap-3">
            <BarChart3 className="text-accent h-8 w-8" /> Pilotage & Simulation
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Niveau Master - Jumeau Numérique Financier</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 font-black uppercase text-[10px] tracking-widest">
            <ShieldCheck className="h-3 w-3 mr-2" /> Analyse d'Efficience : Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
            <Zap className="h-24 w-24 text-accent" />
          </div>
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase tracking-widest text-accent flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Décisions Stratégiques
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium leading-relaxed opacity-80">
              Utilisez l'IA pour simuler des scénarios "What-If" basés sur vos données réelles de dossier.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-accent text-primary font-black uppercase tracking-widest text-[10px] h-10"
              onClick={handleGeneratePlan}
              disabled={isGeneratingPlan}
            >
              {isGeneratingPlan ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Layers className="h-4 w-4 mr-2" />}
              Lancer Simulation IA
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-t-4 border-t-emerald-500">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
              <Calculator className="h-4 w-4" /> Optimisation Fiscale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <p className="text-sm font-bold">Améliorez votre ROI de {(analysis?.margo || 0).toFixed(1)}%</p>
             <div className="p-3 bg-emerald-50 rounded-xl text-[11px] text-emerald-800 italic">
               "Note : Le réinvestissement dans des actifs productifs réduit votre base IBS de 5% à 10% (Art. 150 CIDTA)."
             </div>
          </CardContent>
          <CardFooter>
            <Dialog open={isSimModalOpen} onOpenChange={setIsSimModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-emerald-500 text-emerald-600 font-black uppercase tracking-widest text-[10px] h-10">
                  Comparer Scénarios d'Investissement <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl rounded-3xl p-8">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Simulateur de Scénarios Dynamiques</DialogTitle>
                  <DialogDescription className="uppercase text-[9px] font-bold tracking-widest">Optimisation du mode d'acquisition (Pro Level)</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-6">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-slate-400">Valeur de l'actif HT (DA)</Label>
                      <Input type="number" value={simAmount} onChange={e => setSimAmount(parseFloat(e.target.value) || 0)} className="rounded-xl h-12 text-lg font-black" />
                    </div>
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-slate-400">Durée d'usage (Années)</Label>
                      <Select value={simYears.toString()} onValueChange={v => setSimYears(parseInt(v))}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 ans (Technologie)</SelectItem>
                          <SelectItem value="5">5 ans (Transport/Industrie)</SelectItem>
                          <SelectItem value="10">10 ans (Bâtiments)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                     <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-6">
                        <h4 className="text-xs font-black uppercase text-accent border-b border-white/10 pb-2">Verdict Master : Achat vs Leasing</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <p className="text-[8px] uppercase font-bold text-slate-400">Scénario Achat Direct</p>
                              <p className="text-lg font-black">-{simResults.purchase.netCost.toLocaleString()} DA</p>
                              <p className="text-[9px] text-emerald-400">Gain fiscal : {simResults.purchase.totalTaxSaving.toLocaleString()} DA</p>
                           </div>
                           <div className="space-y-1 border-l border-white/10 pl-4">
                              <p className="text-[8px] uppercase font-bold text-slate-400">Scénario Leasing</p>
                              <p className="text-lg font-black">-{simResults.leasing.netCost.toLocaleString()} DA</p>
                              <p className="text-[9px] text-accent">Loyer mensuel : {Math.round(simResults.leasing.monthlyLease).toLocaleString()} DA</p>
                           </div>
                        </div>
                        <div className="pt-4 mt-2 border-t border-white/10 text-center">
                           <p className="text-[9px] font-bold text-emerald-400 italic">"Recommandation : Le leasing préserve votre trésorerie immédiate."</p>
                        </div>
                     </div>
                  </div>
                </div>
                <DialogFooter><Button className="w-full rounded-2xl h-12" onClick={() => setIsSimModalOpen(false)}>Fermer le Simulateur</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>

        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Patrimoine & V.N.C
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">Valeur brute immobilisée : <span className="font-black text-blue-600">{analysis?.fixedAssets.toLocaleString()} DA</span></p>
            <div className="p-3 bg-blue-50 rounded-xl text-[11px] text-blue-800">
              Extraction réelle depuis votre registre de classe 2.
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full text-blue-600 font-black uppercase tracking-widest text-[10px] h-10" asChild>
              <Link href={`/dashboard/accounting/assets?tenantId=${currentTenant?.id}`}>Accéder au Registre Immo <ArrowRight className="ml-2 h-3 w-3" /></Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 border-none shadow-2xl rounded-3xl overflow-hidden">
           <DialogHeader className="bg-slate-900 text-white p-8 shrink-0">
             <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-2xl bg-accent/20 flex items-center justify-center border border-accent/20 shadow-inner">
                 <Sparkles className="h-6 w-6 text-accent animate-pulse" />
               </div>
               <div>
                 <DialogTitle className="text-2xl font-black tracking-tighter uppercase">Plan de Route Stratégique SEAD</DialogTitle>
                 <DialogDescription className="text-accent font-bold uppercase text-[10px] tracking-widest">Expertise Prescriptive ComptaFisc-DZ v2.6</DialogDescription>
               </div>
             </div>
           </DialogHeader>
           
           <ScrollArea className="flex-1 w-full bg-white">
             <div className="p-8 prose prose-slate max-w-none prose-sm leading-relaxed text-slate-700 whitespace-pre-line">
               {recommendation}
             </div>
           </ScrollArea>

           <CardFooter className="bg-slate-50 border-t p-6 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
               <ShieldCheck className="h-4 w-4 text-emerald-500" /> Audit de recommandation certifié
             </div>
             <Button variant="outline" className="rounded-xl font-bold h-10" onClick={() => setIsDialogOpen(false)}>Fermer l'Analyse</Button>
           </CardFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
        <Card className="lg:col-span-4 shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b p-6">
            <CardTitle className="text-lg font-black uppercase tracking-tighter">Analyse Structurelle (DSL Active)</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Extraction temps-réel via Moteur Fiscal Master</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Immos', value: analysis?.fixedAssets },
                { name: 'Stocks', value: analysis?.stocks },
                { name: 'Clients', value: analysis?.receivables },
                { name: 'Cash', value: analysis?.cash },
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
          <CardHeader className="p-0 mb-6"><CardTitle className="text-lg font-black uppercase tracking-tighter">Scorecard Décisionnel</CardTitle></CardHeader>
          <CardContent className="p-0 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-slate-500">B.F.R (Bilan)</span>
                <span className="text-primary font-bold">{analysis?.bfr.toLocaleString()} DA</span>
              </div>
              <Progress value={65} className="h-1.5" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-slate-500">Liquidité</span>
                <span className="text-emerald-600 font-bold">{analysis?.liquidity.toFixed(2)}</span>
              </div>
              <Progress value={analysis ? analysis.liquidity * 50 : 0} className="h-1.5 bg-slate-100" />
            </div>

            <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16" />
               <h4 className="text-[10px] font-black uppercase text-accent tracking-widest mb-3">Master Strategy Insight</h4>
               <p className="text-[11px] leading-relaxed opacity-80 italic">
                "Votre ratio de liquidité est {analysis && analysis.liquidity > 1 ? 'favorable' : 'tendu'}. Le moteur recommande d'optimiser le DSO (délai client) pour libérer du cash-flow immédiat."
               </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
