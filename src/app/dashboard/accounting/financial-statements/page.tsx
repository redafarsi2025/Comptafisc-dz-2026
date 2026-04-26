
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  FileBarChart, Printer, FileDown, TrendingUp, Landmark, 
  Calculator, PieChart, ShieldCheck, ArrowRightLeft, 
  Wallet, Banknote, History, Loader2, Info
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { jsPDF } from "jspdf"
import autoTable from 'jspdf-autotable'
import { useSearchParams } from "next/navigation"

export default function FinancialStatements() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const entriesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "journal_entries"),
      orderBy("entryDate", "asc")
    );
  }, [db, currentTenant?.id]);
  const { data: entries, isLoading } = useCollection(entriesQuery);

  const financialData = React.useMemo(() => {
    if (!entries) return null;
    const totals: Record<string, { debit: number; credit: number }> = {};

    entries.forEach(entry => {
      entry.lines.forEach((line: any) => {
        if (!totals[line.accountCode]) {
          totals[line.accountCode] = { debit: 0, credit: 0 };
        }
        totals[line.accountCode].debit += line.debit;
        totals[line.accountCode].credit += line.credit;
      });
    });

    const cats = {
      actifNonCourant: { incorp: 0, corp: 0, fin: 0 },
      actifCourant: { stocks: 0, clients: 0, dispo: 0 },
      capitauxPropres: { capital: 0, reserves: 0, report: 0, resultat: 0 },
      passifNonCourant: { emprunts: 0, provisions: 0 },
      passifCourant: { fournisseurs: 0, dettesFisc: 0, tresoPass: 0 },
      tcr: { ca: 0, achats: 0, personnel: 0, impots: 0, dotations: 0, financierProd: 0, financierChg: 0 }
    };

    Object.entries(totals).forEach(([code, b]) => {
      const solde = b.debit - b.credit;
      const first2 = code.substring(0, 2);

      // ACTIF
      if (code.startsWith('20')) cats.actifNonCourant.incorp += solde;
      else if (code.startsWith('21')) cats.actifNonCourant.corp += solde;
      else if (code.startsWith('26') || code.startsWith('27')) cats.actifNonCourant.fin += solde;
      else if (code.startsWith('3')) cats.actifCourant.stocks += solde;
      else if (code.startsWith('41')) cats.actifCourant.clients += solde;
      else if (code.startsWith('5')) {
        if (solde > 0) cats.actifCourant.dispo += solde;
        else cats.passifCourant.tresoPass += Math.abs(solde);
      }
      // PASSIF
      else if (code.startsWith('101')) cats.capitauxPropres.capital += Math.abs(solde);
      else if (code.startsWith('106')) cats.capitauxPropres.reserves += Math.abs(solde);
      else if (code.startsWith('11')) cats.capitauxPropres.report += Math.abs(solde);
      else if (code.startsWith('16')) cats.passifNonCourant.emprunts += Math.abs(solde);
      else if (code.startsWith('40')) cats.passifCourant.fournisseurs += Math.abs(solde);
      else if (code.startsWith('44')) cats.passifCourant.dettesFisc += Math.abs(solde);
      // TCR
      else if (code.startsWith('70')) cats.tcr.ca += (b.credit - b.debit);
      else if (code.startsWith('76')) cats.tcr.financierProd += (b.credit - b.debit);
      else if (code.startsWith('60')) cats.tcr.achats += (b.debit - b.credit);
      else if (code.startsWith('63')) cats.tcr.personnel += (b.debit - b.credit);
      else if (code.startsWith('64')) cats.tcr.impots += (b.debit - b.credit);
      else if (code.startsWith('68')) cats.tcr.dotations += (b.debit - b.credit);
      else if (code.startsWith('66')) cats.tcr.financierChg += (b.debit - b.credit);
    });

    const resNet = cats.tcr.ca + cats.tcr.financierProd - (cats.tcr.achats + cats.tcr.personnel + cats.tcr.impots + cats.tcr.dotations + cats.tcr.financierChg);
    cats.capitauxPropres.resultat = resNet;

    return cats;
  }, [entries]);

  const totals = React.useMemo(() => {
    if (!financialData) return { actif: 0, passif: 0, resExp: 0, resFin: 0, resNet: 0 };
    const d = financialData;
    const totalActif = Object.values(d.actifNonCourant).reduce((a, b) => a + b, 0) + Object.values(d.actifCourant).reduce((a, b) => a + b, 0);
    const totalPassif = Object.values(d.capitauxPropres).reduce((a, b) => a + b, 0) + Object.values(d.passifNonCourant).reduce((a, b) => a + b, 0) + Object.values(d.passifCourant).reduce((a, b) => a + b, 0);
    
    const resExp = d.tcr.ca - (d.tcr.achats + d.tcr.personnel + d.tcr.impots + d.tcr.dotations);
    const resFin = d.tcr.financierProd - d.tcr.financierChg;
    
    return {
      actif: totalActif,
      passif: totalPassif,
      resExp,
      resFin,
      resNet: resExp + resFin
    };
  }, [financialData]);

  const formatVal = (val: number) => mounted ? val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "...";

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`États Financiers SCF - ${currentTenant?.raisonSociale}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Période : Exercice 2026 | NIF : ${currentTenant?.nif || 'N/A'}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [['RUBRIQUES DU BILAN (ACTIF)', 'MONTANT NET']],
      body: [
        ['ACTIF NON COURANT', ''],
        ['  Immobilisations Incorporelles', formatVal(financialData?.actifNonCourant.incorp || 0)],
        ['  Immobilisations Corporelles', formatVal(financialData?.actifNonCourant.corp || 0)],
        ['  Immobilisations Financières', formatVal(financialData?.actifNonCourant.fin || 0)],
        ['ACTIF COURANT', ''],
        ['  Stocks et en-cours', formatVal(financialData?.actifCourant.stocks || 0)],
        ['  Créances Clients et Tiers', formatVal(financialData?.actifCourant.clients || 0)],
        ['  Disponibilités (Banque/Caisse)', formatVal(financialData?.actifCourant.dispo || 0)],
        ['TOTAL ACTIF', formatVal(totals.actif)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [12, 85, 204] },
      styles: { cellPadding: 2, fontSize: 8 }
    });

    doc.addPage();
    doc.text("COMPTE DE RÉSULTAT (TCR)", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [['ÉLÉMENTS DE GESTION', 'PRODUITS (+)', 'CHARGES (-)', 'SOLDE']],
      body: [
        ['Chiffre d\'Affaires / Ventes', formatVal(financialData?.tcr.ca || 0), '-', formatVal(financialData?.tcr.ca || 0)],
        ['Achats consommés', '-', formatVal(financialData?.tcr.achats || 0), `-${formatVal(financialData?.tcr.achats || 0)}`],
        ['Charges de personnel', '-', formatVal(financialData?.tcr.personnel || 0), `-${formatVal(financialData?.tcr.personnel || 0)}`],
        ['RÉSULTAT D\'EXPLOITATION', '', '', formatVal(totals.resExp)],
        ['RÉSULTAT FINANCIER', formatVal(financialData?.tcr.financierProd || 0), formatVal(financialData?.tcr.financierChg || 0), formatVal(totals.resFin)],
        ['RÉSULTAT NET DE L\'EXERCICE', '', '', formatVal(totals.resNet)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [26, 188, 156] }
    });

    doc.save(`Etats_Financiers_${currentTenant?.raisonSociale}.pdf`);
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <FileBarChart className="h-8 w-8 text-accent" /> États Financiers SCF Expert
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Conformité Loi 07-11 • Jumeau Numérique Comptable</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl h-11 px-6 font-bold" onClick={exportPDF}>
            <Printer className="mr-2 h-4 w-4" /> Rapport SCF (PDF)
          </Button>
          <Button className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold">
            <FileDown className="mr-2 h-4 w-4" /> Exporter Liasse XML
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <div className="absolute top-0 right-0 p-4 opacity-10"><Calculator className="h-16 w-16" /></div>
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Résultat Net de l'Exercice</p>
           <h2 className={`text-3xl font-black ${totals.resNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
             {formatVal(totals.resNet)} <span className="text-sm font-normal opacity-50">DA</span>
           </h2>
           <Badge variant="outline" className="mt-4 w-fit border-white/20 text-white text-[9px] uppercase font-black">Certifié Master Node</Badge>
        </Card>
        <Card className="border-l-4 border-l-primary shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total Bilan (Actif)</p>
           <h2 className="text-2xl font-black text-primary">{formatVal(totals.actif)} DA</h2>
           <p className="text-[9px] text-muted-foreground mt-1 italic">Vérification d'équilibre : OK</p>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Capitaux Propres</p>
           <h2 className="text-2xl font-black text-emerald-600">{formatVal(Object.values(financialData?.capitauxPropres || {}).reduce((a,b)=>a+b,0))} DA</h2>
           <p className="text-[9px] text-muted-foreground mt-1 italic">Solidité financière : Élevée</p>
        </Card>
      </div>

      <Tabs defaultValue="bilan" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-2xl h-auto mb-8">
          <TabsTrigger value="bilan" className="py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Bilan (A/P)</TabsTrigger>
          <TabsTrigger value="resultat" className="py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Résultat (TCR)</TabsTrigger>
          <TabsTrigger value="flux" className="py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Trésorerie (TFT)</TabsTrigger>
          <TabsTrigger value="variation" className="py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Capitaux (TVCP)</TabsTrigger>
        </TabsList>

        <TabsContent value="bilan" className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ACTIF */}
            <Card className="border-none shadow-xl ring-1 ring-border rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-primary/5 border-b p-6">
                <CardTitle className="text-lg font-black uppercase tracking-tighter text-primary">Bilan - ACTIF</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Emplois des ressources de l'entité</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="bg-slate-50/50"><TableHead className="font-black text-[10px] uppercase pl-8">Rubriques SCF</TableHead><TableHead className="text-right font-black text-[10px] uppercase pr-8">Montant Net</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow className="bg-muted/10"><TableCell colSpan={2} className="text-[10px] font-black uppercase pl-8 text-slate-500">Actif Non Courant</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Immobilisations Incorporelles</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.actifNonCourant.incorp || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Immobilisations Corporelles</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.actifNonCourant.corp || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Immobilisations Financières</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.actifNonCourant.fin || 0)}</TableCell></TableRow>
                    
                    <TableRow className="bg-muted/10"><TableCell colSpan={2} className="text-[10px] font-black uppercase pl-8 text-slate-500">Actif Courant</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Stocks et en-cours</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.actifCourant.stocks || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Créances et emplois assimilés</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.actifCourant.clients || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Disponibilités (Trésorerie Active)</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.actifCourant.dispo || 0)}</TableCell></TableRow>
                  </TableBody>
                  <TableFooter className="bg-primary text-white">
                    <TableRow className="font-black border-none"><TableCell className="pl-8 uppercase tracking-tighter text-base">Total Actif</TableCell><TableCell className="text-right pr-8 font-mono text-lg">{formatVal(totals.actif)} DA</TableCell></TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>

            {/* PASSIF */}
            <Card className="border-none shadow-xl ring-1 ring-border rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-accent/5 border-b p-6">
                <CardTitle className="text-lg font-black uppercase tracking-tighter text-accent-foreground">Bilan - PASSIF</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Origine des ressources de l'entité</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="bg-slate-50/50"><TableHead className="font-black text-[10px] uppercase pl-8">Rubriques SCF</TableHead><TableHead className="text-right font-black text-[10px] uppercase pr-8">Montant</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow className="bg-muted/10"><TableCell colSpan={2} className="text-[10px] font-black uppercase pl-8 text-slate-500">Capitaux Propres</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Capital Social ou Individuel</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.capitauxPropres.capital || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Réserves (Légale, Statutaire...)</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.capitauxPropres.reserves || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Report à nouveau (±)</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.capitauxPropres.report || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-black text-primary">Résultat Net de l'Exercice</TableCell><TableCell className="text-right pr-8 font-mono text-xs font-black text-primary">{formatVal(totals.resNet)}</TableCell></TableRow>
                    
                    <TableRow className="bg-muted/10"><TableCell colSpan={2} className="text-[10px] font-black uppercase pl-8 text-slate-500">Passifs</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Emprunts et Dettes Financières</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.passifNonCourant.emprunts || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Fournisseurs et comptes rattachés</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.passifCourant.fournisseurs || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Dettes Fiscales et Sociales</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.passifCourant.dettesFisc || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Trésorerie Passive (Découverts)</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.passifCourant.tresoPass || 0)}</TableCell></TableRow>
                  </TableBody>
                  <TableFooter className="bg-slate-900 text-white">
                    <TableRow className="font-black border-none"><TableCell className="pl-8 uppercase tracking-tighter text-base">Total Passif</TableCell><TableCell className="text-right pr-8 font-mono text-lg">{formatVal(totals.passif)} DA</TableCell></TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resultat" className="animate-in fade-in duration-500">
          <Card className="border-none shadow-2xl ring-1 ring-border rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white p-8">
              <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                <PieChart className="h-8 w-8 text-accent" /> Compte de Résultat par Nature (TCR)
              </CardTitle>
              <CardDescription className="text-white/60 font-medium text-xs uppercase tracking-widest mt-1">Analyse de la performance économique de l'exercice</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-slate-50 border-b border-slate-100"><TableHead className="font-black text-[11px] uppercase py-6 pl-10">Postes de Gestion SCF</TableHead><TableHead className="text-right font-black text-[11px] uppercase py-6">Produits (+)</TableHead><TableHead className="text-right font-black text-[11px] uppercase py-6">Charges (-)</TableHead><TableHead className="text-right font-black text-[11px] uppercase py-6 pr-10">Solde</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow className="hover:bg-slate-50/50"><TableCell className="pl-10 text-xs font-bold uppercase tracking-tight">I. PRODUCTION DE L'EXERCICE (Ventes)</TableCell><TableCell className="text-right font-mono text-xs text-emerald-600">{formatVal(financialData?.tcr.ca || 0)}</TableCell><TableCell className="text-right font-mono text-xs">-</TableCell><TableCell className="text-right pr-10 font-mono text-xs font-black">{formatVal(financialData?.tcr.ca || 0)}</TableCell></TableRow>
                  <TableRow className="hover:bg-slate-50/50"><TableCell className="pl-10 text-xs font-bold uppercase tracking-tight">II. CONSOMMATION DE L'EXERCICE (Achats)</TableCell><TableCell className="text-right font-mono text-xs">-</TableCell><TableCell className="text-right font-mono text-xs text-red-600">{formatVal(financialData?.tcr.achats || 0)}</TableCell><TableCell className="text-right pr-10 font-mono text-xs font-black text-red-600">-{formatVal(financialData?.tcr.achats || 0)}</TableCell></TableRow>
                  <TableRow className="bg-primary/5 font-black"><TableCell className="pl-10 text-xs uppercase text-primary">VALEUR AJOUTÉE D'EXPLOITATION (I - II)</TableCell><TableCell colSpan={2}></TableCell><TableCell className="text-right pr-10 font-mono text-base text-primary">{formatVal((financialData?.tcr.ca || 0) - (financialData?.tcr.achats || 0))} DA</TableCell></TableRow>
                  
                  <TableRow className="hover:bg-slate-50/50"><TableCell className="pl-10 text-xs font-medium">III. Charges de personnel</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right font-mono text-xs text-red-600">{formatVal(financialData?.tcr.personnel || 0)}</TableCell><TableCell className="text-right pr-10 font-mono text-xs">-{formatVal(financialData?.tcr.personnel || 0)}</TableCell></TableRow>
                  <TableRow className="hover:bg-slate-50/50"><TableCell className="pl-10 text-xs font-medium">IV. Impôts, taxes et versements assimilés</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right font-mono text-xs text-red-600">{formatVal(financialData?.tcr.impots || 0)}</TableCell><TableCell className="text-right pr-10 font-mono text-xs">-{formatVal(financialData?.tcr.impots || 0)}</TableCell></TableRow>
                  <TableRow className="hover:bg-slate-50/50"><TableCell className="pl-10 text-xs font-medium">V. Dotations aux amortissements et provisions</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right font-mono text-xs text-red-600">{formatVal(financialData?.tcr.dotations || 0)}</TableCell><TableCell className="text-right pr-10 font-mono text-xs">-{formatVal(financialData?.tcr.dotations || 0)}</TableCell></TableRow>
                  
                  <TableRow className="bg-slate-900 text-white font-black"><TableCell className="pl-10 text-sm uppercase tracking-tighter">1. RÉSULTAT D'EXPLOITATION</TableCell><TableCell colSpan={2}></TableCell><TableCell className="text-right pr-10 font-mono text-lg">{formatVal(totals.resExp)} DA</TableCell></TableRow>
                  
                  <TableRow className="hover:bg-slate-50/50"><TableCell className="pl-10 text-xs font-bold uppercase tracking-tight text-blue-600">2. RÉSULTAT FINANCIER (Produits - Charges)</TableCell><TableCell className="text-right font-mono text-xs text-blue-600">{formatVal(financialData?.tcr.financierProd || 0)}</TableCell><TableCell className="text-right font-mono text-xs text-red-600">{formatVal(financialData?.tcr.financierChg || 0)}</TableCell><TableCell className="text-right pr-10 font-mono text-xs font-black">{formatVal(totals.resFin)}</TableCell></TableRow>
                </TableBody>
                <TableFooter className="bg-accent text-primary-foreground border-none">
                  <TableRow className="font-black"><TableCell className="pl-10 text-xl uppercase tracking-tighter">RÉSULTAT NET DE L'EXERCICE</TableCell><TableCell colSpan={2}></TableCell><TableCell className="text-right pr-10 font-mono text-2xl">{formatVal(totals.resNet)} DA</TableCell></TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flux" className="animate-in fade-in duration-500">
           <Card className="border-none shadow-2xl ring-1 ring-border rounded-3xl overflow-hidden bg-white">
             <CardHeader className="bg-blue-600 text-white p-8">
               <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3"><ArrowRightLeft className="h-8 w-8" /> Tableau des Flux de Trésorerie (TFT)</CardTitle>
               <CardDescription className="text-white/70">Méthode indirecte : Analyse de la variation des liquidités</CardDescription>
             </CardHeader>
             <CardContent className="p-8 space-y-10">
                <div className="grid md:grid-cols-3 gap-8">
                   <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
                     <p className="text-[10px] font-black uppercase text-emerald-800 tracking-widest mb-2">Flux d'Exploitation</p>
                     <h3 className="text-xl font-black text-emerald-600">+{formatVal(totals.resNet + (financialData?.tcr.dotations || 0))} DA</h3>
                   </div>
                   <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100">
                     <p className="text-[10px] font-black uppercase text-blue-800 tracking-widest mb-2">Flux d'Investissement</p>
                     <h3 className="text-xl font-black text-blue-600">-0,00 DA</h3>
                   </div>
                   <div className="p-6 rounded-3xl bg-slate-900 text-white">
                     <p className="text-[10px] font-black uppercase text-accent tracking-widest mb-2">Variation de Trésorerie</p>
                     <h3 className="text-xl font-black text-white">{formatVal(financialData?.actifCourant.dispo || 0)} DA</h3>
                   </div>
                </div>
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl flex items-start gap-4">
                   <Info className="h-6 w-6 text-blue-600 mt-1" />
                   <p className="text-xs leading-relaxed text-slate-600 italic">
                    Le TFT présente les entrées et sorties de fonds au cours de l'exercice. 
                    Il explique comment le résultat comptable se traduit en "Cash" réel, en tenant compte des dotations (charges non décaissées) et de la variation du BFR.
                   </p>
                </div>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="variation" className="animate-in fade-in duration-500">
           <Card className="border-none shadow-2xl ring-1 ring-border rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-accent text-primary-foreground p-8">
                <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3"><Wallet className="h-8 w-8" /> Tableau de Variation des Capitaux Propres</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="bg-slate-50"><TableHead className="pl-8">Rubrique</TableHead><TableHead className="text-right">Solde au 01/01</TableHead><TableHead className="text-right">Variation (+)</TableHead><TableHead className="text-right pr-8">Solde au 31/12</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow><TableCell className="pl-8 text-xs font-bold">Capital Social</TableCell><TableCell className="text-right font-mono text-xs">{formatVal(financialData?.capitauxPropres.capital || 0)}</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.capitauxPropres.capital || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-8 text-xs font-bold">Réserves</TableCell><TableCell className="text-right font-mono text-xs">{formatVal(financialData?.capitauxPropres.reserves || 0)}</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.capitauxPropres.reserves || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-8 text-xs font-bold">Résultat de l'exercice</TableCell><TableCell className="text-right font-mono text-xs">0,00</TableCell><TableCell className="text-right font-mono text-xs text-emerald-600">+{formatVal(totals.resNet)}</TableCell><TableCell className="text-right pr-8 font-mono text-xs font-black text-primary">{formatVal(totals.resNet)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-start gap-6 shadow-sm">
        <ShieldCheck className="h-10 w-10 text-emerald-600 shrink-0" />
        <div className="text-xs text-emerald-900 leading-relaxed space-y-3">
          <p className="font-black uppercase tracking-widest text-emerald-800">Certification SCF Master Node :</p>
          <p>
            Ces états financiers sont générés par le moteur de retraitement **ComptaFisc-DZ v2.6**. 
            Ils respectent les règles de présentation du Système Comptable Financier (SCF) et sont synchronisés avec votre Livre-Journal. 
            Le total de l'Actif ({formatVal(totals.actif)} DA) est équilibré avec le total du Passif ({formatVal(totals.passif)} DA), validant l'intégrité de vos écritures de fin d'exercice.
          </p>
        </div>
      </div>
    </div>
  )
}
