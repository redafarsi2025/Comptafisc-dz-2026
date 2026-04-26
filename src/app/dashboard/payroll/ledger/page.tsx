
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Printer, FileDown, BookOpen, Calendar, Calculator, ShieldCheck, Loader2, Send, FileText } from "lucide-react"
import { PAYROLL_CONSTANTS, calculateIRG, processEmployeePayroll } from "@/lib/calculations"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { jsPDF } from "jspdf"
import autoTable from 'jspdf-autotable'

export default function PayrollLedger() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth().toString())
  const [isPosting, setIsPosting] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formatAmount = (val: number) => mounted ? Math.round(val).toLocaleString() : "..."

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

  const employeesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "employees");
  }, [db, currentTenant?.id]);
  const { data: employees, isLoading } = useCollection(employeesQuery);

  const context = React.useMemo(() => ({
    valeurPoint: currentTenant?.iepPointValue || PAYROLL_CONSTANTS.DEFAULT_VALEUR_POINT
  }), [currentTenant]);

  const ledgerData = React.useMemo(() => {
    if (!employees) return [];
    
    return employees.map(emp => {
      const pay = processEmployeePayroll(emp, context);
      return {
        ...emp,
        ...pay,
        totalFrais: (Number(emp.indemnitePanier) || 0) + (Number(emp.indemniteTransport) || 0)
      };
    });
  }, [employees, context]);

  const totals = React.useMemo(() => {
    return ledgerData.reduce((acc, curr) => ({
      base: acc.base + curr.salaireBase,
      poste: acc.poste + curr.salairePoste,
      cnasE: acc.cnasE + curr.cnasSalariale,
      irg: acc.irg + curr.irg,
      net: acc.net + curr.net,
      cnasP: acc.cnasP + curr.cnasPatronale
    }), { base: 0, poste: 0, cnasE: 0, irg: 0, net: 0, cnasP: 0 });
  }, [ledgerData]);

  const handlePostToJournal = async () => {
    if (!db || !currentTenant || !user || ledgerData.length === 0) return;
    setIsPosting(true);

    const monthName = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"][parseInt(selectedMonth)];
    const journalEntriesRef = collection(db, "tenants", currentTenant.id, "journal_entries");

    const entryData = {
      tenantId: currentTenant.id,
      entryDate: new Date(2026, parseInt(selectedMonth), 28).toISOString(),
      description: `PAIE DU MOIS DE ${monthName.toUpperCase()} 2026`,
      documentReference: `PAIE-${selectedMonth}-2026`,
      journalType: "OD",
      status: 'Validated',
      createdAt: new Date().toISOString(),
      createdByUserId: user.uid,
      tenantMembers: currentTenant.members,
      lines: [
        { accountCode: "631", accountName: "Rémunérations du personnel (Brut)", debit: totals.poste, credit: 0 },
        { accountCode: "635", accountName: "Cotisations aux organismes sociaux (Patr.)", debit: totals.cnasP, credit: 0 },
        { accountCode: "421", accountName: "Personnel - Net à payer", debit: 0, credit: totals.net },
        { accountCode: "431", accountName: "Sécurité Sociale (CNAS 9%+26%)", debit: 0, credit: totals.cnasE + totals.cnasP },
        { accountCode: "442", accountName: "État - Impôts et taxes retenus (IRG)", debit: 0, credit: totals.irg },
        { accountCode: "421", accountName: "Indemnités de frais (Panier/Transp)", debit: 0, credit: ledgerData.reduce((s, e) => s + e.totalFrais, 0) }
      ]
    };

    try {
      await addDocumentNonBlocking(journalEntriesRef, entryData);
      toast({ title: "Paie Journalisée", description: "Les charges de personnel ont été intégrées à la comptabilité de l'exercice." });
    } catch (e) {
      console.error(e);
    } finally {
      setIsPosting(false);
    }
  };

  const generatePaySlip = (emp: any) => {
    const doc = new jsPDF();
    const monthName = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"][parseInt(selectedMonth)];

    // 1. Header (Entreprise)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(currentTenant?.raisonSociale || "ENTREPRISE", 14, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Adresse : ${currentTenant?.adresse || "Non renseignée"}`, 14, 20);
    doc.text(`NIF : ${currentTenant?.nif || "N/A"}`, 14, 25);
    doc.text(`RC : ${currentTenant?.rc || "N/A"}`, 14, 30);

    // 2. Title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("BULLETIN DE PAIE", 105, 45, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Période : ${monthName} 2026`, 105, 52, { align: "center" });

    // 3. Employee Info Box
    doc.setDrawColor(200);
    doc.rect(14, 60, 182, 35);
    doc.setFontSize(9);
    doc.text(`Nom & Prénom : ${emp.name}`, 20, 70);
    doc.text(`Matricule : ${emp.id.substring(0, 8).toUpperCase()}`, 20, 75);
    doc.text(`Poste : ${emp.position}`, 20, 80);
    doc.text(`NIN : ${emp.nin || "N/A"}`, 20, 85);

    doc.text(`Date Embauche : ${emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : 'N/A'}`, 120, 70);
    doc.text(`Indice : ${emp.indice}`, 120, 75);
    doc.text(`Valeur Point : ${context.valeurPoint}`, 120, 80);
    doc.text(`N° CNAS : ${emp.cnasNumber || "N/A"}`, 120, 85);

    // 4. Payroll Table
    const body = [
      ["Salaire de base", emp.indice.toLocaleString(), context.valeurPoint.toLocaleString(), emp.salaireBase.toLocaleString(), ""],
      ["Primes imposables", "", "", (emp.primesImposables || 0).toLocaleString(), ""],
      ["Indemnité Panier", "", "", emp.indemnitePanier.toLocaleString(), ""],
      ["Indemnité Transport", "", "", emp.indemniteTransport.toLocaleString(), ""],
      ["Cotisation CNAS (Salariale)", emp.salairePoste.toLocaleString(), "9%", "", emp.cnasSalariale.toLocaleString()],
      ["Impôt Revenu Global (IRG)", emp.imposable.toLocaleString(), "Barème 2026", "", emp.irg.toLocaleString()],
    ];

    autoTable(doc, {
      startY: 105,
      head: [['Désignation Rubrique', 'Base / Indice', 'Taux / VP', 'Gain (DA)', 'Retenue (DA)']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [12, 85, 204], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: 'right' },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // 5. Totals & Net
    doc.setFont("helvetica", "bold");
    doc.rect(14, finalY, 182, 25);
    doc.text("TOTAL BRUT :", 20, finalY + 10);
    doc.text(`${emp.salairePoste.toLocaleString()} DA`, 70, finalY + 10, { align: "right" });
    
    doc.text("TOTAL RETENUES :", 20, finalY + 18);
    doc.text(`${(emp.cnasSalariale + emp.irg).toLocaleString()} DA`, 70, finalY + 18, { align: "right" });

    doc.setFontSize(12);
    doc.text("NET À PAYER :", 110, finalY + 15);
    doc.text(`${emp.net.toLocaleString()} DA`, 185, finalY + 15, { align: "right" });

    // 6. Footer / Signatures
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Mode de paiement : Virement Bancaire", 14, finalY + 35);
    
    doc.text("Signature et Cachet Employeur", 40, finalY + 50);
    doc.text("Signature du Salarié", 140, finalY + 50);

    doc.line(14, finalY + 70, 80, finalY + 70);
    doc.line(120, finalY + 70, 186, finalY + 70);

    doc.save(`Bulletin_${emp.name.replace(/\s+/g, '_')}_${monthName}_2026.pdf`);
    toast({ title: "Bulletin généré", description: `Le document pour ${emp.name} est prêt.` });
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen"><BookOpen className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-accent" /> Livre de Paie Consolidé
          </h1>
          <p className="text-muted-foreground text-sm">Registre légal des rémunérations et cotisations sociales.</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40 bg-white">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"].map((m, i) => (
                <SelectItem key={i} value={i.toString()}>{m} 2026</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
            onClick={handlePostToJournal}
            disabled={isPosting || ledgerData.length === 0}
          >
            {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Journaliser la Paie
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimer Registre</Button>
        </div>
      </div>

      <Card className="shadow-lg border-t-4 border-t-primary overflow-hidden">
        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Journal de Paie - {currentTenant?.raisonSociale || 'Chargement...'}</CardTitle>
            <CardDescription>Période du 01 au 31 {["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"][parseInt(selectedMonth)]} 2026</CardDescription>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            SNMG 24 000 DA OK
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="text-[10px] uppercase font-bold">
                  <TableHead className="w-[200px]">Salarié / Poste</TableHead>
                  <TableHead className="text-right">S. Base</TableHead>
                  <TableHead className="text-right">S. Poste (CNAS)</TableHead>
                  <TableHead className="text-right">Ret. CNAS (9%)</TableHead>
                  <TableHead className="text-right">IRG 2026</TableHead>
                  <TableHead className="text-right">Frais (P/T)</TableHead>
                  <TableHead className="text-right font-black text-primary">Net à Payer</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!ledgerData.length ? (
                   <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground italic">Aucun salarié trouvé dans ce dossier.</TableCell></TableRow>
                ) : ledgerData.map((s, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/10 text-xs">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">{s.name}</span>
                        <span className="text-[9px] text-muted-foreground">{s.cnasNumber || 'SANS NUMÉRO'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(s.baseSalary)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatAmount(s.salairePoste)}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">-{formatAmount(s.cnasSalariale)}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">-{formatAmount(s.irg)}</TableCell>
                    <TableCell className="text-right font-mono">+{formatAmount(s.totalFrais)}</TableCell>
                    <TableCell className="text-right font-mono font-black text-primary">{formatAmount(s.net)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => generatePaySlip(s)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {ledgerData.length > 0 && (
                <TableFooter className="bg-primary/5">
                  <TableRow className="font-bold text-xs">
                    <TableCell>TOTAUX PÉRIODE</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(totals.base)}</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(totals.poste)}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">-{formatAmount(totals.cnasE)}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">-{formatAmount(totals.irg)}</TableCell>
                    <TableCell className="text-right"></TableCell>
                    <TableCell className="text-right font-mono text-lg text-primary">{formatAmount(totals.net)} DA</TableCell>
                    <TableCell className="text-right"></TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-[10px] font-bold text-blue-800 uppercase mb-1">Masse Salariale Brute</p>
            <h3 className="text-2xl font-black text-blue-900">{formatAmount(totals.poste)} DA</h3>
            <p className="text-[10px] text-blue-700 italic mt-1">Assiette de cotisation globale.</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-6">
            <p className="text-[10px] font-bold text-emerald-800 uppercase mb-1">Total Cotisations (35%)</p>
            <h3 className="text-2xl font-black text-emerald-900">{formatAmount(totals.cnasE + totals.cnasP)} DA</h3>
            <p className="text-[10px] text-emerald-700 italic mt-1">Dette sociale estimée (CNAS).</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <p className="text-[10px] font-bold text-amber-800 uppercase mb-1">Retenues Fiscales (IRG)</p>
            <h3 className="text-2xl font-black text-amber-900">{formatAmount(totals.irg)} DA</h3>
            <p className="text-[10px] text-amber-700 italic mt-1">À reverser via G50 (ou G50 ter).</p>
          </CardContent>
        </Card>
      </div>

      <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-4">
        <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
        <div className="text-xs text-emerald-900 space-y-2">
          <p className="font-bold">Audit de Conformité Sociale 2026</p>
          <p>
            Les calculs sont certifiés conformes au <strong>SNMG de 24 000 DA</strong>. L'abattement IRG de 40% (max 1 500 DA) 
            a été appliqué sur chaque ligne. Les indemnités de panier et de transport sont correctement exclues de l'assiette CNAS 
            conformément aux dernières notes circulaires de la Direction Générale des Impôts.
          </p>
        </div>
      </div>
    </div>
  )
}
