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
  Server, HardDrive, Cpu, Calculator, Save, X, AlertTriangle
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"

// Fallback constants if Firestore is empty
const FALLBACK_PRICING = {
  firestore_read_price: 0.0000006,  // $0.06 per 100k
  firestore_write_price: 0.0000018, // $0.18 per 100k
  storage_gb_price: 0.18,           // $0.18 per GB/month
  dzd_exchange_rate: 210            // DZD per USD
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
  
  // Si le plan est gratuit (ou promo cabinet), le prix est 0, donc la marge est négative (coût d'infra)
  const planPriceDZD = plan === 'ESSENTIEL' ? 1500 : plan === 'PRO' ? 5000 : plan === 'CABINET' ? 0 : 0;
  const margin = planPriceDZD - costDZD;

  return {
    reads,
    writes,
    storageMB,
    costUSD,
    costDZD,
    margin,
    marginPercent: planPriceDZD > 0 ? (margin / planPriceDZD) * 100 : (margin < 0 ? -100 : 100)
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
    })).sort((a, b) => b.costUSD - a.costUSD);
  }, [tenants, currentParams]);

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
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Investissement Infra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary tracking-tighter">{Math.round(totalMonthlyCost).toLocaleString()} DA</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">Coût global des ressources Cloud</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Coût moyen par Cabinet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 tracking-tighter">
              {Math.round(billingData.filter(b => b.plan === 'CABINET').reduce((acc, curr) => acc + curr.costDZD, 0) / (billingData.filter(b => b.plan === 'CABINET').length || 1)).toLocaleString()} DA
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest italic">Coût d'infrastructure pour un Hub gratuit</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">ROI Indirect Estimé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 tracking-tighter">x12.5</div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">Multiplicateur de croissance via Cabinets</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <Zap className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent animate-pulse" />
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Stratégie</p>
           <h2 className="text-lg font-black uppercase">Scaling Mode</h2>
        </Card>
      </div>

      <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="text-[11px] text-emerald-900 leading-relaxed font-medium">
          <p className="font-bold uppercase tracking-tight mb-1">Optimisation des Bénéfices :</p>
          <p className="opacity-80">
            Bien que les comptes CABINET affichent une marge directe négative (car offerts gratuitement), ils sont les catalyseurs de votre **croissance virale**. 
            Leur présence réduit votre CAC (Coût d'Acquisition Client) global car chaque dossier d'entreprise invité par un cabinet ne vous coûte rien en marketing.
          </p>
        </div>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
        <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
           <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Journal de Consommation Billing</CardTitle>
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
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Ressources (Read/Write)</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-right">Coût Infra (DA)</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-right px-8">Marge Directe</TableHead>
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
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400">R: {b.reads.toLocaleString()}</span>
                        <span className="text-[9px] font-bold text-slate-400">W: {b.writes.toLocaleString()}</span>
                      </div>
                      <Progress value={Math.min(100, (b.reads / 5000) * 100)} className="w-16 h-1 bg-slate-100" />
                    </div>
                  </TableCell>
                  <TableCell className="py-6 text-right font-mono text-sm font-black text-primary">
                    {Math.round(b.costDZD).toLocaleString()} DA
                  </TableCell>
                  <TableCell className="py-6 text-right px-8">
                    {b.plan === 'CABINET' ? (
                      <div className="flex flex-col items-end">
                         <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1">
                           <TrendingUp className="h-3 w-3" /> Hub Strategique
                         </span>
                         <span className="text-[8px] text-slate-400 font-bold uppercase italic">Rentabilité Indirecte</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className={cn("text-xs font-black", b.marginPercent > 0 ? "text-emerald-600" : "text-red-500")}>
                          {b.marginPercent.toFixed(1)}%
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Marge brute directe</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isParamsOpen} onOpenChange={setIsParamsOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8">
           <DialogHeader>
             <DialogTitle className="text-2xl font-black tracking-tighter uppercase">Paramètres Billing</DialogTitle>
             <DialogDescription className="text-xs font-bold text-slate-400 uppercase">Coûts unitaires de l'infrastructure Cloud</DialogDescription>
           </DialogHeader>
           <div className="grid gap-6 py-6 text-foreground">
             <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase text-slate-400">Taux de Change USD/DZD</Label>
               <Input type="number" value={editParams.dzd_exchange_rate} onChange={e => setEditParams({...editParams, dzd_exchange_rate: parseFloat(e.target.value)})} className="rounded-xl font-black text-primary" />
             </div>
             <div className="p-4 bg-muted/20 rounded-2xl border border-dashed text-center">
                <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                  "Ces paramètres influencent le calcul de marge affiché dans le tableau. Ils n'affectent pas la facturation réelle de Firebase."
                </p>
             </div>
           </div>
           <DialogFooter>
             <Button variant="ghost" onClick={() => setIsParamsOpen(false)} className="rounded-xl font-bold">Fermer</Button>
             <Button className="bg-primary rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-8">Enregistrer</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
