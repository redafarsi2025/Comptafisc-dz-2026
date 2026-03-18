"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { FileText, Printer, ShieldCheck, Download, Calculator, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { jsPDF } from "jspdf"
import { PAYROLL_CONSTANTS, calculateIRG } from "@/lib/calculations"

export default function G50Declaration() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formatAmount = (val: number) => mounted ? val.toLocaleString() : "..."

  // 1. Fetch Tenant
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  // 2. Fetch Invoices (for TVA)
  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "invoices"),
      where(`tenantMembers.${user.uid}`, "!=", null)
    );
  }, [db, currentTenant, user]);
  const { data: invoices } = useCollection(invoicesQuery);

  // 3. Fetch Employees (for IRG Salarié)
  const employeesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "employees"),
      where(`tenantMembers.${user.uid}`, "!=", null)
    );
  }, [db, currentTenant, user]);
  const { data: employees } = useCollection(employeesQuery);

  const g50Data = React.useMemo(() => {
    const tvaCollectee = invoices?.reduce((sum, inv) => sum + (inv.totalTaxAmount || 0), 0) || 0;
    const irgSalarie = employees?.reduce((sum, emp) => {
      const base = (Number(emp.baseSalary) || 0) + (Number(emp.primesImposables) || 0);
      const imposable = base * (1 - PAYROLL_CONSTANTS.CNAS_EMPLOYEE);
      return sum + calculateIRG(imposable, emp.isGrandSud, emp.isHandicapped);
    }, 0) || 0;

    return {
      tva: tvaCollectee,
      irg: irgSalarie,
      total: tvaCollectee + irgSalarie
    };
  }, [invoices, employees]);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("MINISTERE DES FINANCES - DGI", 10, 10);
    doc.text("BORDEREAU AVIS DE VERSEMENT G N° 50", 10, 20);
    doc.setFont("helvetica", "normal");
    doc.text(`Entreprise: ${currentTenant?.raisonSociale}`, 10, 30);
    doc.text(`NIF: ${currentTenant?.nif}`, 10, 40);
    doc.text(`Période: ${new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`, 10, 50);
    
    doc.line(10, 55, 200, 55);
    doc.text("Rubriques", 10, 65);
    doc.text("Montant (DZD)", 150, 65);
    
    doc.text("TVA (Taxe sur la Valeur Ajoutée)", 10, 75);
    doc.text(g50Data.tva.toLocaleString(), 150, 75);
    
    doc.text("IRG Salariés (Retenue à la source)", 10, 85);
    doc.text(g50Data.irg.toLocaleString(), 150, 85);
    
    doc.line(10, 95, 200, 95);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL A PAYER", 10, 105);
    doc.text(`${g50Data.total.toLocaleString()} DZD`, 150, 105);
    
    doc.save(`G50_${currentTenant?.raisonSociale}_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <FileText className="h-8 w-8 text-accent" /> Bordereau G n° 50
          </h1>
          <p className="text-muted-foreground text-sm">Déclaration mensuelle des taxes et retenues à la source.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generatePDF}><Download className="mr-2 h-4 w-4" /> PDF</Button>
          <Button className="bg-primary"><Printer className="mr-2 h-4 w-4" /> Imprimer</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase opacity-80">Total à Verser</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-3xl font-bold">{formatAmount(g50Data.total)} DA</h2>
            <p className="text-xs mt-2 opacity-70">Échéance : 20 du mois prochain.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">TVA Collectée</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl font-bold text-blue-600">{formatAmount(g50Data.tva)} DA</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">IRG Salarié</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl font-bold text-amber-600">{formatAmount(g50Data.irg)} DA</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="border-t-4 border-t-primary shadow-lg overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg">Détail des Rubriques Fiscales</CardTitle>
          <CardDescription>Extraction automatique basée sur vos factures et votre paie.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nature des Impôts et Taxes</TableHead>
                <TableHead className="text-right">Base d'Imposition</TableHead>
                <TableHead className="text-right">Taux</TableHead>
                <TableHead className="text-right font-bold">Montant dû</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-xs">101</TableCell>
                <TableCell>TVA (Opérations Imposables)</TableCell>
                <TableCell className="text-right font-mono text-xs">{(g50Data.tva / 0.19).toLocaleString()}</TableCell>
                <TableCell className="text-right">19%</TableCell>
                <TableCell className="text-right font-mono text-xs text-primary">{formatAmount(g50Data.tva)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-xs">102</TableCell>
                <TableCell>IRG Salariés (Retenue à la source)</TableCell>
                <TableCell className="text-right font-mono text-xs">Voir Livre de Paie</TableCell>
                <TableCell className="text-right">Barème</TableCell>
                <TableCell className="text-right font-mono text-xs text-primary">{formatAmount(g50Data.irg)}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter className="bg-primary/5">
              <TableRow className="font-bold">
                <TableCell colSpan={4}>TOTAL GÉNÉRAL DU VERSEMENT</TableCell>
                <TableCell className="text-right font-mono text-lg text-primary">{formatAmount(g50Data.total)} DA</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-4">
        <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
        <div className="text-xs text-emerald-900">
          <p className="font-bold mb-1">Conformité DGI - LF 2026</p>
          <p>
            Ce document est une aide à la préparation de votre G50 physique ou électronique. 
            Veuillez vérifier que tous les journaux (Achats/Ventes) sont validés pour cette période avant le dépôt définitif.
          </p>
        </div>
      </div>
    </div>
  )
}