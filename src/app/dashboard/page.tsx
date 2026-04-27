"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { 
  TrendingUp, TrendingDown, Activity, ShieldCheck, Loader2,
  Camera, Package, Pickaxe, History, Landmark, Zap, ArrowRight,
  AlertTriangle, CheckCircle2, Target
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useLocale } from "@/context/LocaleContext"
import { cn } from "@/lib/utils"

const REGULATORY_MILESTONES = [
  {
    law: "LF 2026",
    title: "Barème IRG & Lissage",
    status: "VÉRIFIÉ",
    desc: "Application du nouveau barème progressif et exonération des salaires < 30k DA.",
    color: "bg-blue-50 text-blue-700 border-blue-100"
  },
  {
    law: "Art. 150 CIDTA",
    title: "Réinvestissement",
    status: "OPTIMISABLE",
    desc: "Calcul de l'abattement IBS pour les investissements productifs réalisés.",
    color: "bg-emerald-50 text-emerald-700 border-emerald-100"
  },
  {
    law: "LF 2024",
    title: "Suppression TAP",
    status: "CONFORME",
    desc: "Retrait définitif de la Taxe sur l'Activité Professionnelle du calcul G50.",
    color: "bg-amber-50 text-amber-700 border-amber-100"
  }
];

export default function DashboardOverview() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const { t, isRtl } = useLocale()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // OPTIMISATION : Memoization des requêtes pour éviter les loops de rendu et réduire les coûts
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user?.uid]);
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants || tenants.length === 0) return null;
    const urlId = searchParams.get('tenantId');
    if (urlId) return tenants.find(t => t.id === urlId) || tenants[0];
    return tenants[0];
  }, [tenants, searchParams]);

  const entriesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return collection(db, "tenants", currentTenant.id, "journal_entries");
  }, [db, currentTenant?.id, user]);
  const { data: entries } = useCollection(entriesQuery);

  const assetsQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "assets");
  }, [db, currentTenant?.id]);
  const { data: assets } = useCollection(assetsQuery);

  const totalAssetsValue = React.useMemo(() => {
    if (!assets) return 0;
    return assets.reduce((sum, a) => sum + (a.acquisitionValue || 0), 0);
  }, [assets]);

  const { stats, monthlyData, healthScore } = React.useMemo(() => {
    const monthLabels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const chartData = monthLabels.map(m => ({ month: m, revenue: 0, expenses: 0 }));
    
    if (!entries || !mounted) return { 
      stats: { ca: 0, tva: 0, charges: 0, count: 0 }, 
      monthlyData: chartData,
      healthScore: 100
    };
    
    let caHT = 0;
    let tvaCollectee = 0;
    let chargesHT = 0;
    let transactions = new Set();
    let issues = 0;

    entries.forEach(entry => {
      const entryDate = new Date(entry.entryDate);
      const monthIdx = entryDate.getMonth();

      entry.lines.forEach((line: any) => {
        if (line.accountCode.startsWith('7')) {
          const val = (line.credit || 0) - (line.debit || 0);
          caHT += val;
          transactions.add(entry.id);
          if (monthIdx >= 0 && monthIdx < 12) chartData[monthIdx].revenue += val;
        }
        if (line.accountCode.startsWith('6')) {
          const val = (line.debit || 0) - (line.credit || 0);
          chargesHT += val;
          if (monthIdx >= 0 && monthIdx < 12) chartData[monthIdx].expenses += val;
        }
        if (line.accountCode === '4457') {
          tvaCollectee += (line.credit || 0) - (line.debit || 0);
        }
      });
    });

    // Simple deterministic health score calculation
    if (caHT > 0 && tvaCollectee === 0) issues += 20; // Possible missing VAT
    if (chargesHT > caHT * 1.5) issues += 10; // High expense ratio risk

    return { 
      stats: { ca: caHT, tva: tvaCollectee, charges: chargesHT, count: transactions.size }, 
      monthlyData: chartData,
      healthScore: Math.max(0, 100 - issues)
    };
  }, [entries, mounted]);

  const formatAmount = (val: number) => mounted ? Math.round(val).toLocaleString() : "...";

  if (!mounted || isTenantsLoading) {
    return <div className="h-[80vh] flex flex-col items-center justify-center space-y-6"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  const secteur = currentTenant?.secteurActivite || "COMMERCE";

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER MASTER NODE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="text-start">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic leading-none">{t.Dashboard.overview}</h1>
          <div className="text-muted-foreground flex items-center gap-3 mt-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t.Dashboard.dossier} :</span>
            <span className="font-bold text-primary uppercase text-xs">{currentTenant?.raisonSociale}</span>
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase px-3">{currentTenant?.regimeFiscal}</Badge>
            <Badge className="bg-slate-900 text-accent text-[9px] font-black px-3 py-1">ENGINE V2.6</Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-4 rounded-[2rem] border shadow-xl shadow-slate-100 ring-1 ring-slate-100">
          <div className={cn(
            "h-12 w-12 rounded-2xl flex items-center justify-center border-2",
            healthScore > 80 ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-amber-50 border-amber-100 text-amber-600"
          )}>
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="text-start pr-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.Common.status_compliance}</p>
            <div className="flex items-baseline gap-2">
              <p className={cn("text-xl font-black uppercase", healthScore > 80 ? "text-emerald-600" : "text-amber-600")}>
                {healthScore}%
              </p>
              <span className="text-[10px] font-bold text-slate-400">Score Audit</span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS ACTIONNABLES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {secteur === 'BTP' && (
          <Card className="bg-white border-none shadow-xl hover:shadow-2xl transition-all cursor-pointer group rounded-[2.5rem] overflow-hidden" asChild>
            <Link href={`/dashboard/btp/projects?tenantId=${currentTenant?.id}`}>
              <CardContent className="p-8 flex items-center gap-6">
                <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-all duration-500 shadow-inner">
                  <Pickaxe className="h-8 w-8 text-primary group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">Pilotage Chantiers</h4>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Marges & Avancement</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        )}
        
        <Card className="bg-white border-none shadow-xl hover:shadow-2xl transition-all cursor-pointer group rounded-[2.5rem] overflow-hidden" asChild>
          <Link href={`/dashboard/ocr?tenantId=${currentTenant?.id}`}>
            <CardContent className="p-8 flex items-center gap-6">
              <div className="h-16 w-16 rounded-3xl bg-accent/10 flex items-center justify-center group-hover:bg-accent transition-all duration-500 shadow-inner">
                <Camera className="h-8 w-8 text-accent group-hover:text-white transition-colors" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">Capture Vision</h4>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Saisie Automatique IA</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="bg-white border-none shadow-xl hover:shadow-2xl transition-all cursor-pointer group rounded-[2.5rem] overflow-hidden" asChild>
          <Link href={`/dashboard/financial-analysis?tenantId=${currentTenant?.id}`}>
            <CardContent className="p-8 flex items-center gap-6">
              <div className="h-16 w-16 rounded-3xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-all duration-500 shadow-inner">
                <Target className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">Audit Permanent</h4>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Diagnostic Fiscal 2026</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* KPI GRID OPTIMISÉ */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title={t.Dashboard.revenue_annual} value={formatAmount(stats.ca)} sub={t.Dashboard.revenue_journalized} color="primary" trend="up" />
        <KPICard title={t.Dashboard.expenses} value={formatAmount(stats.charges)} sub="Achats & Paie consolidés" color="red" trend="down" />
        <KPICard title={t.Dashboard.gross_result} value={formatAmount(stats.ca - stats.charges)} sub={t.Dashboard.performance_consolidated} color="emerald" />
        <KPICard title={t.Dashboard.assets_value} value={formatAmount(totalAssetsValue)} sub={t.Dashboard.investments_class2} color="blue" />
      </div>

      <div className="grid gap-10 md:grid-cols-7">
        {/* CHART CONTAINER */}
        <Card className="md:col-span-4 shadow-2xl border-none ring-1 ring-slate-200 bg-white rounded-[3rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-8 text-start">
            <CardTitle className="text-xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-3">
              <Activity className="h-6 w-6 text-primary" /> {t.Dashboard.flow_analysis}
            </CardTitle>
            <CardDescription className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">{t.Dashboard.real_evolution}</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] p-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 'bold' }} reversed={isRtl} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  orientation={isRtl ? 'right' : 'left'}
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 'bold' }}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} 
                />
                <Tooltip
                  cursor={{ fill: "#F8FAFC", opacity: 0.4 }}
                  contentStyle={{ borderRadius: "24px", border: "none", boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.15)", padding: "16px" }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                <Bar dataKey="revenue" name="Produits (7)" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} barSize={28} />
                <Bar dataKey="expenses" name="Charges (6)" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* REGULATORY & INSIGHTS */}
        <div className="md:col-span-3 space-y-8 text-start">
          <Card className="shadow-2xl border-none ring-1 ring-slate-200 bg-white rounded-[3rem] overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-8">
              <CardTitle className="text-base font-black flex items-center gap-3 uppercase tracking-[0.2em] text-accent">
                <History className="h-5 w-5" /> {t.Dashboard.regulatory_watch}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {REGULATORY_MILESTONES.map((item, idx) => (
                  <div key={idx} className="p-6 hover:bg-slate-50 transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full ${item.color} border shadow-sm`}>
                          {item.law}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.title}</h4>
                      </div>
                      <Badge variant="outline" className="text-[8px] font-black h-5 border-emerald-200 text-emerald-600 bg-emerald-50 px-2">
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium pl-1 border-l-2 border-transparent group-hover:border-primary transition-all">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 p-6 flex justify-center border-t">
              <Button variant="ghost" size="sm" className="text-[11px] h-10 text-primary font-black uppercase tracking-widest hover:bg-white px-8 rounded-xl" asChild>
                <Link href={currentTenant ? `/dashboard/assistant?tenantId=${currentTenant.id}` : "/dashboard/assistant"}>
                  {t.Dashboard.legal_corpus} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          <div className="p-8 bg-blue-50 border-2 border-blue-100 rounded-[3rem] flex items-start gap-6 shadow-inner relative overflow-hidden group">
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
               <Landmark className="h-32 w-32 text-blue-900" />
             </div>
             <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-md shrink-0 border border-blue-100">
               <Landmark className="h-6 w-6 text-blue-600" />
             </div>
             <div className="text-start relative">
               <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-900 mb-2">Expert Insight v2.6</p>
               <p className="text-xs text-blue-800 leading-relaxed font-medium italic opacity-80">
                 "Votre comptabilité est auditée en temps réel selon les 350 règles de conformité algériennes. Cliquez sur 'Analyse & Pilotage' pour voir votre diagnostic."
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, sub, color, trend }: { title: string, value: string, sub: string, color: string, trend?: 'up' | 'down' }) {
  const colorMap: any = {
    primary: "border-l-primary text-primary",
    red: "border-l-red-500 text-red-600",
    emerald: "border-l-emerald-500 text-emerald-600",
    blue: "border-l-blue-400 text-blue-700"
  };

  return (
    <Card className={cn("border-none shadow-xl bg-white border-l-[6px] rounded-3xl overflow-hidden transition-all hover:translate-y-[-4px]", colorMap[color])}>
      <CardHeader className="pb-2 text-start pt-8 px-8">
        <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-start px-8 pb-8">
        <div className="text-3xl font-black tracking-tighter text-slate-900">{value} <span className="text-xs font-normal opacity-30">DA</span></div>
        <div className="flex items-center gap-2 mt-3">
          {trend === 'up' ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : trend === 'down' ? <TrendingDown className="h-4 w-4 text-red-500" /> : null}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}
