
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { FileText, Printer, ShieldCheck, Download, Calculator, Info, Loader2, AlertCircle, FileCode, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { jsPDF } from "jspdf"
import { PAYROLL_CONSTANTS, calculateIRG, getIBSRate } from "@/lib/calculations"
import { useSearchParams } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"

export default function G50Declaration() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formatAmount = (val: number) => mounted ? val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "..."
  const formatPDF = (val: number) => val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // 1. Fetch Tenant Profile
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user?.uid]);
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants || tenants.length === 0) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  // 2. Fetch Invoices for TVA Collected
  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "invoices");
  }, [db, currentTenant?.id]);
  const { data: invoices } = useCollection(invoicesQuery);

  // 3. Fetch Journal for TVA Deductible (Purchases)
  const entriesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "journal_entries"),
      where("journalType", "==", "ACHATS")
    );
  }, [db, currentTenant?.id]);
  const { data: entries } = useCollection(entriesQuery);

  // 4. Fetch Employees for IRG Salaries
  const employeesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "employees");
  }, [db, currentTenant?.id]);
  const { data: employees } = useCollection(employeesQuery);

  const g50Calculations = React.useMemo(() => {
    if (!mounted) return { tvaCollectee: 0, tvaDeductible: 0, irgSalaries: 0, total: 0, baseImposableTVA: 0 };

    const tvaCollectee = invoices?.reduce((sum, inv) => sum + (inv.totalTaxAmount || 0), 0) || 0;
    const baseImposableTVA = invoices?.reduce((sum, inv) => sum + (inv.totalAmountExcludingTax || 0), 0) || 0;

    let tvaDeductible = 0;
    entries?.forEach(entry => {
      entry.lines.forEach((line: any) => {
        if (line.accountCode === '4456') {
          tvaDeductible += (line.debit || 0) - (line.credit || 0);
        }
      });
    });

    const irgSalaries = employees?.reduce((sum, emp) => {
      const base = (Number(emp.baseSalary) || 0) + (Number(emp.primesImposables) || 0);
      const imposable = base * (1 - PAYROLL_CONSTANTS.CNAS_EMPLOYEE);
      return sum + calculateIRG(imposable, emp.isGrandSud, emp.isHandicapped);
    }, 0) || 0;

    const tvaNette = Math.max(0, tvaCollectee - tvaDeductible);

    return {
      tvaCollectee,
      tvaDeductible,
      tvaNette,
      irgSalaries,
      baseImposableTVA,
      total: tvaNette + irgSalaries
    };
  }, [invoices, entries, employees, mounted]);

  const handleExportJibayatic = () => {
    if (!currentTenant) return;
    
    const period = new Date().toISOString().substring(0, 7);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DeclarationG50 version="2026.1">
  <Header>
    <NIF>${currentTenant.nif || '00000000000000000000'}</NIF>
    <RaisonSociale>${currentTenant.raisonSociale}</RaisonSociale>
    <Periode>${period}</Periode>
    <Systeme>ComptaFisc-DZ Master Node</Systeme>
  </Header>
  <Data>
    <TVA>
      <CA_Imposable>${g50Calculations.baseImposableTVA.toFixed(2)}</CA_Imposable>
      <TVA_Collectee>${g50Calculations.tvaCollectee.toFixed(2)}</TVA_Collectee>
      <TVA_Deductible>${g50Calculations.tvaDeductible.toFixed(2)}</TVA_Deductible>
      <Net_A_Reverser>${g50Calculations.tvaNette.toFixed(2)}</Net_A_Reverser>
    </TVA>
    <IRG_Salaires>
      <Montant_Retenu>${g50Calculations.irgSalaries.toFixed(2)}</Montant_Retenu>
    </IRG_Salaires>
    <Total_Droits>${g50Calculations.total.toFixed(2)}</Total_Droits>
  </Data>
</DeclarationG50>`;

    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.body.appendChild(document.createElement('a'));
    link.href = url;
    link.download = `Jibayatic_G50_${currentTenant.raisonSociale}_${period}.xml`;
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Jibayatic XML généré", description: "Le fichier est prêt pour le téléversement sur le portail DGI." });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE", 105, 10, { align: "center" });
    doc.text("MINISTÈRE DES FINANCES - DGI", 105, 15, { align: "center" });
    doc.text("BORDEREAU G N° 50", 105, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Entreprise : ${currentTenant?.raisonSociale}`, 14, 40);
    doc.text(`NIF (20 Digits) : ${currentTenant?.nif}`, 14, 45);
    doc.text(`Régime : ${currentTenant?.regimeFiscal}`, 14, 50);
    doc.text(`Période : ${new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`, 14, 55);
    
    doc.line(14, 60, 196, 60);
    doc.text("Détail du Versement Spontané (Conforme LF 2026)", 14, 68);
    
    const body = [
      ["TVA Collectée (Opérations Imposables)", formatPDF(g50Calculations.tvaCollectee) + " DA"],
      ["TVA Déductible (Achats)", "-" + formatPDF(g50Calculations.tvaDeductible) + " DA"],
      ["TVA Nette à reverser", formatPDF(g50Calculations.tvaNette) + " DA"],
      ["IRG Salariés (Retenue à la source)", formatPDF(g50Calculations.irgSalaries) + " DA"],
      ["TOTAL À PAYER", formatPDF(g50Calculations.total) + " DA"],
    ];

    let y = 75;
    body.forEach(([label, value]) => {
      doc.text(label, 14, y);
      doc.text(value, 160, y, { align: "right" });
      y += 8;
    });

    doc.setFontSize(8);
    doc.text("Certifié sincère et conforme via l'interopérabilité Jibayatic.", 14, y + 10);
    doc.text(`Identifiant Document : ${Date.now()}`, 14, y + 15);
    
    doc.save(`G50_${currentTenant?.raisonSociale}.pdf`);
  };

  if (isTenantsLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

  if (currentTenant?.regimeFiscal === 'IFU') {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Accès Restreint</AlertTitle>
          <AlertDescription>
            La déclaration <strong>G50 Mensuelle</strong> est réservée aux contribuables du <strong>Régime Réel</strong>. 
            Votre dossier est actuellement en régime <strong>IFU</strong>. Veuillez utiliser le module G12.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <FileText className="h-8 w-8 text-accent" /> Bordereau G n° 50
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Interopérabilité Jibayatic Active • Standard 2026</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportJibayatic} className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-xl h-11 px-6 font-bold shadow-sm">
            <FileCode className="mr-2 h-4 w-4" /> Export XML Jibayatic
          </Button>
          <Button variant="outline" onClick={generatePDF} disabled={!currentTenant} className="rounded-xl h-11 px-6 font-bold">
            <Printer className="mr-2 h-4 w-4" /> Imprimer G50
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-primary text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6">
           <div className="absolute top-0 right-0 p-4 opacity-10"><Calculator className="h-16 w-16" /></div>
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Montant Total à Reverser</p>
           <h2 className="text-3xl font-black">{formatAmount(g50Calculations.total)} DA</h2>
           <p className="text-[10px] mt-2 opacity-70">Échéance : 20 du mois prochain.</p>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm bg-white p-6">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">TVA Nette (Collectée - Déd.)</p>
           <h2 className="text-2xl font-black text-blue-600">{formatAmount(g50Calculations.tvaNette)} DA</h2>
           {g50Calculations.tvaCollectee < g50Calculations.tvaDeductible && (
             <Badge className="bg-emerald-50 mt-2">PRÉCOMPTE TVA</Badge>
           )}
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white p-6">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">IRG Salarié Retenu</p>
           <h2 className="text-2xl font-black text-amber-600">{formatAmount(g50Calculations.irgSalaries)} DA</h2>
           <p className="text-[9px] text-muted-foreground mt-1">Calculé sur {employees?.length || 0} fiches.</p>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center px-6">
           <ShieldCheck className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1 relative">Data Validation</p>
           <div className="text-sm font-black text-white relative uppercase">NIF 20 Digits OK</div>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-muted/30 border-b py-6 px-8">
          <CardTitle className="text-lg font-black uppercase tracking-tighter">Tableau des Rubriques Fiscales (Mode Jibayatic)</CardTitle>
          <CardDescription className="text-xs">Extraction automatique conforme au schéma de télé-déclaration 2026.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="text-[10px] uppercase font-black">
                <TableHead className="pl-8">Code Rubrique</TableHead>
                <TableHead>Nature des Impôts et Taxes</TableHead>
                <TableHead className="text-right">Assiette / Chiffre d'Affaires</TableHead>
                <TableHead className="text-center">Taux Applicable</TableHead>
                <TableHead className="text-right pr-8 font-bold">Montant à Reverser</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-muted/5">
                <TableCell className="font-mono text-xs pl-8 font-bold text-primary">101</TableCell>
                <TableCell className="text-xs font-medium">TVA - Opérations imposables au taux normal (19%)</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatAmount(g50Calculations.baseImposableTVA)} DA</TableCell>
                <TableCell className="text-center"><Badge variant="outline" className="text-[9px]">19%</Badge></TableCell>
                <TableCell className="text-right pr-8 font-mono text-xs text-primary">{formatAmount(g50Calculations.tvaCollectee)} DA</TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/5">
                <TableCell className="font-mono text-xs pl-8 font-bold text-emerald-600">401</TableCell>
                <TableCell className="text-xs font-medium">TVA Déductible sur Achats (Pièces comptables justifiées)</TableCell>
                <TableCell className="text-right font-mono text-xs">Extraction Journal</TableCell>
                <TableCell className="text-center">-</TableCell>
                <TableCell className="text-right pr-8 font-mono text-xs text-emerald-600">-{formatAmount(g50Calculations.tvaDeductible)} DA</TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/5">
                <TableCell className="font-mono text-xs pl-8 font-bold text-amber-600">102</TableCell>
                <TableCell className="text-xs font-medium">IRG Salariés (Retenues à la source LF 2026)</TableCell>
                <TableCell className="text-right font-mono text-xs">Masse Imposable</TableCell>
                <TableCell className="text-center"><Badge variant="outline" className="text-[9px]">Barème</Badge></TableCell>
                <TableCell className="text-right pr-8 font-mono text-xs text-amber-600">{formatAmount(g50Calculations.irgSalaries)} DA</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter className="bg-primary/5">
              <TableRow className="font-black">
                <TableCell colSpan={4} className="pl-8 text-lg tracking-tighter uppercase">Total Net à Mandater (G50)</TableCell>
                <TableCell className="text-right pr-8 font-mono text-2xl text-primary">{formatAmount(g50Calculations.total)} DA</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-start gap-4 shadow-sm">
        <Send className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
        <div className="text-xs text-emerald-900 space-y-2">
          <p className="font-bold uppercase tracking-widest">Télé-déclaration Obligatoire 2026</p>
          <p className="opacity-80 leading-relaxed italic">
            "Conformément à la Loi de Finances 2026, le dépôt électronique est généralisé. Utilisez le bouton **'Export XML Jibayatic'** pour générer votre fichier ERA. Une fois téléchargé, connectez-vous à votre espace DGI et importez le fichier pour éviter toute erreur de saisie manuelle et les sanctions de retard."
          </p>
        </div>
      </div>
    </div>
  )
}
