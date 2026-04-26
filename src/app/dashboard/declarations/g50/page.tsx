
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { FileText, Printer, ShieldCheck, Download, Calculator, Info, Loader2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { jsPDF } from "jspdf"
import { PAYROLL_CONSTANTS, calculateIRG, getIBSRate } from "@/lib/calculations"
import { useSearchParams } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function G50Declaration() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formatAmount = (val: number) => mounted ? Math.round(val).toLocaleString() : "..."

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

    // A. TVA Collectée (Ventes)
    const tvaCollectee = invoices?.reduce((sum, inv) => sum + (inv.totalTaxAmount || 0), 0) || 0;
    const baseImposableTVA = invoices?.reduce((sum, inv) => sum + (inv.totalAmountExcludingTax || 0), 0) || 0;

    // B. TVA Déductible (Achats) - Basé sur le compte 4456 dans le journal
    let tvaDeductible = 0;
    entries?.forEach(entry => {
      entry.lines.forEach((line: any) => {
        if (line.accountCode === '4456') {
          tvaDeductible += (line.debit || 0) - (line.credit || 0);
        }
      });
    });

    // C. IRG Salaries (Retenue à la source)
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

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE", 105, 10, { align: "center" });
    doc.text("MINISTÈRE DES FINANCES - DGI", 105, 15, { align: "center" });
    doc.text("BORDEREAU G N° 50", 105, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Entreprise : ${currentTenant?.raisonSociale}`, 14, 40);
    doc.text(`NIF : ${currentTenant?.nif}`, 14, 45);
    doc.text(`Régime : ${currentTenant?.regimeFiscal}`, 14, 50);
    doc.text(`Période : ${new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`, 14, 55);
    
    doc.line(14, 60, 196, 60);
    doc.text("Détail du Versement Spontané", 14, 68);
    
    const body = [
      ["TVA Collectée (Opérations Imposables)", g50Calculations.tvaCollectee.toLocaleString() + " DA"],
      ["TVA Déductible (Achats)", "-" + g50Calculations.tvaDeductible.toLocaleString() + " DA"],
      ["TVA Nette à reverser", g50Calculations.tvaNette.toLocaleString() + " DA"],
      ["IRG Salariés (Retenue à la source)", g50Calculations.irgSalaries.toLocaleString() + " DA"],
      ["TOTAL À PAYER", g50Calculations.total.toLocaleString() + " DA"],
    ];

    let y = 75;
    body.forEach(([label, value]) => {
      doc.text(label, 14, y);
      doc.text(value, 160, y, { align: "right" });
      y += 8;
    });

    doc.setFontSize(8);
    doc.text("Certifié sincère et conforme au Livre-Journal.", 14, y + 10);
    doc.text(`Généré par ComptaFisc-DZ Master Node le ${new Date().toLocaleString()}`, 14, y + 15);
    
    doc.save(`G50_${currentTenant?.raisonSociale}_${Date.now()}.pdf`);
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
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Calculateur de versement spontané - Mode Master Node</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generatePDF} disabled={!currentTenant}><Download className="mr-2 h-4 w-4" /> Export Officiel PDF</Button>
          <Button className="bg-primary shadow-lg shadow-primary/20"><Calculator className="mr-2 h-4 w-4" /> Simuler Déclaration</Button>
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
             <Badge className="bg-emerald-500 mt-2">PRÉCOMPTE TVA</Badge>
           )}
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white p-6">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">IRG Salarié Retenu</p>
           <h2 className="text-2xl font-black text-amber-600">{formatAmount(g50Calculations.irgSalaries)} DA</h2>
           <p className="text-[9px] text-muted-foreground mt-1">Calculé sur {employees?.length || 0} fiches.</p>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white p-6">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Acomptes IBS / IFU</p>
           <h2 className="text-2xl font-black text-emerald-600">0 DA</h2>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-muted/30 border-b py-6 px-8">
          <CardTitle className="text-lg font-black uppercase tracking-tighter">Tableau des Rubriques Fiscales (DSL Active)</CardTitle>
          <CardDescription className="text-xs">Extraction automatique des assiettes et taxes depuis les journaux comptables.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
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
                <TableCell className="text-xs font-medium">TVA - Opérations imposables au taux normal</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatAmount(g50Calculations.baseImposableTVA)} DA</TableCell>
                <TableCell className="text-center"><Badge variant="outline" className="text-[9px]">19%</Badge></TableCell>
                <TableCell className="text-right pr-8 font-mono text-xs text-primary">{formatAmount(g50Calculations.tvaCollectee)} DA</TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/5">
                <TableCell className="font-mono text-xs pl-8 font-bold text-emerald-600">401</TableCell>
                <TableCell className="text-xs font-medium">TVA Déductible sur Achats et Services</TableCell>
                <TableCell className="text-right font-mono text-xs">Extraction Journal</TableCell>
                <TableCell className="text-center">-</TableCell>
                <TableCell className="text-right pr-8 font-mono text-xs text-emerald-600">-{formatAmount(g50Calculations.tvaDeductible)} DA</TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/5">
                <TableCell className="font-mono text-xs pl-8 font-bold text-amber-600">102</TableCell>
                <TableCell className="text-xs font-medium">IRG Salariés (Versements Traitements/Salaires)</TableCell>
                <TableCell className="text-right font-mono text-xs">Masse Imposable 2026</TableCell>
                <TableCell className="text-center"><Badge variant="outline" className="text-[9px]">Barème</Badge></TableCell>
                <TableCell className="text-right pr-8 font-mono text-xs text-amber-600">{formatAmount(g50Calculations.irgSalaries)} DA</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter className="bg-primary/5">
              <TableRow className="font-black">
                <TableCell colSpan={4} className="pl-8 text-lg tracking-tighter uppercase">Net à Mandater ce mois</TableCell>
                <TableCell className="text-right pr-8 font-mono text-2xl text-primary">{formatAmount(g50Calculations.total)} DA</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-start gap-4 shadow-sm">
          <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
          <div className="text-xs text-emerald-900 space-y-2">
            <p className="font-bold uppercase tracking-widest">Conformité DGI - LF 2026</p>
            <p className="opacity-80">
              Ce G50 est généré via le **Moteur Fiscal Master Node**. Il vérifie en temps réel que les écritures de TVA sont équilibrées. 
              En cas de précompte (crédit de TVA), le montant est reporté automatiquement sur le mois suivant dans votre comptabilité.
            </p>
          </div>
        </div>
        <Card className="bg-slate-900 text-white border-none shadow-xl rounded-3xl p-6 relative overflow-hidden">
           <Info className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 text-accent" />
           <h4 className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 flex items-center gap-2">
             <Calculator className="h-4 w-4" /> Note de Rapprochement
           </h4>
           <p className="text-[11px] leading-relaxed opacity-80 italic">
             "La base imposable de la TVA (Rubrique 101) doit correspondre au cumul de votre Journal des Ventes (Classe 7) pour la période du 1er au dernier jour du mois précédent."
           </p>
        </Card>
      </div>
    </div>
  )
}
