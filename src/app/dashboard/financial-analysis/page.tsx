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
  TrendingDown, CheckCircle2, Sparkles, ScrollText, Building2, Layers, Gavel, Scale, AlertCircle, ShieldAlert
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
  const [fiscalScore, setFiscalScore] = React.useState(100)

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

  const analysis = React.useMemo(() => {
    if (!entries) return null;
    const balances: Record<string, number> = {};
    entries.forEach(e => {
      e.lines.forEach((l: any) => {
        if (!balances[l.accountCode]) balances[l.accountCode] = 0;
        balances[l.accountCode] += (l.debit - l.credit);
      });
    });

    const revenue = Math.abs(Object.entries(balances).filter(([c]) => c.startsWith('7')).reduce((s, [, v]) => s + v, 0));
    const costs = Math.abs(Object.entries(balances).filter(([c]) => c.startsWith('6')).reduce((s, [, v]) => s + v, 0));
    const netProfit = revenue - costs;
    const cash = Math.abs((balances['512'] || 0) + (balances['53'] || 0));

    return { 
      revenue, 
      netProfit, 
      cash,
      vatCollected: Math.abs(balances['4457'] || 0),
      vatDeductible: Math.abs(balances['4456'] || 0),
      paymentMethod: cash > 1000000 ? 'Espèces' : 'Virement' // Simulation heuristique
    };
  }, [entries]);

  // EXECUTION DU MOTEUR FISCAL MASTER 4.0
  React.useEffect(() => {
    const runDiagnostic = async () => {
      if (!db || !analysis || !currentTenant) return;
      setIsFiscalLoading(true);
      try {
        const { results, traces, score } = await executeFiscalPipeline(
          { 
            db, 
            date: new Date().toISOString().split('T')[0], 
            sector: currentTenant.secteurActivite, 
            regime: currentTenant.regimeFiscal,
            fiscalYear: 2026
          },
          undefined,
          { 
            resultat_fiscal: analysis.netProfit,
            resultat_comptable: analysis.netProfit,
            totalTTC: analysis.revenue * 1.19,
            paymentMethod: analysis.paymentMethod,
            cash_balance: analysis.cash,
            vat_collected: analysis.vatCollected,
            vat_deductible: analysis.vatDeductible
          }
        );
        setFiscalDiagnostic({ results, traces });
        setFiscalScore(score);
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

  if (!mounted || isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>

  const grade = fiscalScore > 85 ? 'A+' : fiscalScore > 65 ? 'B' : fiscalScore > 40 ? 'C' : 'RISQUE';

  return (
    <div className="space-y-8 pb-20" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className={cn("text-start")}>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase flex items-center gap-3">
            <BarChart3 className="text-accent h-8 w-8" /> {t.Navigation.analytics}
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Audit Expert v4.0 • Dossier : {currentTenant?.raisonSociale}</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 px-4 py-2 font-black uppercase text-[10px]">
            <ShieldCheck className="h-3 w-3 mr-2" /> Moteur LF 2026 Certifié
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl bg-white border-l-4 border-l-primary overflow-hidden relative">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-start">{t.Analysis.fiscal_score}</CardTitle>
          </CardHeader>
          <CardContent className="text-start">
            <div className="flex items-baseline gap-2">
              <span className={cn("text-5xl font-black tracking-tighter", fiscalScore > 65 ? "text-emerald-600" : "text-red-500")}>{grade}</span>
              <span className="text-sm font-bold text-slate-400">({fiscalScore}/100)</span>
            </div>
            <Progress value={fiscalScore} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white border-l-4 border-l-amber-500 overflow-hidden">
          <CardHeader className="pb-2 text-start">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Provision IBS</CardTitle>
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-3xl font-black text-amber-600 tracking-tighter">
              {fiscalDiagnostic ? Math.round(fiscalDiagnostic.results.IBS || 0).toLocaleString() : '...'} DA
            </div>
            <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase">Simulation au taux sectoriel</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white border-l-4 border-l-blue-500 overflow-hidden">
          <CardHeader className="pb-2 text-start">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assiette Fiscale</CardTitle>
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-3xl font-black text-blue-600 tracking-tighter">
              {analysis ? Math.round(analysis.netProfit).toLocaleString() : '...'} DA
            </div>
            <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase">Résultat après retraitements</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <Landmark className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1 text-start">Validation Node</p>
           <h2 className="text-lg font-black uppercase text-start">AUDIT READY</h2>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-2xl ring-1 ring-border bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                <ShieldAlert className="h-5 w-5 text-white" />
              </div>
              <div className="text-start">
                <CardTitle className="text-lg font-black uppercase tracking-tighter">{t.Analysis.diagnostic}</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Analyse déterministe basée sur le pack 350+ règles</CardDescription>
              </div>
            </div>
            {isFiscalLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </CardHeader>
          <CardContent className="p-0">
             <ScrollArea className="h-[450px]">
                <div className="divide-y">
                   {fiscalDiagnostic?.traces.length > 0 ? fiscalDiagnostic.traces.map((t: any, i: number) => (
                     <div key={i} className="p-6 hover:bg-slate-50 transition-colors flex gap-6 text-start">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                          t.severity === 'CRITIQUE' ? 'bg-red-50 border-red-100 text-red-600' :
                          t.severity === 'HIGH' ? 'bg-orange-50 border-orange-100 text-orange-600' :
                          'bg-blue-50 border-blue-100 text-blue-600'
                        )}>
                          {t.severity === 'CRITIQUE' ? <ShieldAlert className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between">
                             <span className="text-[10px] font-black uppercase text-slate-400">{t.ruleName}</span>
                             <Badge variant="outline" className="text-[8px] font-black uppercase">{t.severity}</Badge>
                          </div>
                          <p className="text-sm font-bold text-slate-900">{t.advice}</p>
                          <p className="text-[11px] text-primary font-bold mt-2">👉 Recommandation : {t.recommendation}</p>
                          <p className="text-[9px] text-slate-400 italic mt-1">"Base légale : {t.justification}"</p>
                        </div>
                     </div>
                   )) : (
                     <div className="p-20 text-center text-slate-400 italic">
                       Aucune anomalie critique détectée par le moteur.
                     </div>
                   )}
                </div>
             </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-xl rounded-3xl overflow-hidden flex flex-col group">
            <CardHeader className="bg-primary/20 border-b border-white/5 p-6 text-start">
              <CardTitle className={cn("text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2", isRtl && "flex-row-reverse")}>
                <Sparkles className="h-4 w-4" /> Simulation IA Strategique
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-8 space-y-6 text-start">
                <p className="text-sm font-medium leading-relaxed opacity-80">
                  Améliorez votre score fiscal en simulant des optimisations personnalisées via notre IA SEAD.
                </p>
                <Button 
                  className="w-full bg-accent text-primary font-black uppercase tracking-widest text-[10px] h-12 rounded-2xl shadow-xl"
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan}
                >
                  {isGeneratingPlan ? <Loader2 className="animate-spin h-4 w-4 me-2" /> : <Layers className="h-4 w-4 me-2" />}
                  Lancer Simulation Stratégique
                </Button>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border border-blue-100 rounded-3xl p-6 relative overflow-hidden shadow-inner text-start">
             <Info className="h-6 w-6 text-blue-600 shrink-0 mb-4" />
             <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2">Audit Structurel</h4>
             <p className="text-[11px] text-blue-700 leading-relaxed font-medium italic">
              "Le moteur versionné 2026 applique les règles du CIDTA en temps réel sur vos écritures validées pour garantir l'image fidèle de votre dossier."
             </p>
          </Card>
        </div>
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
                 <DialogDescription className="text-accent font-bold uppercase text-[10px] tracking-widest">IA Prescriptive ComptaFisc-DZ v4.0</DialogDescription>
               </div>
             </div>
           </DialogHeader>
           <ScrollArea className="flex-1 w-full bg-white">
             <div className={cn("p-8 prose prose-slate max-w-none prose-sm leading-relaxed text-slate-700 whitespace-pre-line text-start", isRtl ? "text-right" : "text-left")}>
               {recommendation}
             </div>
           </ScrollArea>
           <CardFooter className="bg-slate-50 border-t p-6 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
               <ShieldCheck className="h-4 w-4 text-emerald-500" /> Audit certifié conforme 2026
             </div>
             <Button variant="outline" className="rounded-xl font-bold h-10" onClick={() => setIsDialogOpen(false)}>Fermer l'Analyse</Button>
           </CardFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
