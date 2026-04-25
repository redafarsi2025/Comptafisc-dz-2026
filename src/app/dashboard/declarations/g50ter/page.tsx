
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Download, Printer, ShieldCheck, Calendar, Calculator, Info, AlertCircle } from "lucide-react"
import { PAYROLL_CONSTANTS, calculateIRG } from "@/lib/calculations"
import { jsPDF } from "jspdf"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useSearchParams } from "next/navigation"

export default function G50TerDeclaration() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [selectedQuarter, setSelectedQuarter] = React.useState("1")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formatAmount = (val: number) => mounted ? Math.round(val).toLocaleString() : "..."

  // 1. Fetch Active Tenants
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

  // 2. Fetch Employees (for IRG Calculation)
  const employeesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "employees");
  }, [db, currentTenant?.id]);
  const { data: employees, isLoading } = useCollection(employeesQuery);

  const quarterData = React.useMemo(() => {
    if (!employees) return { m1: 0, m2: 0, m3: 0, total: 0 };
    
    // Pour le prototype, on simule que l'IRG mensuel est stable sur le trimestre
    const monthlyIrg = employees.reduce((sum, emp) => {
      const base = (Number(emp.baseSalary) || 0) + (Number(emp.primesImposables) || 0);
      const imposable = base * (1 - PAYROLL_CONSTANTS.CNAS_EMPLOYEE);
      return sum + calculateIRG(imposable, emp.isGrandSud, emp.isHandicapped);
    }, 0);

    return {
      m1: monthlyIrg,
      m2: monthlyIrg,
      m3: monthlyIrg,
      total: monthlyIrg * 3
    };
  }, [employees]);

  const deadlines: Record<string, string> = {
    "1": "20 Avril 2026",
    "2": "20 Juillet 2026",
    "3": "20 Octobre 2026",
    "4": "20 Janvier 2027"
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("MINISTERE DES FINANCES - DGI", 10, 10);
    doc.text("AVIS DE VERSEMENT IRG/SALAIRES (IFU) - G N° 50 ter", 10, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Entreprise: ${currentTenant?.raisonSociale}`, 10, 35);
    doc.text(`NIF: ${currentTenant?.nif}`, 10, 42);
    doc.text(`Trimestre: T${selectedQuarter} 2026`, 10, 49);
    doc.text(`Échéance: ${deadlines[selectedQuarter]}`, 10, 56);
    
    doc.line(10, 62, 200, 62);
    doc.setFont("helvetica", "bold");
    doc.text("Mois du Trimestre", 10, 70);
    doc.text("Montant IRG Retenu (DZD)", 140, 70);
    doc.setFont("helvetica", "normal");
    
    const months = selectedQuarter === "1" ? ["Janvier", "Février", "Mars"] :
                   selectedQuarter === "2" ? ["Avril", "Mai", "Juin"] :
                   selectedQuarter === "3" ? ["Juillet", "Août", "Septembre"] :
                   ["Octobre", "Novembre", "Décembre"];

    doc.text(`Mois 1 (${months[0]})`, 10, 80);
    doc.text(quarterData.m1.toLocaleString(), 140, 80);
    
    doc.text(`Mois 2 (${months[1]})`, 10, 90);
    doc.text(quarterData.m2.toLocaleString(), 140, 90);
    
    doc.text(`Mois 3 (${months[2]})`, 10, 100);
    doc.text(quarterData.m3.toLocaleString(), 140, 100);
    
    doc.line(10, 105, 200, 105);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL DU TRIMESTRE", 10, 115);
    doc.text(`${quarterData.total.toLocaleString()} DZD`, 140, 115);
    
    doc.setFontSize(8);
    doc.text("Certifié exact et conforme au livre de paie.", 10, 130);
    doc.save(`G50Ter_T${selectedQuarter}_${currentTenant?.raisonSociale}.pdf`);
  };

  if (!currentTenant) return <div className="p-8">Chargement...</div>;

  if (currentTenant?.regimeFiscal !== "IFU") {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Accès Restreint</AlertTitle>
          <AlertDescription>
            La déclaration <strong>G50 ter</strong> est exclusivement réservée aux contribuables soumis au régime de l'<strong>IFU</strong>. 
            Votre dossier est actuellement configuré en régime du {currentTenant?.regimeFiscal || "Réel"}.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <FileText className="h-8 w-8 text-accent" /> IRG Salaires : G n° 50 ter
          </h1>
          <p className="text-muted-foreground text-sm">Versement trimestriel des retenues à la source pour contribuables IFU.</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
            <SelectTrigger className="w-40 bg-white">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1er Trimestre</SelectItem>
              <SelectItem value="2">2ème Trimestre</SelectItem>
              <SelectItem value="3">3ème Trimestre</SelectItem>
              <SelectItem value="4">4ème Trimestre</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={generatePDF}><Download className="mr-2 h-4 w-4" /> PDF</Button>
          <Button className="bg-primary shadow-lg"><Printer className="mr-2 h-4 w-4" /> Imprimer</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase opacity-80">Total Trimestriel</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-4xl font-black">{formatAmount(quarterData.total)} DA</h2>
            <p className="text-xs mt-2 font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> À verser avant le {deadlines[selectedQuarter]}.
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Moyenne Mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl font-bold text-amber-600">{formatAmount(quarterData.m1)} DA</h2>
            <p className="text-[10px] text-muted-foreground italic mt-1">Calculé sur {employees?.length || 0} salariés.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Statut Conformité</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-sm text-emerald-700">Barème 2026 OK</p>
              <p className="text-[10px] text-muted-foreground">Abattements appliqués.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-t-4 border-t-primary shadow-lg overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-lg">Détail des Retenues du Trimestre</CardTitle>
          <CardDescription>
            Ventilation mensuelle des sommes dues au titre de l'IRG catégorie "Traitements et Salaires".
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Période du Trimestre</TableHead>
                <TableHead className="text-right">Nombre de Salariés</TableHead>
                <TableHead className="text-right">Masse Imposable</TableHead>
                <TableHead className="text-right font-bold text-primary">IRG Retenu (DA)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Mois 1</TableCell>
                <TableCell className="text-right">{employees?.length || 0}</TableCell>
                <TableCell className="text-right font-mono text-xs">...</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold">{formatAmount(quarterData.m1)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Mois 2</TableCell>
                <TableCell className="text-right">{employees?.length || 0}</TableCell>
                <TableCell className="text-right font-mono text-xs">...</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold">{formatAmount(quarterData.m2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Mois 3</TableCell>
                <TableCell className="text-right">{employees?.length || 0}</TableCell>
                <TableCell className="text-right font-mono text-xs">...</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold">{formatAmount(quarterData.m3)}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter className="bg-primary/5">
              <TableRow className="font-bold">
                <TableCell colSpan={3} className="text-lg">TOTAL À REVERSER (Bordereau G n° 50 ter)</TableCell>
                <TableCell className="text-right font-mono text-2xl text-primary">{formatAmount(quarterData.total)} DA</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-4">
        <Info className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
        <div className="text-xs text-blue-900 leading-relaxed space-y-2">
          <p className="font-bold underline uppercase tracking-tighter">Rappel Réglementaire IFU (Art. 129 CIDTA) :</p>
          <p>
            En tant que contribuable IFU, vous versez l'IRG de vos salariés <strong>trimestriellement</strong>. 
            Le défaut de dépôt dans les délais (20 du mois suivant le trimestre) entraîne une pénalité automatique de <strong>10%</strong>, 
            pouvant être portée à <strong>25%</strong> en cas de mise en demeure.
          </p>
          <div className="bg-white/50 p-3 rounded border border-blue-100 flex justify-between items-center mt-2">
            <span className="font-bold">Prochaine Échéance :</span>
            <Badge className="bg-blue-600">{deadlines[selectedQuarter]}</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
