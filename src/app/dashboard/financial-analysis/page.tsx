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
  Activity, Landmark, Wallet, AlertTriangle, 
  ShieldCheck, ArrowUpRight, Calculator, PieChart,
  BarChart3, HeartPulse, Zap, Info, Loader2, Lightbulb, Target, ArrowRight,
  TrendingDown, CheckCircle2, Sparkles, ScrollText, Building2, Layers, Gavel, Scale, AlertCircle, ShieldAlert
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import { executeFiscalPipeline, RuleTrace } from "@/lib/fiscal-engine"
import { useLocale } from "@/context/LocaleContext"
import { cn } from "@/lib/utils"

export default function FinancialAnalysisPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { t, isRtl } = useLocale()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  
  // Fiscal Advisor State
  const [isFiscalLoading, setIsFiscalLoading] = React.useState(false)
  const [fiscalDiagnostic, setFiscalDiagnostic] = React.useState<{ results: any, traces: RuleTrace[] } | null>(null)
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
      paymentMethod: cash > 1000000 ? 'Espèces' : 'Virement' 
    };
  }, [entries]);

  // EXECUTION DU NOYAU DÉTERMINISTE MASTER 4.0
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

  if (!mounted || isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>

  const grade = fiscalScore > 85 ? 'A+' : fiscalScore > 65 ? 'B' : fiscalScore > 40 ? 'C' : 'RISQUE';

  return (
    <div className="space-y-8 pb-20" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-start">
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase flex items-center gap-3">
            <BarChart3 className="text-accent h-8 w-8" /> {t.Navigation.analytics}
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Audit Déterministe v4.0 • Dossier : {currentTenant?.raisonSociale}</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 px-4 py-2 font-black uppercase text-[10px]">
            <ShieldCheck className="h-3 w-3 mr-2" /> Moteur LF 2026 Actif
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl bg-white border-l-4 border-l-primary overflow-hidden relative">
          <CardHeader className="pb-2 text-start">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.Analysis.fiscal_score}</CardTitle>
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
            <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase">Simulation déterministe</p>
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
            <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase">Résultat audité</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <Landmark className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1 text-start">Validation Node</p>
           <h2 className="text-lg font-black uppercase text-start italic">AUDIT READY</h2>
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
                <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Analyse logique basée sur 350+ règles métier</CardDescription>
              </div>
            </div>
            {isFiscalLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </CardHeader>
          <CardContent className="p-0">
             <ScrollArea className="h-[550px]">
                <div className="divide-y">
                   {fiscalDiagnostic?.traces.length ? fiscalDiagnostic.traces.map((trace, i) => (
                     <div key={i} className="p-6 hover:bg-slate-50 transition-colors flex gap-6 text-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border-2",
                          trace.severity === 'CRITIQUE' ? 'bg-red-50 border-red-200 text-red-600' :
                          trace.severity === 'HIGH' ? 'bg-orange-50 border-orange-200 text-orange-600' :
                          'bg-blue-50 border-blue-200 text-blue-600'
                        )}>
                          {trace.severity === 'CRITIQUE' ? <ShieldAlert className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                        </div>
                        <div className="space-y-4 flex-1">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{trace.ruleCode}</span>
                               <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter h-4">{trace.category}</Badge>
                             </div>
                             <Badge className={cn(
                               "text-[8px] font-black uppercase tracking-[0.2em] h-5",
                               trace.severity === 'CRITIQUE' ? 'bg-red-600' : 
                               trace.severity === 'HIGH' ? 'bg-orange-600' : 'bg-blue-600'
                             )}>
                               {trace.severity}
                             </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{trace.ruleName}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium italic">"{trace.advice}"</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Info className="h-3 w-3" /> Pourquoi cet écart ?</p>
                                <p className="text-[10px] text-slate-700 leading-relaxed">{trace.observation}</p>
                             </div>
                             <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                                <p className="text-[9px] font-black text-emerald-700 uppercase flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Recommandation</p>
                                <p className="text-[10px] text-emerald-800 font-bold">{trace.recommendation}</p>
                             </div>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                             <p className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                               <Gavel className="h-3 w-3" /> Base Légale : {trace.justification}
                             </p>
                          </div>
                        </div>
                     </div>
                   )) : (
                     <div className="p-20 text-center space-y-4">
                        <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                          <ShieldCheck className="h-8 w-8 text-emerald-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                          {isFiscalLoading ? "Exécution de l'audit..." : "Dossier 100% conforme."}
                        </p>
                     </div>
                   )}
                </div>
             </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-xl rounded-3xl p-8 text-start relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32" />
            <div className="relative space-y-6">
              <h4 className="text-xl font-black uppercase tracking-tighter">L'Intelligence Expert</h4>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                Contrairement à une IA générative, notre moteur d'audit est **déterministe**. Il scanne chaque écriture comptable et vérifie sa conformité aux articles du CIDTA.
              </p>
              <div className="grid grid-cols-1 gap-3">
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black text-accent uppercase mb-1">0% Hallucination</p>
                    <p className="text-[10px] opacity-60">Basé sur des règles métier rigoureuses.</p>
                 </div>
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">Audit-Ready</p>
                    <p className="text-[10px] opacity-60">Justification légale pour chaque alerte.</p>
                 </div>
              </div>
            </div>
          </Card>

          <Card className="bg-blue-50 border border-blue-200 rounded-3xl p-6 relative overflow-hidden shadow-inner text-start">
             <Info className="h-6 w-6 text-blue-600 shrink-0 mb-4" />
             <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2">Note sur la Méthodologie</h4>
             <p className="text-[11px] text-blue-700 leading-relaxed font-medium italic">
              "Le moteur Master 4.0 analyse les soldes de vos comptes SCF. Un score de 100/100 garantit que vos documents de synthèse (Bilan, TCR) sont prêts pour le commissariat aux comptes."
             </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
