"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Download, Printer, ShieldCheck, GraduationCap, Calculator, Info, AlertCircle, Calendar } from "lucide-react"
import { TAX_RATES } from "@/lib/calculations"
import { jsPDF } from "jspdf"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function TaxeApprentissagePage() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)
  const [selectedSemester, setSelectedSemester] = React.useState("1")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formatAmount = (val: number) => mounted ? Math.round(val).toLocaleString() : "..."

  // 1. Fetch Active Tenant
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  // 2. Fetch Employees (for Payroll Base)
  const employeesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "employees");
  }, [db, currentTenant]);
  const { data: employees, isLoading } = useCollection(employeesQuery);

  const semesterData = React.useMemo(() => {
    if (!employees) return { base: 0, ta: 0, tfp: 0, total: 0 };
    
    // Pour le prototype, on simule que la masse salariale semestrielle est (Salaire Poste x 6)
    const monthlyBase = employees.reduce((sum, emp) => {
      return sum + (Number(emp.baseSalary) || 0) + (Number(emp.primesImposables) || 0);
    }, 0);

    const baseSemestrielle = monthlyBase * 6;
    const ta = baseSemestrielle * TAX_RATES.TAXE_APPRENTISSAGE;
    const tfp = baseSemestrielle * TAX_RATES.TAXE_FORMATION_CONT;

    return {
      base: baseSemestrielle,
      ta,
      tfp,
      total: ta + tfp
    };
  }, [employees]);

  const deadlines: Record<string, string> = {
    "1": "20 Juillet 2026",
    "2": "20 Janvier 2027"
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("MINISTERE DES FINANCES - DGI", 10, 10);
    doc.text("ANNEXE I : TAXE D'APPRENTISSAGE ET DE FORMATION", 10, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Entreprise: ${currentTenant?.raisonSociale}`, 10, 35);
    doc.text(`NIF: ${currentTenant?.nif}`, 10, 42);
    doc.text(`Période: S${selectedSemester} 2026`, 10, 49);
    doc.text(`Échéance: ${deadlines[selectedSemester]}`, 10, 56);
    
    doc.line(10, 62, 200, 62);
    doc.text("Nature de la Taxe", 10, 70);
    doc.text("Assiette (DA)", 100, 70);
    doc.text("Montant (DA)", 160, 70);
    
    doc.text("Taxe d'Apprentissage (1%)", 10, 80);
    doc.text(semesterData.base.toLocaleString(), 100, 80);
    doc.text(semesterData.ta.toLocaleString(), 160, 80);
    
    doc.text("Taxe de Formation Continue (1%)", 10, 90);
    doc.text(semesterData.base.toLocaleString(), 100, 90);
    doc.text(semesterData.tfp.toLocaleString(), 160, 90);
    
    doc.line(10, 100, 200, 100);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL À VERSER", 10, 110);
    doc.text(`${semesterData.total.toLocaleString()} DZD`, 160, 110);
    
    doc.save(`AnnexeI_S${selectedSemester}_${currentTenant?.raisonSociale}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-accent" /> Taxe d'Apprentissage & Formation
          </h1>
          <p className="text-muted-foreground text-sm">Déclaration semestrielle Annexe I - Conformité Art. 196 sexies CIDTA.</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger className="w-44 bg-white">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1er Semestre 2026</SelectItem>
              <SelectItem value="2">2ème Semestre 2026</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={generatePDF}><Download className="mr-2 h-4 w-4" /> Annexe I (PDF)</Button>
          <Button className="bg-primary shadow-lg"><Printer className="mr-2 h-4 w-4" /> Imprimer</Button>
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 font-bold">Obligation Déclarative</AlertTitle>
        <AlertDescription className="text-xs text-blue-700">
          La déclaration <strong>Annexe I</strong> doit être souscrite par tous les employeurs, même lorsqu'aucun montant n'est dû, au plus tard le <strong>20 du mois qui suit le semestre</strong>.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase opacity-80">Total Semestriel (2%)</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-4xl font-black">{formatAmount(semesterData.total)} DA</h2>
            <p className="text-xs mt-2 font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> À verser avant le {deadlines[selectedSemester]}.
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Masse Salariale Semestrielle</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl font-bold text-amber-600">{formatAmount(semesterData.base)} DA</h2>
            <p className="text-[10px] text-muted-foreground italic mt-1">Base de calcul pour les taxes de formation.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Statut Annexes</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-sm text-emerald-700">Annexes II, III, IV</p>
              <p className="text-[10px] text-muted-foreground">Prêtes pour impression.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-t-4 border-t-primary shadow-lg overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-lg">Détail du Bordereau Annexe I</CardTitle>
          <CardDescription>
            Ventilation des taxes sur la formation et l'apprentissage pour le semestre sélectionné.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Libellé de la Taxe</TableHead>
                <TableHead className="text-right">Assiette (DA)</TableHead>
                <TableHead className="text-center">Taux</TableHead>
                <TableHead className="text-right font-bold text-primary">Montant dû (DA)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Taxe d'Apprentissage (TA)</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatAmount(semesterData.base)}</TableCell>
                <TableCell className="text-center text-xs">1%</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold">{formatAmount(semesterData.ta)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Taxe de Formation Professionnelle (TFP)</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatAmount(semesterData.base)}</TableCell>
                <TableCell className="text-center text-xs">1%</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold">{formatAmount(semesterData.tfp)}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter className="bg-primary/5">
              <TableRow className="font-bold">
                <TableCell colSpan={3} className="text-lg">MONTANT TOTAL DU VERSEMENT</TableCell>
                <TableCell className="text-right font-mono text-2xl text-primary">{formatAmount(semesterData.total)} DA</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" /> Justificatifs de Dépenses
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>Le montant à verser peut être réduit si vous justifiez de dépenses réelles :</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Actions de formation continue interne ou externe (Annexe II).</li>
              <li>Prise en charge d'apprentis au sein de l'entreprise (Annexe III).</li>
              <li>Attestation de l'effort consacré (Annexe IV).</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Sanctions de retard (LF 2025)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-amber-700 leading-relaxed">
            Le défaut de dépôt dans les délais entraîne une majoration de <strong>10%</strong> (≤ 1 mois), <strong>20%</strong> (≤ 2 mois) ou <strong>25%</strong> (> 2 mois). 
            En l'absence de paiement, une amende forfaitaire de <strong>10 000 DA</strong> est appliquée.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}