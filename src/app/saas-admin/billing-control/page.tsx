"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, setDocumentNonBlocking } from "@/firebase"
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
  Server, HardDrive, Cpu, Calculator, Save, X, AlertTriangle, Sparkles
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { PREMIUM_ADDONS } from "@/lib/plans"

// Fallback constants if Firestore is empty
const FALLBACK_PRICING = {
  firestore_read_price: 0.0000006,  
  firestore_write_price: 0.0000018, 
  storage_gb_price: 0.18,           
  dzd_exchange_rate: 210            
};

const calculatePseudoUsage = (tenant: any, params: typeof FALLBACK_PRICING) => {
  const idHash = tenant.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const plan = (tenant.plan || 'GRATUIT').toUpperCase();
  
  const factor = plan === 'CABINET' ? 12 : plan === 'PRO' ? 5 : plan === 'ESSENTIEL' ? 2 : 0.5;
  
  const reads = (idHash % 2000) * 10 * factor;
  const writes = (idHash % 800) * 5 * factor;
  const storageMB = ((idHash % 150) + 20) * factor;

  const costUSD = (reads * params.firestore_read_price) + 
                  (writes * params.firestore_write_price) + 
                  ((storageMB / 1024) * params.storage_gb_price);
  
  const costDZD = costUSD * params.dzd_exchange_rate;
  
  const planPriceDZD = plan === 'ESSENTIEL' ? 1500 : plan === 'PRO' ? 5000 : 0;
  
  // Ajouter les revenus d'Upsell
  let upsellRevenue = 0;
  if (tenant.activeAddons && Array.isArray(tenant.activeAddons)) {
    tenant.activeAddons.forEach((addonId: string) => {
      const addon = PREMIUM_ADDONS.find(a => a.id === addonId);
      if (addon) upsellRevenue += addon.price;
    });
  }

  const totalRevenue = planPriceDZD + upsellRevenue;
  const margin = totalRevenue - costDZD;

  return {
    reads,
    writes,
    storageMB,
    costUSD,
    costDZD,
    upsellRevenue,
    totalRevenue,
    margin,
    marginPercent: totalRevenue > 0 ? (margin / totalRevenue) * 100 : (margin < 0 ? -100 : 100)
  };
};

export default function BillingControlPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isParamsOpen, setIsParamsOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const billingParamsRef = useMemoFirebase(() => db ? doc(db, "system_config", "billing_params") : null, [db]);
  const { data: liveParams } = useDoc(billingParamsRef);

  const currentParams = React.useMemo(() => {
    return {
      firestore_read_price: liveParams?.firestore_read_price ?? FALLBACK_PRICING.firestore_read_price,
      firestore_write_price: liveParams?.firestore_write_price ?? FALLBACK_PRICING.firestore_write_price,
      storage_gb_price: liveParams?.storage_gb_price ?? FALLBACK_PRICING.storage_gb_price,
      dzd_exchange_rate: liveParams?.dzd_exchange_rate ?? FALLBACK_PRICING.dzd_exchange_rate,
    };
  }, [liveParams]);

  const [editParams, setEditParams] = React.useState(currentParams);

  const tenantsQuery = useMemoFirebase(() => (db) ? collection(db, "tenants") : null, [db]);
  const { data: tenants, isLoading } = useCollection(tenantsQuery);

  const billingData = React.useMemo(() => {
    if (!tenants) return [];
    return tenants.map(t => ({
      ...t,
      ...calculatePseudoUsage(t, currentParams)
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [tenants, currentParams]);

  const filteredData = React.useMemo(() => {
    return billingData.filter(b => 
      b.raisonSociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.plan?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [billingData, searchTerm]);

  const totalMonthlyCost = billingData.reduce((acc, curr) => acc + curr.costDZD, 0);
  const totalMonthlyRevenue = billingData.reduce((acc, curr) => acc + curr.totalRevenue, 0);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary flex items-center gap-3 tracking-tighter">
            <Banknote className="text-accent h-10 w-10" /> Rentabilité & Infra
          </h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest">Analyse du LTV (Lifetime Value) vs Coûts d'hébergement</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-2xl border-slate-200 bg-white font-bold h-11 px-6 shadow-sm">
            <Download className="mr-2 h-4 w-4" /> Rapport LTV CSV
          </Button>
          <Button onClick={() => setIsParamsOpen(true)} className="bg-primary shadow-lg shadow-primary/20 rounded-2xl h-11 px-8 font-black uppercase text-[10px] tracking-widest">
            <Calculator className="mr-2 h-4 w-4" /> Calibrer Coûts
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Revenu Global (MRR)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary tracking-tighter">{Math.round(totalMonthlyRevenue).toLocaleString()} DA</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">Plans + Upsells actifs</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-accent">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Part de l'Upsell</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-accent tracking-tighter">
              {Math.round(billingData.reduce((acc, curr) => acc + curr.upsellRevenue, 0)).toLocaleString()} DA
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest italic">Revenu généré par les add-ons</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Investissement Infra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-600 tracking-tighter">{Math.round(totalMonthlyCost).toLocaleString()} DA</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">Coût global des ressources Cloud</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <Zap className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent animate-pulse" />
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Stratégie</p>
           <h2 className="text-lg font-black uppercase">Monétisation Indirecte</h2>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
           <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Moniteur de Yield par Dossier</CardTitle>
           <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Filtrer par dossier..." 
                className="pl-10 h-10 w-80 rounded-2xl bg-white" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-100">
              <TableRow>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 px-8">Client / Plan</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Upsells Actifs</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-right">Revenu Total (DA)</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-right px-8">Net Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></TableCell></TableRow>
              ) : filteredData.map((b) => (
                <TableRow key={b.id} className="hover:bg-slate-50 transition-colors group">
                  <TableCell className="py-6 px-8">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 uppercase tracking-tight">{b.raisonSociale}</span>
                      <Badge variant="outline" className={cn(
                        "w-fit text-[8px] font-black h-4 mt-1 bg-white",
                        b.plan === 'CABINET' ? "border-purple-200 text-purple-600" : "border-primary/20 text-primary"
                      )}>{b.plan}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex flex-wrap gap-1">
                      {b.activeAddons?.length > 0 ? b.activeAddons.map((aid: string) => (
                        <Badge key={aid} className="bg-accent/10 text-accent border-accent/20 text-[7px] font-black uppercase h-4">
                          {aid.split('_')[0]}
                        </Badge>
                      )) : <span className="text-[10px] text-slate-300 italic">Aucun upsell</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-6 text-right font-mono text-sm font-black text-primary">
                    {Math.round(b.totalRevenue).toLocaleString()} DA
                  </TableCell>
                  <TableCell className="py-6 text-right px-8">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1">
                         <span className={cn("text-xs font-black", b.marginPercent > 0 ? "text-emerald-600" : "text-red-500")}>
                           {b.marginPercent.toFixed(1)}%
                         </span>
                         {b.upsellRevenue > 0 && <Sparkles className="h-3 w-3 text-accent animate-pulse" />}
                      </div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Marge nette vs Infra</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
