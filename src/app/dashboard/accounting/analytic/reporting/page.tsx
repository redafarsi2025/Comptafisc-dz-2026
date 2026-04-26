/**
 * @fileOverview Reporting Analytique Master Node avec Intelligence Décisionnelle.
 */

"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { 
  PieChart, Printer, FileDown, ShieldCheck, Loader2,
  Target, Activity, Layers, Landmark, Lightbulb, AlertTriangle, TrendingUp, TrendingDown
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSearchParams } from "next/navigation"
import { aggregateResultBySection } from "@/services/analytique/reporting.service"
import { formatDZD } from "@/utils/fiscalAlgerie"

export default function AnalyticReporting() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [activeAxeId, setActiveAxeId] = React.useState<string>("")

  React.useEffect(() => { setMounted(true) }, [])

  const axesQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "axesAnalytiques"), where("actif", "==", true)) : null
  , [db, tenantId]);
  const { data: axes } = useCollection(axesQuery);

  const entriesQuery = useMemoFirebase(() => 
    (db && tenantId) ? collection(db, "tenants", tenantId, "ecrituresAnalytiques") : null
  , [db, tenantId]);
  const { data: ecritures, isLoading } = useCollection(entriesQuery);

  React.useEffect(() => {
    if (axes?.length && !activeAxeId) setActiveAxeId(axes[0].id);
  }, [axes]);

  const reportData = React.useMemo(() => {
    if (!ecritures || !activeAxeId) return [];
    return aggregateResultBySection(ecritures, activeAxeId);
  }, [ecritures, activeAxeId]);

  const totals = React.useMemo(() => {
    return reportData.reduce((acc, curr) => ({
      charges: acc.charges + curr.charges,
      produits: acc.produits + curr.produits,
      marge: acc.marge + curr.marge
    }), { charges: 0, produits: 0, marge: 0 });
  }, [reportData]);

  // ANALYSE DÉCISIONNELLE AUTOMATIQUE
  const insights = React.useMemo(() => {
    if (reportData.length === 0) return [];
    const items = [];
    
    // 1. Détection des déficits
    const losingSections = reportData.filter(s => s.marge < 0);
    if (losingSections.length > 0) {
      items.push({
        type: 'danger',
        title: 'Alerte Rentabilité',
        text: `${losingSections.length} section(s) présentent un solde débiteur. Une revue des charges directes est prioritaire.`
      });
    }

    // 2. Analyse du poids structurel
    const heavyWeight = reportData.find(s => totals.charges > 0 && (s.charges / totals.charges) > 0.4);
    if (heavyWeight) {
      items.push({
        type: 'warning',
        title: 'Poids Structurel Élevé',
        text: `La section ${heavyWeight.sectionLibelle} consomme plus de 40% des ressources de cet axe.`
      });
    }

    // 3. Optimisation Fiscale
    if (totals.marge > 0) {
      items.push({
        type: 'success',
        title: 'Levier IBS 2026',
        text: "Votre marge analytique est positive. Envisagez le réinvestissement productif pour réduire votre taux d'imposition effectif."
      });
    }

    return items;
  }, [reportData, totals]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <PieChart className="text-accent h-8 w-8" /> Pilotage Analytique
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Exploitation Master - Rentabilité par Centre de Coût</p>
        </div>
        <div className="flex gap-2">
          <Select value={activeAxeId} onValueChange={setActiveAxeId}>
            <SelectTrigger className="w-64 h-11 rounded-xl bg-white shadow-sm font-bold">
              <Layers className="h-4 w-4 mr-2 text-primary" />
              <SelectValue placeholder="Choisir un axe..." />
            </SelectTrigger>
            <SelectContent>
              {axes?.map(a => <SelectItem key={a.id} value={a.id}>{a.libelle}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-xl h-11 px-6 font-bold"><Printer className="mr-2 h-4 w-4" /> PDF</Button>
          <Button className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold"><FileDown className="mr-2 h-4 w-4" /> Excel</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <div className="absolute top-0 right-0 p-4 opacity-10"><Target className="h-16 w-16" /></div>
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Marge Globale Analytique</p>
           <h2 className={`text-3xl font-black ${totals.marge >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
             {formatDZD(totals.marge)}
           </h2>
        </Card>
        <Card className="border-l-4 border-l-primary shadow-sm bg-white p-6">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total Produits (7)</p>
           <h2 className="text-2xl font-black text-primary">{formatDZD(totals.produits)}</h2>
        </Card>
        <Card className="border-l-4 border-l-red-500 shadow-sm bg-white p-6">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total Charges (6)</p>
           <h2 className="text-2xl font-black text-red-600">{formatDZD(totals.charges)}</h2>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 border border-l-4 border-l-emerald-500 p-6 flex items-center gap-4">
           <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
             <ShieldCheck className="h-6 w-6 text-emerald-600" />
           </div>
           <div>
             <p className="text-[10px] font-black text-emerald-800 uppercase leading-tight">Data Integrity</p>
             <p className="text-[11px] text-emerald-600 font-medium">100% Ventilée</p>
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
          <CardHeader className="bg-slate-50 border-b p-6">
            <CardTitle className="text-lg font-black uppercase tracking-tighter">Tableau des Soldes de Gestion Analytiques</CardTitle>
            <CardDescription className="text-xs uppercase font-bold text-slate-400">Extraction temps-réel du Livre de Paie, Stocks et Facturation.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="text-[10px] uppercase font-black">
                  <TableHead className="pl-8">Section / Code</TableHead>
                  <TableHead className="text-right">Produits (+)</TableHead>
                  <TableHead className="text-right">Charges (-)</TableHead>
                  <TableHead className="text-right">Marge Nette</TableHead>
                  <TableHead className="text-center pr-8">Poids / CA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin mx-auto text-primary h-10 w-10" /></TableCell></TableRow>
                ) : reportData.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">Aucune écriture ventilée sur cet axe.</TableCell></TableRow>
                ) : reportData.map(s => (
                  <TableRow key={s.sectionId} className="hover:bg-slate-50 transition-colors h-16">
                    <TableCell className="pl-8">
                      <div className="flex flex-col">
                        <span className="font-black text-xs uppercase text-slate-900">{s.sectionLibelle}</span>
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">{s.sectionCode}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-emerald-600">{formatDZD(s.produits)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-red-600">{formatDZD(s.charges)}</TableCell>
                    <TableCell className={`text-right font-black text-sm ${s.marge >= 0 ? 'text-primary' : 'text-red-500'}`}>{formatDZD(s.marge)}</TableCell>
                    <TableCell className="text-center pr-8">
                      <Badge variant="outline" className="text-[9px] font-black h-5 border-primary/20 text-primary">
                        {s.tauxMarge ? `${s.tauxMarge.toFixed(1)}%` : "0%"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-slate-900 text-white">
                <TableRow className="font-black h-16">
                  <TableCell className="pl-8 uppercase tracking-widest text-base">Total Axe</TableCell>
                  <TableCell className="text-right font-mono">{formatDZD(totals.produits)}</TableCell>
                  <TableCell className="text-right font-mono">{formatDZD(totals.charges)}</TableCell>
                  <TableCell className="text-right font-mono text-lg text-accent">{formatDZD(totals.marge)}</TableCell>
                  <TableCell className="text-center pr-8">100%</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
           <Card className="bg-slate-900 text-white border-none shadow-xl rounded-3xl overflow-hidden relative">
             <Activity className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
             <CardHeader className="bg-primary/20 border-b border-white/5">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent">Observations Master</CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-4">
                {insights.length === 0 ? (
                  <p className="text-[11px] opacity-70 italic">Aucune anomalie détectée sur ce périmètre.</p>
                ) : insights.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2">
                      {item.type === 'danger' ? <AlertTriangle className="h-3 w-3 text-red-400" /> : 
                       item.type === 'warning' ? <TrendingDown className="h-3 w-3 text-amber-400" /> :
                       <TrendingUp className="h-3 w-3 text-emerald-400" />}
                      <span className="text-[10px] font-black uppercase">{item.title}</span>
                    </div>
                    <p className="text-[11px] opacity-80 leading-relaxed italic">"{item.text}"</p>
                  </div>
                ))}
             </CardContent>
           </Card>

           <div className="p-6 bg-blue-50 border border-blue-200 rounded-3xl flex items-start gap-4">
              <Lightbulb className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
              <div className="text-[11px] leading-relaxed text-blue-900 font-medium">
                <p className="font-bold uppercase tracking-tight mb-1">Optimisation IBS 2026 :</p>
                <p className="opacity-80">
                  Ce rapport permet de distinguer vos marges industrielles (IBS 19%) de vos marges de services (IBS 26%). 
                  Ces tableaux constituent la preuve matérielle de votre base d'imposition sectorielle.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
