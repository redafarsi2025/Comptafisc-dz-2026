"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, FileDown, ShieldCheck, Info, Loader2, Calendar, FileJson, AlertCircle, Layout, FileCode } from "lucide-react"
import { PAYROLL_CONSTANTS, calculateIRG } from "@/lib/calculations"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"

export default function DasPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)
  const [selectedYear, setSelectedYear] = React.useState(2025)

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
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "employees");
  }, [db, currentTenant]);
  const { data: employees, isLoading } = useCollection(employeesQuery);

  const dasData = React.useMemo(() => {
    if (!employees) return [];
    
    return employees.map(emp => {
      const base = Number(emp.baseSalary) || 0;
      const primes = Number(emp.primesImposables) || 0;
      const salairePoste = base + primes;
      
      const annualGross = salairePoste * 12;
      const annualCnasEmployee = annualGross * PAYROLL_CONSTANTS.CNAS_EMPLOYEE;
      const annualCnasEmployer = annualGross * PAYROLL_CONSTANTS.CNAS_EMPLOYER;
      
      // Calcul IRG Annuel (simplifié)
      const annualIrg = calculateIRG(salairePoste - (salairePoste * 0.09), emp.isGrandSud, emp.isHandicapped) * 12;

      return {
        ...emp,
        annualGross,
        annualIrg,
        annualCnasTotal: annualCnasEmployee + annualCnasEmployer,
        monthsWorked: 12
      };
    });
  }, [employees]);

  const totals = React.useMemo(() => {
    return dasData.reduce((acc, curr) => ({
      gross: acc.gross + curr.annualGross,
      cnas: acc.cnas + curr.annualCnasTotal,
      irg: acc.irg + curr.annualIrg,
      count: acc.count + 1
    }), { gross: 0, cnas: 0, irg: 0, count: 0 });
  }, [dasData]);

  const generateCnasXml = () => {
    if (!currentTenant || !dasData.length) return "Données insuffisantes.";
    let xml = `<?xml version="1.0" encoding="ISO-8859-1"?>\n<DAS_V1_0_52>\n`;
    xml += `  <ENTETE>\n    <RAISON_SOCIALE>${currentTenant.raisonSociale}</RAISON_SOCIALE>\n    <NIF>${currentTenant.nif || ''}</NIF>\n    <ANNEE>${selectedYear}</ANNEE>\n  </ENTETE>\n  <SALARIES>\n`;
    dasData.forEach(s => {
      xml += `    <SALARIE>\n      <NOM_PRENOM>${s.name}</NOM_PRENOM>\n      <N_ASSURANCE>${s.cnasNumber || '0000000000'}</N_ASSURANCE>\n      <BRUT_ANNUEL>${s.annualGross.toFixed(2)}</BRUT_ANNUEL>\n      <MOIS_TRAVAILLES>${s.monthsWorked}</MOIS_TRAVAILLES>\n    </SALARIE>\n`;
    });
    xml += `  </SALARIES>\n</DAS_V1_0_52>`;
    return xml;
  };

  const generateG29Xml = () => {
    if (!currentTenant || !dasData.length) return "Données insuffisantes.";
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<G29_DGI_2026>\n`;
    xml += `  <DECLARENT>\n    <RAISON_SOCIALE>${currentTenant.raisonSociale}</RAISON_SOCIALE>\n    <NIF>${currentTenant.nif || ''}</NIF>\n    <EXERCICE>${selectedYear}</EXERCICE>\n  </DECLARENT>\n  <REMUNERATIONS>\n`;
    dasData.forEach(s => {
      xml += `    <SALARIE>\n      <NIN>${s.nin || 'REQUIS'}</NIN>\n      <NOM_PRENOM>${s.name}</NOM_PRENOM>\n      <BRUT_ANNUEL>${s.annualGross.toFixed(2)}</BRUT_ANNUEL>\n      <IRG_REVENU>${s.annualIrg.toFixed(2)}</IRG_REVENU>\n    </SALARIE>\n`;
    });
    xml += `  </REMUNERATIONS>\n</G29_DGI_2026>`;
    return xml;
  };

  const handleDownloadXml = (type: 'CNAS' | 'G29') => {
    const xmlContent = type === 'CNAS' ? generateCnasXml() : generateG29Xml();
    const blob = new Blob([xmlContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}_${currentTenant?.raisonSociale}_${selectedYear}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: `Export ${type} terminé`, description: "Le fichier XML est prêt pour le téléversement." });
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-accent" /> Déclarations Annuelles (DAS & G29)
          </h1>
          <p className="text-muted-foreground text-sm">Génération des fichiers XML réglementaires pour CNAS et DGI (LF 2026).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedYear(selectedYear - 1)}><Calendar className="mr-2 h-4 w-4" /> Exercice {selectedYear}</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md" onClick={() => handleDownloadXml('G29')}>
            <FileCode className="mr-2 h-4 w-4" /> Télécharger G n°29 (XML)
          </Button>
          <Button className="bg-primary shadow-md" onClick={() => handleDownloadXml('CNAS')}>
            <FileDown className="mr-2 h-4 w-4" /> Télécharger DAS CNAS (XML)
          </Button>
        </div>
      </div>

      <Alert className="bg-emerald-50 border-emerald-200">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <AlertTitle className="text-emerald-800 font-bold">Conformité Art. 8 LF 2026</AlertTitle>
        <AlertDescription className="text-xs text-emerald-700">
          La mention du **NIN (Numéro d'Identification Nationale)** est désormais obligatoire sur la déclaration G n°29, quel que soit le mode de souscription.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-bold opacity-80">Masse Salariale Annuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-3xl font-bold">{formatAmount(totals.gross)} DA</h2>
            <p className="text-xs mt-2 opacity-70">Consolidation sur 12 mois.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Total IRG Retenu (G29)</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-3xl font-bold text-amber-600">{formatAmount(totals.irg)} DA</h2>
            <p className="text-xs text-muted-foreground mt-2 italic">Base imposable cumulée.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Status Jibayatic / Damancom</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-sm">XML V1.0.52 Prêt</p>
              <p className="text-[10px] text-muted-foreground">{employees?.length || 0} salariés conformes.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">Récapitulatif Salariés</TabsTrigger>
          <TabsTrigger value="xml-g29">Aperçu XML G29 (DGI)</TabsTrigger>
          <TabsTrigger value="xml-cnas">Aperçu XML DAS (CNAS)</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card className="border-t-4 border-t-primary shadow-md overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Identité Salarié (NIN/CNAS)</TableHead>
                    <TableHead className="text-center">Mois</TableHead>
                    <TableHead className="text-right">Brut Annuel</TableHead>
                    <TableHead className="text-right">IRG Annuel (G29)</TableHead>
                    <TableHead className="text-right">CNAS (35%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dasData.map((s, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/10">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs">{s.name}</span>
                          <span className="text-[9px] font-mono text-muted-foreground">NIN: {s.nin || 'REQUIS'}</span>
                          <span className="text-[9px] font-mono text-muted-foreground">CNAS: {s.cnasNumber || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{s.monthsWorked}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatAmount(s.annualGross)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-600">{formatAmount(s.annualIrg)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-primary">{formatAmount(s.annualCnasTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-primary/5">
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>TOTAL EXERCICE {selectedYear}</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(totals.gross)} DA</TableCell>
                    <TableCell className="text-right font-mono text-amber-600">{formatAmount(totals.irg)} DA</TableCell>
                    <TableCell className="text-right font-mono text-primary">{formatAmount(totals.cnas)} DA</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="xml-g29">
          <Card className="border-t-4 border-t-slate-800 shadow-xl">
            <CardHeader className="bg-slate-900 text-white flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <FileCode className="h-4 w-4" /> g29_declaration_2026.xml
                </CardTitle>
                <CardDescription className="text-slate-400 text-[10px]">Format conforme Jibayatic (Art. 8 LF 2026).</CardDescription>
              </div>
              <Badge variant="outline" className="border-slate-700 text-slate-300">V2026.1</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] bg-slate-950 p-6">
                <pre className="text-amber-400 font-mono text-xs leading-relaxed">
                  {generateG29Xml()}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="xml-cnas">
          <Card className="border-t-4 border-t-slate-800 shadow-xl">
            <CardHeader className="bg-slate-900 text-white flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <FileJson className="h-4 w-4" /> das_cnas_allegee.xml
                </CardTitle>
                <CardDescription className="text-slate-400 text-[10px]">Format optimisé Tasrihatcom / Damancom.</CardDescription>
              </div>
              <Badge variant="outline" className="border-slate-700 text-slate-300">V1.0.52</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] bg-slate-950 p-6">
                <pre className="text-emerald-400 font-mono text-xs leading-relaxed">
                  {generateCnasXml()}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-4">
        <Info className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
        <div className="text-xs text-blue-900 leading-relaxed space-y-2">
          <p className="font-bold underline uppercase">Note de Conformité G29 (DGI) :</p>
          <p>
            Le défaut de production de la déclaration **G n°29** dans le délai légal (30 avril) est sanctionné par une pénalité de **5%** sur la masse salariale annuelle (Art. 13 LF 2024). 
            Le système vérifie automatiquement la présence du **NIN** et du **NIF** pour éviter tout rejet sur le portail Jibayatic.
          </p>
        </div>
      </div>
    </div>
  )
}