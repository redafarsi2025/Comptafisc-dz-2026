/**
 * @fileOverview Analyse Financière & Pilotage Stratégique (SEAD) + Conseiller Fiscal Master.
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
  TrendingDown, CheckCircle2, Sparkles, ScrollText, Building2, Layers, Gavel, Scale
} from "lucide-react"
import { calculateBFR, calculateLiquidityRatio, simulateInvestmentScenarios, getIBSRate } from "@/lib/calculations"
import { useSearchParams } from "next/navigation"
import { getSeadRecommendation } from "@/ai/flows/sead-decision-flow"
import { executeFiscalPipeline } from "@/lib/fiscal-engine"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLocale } from "@/context/LocaleContext"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function FinancialAnalysisPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { t, isRtl } = useLocale()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isGeneratingPlan, setIsGeneratingPlan] = React.useState(false)
  const [recommendation, setRecommendation] = React.useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  
  // Fiscal Advisor State
  const [isFiscalLoading, setIsFiscalLoading] = React.useState(false)
  const [fiscalDiagnostic, setFiscalDiagnostic] = React.useState<any>(null)

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

    // Extraction des charges non déductibles (Compte 671)
    const reintegrations = Math.abs(getBalance('671'));
    const vatCollected = Math.abs(getBalance('4457'));
    const vatDeductible = Math.abs(getBalance('4456'));

    return { fixedAssets, stocks, receivables, payables, cash, bfr, liquidity, revenue, netProfit, reintegrations, vatCollected, vatDeductible, margo: revenue > 0 ? (netProfit / revenue) * 100 : 0 };
  }, [entries, assets]);

  // EXECUTION DU MOTEUR FISCAL MASTER
  React.useEffect(() => {
    const runDiagnostic = async () => {
      if (!db || !analysis || !currentTenant) return;
      setIsFiscalLoading(true);
      try {
        const { results, traces } = await executeFiscalPipeline(
          { 
            db, 
            date: new Date().toISOString().split('T')[0], 
            sector: currentTenant.secteurActivite, 
            regime: currentTenant.regimeFiscal 
          },
          'FISCAL',
          { 
            resultat_fiscal: analysis.netProfit + analysis.reintegrations,
            totalTTC: analysis.revenue * 1.19,
            paymentMethod: 'Virement'
          }
        );
        setFiscalDiagnostic({ results, traces });
      } finally {
        setIsFiscalLoading(false);
      }
    };
    runDiagnostic();
  }, [db, analysis, currentTenant]);

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
    <div className="space-y-8 pb-20" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className={cn("text-start")}>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase flex items-center gap-3">
            <BarChart3 className="text-accent h-8 w-8" /> {t.Navigation.analytics}
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Niveau Master - Jumeau Numérique Financier</p>
        </div>
        <div className="flex gap-2">
          <Badge className={cn("px-4 py-2 font-black uppercase text-[10px] tracking-widest shadow-sm bg-primary/10 text-primary border-primary/20", isRtl && "flex-row-reverse")}>
            <ShieldCheck className={cn("h-3 w-3", isRtl ? "ml-2" : "mr-2")} /> {t.Common.status_compliance}: {t.Common.certified}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-2xl ring-1 ring-border bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Gavel className="h-5 w-5 text-white" />
              </div>
              <div className="text-start">
                <CardTitle className="text-lg font-black uppercase tracking-tighter">{t.Analysis.diagnostic}</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Audit automatique basé sur le Livre-Journal</CardDescription>
              </div>
            </div>
            {isFiscalLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </CardHeader>
          <CardContent className="p-8 grid md:grid-cols-2 gap-12">
             <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase">{t.Analysis.accounting_profit}</span>
                  <span className="text-sm font-black text-slate-900">{analysis?.netProfit.toLocaleString()} DA</span>
                </div>
                <div className="flex justify-between items-center border-b pb-4">
                  <span className="text-xs font-bold text-amber-600 uppercase flex items-center gap-2">
                    <TrendingDown className="h-3 w-3" /> {t.Analysis.reintegrations}
                  </span>
                  <span className="text-sm font-black text-amber-600">+{analysis?.reintegrations.toLocaleString()} DA</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-black text-primary uppercase">{t.Analysis.fiscal_profit}</span>
                  <Badge className="h-8 px-4 text-sm font-black bg-primary text-white">
                    {( (analysis?.netProfit || 0) + (analysis?.reintegrations || 0) ).toLocaleString()} DA
                  </Badge>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                   <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                   <p className="text-[10px] text-blue-800 leading-relaxed font-medium italic text-start">
                    "Les réintégrations incluent automatiquement les montants portés au débit du compte 671 (Amendes et pénalités) conformément à l'Art. 141 du CIDTA."
                   </p>
                </div>
             </div>

             <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Scale className="h-20 w-20" /></div>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-accent">
                        <span>{t.Analysis.tax_pressure}</span>
                        <span>{fiscalDiagnostic ? ((fiscalDiagnostic.results.IBS / (analysis?.netProfit || 1)) * 100).toFixed(1) : '...'}%</span>
                      </div>
                      <Progress value={fiscalDiagnostic ? (fiscalDiagnostic.results.IBS / (analysis?.netProfit || 1)) * 100 : 0} className="h-1 bg-white/10" />
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-blue-400">
                        <span>{t.Analysis.vat_ratio}</span>
                        <span>{analysis ? ((analysis.vatDeductible / (analysis.vatCollected || 1)) * 100).toFixed(1) : '...'}%</span>
                      </div>
                      <Progress value={analysis ? (analysis.vatDeductible / (analysis.vatCollected || 1)) * 100 : 0} className="h-1 bg-white/10" />
                   </div>
                   <div className="pt-4 border-t border-white/5">
                      <Badge className={cn("w-full h-8 flex justify-center text-[10px] font-black tracking-widest", (analysis?.reintegrations || 0) > ((analysis?.netProfit || 0) * 0.05) ? "bg-red-500" : "bg-emerald-500")}>
                        <ShieldCheck className="h-3 w-3 mr-2" /> 
                        {(analysis?.reintegrations || 0) > ((analysis?.netProfit || 0) * 0.05) ? t.Analysis.risk_medium : t.Analysis.risk_low}
                      </Badge>
                   </div>
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 border-none shadow-xl ring-1 ring-border bg-white rounded-3xl overflow-hidden flex flex-col">
          <CardHeader className="bg-emerald-50 border-b border-emerald-100 p-6">
            <CardTitle className={cn("text-sm font-black uppercase tracking-widest text-emerald-900 flex items-center gap-2", isRtl && "flex-row-reverse")}>
              <Lightbulb className="h-4 w-4" /> {t.Analysis.recommendations}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-6 space-y-4">
             <ScrollArea className="h-[300px] pe-4">
                <div className="space-y-4">
                   {(analysis?.reintegrations || 0) > 0 && (
                     <div className="p-4 bg-slate-50 rounded-2xl border-s-4 border-s-amber-500 space-y-2 text-start">
                        <p className="text-[10px] font-black uppercase text-amber-700">Optimisation IBS</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">Réduire les charges non déductibles (671) pour abaisser le résultat fiscal.</p>
                     </div>
                   )}
                   {analysis && analysis.vatDeductible < analysis.vatCollected * 0.2 && (
                     <div className="p-4 bg-slate-50 rounded-2xl border-s-4 border-s-primary space-y-2 text-start">
                        <p className="text-[10px] font-black uppercase text-primary">Gestion de TVA</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">Récupération de TVA faible. Vérifiez la validité fiscale des factures fournisseurs.</p>
                     </div>
                   )}
                   <div className="p-4 bg-emerald-50/50 rounded-2xl border-s-4 border-s-emerald-500 space-y-2 text-start">
                      <p className="text-[10px] font-black uppercase text-emerald-700">Investissement Pro</p>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">Utiliser le levier de réinvestissement (Art. 150 CIDTA) pour réduire l'IBS de 5%.</p>
                   </div>
                </div>
             </ScrollArea>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t p-4">
             <Button className="w-full bg-primary text-white font-black uppercase text-[10px] tracking-widest h-10" asChild>
                <Link href={`/dashboard/declarations?tenantId=${currentTenant?.id}`}>Accéder aux G50 <ArrowRight className={cn("h-3 w-3", isRtl ? "mr-2 rotate-180" : "ml-2")} /></Link>
             </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
            <Zap className="h-24 w-24 text-accent" />
          </div>
          <CardHeader className="text-start">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-accent flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Décisions Stratégiques
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-start">
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
              {isGeneratingPlan ? <Loader2 className="animate-spin h-4 w-4 me-2" /> : <Layers className="h-4 w-4 me-2" />}
              Lancer Simulation IA
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-t-4 border-t-emerald-500">
          <CardHeader className="text-start">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
              <Calculator className="h-4 w-4" /> Optimisation Fiscale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-start">
             <p className="text-sm font-bold">Améliorez votre ROI de {(analysis?.margo || 0).toFixed(1)}%</p>
             <div className="p-3 bg-emerald-50 rounded-xl text-[11px] text-emerald-800 italic">
               "Note : Le réinvestissement dans des actifs productifs réduit votre base IBS de 5% à 10% (Art. 150 CIDTA)."
             </div>
          </CardContent>
          <CardFooter>
            <Dialog open={isSimModalOpen} onOpenChange={setIsSimModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-emerald-500 text-emerald-600 font-black uppercase tracking-widest text-[10px] h-10">
                  Comparer Scénarios d'Investissement <ArrowRight className={cn("h-3 w-3", isRtl ? "mr-2 rotate-180" : "ml-2")} />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl rounded-3xl p-8">
                <DialogHeader className="text-start">
                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Simulateur de Scénarios Dynamiques</DialogTitle>
                  <DialogDescription className="uppercase text-[9px] font-bold tracking-widest">Optimisation du mode d'acquisition (Pro Level)</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-6">
                  <div className="space-y-6 text-start">
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
                        <h4 className="text-xs font-black uppercase text-accent border-b border-white/10 pb-2 text-start">Verdict Master : Achat vs Leasing</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1 text-start">
                              <p className="text-[8px] uppercase font-bold text-slate-400">Scénario Achat Direct</p>
                              <p className="text-lg font-black">-{simResults.purchase.netCost.toLocaleString()} DA</p>
                              <p className="text-[9px] text-emerald-400">Gain fiscal : {simResults.purchase.totalTaxSaving.toLocaleString()} DA</p>
                           </div>
                           <div className={cn("space-y-1 border-white/10 ps-4 text-start", isRtl ? "border-e" : "border-s")}>
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
                <DialogFooter><Button className="w-full rounded-2xl h-12 font-bold" onClick={() => setIsSimModalOpen(false)}>Fermer le Simulateur</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>

        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-t-4 border-t-blue-500">
          <CardHeader className="text-start">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Patrimoine & V.N.C
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-start">
            <p className="text-sm">Valeur brute immobilisée : <span className="font-black text-blue-600">{analysis?.fixedAssets.toLocaleString()} DA</span></p>
            <div className="p-3 bg-blue-50 rounded-xl text-[11px] text-blue-800 italic">
              Extraction réelle depuis votre registre de classe 2.
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full text-blue-600 font-black uppercase tracking-widest text-[10px] h-10" asChild>
              <Link href={`/dashboard/accounting/assets?tenantId=${currentTenant?.id}`}>Accéder au Registre Immo <ArrowRight className={cn("h-3 w-3", isRtl ? "mr-2 rotate-180" : "ml-2")} /></Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 border-none shadow-2xl rounded-3xl overflow-hidden">
           <DialogHeader className={cn("bg-slate-900 text-white p-8 shrink-0", isRtl ? "text-right" : "text-left")}>
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
             <div className={cn("p-8 prose prose-slate max-w-none prose-sm leading-relaxed text-slate-700 whitespace-pre-line", isRtl ? "text-right" : "text-left")}>
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
          <CardHeader className="bg-slate-50 border-b p-6 text-start">
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 'bold' }} reversed={isRtl} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 'bold' }} orientation={isRtl ? "right" : "left"} />
                <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#0C55CC" radius={[4, 4, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-2xl border-none ring-1 ring-border bg-white p-6">
          <CardHeader className="p-0 mb-6 text-start"><CardTitle className="text-lg font-black uppercase tracking-tighter">Scorecard Décisionnel</CardTitle></CardHeader>
          <CardContent className="p-0 space-y-6">
            <div className="space-y-2 text-start">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-slate-500">B.F.R (Bilan)</span>
                <span className="text-primary font-bold">{analysis?.bfr.toLocaleString()} DA</span>
              </div>
              <Progress value={65} className="h-1.5" />
            </div>
            <div className="space-y-2 text-start">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-emerald-600 font-bold">Liquidity Ratio</span>
                <span className="text-emerald-600 font-bold">{analysis?.liquidity.toFixed(2)}</span>
              </div>
              <Progress value={analysis ? (analysis.liquidity * 50) : 0} className="h-1.5 bg-slate-100" />
            </div>

            <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden text-start">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16" />
               <h4 className="text-[10px] font-black uppercase text-accent tracking-widest mb-3">{t.Analysis.audit_trace}</h4>
               <p className="text-[11px] leading-relaxed opacity-80 italic">
                {fiscalDiagnostic?.traces?.[0]?.justification || "Audit Master Node en attente de données."}
               </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
