
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from "recharts"
import { 
  TrendingUp, ArrowUpRight, 
  Activity, Target, Sparkles, Zap, CreditCard, 
  Users, UserPlus, ShieldCheck, Download, Loader2
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"

const PLAN_COLORS: Record<string, string> = {
  'GRATUIT': '#94a3b8',
  'ESSENTIEL': '#3b82f6',
  'PRO': '#10b981',
  'CABINET': '#8b5cf6',
};

const PLAN_PRICES: Record<string, number> = {
  'GRATUIT': 0,
  'ESSENTIEL': 1500,
  'PRO': 5000,
  'CABINET': 15000, 
};

export default function AdminDashboard() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Guard: Only fetch if user is definitely an admin
  const adminDocRef = useMemoFirebase(() => (db && user) ? doc(db, "saas_admins", user.uid) : null, [db, user]);
  const { data: adminRecord } = useDoc(adminDocRef);
  const isSaaSAdmin = !!adminRecord;

  // Fetch real profiles
  const profilesQuery = useMemoFirebase(() => (db && isSaaSAdmin) ? query(collection(db, "userProfiles"), orderBy("updatedAt", "desc")) : null, [db, isSaaSAdmin]);
  const { data: profiles, isLoading: isLoadingProfiles } = useCollection(profilesQuery);

  // Fetch real tenants
  const tenantsQuery = useMemoFirebase(() => (db && isSaaSAdmin) ? collection(db, "tenants") : null, [db, isSaaSAdmin]);
  const { data: tenants, isLoading: isLoadingTenants } = useCollection(tenantsQuery);

  const stats = React.useMemo(() => {
    if (!profiles || !tenants) return { totalUsers: 0, totalTenants: 0, mrr: 0, upToDateTenants: 0, planDistribution: [] };

    const planCounts: Record<string, number> = { 'GRATUIT': 0, 'ESSENTIEL': 0, 'PRO': 0, 'CABINET': 0 };
    let totalMrr = 0;
    let upToDate = 0;

    tenants.forEach(t => {
      const plan = (t.plan || 'GRATUIT').toUpperCase();
      planCounts[plan] = (planCounts[plan] || 0) + 1;
      totalMrr += PLAN_PRICES[plan] || 0;
      if (t.onboardingComplete) upToDate++;
    });

    const distribution = Object.entries(planCounts).map(([name, value]) => ({
      name,
      value,
      color: PLAN_COLORS[name] || '#ccc'
    }));

    return {
      totalUsers: profiles.length,
      totalTenants: tenants.length,
      mrr: totalMrr,
      upToDateTenants: upToDate,
      planDistribution: distribution
    };
  }, [profiles, tenants]);

  if (!mounted || isLoadingProfiles || isLoadingTenants) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Calcul des données réelles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary flex items-center gap-3">
            <Target className="text-accent h-10 w-10" /> Pilotage Live
          </h1>
          <p className="text-muted-foreground mt-1">Données réelles agrégées depuis Firestore.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white border-slate-200"><Download className="mr-2 h-4 w-4" /> Rapport Global</Button>
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-inner">
              <ShieldCheck className="text-white h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Santé Parc</p>
              <p className="text-lg font-black text-primary">
                {stats.upToDateTenants} / {stats.totalTenants} Dossiers OK
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
              MRR Estimé <CreditCard className="h-3 w-3" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{stats.mrr.toLocaleString()} DA</div>
            <div className="flex items-center gap-1 text-emerald-600 text-xs mt-2 font-bold uppercase tracking-tighter">
              Basé sur les abonnements actifs
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
              Utilisateurs Uniques <Users className="h-3 w-3" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600">{stats.totalUsers}</div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">Comptes enregistrés</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-accent shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
              Dossiers Gérés <Activity className="h-3 w-3" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-accent">{stats.totalTenants}</div>
            <div className="flex items-center gap-1 text-muted-foreground text-[10px] mt-2 font-bold uppercase">
              Moyenne: {(stats.totalTenants / stats.totalUsers || 0).toFixed(1)} par user
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-white border-none shadow-lg overflow-hidden group">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase opacity-80 flex items-center justify-between">
              Conformité Globale <ShieldCheck className="h-3 w-3" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">
              {Math.round((stats.upToDateTenants / stats.totalTenants || 0) * 100)}%
            </div>
            <Progress value={(stats.upToDateTenants / stats.totalTenants || 0) * 100} className="mt-2 bg-white/20 h-1.5" />
            <p className="text-[10px] mt-2 opacity-70 font-medium">
              Dossiers ayant complété leur onboarding
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-7 gap-8">
        <Card className="md:col-span-4 shadow-md border-none">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Croissance Utilisateurs</CardTitle>
            <CardDescription>Visualisation basée sur les derniers profils créés.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] flex items-center justify-center">
             <div className="text-center space-y-4">
                <Users className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
                <p className="text-sm text-muted-foreground italic">L'historique temporel sera activé après 30 jours de data.</p>
             </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 shadow-md border-none">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Répartition par Plan</CardTitle>
            <CardDescription>Segmentation réelle de la base utilisateur.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 pt-0">
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground uppercase tracking-widest">Taux de Conversion</span>
                <span className="text-primary">
                  {Math.round(((stats.totalTenants - (stats.planDistribution.find(p => p.name === 'GRATUIT')?.value || 0)) / stats.totalTenants || 0) * 100)}%
                </span>
              </div>
              <Progress value={((stats.totalTenants - (stats.planDistribution.find(p => p.name === 'GRATUIT')?.value || 0)) / stats.totalTenants || 0) * 100} className="h-2" />
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
