
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Calculator, Info, Landmark, Sparkles, TrendingDown, CalendarDays, AlertCircle, Clock, ShieldCheck, FileBadge, Loader2, ArrowRight } from "lucide-react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { getIFURate, getIBSRate, calculateIBS, calculateIFU, PAYROLL_CONSTANTS } from "@/lib/calculations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function DeclarationsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [estimatedProfit, setEstimatedProfit] = React.useState<number>(1500000)
  const [reinvestedAmount, setReinvestedAmount] = React.useState<number>(0)
  
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formatAmount = (val: number) => mounted ? Math.round(val).toLocaleString() : "..."

  // 1. Fetch accessible tenants
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user?.uid]);
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);
  
  // 2. Resolve current tenant based on URL
  const currentTenant = React.useMemo(() => {
    if (!tenants || tenants.length === 0) return null;
    const urlId = searchParams.get('tenantId');
    if (urlId) return tenants.find(t => t.id === urlId) || tenants[0];
    return tenants[0];
  }, [tenants, searchParams]);

  const isIFU = currentTenant?.regimeFiscal === "IFU";
  const ifuRate = isIFU ? getIFURate(currentTenant?.secteurActivite || "SERVICES", currentTenant?.formeJuridique || "") : 0;
  const ibsRate = !isIFU ? getIBSRate(currentTenant?.secteurActivite || "SERVICES") : 0;

  // 3. Fetch Invoices for real-time stats
  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "invoices");
  }, [db, currentTenant?.id]);
  const { data: invoices } = useCollection(invoicesQuery);

  const stats = React.useMemo(() => {
    if (!invoices) return { tva: 0, ca: 0, ifu: 0 };
    return invoices.reduce((acc, inv) => ({
      tva: acc.tva + (inv.totalTaxAmount || 0),
      ca: acc.ca + (inv.totalAmountExcludingTax || 0),
      ifu: acc.ifu + calculateIFU(inv.totalAmountExcludingTax || 0, ifuRate, currentTenant?.formeJuridique === 'Auto-entrepreneur', currentTenant?.isStartup)
    }), { tva: 0, ca: 0, ifu: 0 });
  }, [invoices, ifuRate, currentTenant]);

  const projectedIBS = React.useMemo(() => {
    return calculateIBS(estimatedProfit, ibsRate, reinvestedAmount);
  }, [estimatedProfit, ibsRate, reinvestedAmount]);

  if (isTenantsLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary tracking-tighter uppercase">Portail Déclaratif</h1>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 mt-2">
            <span className="text-[10px] font-bold uppercase tracking-widest">Dossier :</span>
            <span className="font-bold text-slate-900 uppercase text-xs">{currentTenant?.raisonSociale}</span> 
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black">{currentTenant?.regimeFiscal}</Badge>
            {currentTenant?.isStartup && <Badge className="bg-emerald-500 text-white text-[9px] font-black">STARTUP EXONÉRÉE</Badge>}
          </div>
        </div>
        <Button className="bg-primary shadow-xl h-11 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest" asChild>
           <Link href={`/dashboard/declarations/${isIFU ? 'g12' : 'g50'}?tenantId=${currentTenant?.id}`}>
             <Calculator className="mr-2 h-4 w-4" /> 
             Générer {isIFU ? 'G12' : 'G50'} Mensuelle
           </Link>
        </Button>
      </div>

      {isIFU && (
        <Alert className="bg-amber-50 border-amber-200 border-l-4 border-l-amber-500 shadow-sm rounded-2xl">
          <Clock className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-800 font-black uppercase text-xs tracking-widest">Échéance IFU G12 bis 2026</AlertTitle>
          <AlertDescription className="text-amber-700 text-xs font-medium">
            La déclaration définitive 2025 (G12 bis) doit être déposée avant le <strong>1er Mars 2026</strong>. 
            Taux appliqué à votre dossier : <strong>{(ifuRate * 100).toFixed(1)}%</strong>.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {isIFU ? (
          <Card className="md:col-span-3 border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-primary relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:rotate-12 transition-transform"><Landmark className="h-24 w-24 text-primary" /></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Estimation Impôt Forfaitaire Unique ({(ifuRate * 100).toFixed(1)}%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-primary tracking-tighter">
                {currentTenant?.isStartup ? "0 (Exonéré)" : `${formatAmount(stats.ifu)} DA`}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 font-bold uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-500" /> Calculé sur CA HT de {formatAmount(stats.ca)} DA
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">TVA à reverser (Net)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-primary tracking-tighter">
                  {formatAmount(stats.tva)} <span className="text-sm font-normal">DA</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-amber-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Provision IBS 2026</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-amber-600 tracking-tighter">
                  {formatAmount(projectedIBS)} <span className="text-sm font-normal">DA</span>
                </div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">Taux secteur : {(ibsRate * 100)}%</p>
              </CardContent>
            </Card>
          </>
        )}
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Chiffre d'Affaires HT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600 tracking-tighter">
              {formatAmount(stats.ca)} <span className="text-sm font-normal">DA</span>
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2">Source : Invoices 2026</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-2xl h-auto">
          <TabsTrigger value="calendar" className="py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Calendrier Fiscal 2026</TabsTrigger>
          <TabsTrigger value="simulation" className="py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Simulation IBS Master</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="mt-8">
          <Card className="border-none shadow-2xl ring-1 ring-border rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b p-6">
              <CardTitle className="text-lg font-black uppercase tracking-tighter">Obligations Légales du Dossier</CardTitle>
              <CardDescription className="text-xs uppercase font-bold text-slate-400">Périodicité et échéances basées sur le profil {currentTenant?.regimeFiscal}.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="text-[10px] uppercase font-black">
                    <TableHead className="pl-8">Déclaration</TableHead>
                    <TableHead>Échéance 2026</TableHead>
                    <TableHead>Objet & Nature</TableHead>
                    <TableHead className="text-right pr-8">Action Requise</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isIFU ? (
                    <>
                      <TableRow className="hover:bg-primary/5 transition-colors">
                        <TableCell className="font-black text-sm pl-8">Série G n°12 bis</TableCell>
                        <TableCell className="text-amber-600 font-black text-xs">01 Mars 2026</TableCell>
                        <TableCell className="text-xs font-medium text-slate-600">Définitive Exercice 2025 (Regularisation CA)</TableCell>
                        <TableCell className="text-right pr-8"><Button size="sm" variant="ghost" className="text-primary font-black uppercase text-[10px]" asChild><Link href={`/dashboard/declarations/g12?tenantId=${currentTenant?.id}`}>Ouvrir <ArrowRight className="ml-1 h-3 w-3" /></Link></Button></TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-primary/5 transition-colors">
                        <TableCell className="font-black text-sm pl-8">Série G n°12</TableCell>
                        <TableCell className="text-xs font-bold">30 Juin 2026</TableCell>
                        <TableCell className="text-xs font-medium text-slate-600">Prévisionnelle 2026 (Assiette estimée)</TableCell>
                        <TableCell className="text-right pr-8"><Button size="sm" variant="ghost" className="text-primary font-black uppercase text-[10px]" asChild><Link href={`/dashboard/declarations/g12?tenantId=${currentTenant?.id}`}>Ouvrir <ArrowRight className="ml-1 h-3 w-3" /></Link></Button></TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow className="hover:bg-primary/5 transition-colors">
                      <TableCell className="font-black text-sm pl-8">Série G n°50</TableCell>
                      <TableCell className="text-xs font-bold">20 de chaque mois</TableCell>
                      <TableCell className="text-xs font-medium text-slate-600">Mensuelle : TVA, IRG Salariés, Acomptes IBS</TableCell>
                      <TableCell className="text-right pr-8"><Button size="sm" variant="ghost" className="text-primary font-black uppercase text-[10px]" asChild><Link href={`/dashboard/declarations/g50?tenantId=${currentTenant?.id}`}>Ouvrir <ArrowRight className="ml-1 h-3 w-3" /></Link></Button></TableCell>
                    </TableRow>
                  )}
                  <TableRow className="hover:bg-primary/5 transition-colors">
                    <TableCell className="font-black text-sm pl-8">Liasse G n°4</TableCell>
                    <TableCell className="text-xs font-bold">30 Avril 2026</TableCell>
                    <TableCell className="text-xs font-medium text-slate-600">Déclaration annuelle des résultats (Bilan/TCR)</TableCell>
                    <TableCell className="text-right pr-8"><Button size="sm" variant="ghost" className="text-primary font-black uppercase text-[10px]" asChild><Link href={`/dashboard/declarations/g4?tenantId=${currentTenant?.id}`}>Ouvrir <ArrowRight className="ml-1 h-3 w-3" /></Link></Button></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulation" className="mt-8">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 border-none shadow-xl ring-1 ring-border rounded-3xl bg-white p-8">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter">Optimisation IBS Master</CardTitle>
                  <CardDescription className="text-xs font-bold text-slate-400">Utilisez le levier de réinvestissement (Art. 150 CIDTA) pour réduire votre charge.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-8">
                   <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Résultat Fiscal Estimé (Bénéfice)</Label>
                        <Input type="number" value={estimatedProfit} onChange={e => setEstimatedProfit(parseFloat(e.target.value) || 0)} className="h-12 rounded-xl text-lg font-black" />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Montant réinvesti dans des actifs</Label>
                        <Input type="number" value={reinvestedAmount} onChange={e => setReinvestedAmount(parseFloat(e.target.value) || 0)} className="h-12 rounded-xl text-lg font-black border-emerald-200 bg-emerald-50/20" />
                      </div>
                   </div>
                   <div className="p-6 bg-slate-900 text-white rounded-3xl relative overflow-hidden">
                      <Sparkles className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
                      <div className="flex justify-between items-end">
                         <div>
                           <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">Impôt IBS à payer</p>
                           <h2 className="text-4xl font-black tracking-tighter">{formatAmount(projectedIBS)} DA</h2>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-bold text-white/60 uppercase">Gain Fiscal Immédiat</p>
                            <p className="text-xl font-black text-emerald-400">+{formatAmount(reinvestedAmount * ibsRate)} DA</p>
                         </div>
                      </div>
                   </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                 <Card className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 relative overflow-hidden">
                    <ShieldCheck className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 text-emerald-600" />
                    <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2">Expertise Fiscalité 2026</h4>
                    <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                      "Le réinvestissement d'une partie des bénéfices dans des équipements productifs permet de réduire l'assiette IBS. Votre taux secteur est automatiquement détecté : **{(ibsRate * 100)}%**."
                    </p>
                 </Card>
                 <div className="p-6 bg-slate-100 rounded-3xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-4 w-4 text-primary" />
                      <span className="text-[10px] font-black uppercase text-primary tracking-widest">Conseil Master Node</span>
                    </div>
                    <p className="text-[11px] text-slate-500 italic leading-relaxed">
                      "Attention : L'exonération IBS pour les Startups est totale pendant 4 ans. Si votre label est actif, ne comptabilisez aucune provision."
                    </p>
                 </div>
              </div>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
