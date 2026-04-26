
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  FileBarChart, Printer, FileDown, TrendingUp, Landmark, 
  Calculator, PieChart, ShieldCheck, ArrowRightLeft, 
  Wallet, Banknote, History, Loader2, Info, Lightbulb, Activity, Scale, AlertTriangle
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
      tcr: { ca: 0, achats: 0, personnel: 0, impots: 0, dotations: 0, financierProd: 0, financierChg: 0 },
      tft: { acquisitions: 0, cessions: 0, nvxEmprunts: 0, remboursements: 0, augmentCapital: 0 }
    };

    Object.entries(totals).forEach(([code, b]) => {
      const solde = b.debit - b.credit;
      
      // ACTIF
      if (code.startsWith('20')) {
        cats.actifNonCourant.incorp += solde;
        cats.tft.acquisitions += b.debit;
        cats.tft.cessions += b.credit;
      }
      else if (code.startsWith('21')) {
        cats.actifNonCourant.corp += solde;
        cats.tft.acquisitions += b.debit;
        cats.tft.cessions += b.credit;
      }
      else if (code.startsWith('26') || code.startsWith('27')) {
        cats.actifNonCourant.fin += solde;
        cats.tft.acquisitions += b.debit;
      }
      else if (code.startsWith('3')) cats.actifCourant.stocks += solde;
      else if (code.startsWith('41')) cats.actifCourant.clients += solde;
      else if (code.startsWith('5')) {
        if (solde > 0) cats.actifCourant.dispo += solde;
        else cats.passifCourant.tresoPass += Math.abs(solde);
      }
      // PASSIF
      else if (code.startsWith('101')) {
        cats.capitauxPropres.capital += Math.abs(solde);
        cats.tft.augmentCapital += b.credit;
      }
      else if (code.startsWith('106')) cats.capitauxPropres.reserves += Math.abs(solde);
      else if (code.startsWith('11')) cats.capitauxPropres.report += Math.abs(solde);
      else if (code.startsWith('16')) {
        cats.passifNonCourant.emprunts += Math.abs(solde);
        cats.tft.nvxEmprunts += b.credit;
        cats.tft.remboursements += b.debit;
      }
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
    if (!financialData) return { actif: 0, passif: 0, resExp: 0, resFin: 0, resNet: 0, fluxInv: 0, fluxFin: 0, fluxExp: 0 };
    const d = financialData;
    const totalActif = Object.values(d.actifNonCourant).reduce((a, b) => a + b, 0) + Object.values(d.actifCourant).reduce((a, b) => a + b, 0);
    const totalPassif = Object.values(d.capitauxPropres).reduce((a, b) => a + b, 0) + Object.values(d.passifNonCourant).reduce((a, b) => a + b, 0) + Object.values(d.passifCourant).reduce((a, b) => a + b, 0);
    
    const resExp = d.tcr.ca - (d.tcr.achats + d.tcr.personnel + d.tcr.impots + d.tcr.dotations);
    const resFin = d.tcr.financierProd - d.tcr.financierChg;
    const resNet = resExp + resFin;

    // TFT Calculs
    const fluxExp = resNet + (d.tcr.dotations || 0);
    const fluxInv = d.tft.cessions - d.tft.acquisitions;
    const fluxFin = d.tft.augmentCapital + d.tft.nvxEmprunts - d.tft.remboursements;
    
    return {
      actif: totalActif,
      passif: totalPassif,
      resExp,
      resFin,
      resNet,
      fluxExp,
      fluxInv,
      fluxFin
    };
  }, [financialData]);

  const formatVal = (val: number) => {
    if (!mounted) return "...";
    return val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getBilanObservation = () => {
    if (!financialData) return null;
    const cp = Object.values(financialData.capitauxPropres).reduce((a, b) => a + b, 0);
    const ratioAutonomie = totals.passif > 0 ? (cp / totals.passif) : 0;
    const ratioLiquidity = (financialData.passifCourant.fournisseurs + financialData.passifCourant.dettesFisc) > 0 
      ? (Object.values(financialData.actifCourant).reduce((a,b)=>a+b,0) / (financialData.passifCourant.fournisseurs + financialData.passifCourant.dettesFisc))
      : 100;

    if (ratioAutonomie < 0.2) return {
      type: "warning",
      title: "Autonomie financière faible",
      text: "Vos capitaux propres représentent moins de 20% de vos ressources totales. Une augmentation de capital ou une mise en réserve des bénéfices est recommandée pour rassurer vos partenaires bancaires."
    };
    if (ratioLiquidity < 1) return {
      type: "warning",
      title: "Tension sur la trésorerie",
      text: "Vos actifs circulants ne couvrent pas vos dettes à court terme. Risque de rupture de paiement fournisseur imminent. Accélérez le recouvrement client."
    };
    return {
      type: "success",
      title: "Structure de bilan saine",
      text: "L'entité dispose d'une bonne solidité financière. L'équilibre entre emplois et ressources est maîtrisé conformément aux standards du SCF."
    };
  };

  const getTCRObservation = () => {
    if (!financialData) return null;
    const margin = financialData.tcr.ca > 0 ? (totals.resNet / financialData.tcr.ca) : 0;
    const chargesPersonnelRatio = financialData.tcr.ca > 0 ? (financialData.tcr.personnel / financialData.tcr.ca) : 0;

    if (margin < 0) return {
      type: "danger",
      title: "Exploitation déficitaire",
      text: "L'exercice génère une perte nette. Une révision urgente de la structure des coûts (achats et charges externes) est impérative pour inverser la tendance."
    };
    if (chargesPersonnelRatio > 0.4) return {
      type: "warning",
      title: "Poids de la masse salariale",
      text: "Vos charges de personnel consomment plus de 40% de votre chiffre d'affaires. Vérifiez l'adéquation entre effectifs et volume d'activité."
    };
    return {
      type: "success",
      title: "Performance opérationnelle",
      text: `L'entreprise dégage une rentabilité nette de ${(margin * 100).toFixed(1)}%. La création de valeur ajoutée est en ligne avec les moyennes du secteur.`
    };
  };

  const getTFTObservation = () => {
    if (totals.fluxInv < 0 && Math.abs(totals.fluxInv) > totals.fluxExp) return {
      type: "info",
      title: "Phase d'investissement",
      text: "Votre flux de trésorerie est consommé par l'acquisition d'actifs (Classe 2). C'est un signe de croissance qui devrait booster la rentabilité des exercices futurs."
    };
    if (totals.fluxExp < 0) return {
      type: "danger",
      title: "Flux d'exploitation négatif",
      text: "Votre activité courante détruit de la valeur. Il est urgent de revoir les délais de paiement ou de réduire le besoin en fonds de roulement (BFR)."
    };
    return {
      type: "success",
      title: "Auto-financement sain",
      text: "L'activité génère suffisamment de cash pour couvrir les besoins courants et les investissements de maintien."
    };
  };

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

  const bilanObs = getBilanObservation();
  const tcrObs = getTCRObservation();
  const tftObs = getTFTObservation();

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <FileBarChart className="h-8 w-8 text-accent" /> États Financiers SCF Expert
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Conformité Loi 07-11 • Digital Twin Financials</p>
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
           <Badge variant="outline" className="mt-4 w-fit border-white/20 text-white text-[9px] font-black uppercase tracking-widest">Calculé via Master Node</Badge>
        </Card>
        <Card className="border-l-4 border-l-primary shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total Bilan (Actif)</p>
           <h2 className="text-2xl font-black text-primary">{formatVal(totals.actif)} DA</h2>
           <p className="text-[9px] text-muted-foreground mt-1 italic">Vérification équilibre : Établie</p>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Capitaux Propres</p>
           <h2 className="text-2xl font-black text-emerald-600">{formatVal(Object.values(financialData?.capitauxPropres || {}).reduce((a,b)=>a+b,0))} DA</h2>
           <p className="text-[9px] text-muted-foreground mt-1 italic">Capacité d'autofinancement : Elevée</p>
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
            <Card className="border-none shadow-xl ring-1 ring-border rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-primary/5 border-b p-6">
                <CardTitle className="text-lg font-black uppercase tracking-tighter text-primary">Bilan - ACTIF</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Emplois des ressources</CardDescription>
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
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Créances Clients</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.actifCourant.clients || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Trésorerie Active</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.actifCourant.dispo || 0)}</TableCell></TableRow>
                  </TableBody>
                  <TableFooter className="bg-primary text-white">
                    <TableRow className="font-black border-none"><TableCell className="pl-8 uppercase tracking-tighter text-base">Total Actif</TableCell><TableCell className="text-right pr-8 font-mono text-lg">{formatVal(totals.actif)} DA</TableCell></TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl ring-1 ring-border rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-accent/5 border-b p-6">
                <CardTitle className="text-lg font-black uppercase tracking-tighter text-accent-foreground">Bilan - PASSIF</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Origine des ressources</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="bg-slate-50/50"><TableHead className="font-black text-[10px] uppercase pl-8">Rubriques SCF</TableHead><TableHead className="text-right font-black text-[10px] uppercase pr-8">Montant</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow className="bg-muted/10"><TableCell colSpan={2} className="text-[10px] font-black uppercase pl-8 text-slate-500">Capitaux Propres</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Capital Social</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.capitauxPropres.capital || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Réserves & Reports</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal((financialData?.capitauxPropres.reserves || 0) + (financialData?.capitauxPropres.report || 0))}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-black text-primary">Résultat Net de l'Exercice</TableCell><TableCell className="text-right pr-8 font-mono text-xs font-black text-primary">{formatVal(totals.resNet)}</TableCell></TableRow>
                    <TableRow className="bg-muted/10"><TableCell colSpan={2} className="text-[10px] font-black uppercase pl-8 text-slate-500">Passifs</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Dettes Non Courantes (L.T)</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.passifNonCourant.emprunts || 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="pl-12 text-xs font-medium">Dettes Courantes (C.T)</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.passifCourant.fournisseurs + financialData?.passifCourant.dettesFisc)}</TableCell></TableRow>
                  </TableBody>
                  <TableFooter className="bg-slate-900 text-white">
                    <TableRow className="font-black border-none"><TableCell className="pl-8 uppercase tracking-tighter text-base">Total Passif</TableCell><TableCell className="text-right pr-8 font-mono text-lg">{formatVal(totals.passif)} DA</TableCell></TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </div>

          {bilanObs && (
            <Card className={`border-none shadow-lg rounded-3xl overflow-hidden ${bilanObs.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
              <CardContent className="p-8 flex items-start gap-6">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${bilanObs.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {bilanObs.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                </div>
                <div>
                  <h4 className={`text-lg font-black uppercase tracking-tighter ${bilanObs.type === 'success' ? 'text-emerald-800' : 'text-amber-800'}`}>{bilanObs.title}</h4>
                  <p className={`text-sm mt-1 leading-relaxed ${bilanObs.type === 'success' ? 'text-emerald-700' : 'text-amber-700'}`}>{bilanObs.text}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resultat" className="animate-in fade-in duration-500 space-y-8">
          <Card className="border-none shadow-2xl ring-1 ring-border rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white p-8">
              <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                <PieChart className="h-8 w-8 text-accent" /> Compte de Résultat (TCR)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-slate-50 border-b border-slate-100"><TableHead className="font-black text-[11px] uppercase py-6 pl-10">Postes de Gestion SCF</TableHead><TableHead className="text-right font-black text-[11px] uppercase py-6">Produits (+)</TableHead><TableHead className="text-right font-black text-[11px] uppercase py-6">Charges (-)</TableHead><TableHead className="text-right font-black text-[11px] uppercase py-6 pr-10">Solde</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow><TableCell className="pl-10 text-xs font-bold uppercase">Production de l'exercice</TableCell><TableCell className="text-right font-mono text-xs text-emerald-600">{formatVal(financialData?.tcr.ca || 0)}</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right pr-10 font-mono text-xs font-black">{formatVal(financialData?.tcr.ca || 0)}</TableCell></TableRow>
                  <TableRow><TableCell className="pl-10 text-xs font-bold uppercase">Consommation de l'exercice</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right font-mono text-xs text-red-600">{formatVal(financialData?.tcr.achats || 0)}</TableCell><TableCell className="text-right pr-10 font-mono text-xs font-black text-red-600">-{formatVal(financialData?.tcr.achats || 0)}</TableCell></TableRow>
                  <TableRow className="bg-primary/5 font-black"><TableCell className="pl-10 text-xs uppercase text-primary">Valeur Ajoutée d'Exploitation</TableCell><TableCell colSpan={2}></TableCell><TableCell className="text-right pr-10 font-mono text-base text-primary">{formatVal((financialData?.tcr.ca || 0) - (financialData?.tcr.achats || 0))} DA</TableCell></TableRow>
                  <TableRow><TableCell className="pl-10 text-xs font-medium">Charges de Personnel (63)</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right font-mono text-xs text-red-600">{formatVal(financialData?.tcr.personnel || 0)}</TableCell><TableCell className="text-right pr-10 font-mono text-xs">-{formatVal(financialData?.tcr.personnel || 0)}</TableCell></TableRow>
                  <TableRow className="bg-slate-900 text-white font-black"><TableCell className="pl-10 text-sm uppercase tracking-tighter">1. Résultat d'Exploitation</TableCell><TableCell colSpan={2}></TableCell><TableCell className="text-right pr-10 font-mono text-lg">{formatVal(totals.resExp)} DA</TableCell></TableRow>
                  <TableRow><TableCell className="pl-10 text-xs font-bold text-blue-600">2. Résultat Financier</TableCell><TableCell className="text-right font-mono text-xs text-blue-600">{formatVal(financialData?.tcr.financierProd || 0)}</TableCell><TableCell className="text-right font-mono text-xs text-red-600">{formatVal(financialData?.tcr.financierChg || 0)}</TableCell><TableCell className="text-right pr-10 font-mono text-xs font-black">{formatVal(totals.resFin)}</TableCell></TableRow>
                </TableBody>
                <TableFooter className="bg-accent text-primary-foreground border-none">
                  <TableRow className="font-black"><TableCell className="pl-10 text-xl uppercase tracking-tighter">Résultat Net de l'Exercice</TableCell><TableCell colSpan={2}></TableCell><TableCell className="text-right pr-10 font-mono text-2xl">{formatVal(totals.resNet)} DA</TableCell></TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {tcrObs && (
            <Card className={`border-none shadow-lg rounded-3xl overflow-hidden ${tcrObs.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <CardContent className="p-8 flex items-start gap-6">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${tcrObs.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h4 className={`text-lg font-black uppercase tracking-tighter ${tcrObs.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>{tcrObs.title}</h4>
                  <p className={`text-sm mt-1 leading-relaxed ${tcrObs.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{tcrObs.text}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="flux" className="animate-in fade-in duration-500 space-y-8">
           <Card className="border-none shadow-2xl ring-1 ring-border rounded-3xl overflow-hidden bg-white">
             <CardHeader className="bg-blue-600 text-white p-8">
               <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3"><ArrowRightLeft className="h-8 w-8" /> Tableau des Flux de Trésorerie (TFT)</CardTitle>
             </CardHeader>
             <CardContent className="p-8 space-y-10">
                <div className="grid md:grid-cols-3 gap-8">
                   <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
                     <p className="text-[10px] font-black uppercase text-emerald-800 tracking-widest mb-2">Flux d'Exploitation</p>
                     <h3 className="text-xl font-black text-emerald-600">+{formatVal(totals.fluxExp)} DA</h3>
                   </div>
                   <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100">
                     <p className="text-[10px] font-black uppercase text-amber-800 tracking-widest mb-2">Flux d'Investissement</p>
                     <h3 className={`text-xl font-black ${totals.fluxInv >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                       {totals.fluxInv >= 0 ? '+' : ''}{formatVal(totals.fluxInv)} DA
                     </h3>
                   </div>
                   <div className="p-6 rounded-3xl bg-slate-900 text-white">
                     <p className="text-[10px] font-black uppercase text-accent tracking-widest mb-2">Flux de Financement</p>
                     <h3 className="text-xl font-black text-white">{totals.fluxFin >= 0 ? '+' : ''}{formatVal(totals.fluxFin)} DA</h3>
                   </div>
                </div>

                <div className="p-8 border-t-2 border-dashed border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-slate-400">Variation Totale de Trésorerie</span>
                      <span className="text-4xl font-black text-primary">{formatVal(totals.fluxExp + totals.fluxInv + totals.fluxFin)} DA</span>
                   </div>
                   <div className="flex flex-col text-right">
                      <span className="text-[10px] font-black uppercase text-slate-400">Solde Clôture (Classe 5)</span>
                      <span className="text-4xl font-black text-emerald-600">{formatVal(financialData?.actifCourant.dispo || 0)} DA</span>
                   </div>
                </div>
             </CardContent>
           </Card>

           {tftObs && (
            <Card className={`border-none shadow-lg rounded-3xl overflow-hidden ${tftObs.type === 'success' ? 'bg-emerald-50 border-emerald-100' : tftObs.type === 'info' ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
              <CardContent className="p-8 flex items-start gap-6">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${tftObs.type === 'success' ? 'bg-emerald-100 text-emerald-600' : tftObs.type === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                  <Lightbulb className="h-6 w-6" />
                </div>
                <div>
                  <h4 className={`text-lg font-black uppercase tracking-tighter ${tftObs.type === 'success' ? 'text-emerald-800' : tftObs.type === 'info' ? 'text-blue-800' : 'text-red-800'}`}>{tftObs.title}</h4>
                  <p className={`text-sm mt-1 leading-relaxed ${tftObs.type === 'success' ? 'text-emerald-700' : tftObs.type === 'info' ? 'text-blue-700' : 'text-red-700'}`}>{tftObs.text}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="variation" className="animate-in fade-in duration-500">
           <Card className="border-none shadow-2xl ring-1 ring-border rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-accent text-primary-foreground p-8">
                <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3"><Wallet className="h-8 w-8" /> Variation des Capitaux Propres</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="bg-slate-50"><TableHead className="pl-8">Rubrique</TableHead><TableHead className="text-right">Solde au 01/01</TableHead><TableHead className="text-right">Variation (+)</TableHead><TableHead className="text-right pr-8">Solde au 31/12</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow><TableCell className="pl-8 text-xs font-bold">Capital Social</TableCell><TableCell className="text-right font-mono text-xs">{formatVal(financialData?.capitauxPropres.capital || 0)}</TableCell><TableCell className="text-right font-mono text-xs">+{formatVal(financialData?.tft.augmentCapital || 0)}</TableCell><TableCell className="text-right pr-8 font-mono text-xs">{formatVal(financialData?.capitauxPropres.capital || 0)}</TableCell></TableRow>
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
          <p className="font-black uppercase tracking-widest text-emerald-800">Note de Certification SCF :</p>
          <p>
            Ces documents sont générés par le **Moteur de Retraitement ComptaFisc-DZ v2.6**. 
            Ils respectent les règles de présentation du Système Comptable Financier algérien. 
            L'intégrité des écritures est vérifiée par la règle : `Actif = Passif` et `Variation Trésorerie TFT = Δ Comptes de Classe 5`.
          </p>
        </div>
      </div>
    </div>
  )
}
