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
  Camera, Package, Pickaxe, History, Landmark
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useLocale } from "@/context/LocaleContext"

const REGULATORY_MILESTONES = [
  { 
    law: "LF 2026", 
    title: "SNMG & IRG", 
    desc: "SNMG à 24 000 DA et nouveaux barèmes IRG appliqués.", 
    status: "ACTIF", 
    color: "text-emerald-600 bg-emerald-50" 
  },
  { 
    law: "LF 2025", 
    title: "Existence (G8)", 
    desc: "Obligation de déclaration sous 30 jours intégrée.", 
    status: "ACTIF", 
    color: "text-blue-600 bg-blue-50" 
  },
  { 
    law: "LF 2024", 
    title: "Suppression TAP", 
    desc: "Taux à 0% pour toutes les activités professionnelles.", 
    status: "ARCHIVÉ", 
    color: "text-slate-600 bg-slate-50" 
  }
]

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
          <h1 className="text-3xl font-bold tracking-tight text-primary">{t.Dashboard.overview}</h1>
          <div className="text-muted-foreground flex items-center gap-2 mt-1">
            <span>{t.Dashboard.dossier} :</span>
            <span className="font-semibold text-foreground">{currentTenant?.raisonSociale}</span>
            <Badge variant="outline" className="border-primary/20 bg-primary/5">{currentTenant?.regimeFiscal}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border shadow-sm">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t.Common.status_compliance}</p>
            <p className="text-sm font-black text-emerald-600">{t.Common.certified}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {secteur === 'BTP' && (
          <Card className="bg-primary text-white border-none shadow-lg hover:scale-[1.02] transition-transform cursor-pointer" asChild>
            <Link href={`/dashboard/btp/projects?tenantId=${currentTenant?.id}`}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Pickaxe className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{t.Dashboard.new_project}</h4>
                  <p className="text-[10px] opacity-70">{t.Dashboard.open_project}</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        )}
        
        <Card className="bg-slate-900 text-white border-none shadow-lg hover:scale-[1.02] transition-transform cursor-pointer" asChild>
          <Link href={`/dashboard/ocr?tenantId=${currentTenant?.id}`}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Camera className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h4 className="font-bold text-sm">{t.Dashboard.scan_invoice}</h4>
                <p className="text-[10px] opacity-70">{t.Dashboard.quick_ocr}</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="border-none shadow-lg hover:scale-[1.02] transition-transform cursor-pointer bg-white" asChild>
          <Link href={`/dashboard/inventory/stock?tenantId=${currentTenant?.id}`}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-sm">{t.Dashboard.stock_management}</h4>
                <p className="text-[10px] opacity-70">{t.Dashboard.control_refs}</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-primary bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">{t.Dashboard.revenue_annual}</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(stats.ca)} DZD</div>
            <p className="text-[10px] text-muted-foreground mt-1">{t.Dashboard.revenue_journalized}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-destructive bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">{t.Dashboard.expenses}</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(stats.charges)} DZD</div>
            <p className="text-[10px] text-muted-foreground mt-1">Achats, Services & Paie.</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-emerald-500 bg-emerald-50/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-emerald-800">{t.Dashboard.gross_result}</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatAmount(stats.ca - stats.charges)} DZD</div>
            <p className="text-[10px] text-emerald-700 italic mt-1">{t.Dashboard.performance_consolidated}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-400 bg-blue-50/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-blue-800">{t.Dashboard.assets_value}</CardTitle>
            <Landmark className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatAmount(totalAssetsValue)} DZD</div>
            <p className="text-[10px] text-blue-600 mt-1 uppercase font-bold">{t.Dashboard.investments_class2}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 shadow-sm border-t-4 border-t-primary bg-white">
          <CardHeader className="bg-muted/10 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" /> {t.Dashboard.flow_analysis}
            </CardTitle>
            <CardDescription>{t.Dashboard.real_evolution}</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} reversed={isRtl} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  orientation={isRtl ? 'right' : 'left'}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} 
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="revenue" name="Ventes (CA)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Charges réelles" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-6">
          <Card className="shadow-lg border-none ring-1 ring-border bg-white overflow-hidden">
            <CardHeader className="bg-primary text-white pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                <History className="h-4 w-4" /> {t.Dashboard.regulatory_watch}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {REGULATORY_MILESTONES.map((item, idx) => (
                  <div key={idx} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${item.color}`}>
                          {item.law}
                        </span>
                        <h4 className="text-xs font-bold">{item.title}</h4>
                      </div>
                      <Badge variant="outline" className="text-[8px] h-4 border-emerald-200 text-emerald-600 bg-emerald-50">
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/20 p-3 flex justify-center border-t">
              <Button variant="ghost" size="sm" className="text-[10px] h-7 text-primary font-bold" asChild>
                <Link href={currentTenant ? `/dashboard/assistant?tenantId=${currentTenant.id}` : "/dashboard/assistant"}>
                  {t.Dashboard.legal_corpus}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
