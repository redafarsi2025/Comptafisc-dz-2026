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
  Camera, Package, Pickaxe, History, Landmark, Zap, ArrowRight
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useLocale } from "@/context/LocaleContext"

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

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants || tenants.length === 0) return null;
    const urlId = searchParams.get('tenantId');
    if (urlId) return tenants.find(t => t.id === urlId) || tenants[0];
    return tenants[0];
  }, [tenants, searchParams]);

  const entriesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(collection(db, "tenants", currentTenant.id, "journal_entries"));
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

  const { stats, monthlyData } = React.useMemo(() => {
    const monthLabels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const chartData = monthLabels.map(m => ({ month: m, revenue: 0, expenses: 0 }));
    
    if (!entries || !mounted) return { 
      stats: { ca: 0, tva: 0, charges: 0, count: 0 }, 
      monthlyData: chartData 
    };
    
    let caHT = 0;
    let tvaCollectee = 0;
    let chargesHT = 0;
    let transactions = new Set();

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

    return { 
      stats: { ca: caHT, tva: tvaCollectee, charges: chargesHT, count: transactions.size }, 
      monthlyData: chartData 
    };
  }, [entries, mounted]);

  const formatAmount = (val: number) => mounted ? Math.round(val).toLocaleString() : "...";

  if (!mounted || isTenantsLoading) {
    return <div className="h-[80vh] flex flex-col items-center justify-center space-y-6"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  const secteur = currentTenant?.secteurActivite || "COMMERCE";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic leading-none">{t.Dashboard.overview}</h1>
          <div className="text-muted-foreground flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold uppercase tracking-widest">{t.Dashboard.dossier} :</span>
            <span className="font-bold text-primary uppercase text-xs">{currentTenant?.raisonSociale}</span>
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase">{currentTenant?.regimeFiscal}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="text-start">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.Common.status_compliance}</p>
            <p className="text-sm font-black text-emerald-600 uppercase">{t.Common.certified}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {secteur === 'BTP' && (
          <Card className="bg-white border-2 border-primary/10 shadow-xl hover:shadow-2xl transition-all cursor-pointer group" asChild>
            <Link href={`/dashboard/btp/projects?tenantId=${currentTenant?.id}`}>
              <CardContent className="p-6 flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                  <Pickaxe className="h-7 w-7 text-primary group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-tight">{t.Dashboard.new_project}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.Dashboard.open_project}</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        )}
        
        <Card className="bg-white border-2 border-accent/10 shadow-xl hover:shadow-2xl transition-all cursor-pointer group" asChild>
          <Link href={`/dashboard/ocr?tenantId=${currentTenant?.id}`}>
            <CardContent className="p-6 flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent transition-colors">
                <Camera className="h-7 w-7 text-accent group-hover:text-white transition-colors" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 uppercase tracking-tight">{t.Dashboard.scan_invoice}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.Dashboard.quick_ocr}</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="bg-white border-2 border-blue-100 shadow-xl hover:shadow-2xl transition-all cursor-pointer group" asChild>
          <Link href={`/dashboard/inventory/stock?tenantId=${currentTenant?.id}`}>
            <CardContent className="p-6 flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <Package className="h-7 w-7 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 uppercase tracking-tight">{t.Dashboard.stock_management}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.Dashboard.control_refs}</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-lg bg-white border-l-4 border-l-primary overflow-hidden">
          <CardHeader className="pb-2 text-start">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.Dashboard.revenue_annual}</CardTitle>
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-2xl font-black text-slate-900">{formatAmount(stats.ca)} <span className="text-xs font-normal opacity-50">DZD</span></div>
            <p className="text-[9px] font-bold text-emerald-600 mt-2 uppercase flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> {t.Dashboard.revenue_journalized}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white border-l-4 border-l-red-500 overflow-hidden">
          <CardHeader className="pb-2 text-start">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.Dashboard.expenses}</CardTitle>
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-2xl font-black text-slate-900">{formatAmount(stats.charges)} <span className="text-xs font-normal opacity-50">DZD</span></div>
            <p className="text-[9px] font-bold text-red-500 mt-2 uppercase flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Achats, Services & Paie.
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white border-l-4 border-l-emerald-500 overflow-hidden">
          <CardHeader className="pb-2 text-start">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.Dashboard.gross_result}</CardTitle>
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-2xl font-black text-emerald-600">{formatAmount(stats.ca - stats.charges)} <span className="text-xs font-normal opacity-50">DZD</span></div>
            <p className="text-[9px] font-bold text-emerald-700 mt-2 uppercase italic">{t.Dashboard.performance_consolidated}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white border-l-4 border-l-blue-400 overflow-hidden">
          <CardHeader className="pb-2 text-start">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.Dashboard.assets_value}</CardTitle>
          </CardHeader>
          <CardContent className="text-start">
            <div className="text-2xl font-black text-blue-700">{formatAmount(totalAssetsValue)} <span className="text-xs font-normal opacity-50">DZD</span></div>
            <p className="text-[9px] font-black text-blue-600 mt-2 uppercase">{t.Dashboard.investments_class2}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-7">
        <Card className="md:col-span-4 shadow-xl border-none ring-1 ring-slate-200 bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b p-6 text-start">
            <CardTitle className="text-lg font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> {t.Dashboard.flow_analysis}
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase text-slate-400">{t.Dashboard.real_evolution}</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-8">
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
                  contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="revenue" name="Ventes (CA)" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={24} />
                <Bar dataKey="expenses" name="Charges réelles" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-6 text-start">
          <Card className="shadow-xl border-none ring-1 ring-slate-200 bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-6">
              <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-accent">
                <History className="h-4 w-4" /> {t.Dashboard.regulatory_watch}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {REGULATORY_MILESTONES.map((item, idx) => (
                  <div key={idx} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${item.color} border`}>
                          {item.law}
                        </span>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.title}</h4>
                      </div>
                      <Badge variant="outline" className="text-[7px] font-black h-4 border-emerald-200 text-emerald-600 bg-emerald-50 px-1.5">
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 p-4 flex justify-center border-t">
              <Button variant="ghost" size="sm" className="text-[10px] h-8 text-primary font-black uppercase tracking-widest hover:bg-white" asChild>
                <Link href={currentTenant ? `/dashboard/assistant?tenantId=${currentTenant.id}` : "/dashboard/assistant"}>
                  {t.Dashboard.legal_corpus} <ArrowRight className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-3xl flex items-start gap-4 shadow-inner">
             <Landmark className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
             <div className="text-[10px] text-blue-900 leading-relaxed font-medium">
               <p className="font-black uppercase tracking-tight mb-1">Moteur Fiscal v2.6 :</p>
               <p className="opacity-80 italic">"Votre comptabilité est auditée en temps réel selon les 350 règles de conformité algériennes. Cliquez sur 'Analyse & Pilotage' pour voir votre diagnostic."</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
