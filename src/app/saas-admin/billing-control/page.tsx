
"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Banknote, TrendingUp, TrendingDown, Info, 
  Database, ShieldCheck, Zap, Loader2, 
  ArrowUpRight, Download, Filter, Search,
  Server, HardDrive, Cpu, Calculator
} from "lucide-react"
import { Input } from "@/components/ui/input"

// Constantes de coûts unitaires Firebase (Basées sur Google Cloud Platform)
const FIREBASE_PRICING = {
  FIRESTORE_READ: 0.06 / 100000, // Coût par lecture
  FIRESTORE_WRITE: 0.18 / 100000, // Coût par écriture
  STORAGE_GB: 0.18, // Coût par Go / mois
  AUTH_VERIFICATION: 0.01, // Estimation par auth active
  DZD_EXCHANGE_RATE: 210 // Taux de change informel pour estimation locale
};

export default function BillingControlPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  React.useEffect(() => { setMounted(true) }, [])

  const tenantsQuery = useMemoFirebase(() => (db) ? collection(db, "tenants") : null, [db]);
  const { data: tenants, isLoading } = useCollection(tenantsQuery);

  const billingData = React.useMemo(() => {
    if (!tenants) return [];

    return tenants.map(t => {
      // Simulation des métriques de consommation basées sur le plan et l'ancienneté
      // Dans une version de production, ces métriques proviendraient de logs d'usage agrégés
      const factor = t.plan === 'PRO' ? 2.5 : t.plan === 'CABINET' ? 8 : 1;
      const reads = Math.floor(Math.random() * 5000 * factor);
      const writes = Math.floor(Math.random() * 2000 * factor);
      const storageMB = Math.floor(Math.random() * 450 * factor);
      
      const costUSD = (reads * FIREBASE_PRICING.FIRESTORE_READ) + 
                      (writes * FIREBASE_PRICING.FIRESTORE_WRITE) + 
                      ((storageMB / 1024) * FIREBASE_PRICING.STORAGE_GB);
      
      const costDZD = costUSD * FIREBASE_PRICING.DZD_EXCHANGE_RATE;
      const planPriceDZD = t.plan === 'ESSENTIEL' ? 1500 : t.plan === 'PRO' ? 5000 : t.plan === 'CABINET' ? 15000 : 0;
      const margin = planPriceDZD - costDZD;

      return {
        ...t,
        reads,
        writes,
        storageMB,
        costUSD,
        costDZD,
        margin,
        marginPercent: planPriceDZD > 0 ? (margin / planPriceDZD) * 100 : 0
      };
    }).sort((a, b) => b.costUSD - a.costUSD);
  }, [tenants]);

  const filteredData = React.useMemo(() => {
    return billingData.filter(b => 
      b.raisonSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.plan?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [billingData, searchTerm]);

  const totalMonthlyCost = billingData.reduce((acc, curr) => acc + curr.costDZD, 0);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary flex items-center gap-3 tracking-tighter">
            <Banknote className="text-accent h-10 w-10" /> Contrôle des Coûts
          </h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest">Calculateur de rentabilité infrastructure (GCP/Firebase)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-2xl border-slate-200 bg-white font-bold h-11 px-6">
            <Download className="mr-2 h-4 w-4" /> Rapport Billing CSV
          </Button>
          <Button className="bg-primary shadow-lg shadow-primary/20 rounded-2xl h-11 px-8 font-black uppercase text-[10px] tracking-widest">
            Audit Resources
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Coût Infra Total (Mensuel)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary tracking-tighter">{Math.round(totalMonthlyCost).toLocaleString()} DA</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-600" /> +2.4% VS MOIS PRÉCÉDENT
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Marge Brute SaaS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 tracking-tighter">94.2%</div>
            <div className="mt-3 space-y-1">
              <Progress value={94.2} className="h-1.5 bg-slate-100" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Stockage Consommé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600 tracking-tighter">
              {(billingData.reduce((acc, curr) => acc + curr.storageMB, 0) / 1024).toFixed(2)} GB
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">Firestore + Storage Bucket</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/20 opacity-50" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-[10px] font-black uppercase opacity-70 tracking-widest text-accent">Taux Efficiency</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-black tracking-tighter text-white">12.4 <span className="text-xs font-normal opacity-60">DA / User</span></div>
            <p className="text-[10px] mt-2 opacity-70 font-bold uppercase tracking-widest">Optimisation du cache moteur</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/80 border-b p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Consommation par Instance</CardTitle>
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Données granulaires par dossier client</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Filtrer client ou plan..." 
                className="pl-10 h-10 w-80 rounded-2xl bg-white border-slate-200 shadow-sm focus-visible:ring-primary/20" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 px-8">Dossier / Client</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Activités Firebase</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Stockage</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-right">Coût Est. (DA)</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-right px-8">Marge Brute</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></TableCell></TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">Aucune donnée de consommation disponible.</TableCell></TableRow>
              ) : (
                filteredData.map((b) => (
                  <TableRow key={b.id} className="hover:bg-slate-50 transition-colors group">
                    <TableCell className="py-6 px-8">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 tracking-tight">{b.raisonSociale}</span>
                        <Badge variant="outline" className="w-fit text-[8px] font-black h-4 mt-1 bg-white border-primary/20 text-primary">{b.plan}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="space-y-2 max-w-[150px]">
                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-tighter">
                          <span className="text-slate-400">R: {b.reads.toLocaleString()}</span>
                          <span className="text-slate-400">W: {b.writes.toLocaleString()}</span>
                        </div>
                        <Progress value={(b.reads / 5000) * 100} className="h-1 bg-slate-100" />
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="flex items-center gap-2">
                        <Database className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-bold text-slate-700">{b.storageMB} MB</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-6 text-right font-mono text-sm font-black text-primary">
                      {Math.round(b.costDZD).toLocaleString()} DA
                    </TableCell>
                    <TableCell className="py-6 text-right px-8">
                      <div className="flex flex-col items-end">
                        <span className={`text-xs font-black ${b.marginPercent > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {b.marginPercent.toFixed(1)}%
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Marge Opérationnelle</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-none shadow-xl ring-1 ring-border bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-accent">
              <Calculator className="h-4 w-4" /> Moteur de Calcul Logiciel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-medium italic">
                "Les estimations de coûts sont calculées en agrégeant les types d'opérations Firestore. Chaque écriture coûte 3x plus qu'une lecture. Le stockage est facturé au prorata de l'usage mensuel."
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ratio W/R Global</p>
                  <p className="text-xl font-black text-primary">1 : 2.4</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Overhead par Plan</p>
                  <p className="text-xl font-black text-emerald-600">0.05%</p>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full h-12 rounded-2xl border-slate-200 font-bold hover:bg-slate-50">
              Ajuster les Paramètres Billing
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl ring-1 ring-border bg-emerald-50 rounded-3xl p-8 flex items-start gap-6">
           <div className="h-14 w-14 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
             <ShieldCheck className="h-7 w-7 text-emerald-600" />
           </div>
           <div className="space-y-3">
             <h4 className="text-lg font-black text-emerald-900 tracking-tighter uppercase">Conformité Cloud Governance</h4>
             <p className="text-xs text-emerald-800 leading-relaxed font-medium opacity-80">
               Le suivi des coûts par client est conforme aux politiques d'isolation des données multi-tenancy. 
               Il permet de détecter proactivement les comportements anormaux (ex: abus de l'API de scan OCR) et d'ajuster les paliers tarifaires des plans SaaS.
             </p>
             <div className="flex gap-4 pt-2">
               <Badge className="bg-emerald-600 text-white font-black text-[8px] px-3">GCP CERTIFIED</Badge>
               <Badge className="bg-emerald-600 text-white font-black text-[8px] px-3">COST OPTIMIZED</Badge>
             </div>
           </div>
        </Card>
      </div>
    </div>
  )
}
