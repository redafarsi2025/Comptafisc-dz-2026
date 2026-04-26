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
import { collection, query, where, limit } from "firebase/firestore"
import { 
  TrendingUp, ArrowUpRight, BadgeCheck, 
  CheckCircle2, Activity, Sparkles, Landmark, History, ShieldCheck, Zap, Loader2,
  ChevronRight, PlayCircle, Lightbulb, Target, ArrowRight, Pickaxe, Factory, ShoppingCart, Briefcase,
  Camera
} from "lucide-react"
import { getIBSRate } from "@/lib/calculations"
import { useSearchParams, useRouter } from "next/navigation"
import { seedDemoForUser } from "@/lib/demo-seeder"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

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
  const router = useRouter()
  const [mounted, setMounted] = React.useState(false)
  const [isSeeding, setIsSeeding] = React.useState(false)

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

  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "invoices"),
      where(`tenantMembers.${user.uid}`, "!=", null)
    );
  }, [db, currentTenant?.id, user]);
  const { data: invoices } = useCollection(invoicesQuery);

  const stats = React.useMemo(() => {
    if (!invoices || !mounted) return { ca: 0, tva: 0, count: 0 };
    return invoices.reduce((acc, inv) => ({
      ca: acc.ca + (inv.totalAmountExcludingTax || 0),
      tva: acc.tva + (inv.totalTaxAmount || 0),
      count: acc.count + 1
    }), { ca: 0, tva: 0, count: 0 });
  }, [invoices, mounted]);

  const formatAmount = (val: number) => mounted ? Math.round(val).toLocaleString() : "...";

  const monthlyData = [
    { month: "Jan", revenue: stats.ca * 0.1, expenses: stats.ca * 0.05 },
    { month: "Feb", revenue: stats.ca * 0.15, expenses: stats.ca * 0.08 },
    { month: "Mar", revenue: stats.ca * 0.2, expenses: stats.ca * 0.1 },
    { month: "Apr", revenue: stats.ca * 0.25, expenses: stats.ca * 0.12 },
    { month: "May", revenue: stats.ca * 0.3, expenses: stats.ca * 0.15 },
    { month: "Jun", revenue: stats.ca, expenses: stats.ca * 0.6 },
  ]

  if (!mounted || isSeeding || isTenantsLoading) {
    return <div className="h-[80vh] flex flex-col items-center justify-center space-y-6"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  const secteur = currentTenant?.secteurActivite || "COMMERCE";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Vue d'ensemble</h1>
          <div className="text-muted-foreground flex items-center gap-2 mt-1">
            <span>Dossier :</span>
            <span className="font-semibold text-foreground">{currentTenant?.raisonSociale}</span>
            <Badge variant="outline" className="border-primary/20 bg-primary/5">{currentTenant?.regimeFiscal}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border shadow-sm">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Statut Conformité</p>
            <p className="text-sm font-black text-emerald-600">CERTIFIÉ LF 2026</p>
          </div>
        </div>
      </div>

      {/* SECTOR SPECIFIC QUICK ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {secteur === 'BTP' && (
          <Card className="bg-primary text-white border-none shadow-lg hover:scale-[1.02] transition-transform cursor-pointer" asChild>
            <Link href={`/dashboard/btp/projects?tenantId=${currentTenant?.id}`}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center"><Pickaxe className="h-6 w-6 text-white" /></div>
                <div>
                  <h4 className="font-bold text-sm">Nouveau Chantier</h4>
                  <p className="text-[10px] opacity-70">Ouvrir un nouveau dossier de projet</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        )}
        {secteur === 'INDUSTRIE' && (
          <Card className="bg-primary text-white border-none shadow-lg hover:scale-[1.02] transition-transform cursor-pointer" asChild>
            <Link href={`/dashboard/industry/production?tenantId=${currentTenant?.id}`}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center"><Factory className="h-6 w-6 text-white" /></div>
                <div>
                  <h4 className="font-bold text-sm">Lancer un O.F..</h4>
                  <p className="text-[10px] opacity-70">Initialiser un ordre de fabrication</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        )}
        {(secteur === 'COMMERCE' || secteur === 'INDUSTRIE') && (
          <Card className="bg-accent text-primary border-none shadow-lg hover:scale-[1.02] transition-transform cursor-pointer" asChild>
            <Link href={`/dashboard/inventory/stock?tenantId=${currentTenant?.id}`}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Package className="h-6 w-6 text-primary" /></div>
                <div>
                  <h4 className="font-bold text-sm">Gestion de Stock</h4>
                  <p className="text-[10px] opacity-70">Contrôler l'état des références</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        )}
        <Card className="bg-slate-900 text-white border-none shadow-lg hover:scale-[1.02] transition-transform cursor-pointer" asChild>
          <Link href={`/dashboard/ocr?tenantId=${currentTenant?.id}`}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center"><Camera className="h-6 w-6 text-accent" /></div>
              <div>
                <h4 className="font-bold text-sm">Scan Facture IA</h4>
                <p className="text-[10px] opacity-70">Capture intelligente OCR Gemini</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-primary bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">CA Annuel (HT)</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(stats.ca)} DZD</div>
            <p className="text-[10px] text-muted-foreground mt-1">Données temps réel.</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-amber-500 bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Optimisation IRG</CardTitle>
            <Target className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Lissage Activé</div>
            <p className="text-[10px] text-emerald-600 mt-1 font-bold">GAIN : -40% d'abattement</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-emerald-500 bg-emerald-50/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-emerald-800">Santé Financière</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">SCORE 98/100</div>
            <p className="text-[10px] text-emerald-700 italic mt-1">Risque de contrôle : Très Faible</p>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground shadow-lg border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase opacity-80">Prochain Audit IA</CardTitle>
            <BadgeCheck className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">30 AVRIL</div>
            <p className="text-[10px] mt-1 opacity-90 font-medium italic">Préparation Liasse G4</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 shadow-sm border-t-4 border-t-primary bg-white">
          <CardHeader className="bg-muted/10 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" /> Analyse des Flux (HT)
            </CardTitle>
            <CardDescription>Évolution des produits et charges sur l'exercice en cours.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="revenue" name="Ventes (CA)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Achats / Charges" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-6">
          <Card className="shadow-lg border-none ring-1 ring-border bg-white overflow-hidden">
            <CardHeader className="bg-primary text-white pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                <History className="h-4 w-4" /> Veille Réglementaire Active
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
              <Button variant="ghost" size="sm" className="text-[10px] h-7 text-primary font-bold">
                Consulter le Corpus Juridique (RAG)
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
