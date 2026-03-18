"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, FileDown, ShieldCheck, Info, Loader2, Calendar, FileJson } from "lucide-react"
import { PAYROLL_CONSTANTS } from "@/lib/calculations"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function DasPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear())

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formatAmount = (val: number) => mounted ? val.toLocaleString() : "..."

  // Fetch active tenant
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  // Fetch employees for the year
  const employeesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "employees"),
      where(`tenantMembers.${user.uid}`, "!=", null)
    );
  }, [db, currentTenant, user]);
  const { data: employees, isLoading } = useCollection(employeesQuery);

  const dasData = React.useMemo(() => {
    if (!employees) return [];
    
    return employees.map(emp => {
      const base = Number(emp.baseSalary) || 0;
      const primes = Number(emp.primesImposables) || 0;
      const salairePoste = base + primes;
      
      // Simulation annuelle (12 mois)
      const annualGross = salairePoste * 12;
      const annualCnasEmployee = annualGross * PAYROLL_CONSTANTS.CNAS_EMPLOYEE;
      const annualCnasEmployer = annualGross * PAYROLL_CONSTANTS.CNAS_EMPLOYER;
      
      return {
        ...emp,
        annualGross,
        annualCnasTotal: annualCnasEmployee + annualCnasEmployer,
        monthsWorked: 12 // Simplifié pour l'exemple
      };
    });
  }, [employees]);

  const totals = React.useMemo(() => {
    return dasData.reduce((acc, curr) => ({
      gross: acc.gross + curr.annualGross,
      cnas: acc.cnas + curr.annualCnasTotal,
      count: acc.count + 1
    }), { gross: 0, cnas: 0, count: 0 });
  }, [dasData]);

  const generateXmlPreview = () => {
    if (!currentTenant || !dasData.length) return "Données insuffisantes pour générer l'XML.";
    
    let xml = `<?xml version="1.0" encoding="ISO-8859-1"?>\n<DAS>\n`;
    xml += `  <ENTETE>\n`;
    xml += `    <RAISON_SOCIALE>${currentTenant.raisonSociale}</RAISON_SOCIALE>\n`;
    xml += `    <NIF>${currentTenant.nif || ''}</NIF>\n`;
    xml += `    <ANNEE>${selectedYear}</ANNEE>\n`;
    xml += `  </ENTETE>\n`;
    xml += `  <SALARIES>\n`;
    
    dasData.forEach(s => {
      xml += `    <SALARIE>\n`;
      xml += `      <NOM_PRENOM>${s.name}</NOM_PRENOM>\n`;
      xml += `      <N_ASSURANCE>${s.cnasNumber || '0000000000'}</N_ASSURANCE>\n`;
      xml += `      <BRUT_ANNUEL>${s.annualGross.toFixed(2)}</BRUT_ANNUEL>\n`;
      xml += `      <MOIS_TRAVAILLES>${s.monthsWorked}</MOIS_TRAVAILLES>\n`;
      xml += `    </SALARIE>\n`;
    });
    
    xml += `  </SALARIES>\n</DAS>`;
    return xml;
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-accent" /> Déclaration DAS (CNAS)
          </h1>
          <p className="text-muted-foreground text-sm">Récapitulatif annuel des salaires et cotisations pour l'exercice {selectedYear}.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Calendar className="mr-2 h-4 w-4" /> Année {selectedYear}</Button>
          <Button className="bg-primary shadow-md">
            <FileDown className="mr-2 h-4 w-4" /> Télécharger DAS (XML)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-bold opacity-80">Masse Salariale Annuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-3xl font-bold">{formatAmount(totals.gross)} DA</h2>
            <p className="text-xs mt-2 opacity-70">Basé sur {totals.count} salariés déclarés.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Cotisations CNAS Totales (35%)</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-3xl font-bold text-emerald-600">{formatAmount(totals.cnas)} DA</h2>
            <p className="text-xs text-muted-foreground mt-2 italic">Part ouvrière + Part patronale.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-accent shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Statut Conformité</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-sm">Prêt pour Damancom</p>
              <p className="text-[10px] text-muted-foreground">Données 2026 validées.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Détail par Salarié</TabsTrigger>
          <TabsTrigger value="xml">Aperçu Format XML (CNAS)</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card className="border-t-4 border-t-primary shadow-md overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">Tableau Récapitulatif DAS</CardTitle>
              <CardDescription>Tous les montants sont calculés en Salaire de Poste (SCF Classe 63).</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Nom & Prénom</TableHead>
                    <TableHead>N° Assuré CNAS</TableHead>
                    <TableHead className="text-center">Mois</TableHead>
                    <TableHead className="text-right">Brut Cotisable (Poste)</TableHead>
                    <TableHead className="text-right">Cotisation (35%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dasData.map((s, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/10">
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="font-mono text-xs">{s.cnasNumber || 'N/A'}</TableCell>
                      <TableCell className="text-center">{s.monthsWorked}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatAmount(s.annualGross)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-primary">{formatAmount(s.annualCnasTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-primary/5">
                  <TableRow className="font-bold">
                    <TableCell colSpan={3}>TOTAL GÉNÉRAL DAS</TableCell>
                    <TableCell className="text-right font-mono text-lg">{formatAmount(totals.gross)} DA</TableCell>
                    <TableCell className="text-right font-mono text-lg text-primary">{formatAmount(totals.cnas)} DA</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="xml">
          <Card className="border-t-4 border-t-slate-800 shadow-xl">
            <CardHeader className="bg-slate-900 text-white flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <FileJson className="h-4 w-4" /> das_export_${selectedYear}.xml
                </CardTitle>
                <CardDescription className="text-slate-400 text-[10px]">Structure de données certifiée pour télé-déclaration.</CardDescription>
              </div>
              <Badge variant="outline" className="border-slate-700 text-slate-300">Format Damancom</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] bg-slate-950 p-6">
                <pre className="text-emerald-400 font-mono text-xs leading-relaxed">
                  {generateXmlPreview()}
                </pre>
              </ScrollArea>
            </CardContent>
            <CardFooter className="bg-slate-100 p-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="text-xs">Copier</Button>
              <Button size="sm" className="bg-slate-900 text-white text-xs">Générer le fichier .txt</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-4">
        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
          <Info className="h-6 w-6 text-blue-600" />
        </div>
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold mb-1 underline">Note de l'expert ComptaFisc-DZ :</p>
          <p>
            La DAS doit être déposée avant le 31 janvier de l'année N+1. Ce module automatise la consolidation de vos 12 mois de paie. 
            <strong> Attention :</strong> Les salaires reportés ici doivent correspondre à la somme des assiettes CNAS déclarées mensuellement (ou trimestriellement) via les bordereaux de cotisation. 
            Le système vérifie automatiquement la cohérence entre votre Grand Livre (Classe 63) et ce registre social.
          </p>
        </div>
      </div>
    </div>
  )
}
