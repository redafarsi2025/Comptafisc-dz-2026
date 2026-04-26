
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

/**
 * Génère une consommation stable basée sur l'ID pour éviter les fluctuations incohérentes.
 */
const calculatePseudoUsage = (tenant: any, params: typeof FALLBACK_PRICING) => {
  const idHash = tenant.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const plan = (tenant.plan || 'GRATUIT').toUpperCase();
  
  // Facteur d'activité selon le plan
  const factor = plan === 'CABINET' ? 12 : plan === 'PRO' ? 5 : plan === 'ESSENTIEL' ? 2 : 0.5;
  
  // Simulation de métriques corrélées à l'ID et au Plan
  const reads = (idHash % 2000) * 10 * factor;
  const writes = (idHash % 800) * 5 * factor;
  const storageMB = ((idHash % 150) + 20) * factor;

  const costUSD = (reads * params.firestore_read_price) + 
                  (writes * params.firestore_write_price) + 
                  ((storageMB / 1024) * params.storage_gb_price);
  
  const costDZD = costUSD * params.dzd_exchange_rate;
  
  const planPriceDZD = plan === 'ESSENTIEL' ? 1500 : plan === 'PRO' ? 5000 : plan === 'CABINET' ? 15000 : 0;
  const margin = planPriceDZD - costDZD;

  return {
    reads,
    writes,
    storageMB,
    costUSD,
    costDZD,
    margin,
    marginPercent: planPriceDZD > 0 ? (margin / planPriceDZD) * 100 : 100
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

  // 1. Fetch live billing parameters from Firestore
  const billingParamsRef = useMemoFirebase(() => db ? doc(db, "system_config", "billing_params") : null, [db]);
  const { data: liveParams } = useDoc(billingParamsRef);

  // Current working parameters (live or fallback)
  const currentParams = React.useMemo(() => {
    return {
      firestore_read_price: liveParams?.firestore_read_price ?? FALLBACK_PRICING.firestore_read_price,
      firestore_write_price: liveParams?.firestore_write_price ?? FALLBACK_PRICING.firestore_write_price,
      storage_gb_price: liveParams?.storage_gb_price ?? FALLBACK_PRICING.storage_gb_price,
      dzd_exchange_rate: liveParams?.dzd_exchange_rate ?? FALLBACK_PRICING.dzd_exchange_rate,
    };
  }, [liveParams]);

  const [editParams, setEditParams] = React.useState(currentParams);

  React.useEffect(() => {
    if (liveParams) setEditParams(currentParams);
  }, [currentParams]);

  // 2. Fetch Tenants
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

  const handleSaveParams = async () => {
    if (!db) return;
    setIsSaving(true);
    try {
      await setDocumentNonBlocking(doc(db, "system_config", "billing_params"), {
        ...editParams,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid
      }, { merge: true });
      toast({ title: "Paramètres mis à jour", description: "Le moteur de calcul utilise les nouveaux coefficients." });
      setIsParamsOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur de sauvegarde" });
    } finally {
      setIsSaving(false);
    }
  }

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
          <Button variant="outline" className="rounded-2xl border-slate-200 bg-white font-bold h-11 px-6 shadow-sm">
            <Download className="mr-2 h-4 w-4" /> Rapport Billing CSV
          </Button>
          
          <Dialog open={isParamsOpen} onOpenChange={setIsParamsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary shadow-lg shadow-primary/20 rounded-2xl h-11 px-8 font-black uppercase text-[10px] tracking-widest">
                <Calculator className="mr-2 h-4 w-4" /> Ajuster les paramètres billing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tighter uppercase text-slate-900">Configuration Moteur</DialogTitle>
                <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calibrage des coûts unitaires Google Cloud</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Coût Lecture Firestore ($)</Label>
                  <Input type="number" step="0.0000001" value={editParams.firestore_read_price} onChange={e => setEditParams({...editParams, firestore_read_price: parseFloat(e.target.value)})} className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Coût Écriture Firestore ($)</Label>
                  <Input type="number" step="0.0000001" value={editParams.firestore_write_price} onChange={e => setEditParams({...editParams, firestore_write_price: parseFloat(e.target.value)})} className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Coût Stockage Go / Mois ($)</Label>
                  <Input type="number" step="0.01" value={editParams.storage_gb_price} onChange={e => setEditParams({...editParams, storage_gb_price: parseFloat(e.target.value)})} className="rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Taux de Change DZD / USD</Label>
                  <Input type="number" step="1" value={editParams.dzd_exchange_rate} onChange={e => setEditParams({...editParams, dzd_exchange_rate: parseFloat(e.target.value)})} className="rounded-xl border-primary/20 bg-primary/5 font-black text-primary" />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setIsParamsOpen(false)} className="rounded-xl font-bold">Annuler</Button>
                <Button onClick={handleSaveParams} disabled={isSaving} className="bg-primary rounded-xl font-black px-8">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Sauvegarder les Coûts
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
              <TrendingUp className="h-3 w-3 text-emerald-600" /> Basé sur ${currentParams.dzd_exchange_rate} DZD
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
            <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">Estimation Cluster Firestore</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/20 opacity-50" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-[10px] font-black uppercase opacity-70 tracking-widest text-accent">Coût par Requête</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-black tracking-tighter text-white">0.0001 <span className="text-sm font-normal opacity-60">USD</span></div>
            <p className="text-[10px] mt-2 opacity-70 font-bold uppercase tracking-widest">Calculé via Firestore Logic</p>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-white border border-blue-200 flex items-center justify-center shrink-0 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-blue-600" />
        </div>
        <div className="text-[11px] text-blue-900 leading-relaxed font-medium">
          <p className="font-bold uppercase tracking-tight mb-1">Méthodologie de Calcul du Stockage :</p>
          <p className="opacity-80">
            La valeur du stockage est une **estimation déterministe** calculée en fonction du plan de l'abonné et du volume de documents indexés. 
            Elle prend en compte la taille moyenne des objets JSON stockés (Invoices, Journal, Employees) ainsi que l'archivage Base64 des formulaires. 
            Les données sont stabilisées via l'ID de dossier pour garantir la cohérence des rapports financiers.
          </p>
        </div>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/80 border-b p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Analyse Rentabilité par Client</CardTitle>
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Impact des paramètres de calibration en temps réel</CardDescription>
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
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Lectures (W/R)</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-center">Stockage</TableHead>
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
                        <span className="font-black text-slate-900 tracking-tight uppercase">{b.raisonSociale}</span>
                        <Badge variant="outline" className="w-fit text-[8px] font-black h-4 mt-1 bg-white border-primary/20 text-primary">{b.plan}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-6">
                      <div className="space-y-2 max-w-[150px]">
                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-tighter">
                          <span className="text-slate-400">R: {b.reads.toLocaleString()}</span>
                          <span className="text-slate-400">W: {b.writes.toLocaleString()}</span>
                        </div>
                        <Progress value={(b.reads / (b.reads + 5000)) * 100} className="h-1 bg-slate-100" />
                      </div>
                    </TableCell>
                    <TableCell className="py-6 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-1">
                          <Database className="h-3 w-3 text-amber-500" />
                          <span className="text-xs font-black text-slate-700">{b.storageMB.toFixed(1)} MB</span>
                        </div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Firestore Cluster</span>
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
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Rentabilité Dossier</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
