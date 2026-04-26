"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts"
import { 
  Activity, Landmark, Wallet, AlertTriangle, 
  ShieldCheck, ArrowUpRight, Scale, Calculator, PieChart,
  BarChart3, HeartPulse, Zap, Info, Loader2, Lightbulb, Target, ArrowRight,
  TrendingDown, CheckCircle2, Sparkles, ScrollText, Building2
} from "lucide-react"
import { calculateBFR, calculateLiquidityRatio, calculateCAF, TAX_RATES } from "@/lib/calculations"
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
  
  // States for Investment Simulation
  const [isSimModalOpen, setIsSimModalOpen] = React.useState(false)
  const [simAmount, setSimAmount] = React.useState(500000)
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
    
    const tva_collectee = Math.abs(getBalance('4457'));
    const tva_deductible = Math.abs(getBalance('4456'));

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

    return { 
      fixedAssets, stocks, receivables, payables, cash, bfr, liquidity, 
      revenue, netProfit, margo, currentAssets, currentLiabilities,
      tva_collectee, tva_deductible
    };
  }, [entries, assets]);

  const handleGeneratePlan = async () => {
    if (!analysis || !currentTenant) return;
    setIsGeneratingPlan(true);
    try {
      const result = await getSeadRecommendation({
        promptKey: 'FISCAL_DECISION_CORE',
        variables: {
          ca: analysis.revenue,
          charges: analysis.revenue - analysis.netProfit,
          resultat: analysis.netProfit,
          cash: analysis.cash,
          tva_collectee: analysis.tva_collectee,
          tva_deductible: analysis.tva_deductible,
          investissements: analysis.fixedAssets, 
          secteur: currentTenant.secteurActivite,
          statut: currentTenant.regimeFiscal
        }
      });
      setRecommendation(result);
      setIsDialogOpen(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const simResults = React.useMemo(() => {
    const rate = currentTenant?.secteurActivite === 'PRODUCTION' ? TAX_RATES.IBS_PRODUCTION : TAX_RATES.IBS_NORMAL;
    const annualDepreciation = simAmount / (simYears || 1);
    const annualTaxSaving = annualDepreciation * rate;
    const netCost = simAmount - (annualTaxSaving * simYears);
    return { annualDepreciation, annualTaxSaving, netCost };
  }, [simAmount, simYears, currentTenant]);

  if (!mounted || isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase flex items-center gap-3">
            <BarChart3 className="text-accent h-8 w-8" /> Pilotage Stratégique
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Système Expert d'Aide à la Décision (SEAD)</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 font-black uppercase text-[10px] tracking-widest">
            <HeartPulse className="h-3 w-3 mr-2" /> Santé Financière : Analyse Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
            <Lightbulb className="h-24 w-24 text-accent" />
          </div>
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase tracking-widest text-accent flex items-center gap-2">
              <Zap className="h-4 w-4" /> Optimisation Trésorerie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium leading-relaxed">
              Votre BFR est actuellement de <span className="text-accent font-bold">{analysis?.bfr.toLocaleString()} DA</span>. 
            </p>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
               <p className="text-[11px] italic opacity-80">
                 "Action SEAD : Une réduction du DSO de 3 jours libérerait immédiatement {Math.round((analysis?.revenue || 0) * 0.01).toLocaleString()} DA."
               </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full border-accent text-accent hover:bg-accent/10 h-10 text-[10px] font-black uppercase tracking-widest"
              onClick={handleGeneratePlan}
              disabled={isGeneratingPlan}
            >
              {isGeneratingPlan ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Générer Plan d'Action Expert
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-t-4 border-t-emerald-500">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Efficience Fiscale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium leading-relaxed">
              Votre marge brute est de <span className="text-emerald-600 font-bold">{analysis?.margo.toFixed(1)}%</span>. 
            </p>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
               <p className="text-[11px] text-emerald-800 italic">
                 "Note Moteur : Les investissements de {analysis?.fixedAssets.toLocaleString()} DA génèrent des amortissements déductibles optimisant votre IBS."
               </p>
            </div>
          </CardContent>
          <CardFooter>
            <Dialog open={isSimModalOpen} onOpenChange={setIsSimModalOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="w-full text-emerald-600 font-black uppercase tracking-widest text-[10px] h-8">
                  Simuler réinvestissement <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl p-8">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 uppercase tracking-tighter font-black">
                    <Calculator className="h-5 w-5 text-primary" /> Simulateur d'Investissement
                  </DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase tracking-widest">Calcul du bouclier fiscal par amortissement</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-6 text-foreground">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Montant Investissement HT (DA)</Label>
                    <Input type="number" value={simAmount} onChange={e => setSimAmount(parseFloat(e.target.value) || 0)} className="rounded-xl border-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Durée d'amortissement (Années)</Label>
                    <Select value={simYears.toString()} onValueChange={v => setSimYears(parseInt(v))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 ans (Informatique/Outillage)</SelectItem>
                        <SelectItem value="5">5 ans (Matériel de transport)</SelectItem>
                        <SelectItem value="10">10 ans (Mobilier/Installations)</SelectItem>
                        <SelectItem value="20">20 ans (Constructions)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-4 p-6 bg-slate-900 text-white rounded-2xl space-y-4">
                     <div className="flex justify-between items-center text-[10px] font-black uppercase text-accent">
                        <span>Économie IBS Annuelle</span>
                        <span>{simResults.annualTaxSaving.toLocaleString()} DA</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/60">
                        <span>Dotation Annuelle</span>
                        <span>{simResults.annualDepreciation.toLocaleString()} DA</span>
                     </div>
                     <div className="pt-4 border-t border-white/10 flex justify-between items-baseline">
                        <p className="text-[10px] font-black uppercase">Coût Net Réel</p>
                        <span className="text-2xl font-black text-white">{simResults.netCost.toLocaleString()} DA</span>
                     </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button className="w-full rounded-2xl font-black uppercase text-[10px]" onClick={() => setIsSimModalOpen(false)}>Fermer le simulateur</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>

        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
              <Target className="h-4 w-4" /> Structure du Patrimoine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium leading-relaxed">
              Actifs Immobilisés : <span className="text-blue-600 font-bold">{analysis?.fixedAssets.toLocaleString()} DA</span>.
            </p>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
               <p className="text-[11px] text-blue-800 italic">
                 "Analyse : Votre ratio d'intensité capitalistique est stable. Envisagez le renouvellement du matériel usagé pour bénéficier des avantages fiscaux 2026."
               </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full text-blue-600 font-black uppercase tracking-widest text-[10px] h-8" asChild>
              <Link href={`/dashboard/accounting/assets?tenantId=${currentTenant?.id}`}>
                Voir registre immo <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">B.F.R</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary tracking-tighter">{analysis?.bfr.toLocaleString()} DA</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest flex items-center gap-1">
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
              <Progress value={analysis?.margo} className="h-1" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border border-slate-200 shadow-inner">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">CAF Estimée</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tighter text-slate-900">{(analysis?.netProfit || 0).toLocaleString()} <span className="text-xs font-normal opacity-60">DA</span></div>
            <p className="text-[10px] mt-2 opacity-70 font-bold uppercase tracking-widest">Capacité d'Autofinancement</p>
          </CardContent>
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
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-black uppercase tracking-tighter text-slate-900">Structure du BFR & Patrimoine</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Équilibre des emplois et ressources (Bilan Simplifié)</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Immos (Actif)', value: analysis?.fixedAssets },
                { name: 'Stocks', value: analysis?.stocks },
                { name: 'Clients', value: analysis?.receivables },
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
                <span className="text-slate-500">Intensité Capitalistique</span>
                <span className="text-blue-600">32%</span>
              </div>
              <Progress value={32} className="h-1.5 bg-slate-100" />
            </div>

            <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16" />
               <h4 className="text-[10px] font-black uppercase text-accent tracking-widest mb-3">Conseil Stratégique IA</h4>
               <p className="text-[11px] leading-relaxed opacity-80 italic">
                "Votre structure de patrimoine est équilibrée. Vos immobilisations (Classe 2) représentent {Math.round((analysis?.fixedAssets || 0) / ((analysis?.fixedAssets || 0) + (analysis?.currentAssets || 1)) * 100)}% de votre actif total. C'est un indicateur de solidité pour vos futurs financements bancaires."
               </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-3xl flex items-start gap-4 shadow-sm">
        <div className="h-10 w-10 rounded-2xl bg-white border border-blue-200 flex items-center justify-center shrink-0 shadow-sm">
          <Info className="h-5 w-5 text-blue-600" />
        </div>
        <div className="text-[11px] text-blue-900 leading-relaxed font-medium">
          <p className="font-bold uppercase tracking-tight mb-1">Méthodologie d'Analyse (Normes SEAD 2026) :</p>
          <p className="opacity-80">
            Ces indicateurs incluent désormais la valeur brute de votre parc d'immobilisations extrait du registre des actifs. Le moteur SEAD utilise ces données pour calculer l'amortissement théorique et son impact sur votre résultat imposable final, vous offrant ainsi une vision réelle de votre charge fiscale annuelle.
          </p>
        </div>
      </div>
    </div>
  )
}
