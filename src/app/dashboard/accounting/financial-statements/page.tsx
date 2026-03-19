"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { FileBarChart, Printer, FileDown, TrendingUp, Landmark, Calculator, PieChart, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { jsPDF } from "jspdf"
import autoTable from 'jspdf-autotable'

export default function FinancialStatements() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  const entriesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "journal_entries"),
      where(`tenantMembers.${user.uid}`, "!=", null),
      orderBy("entryDate", "asc")
    );
  }, [db, currentTenant, user]);
  const { data: entries, isLoading } = useCollection(entriesQuery);

  const financialData = React.useMemo(() => {
    const totals: Record<string, { debit: number; credit: number }> = {};
    if (!entries) return null;

    entries.forEach(entry => {
      entry.lines.forEach((line: any) => {
        if (!totals[line.accountCode]) {
          totals[line.accountCode] = { debit: 0, credit: 0 };
        }
        totals[line.accountCode].debit += line.debit;
        totals[line.accountCode].credit += line.credit;
      });
    });

    const categories = {
      actif: { immobilisations: 0, stocks: 0, creances: 0, tresorerie: 0 },
      passif: { capitaux: 0, dettes: 0, decouverts: 0 },
      resultat: { produits: 0, charges: 0 }
    };

    Object.entries(totals).forEach(([code, balances]) => {
      const balance = balances.debit - balances.credit;
      const firstDigit = code[0];

      if (firstDigit === '2') categories.actif.immobilisations += balance;
      else if (firstDigit === '3') categories.actif.stocks += balance;
      else if (firstDigit === '4') {
        if (balance > 0) categories.actif.creances += balance;
        else categories.passif.dettes += Math.abs(balance);
      }
      else if (firstDigit === '5') {
        if (balance > 0) categories.actif.tresorerie += balance;
        else categories.passif.decouverts += Math.abs(balance);
      }
      else if (firstDigit === '1') categories.passif.capitaux += Math.abs(balance);
      else if (firstDigit === '6') categories.resultat.charges += balances.debit - balances.credit;
      else if (firstDigit === '7') categories.resultat.produits += balances.credit - balances.debit;
    });

    return categories;
  }, [entries]);

  const formatValue = (val: number) => mounted ? val.toLocaleString() : "..."

  const netResult = (financialData?.resultat.produits || 0) - (financialData?.resultat.charges || 0);
  const totalActif = (financialData?.actif.immobilisations || 0) + (financialData?.actif.stocks || 0) + (financialData?.actif.creances || 0) + (financialData?.actif.tresorerie || 0);
  const totalPassifExclResult = (financialData?.passif.capitaux || 0) + (financialData?.passif.dettes || 0) + (financialData?.passif.decouverts || 0);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`États Financiers - ${currentTenant?.raisonSociale}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Bilan et TCR au ${new Date().toLocaleDateString()}`, 14, 30);

    doc.setFontSize(14);
    doc.text("BILAN - ACTIF", 14, 45);
    autoTable(doc, {
      startY: 50,
      head: [['Rubriques', 'Montant Net']],
      body: [
        ['Immobilisations', financialData?.actif.immobilisations.toLocaleString()],
        ['Stocks', financialData?.actif.stocks.toLocaleString()],
        ['Créances', financialData?.actif.creances.toLocaleString()],
        ['Disponibilités', financialData?.actif.tresorerie.toLocaleString()],
        ['TOTAL ACTIF', totalActif.toLocaleString()]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    const nextY = (doc as any).lastAutoTable.finalY + 15;
    doc.text("BILAN - PASSIF", 14, nextY);
    autoTable(doc, {
      startY: nextY + 5,
      head: [['Rubriques', 'Montant']],
      body: [
        ['Capitaux Propres', financialData?.passif.capitaux.toLocaleString()],
        ['Dettes', financialData?.passif.dettes.toLocaleString()],
        ['Découverts', financialData?.passif.decouverts.toLocaleString()],
        ['Résultat de l\'exercice', netResult.toLocaleString()],
        ['TOTAL PASSIF', (totalPassifExclResult + netResult).toLocaleString()]
      ],
      theme: 'grid',
      headStyles: { fillColor: [26, 188, 156] }
    });

    doc.save(`Etats_Financiers_${currentTenant?.raisonSociale}.pdf`);
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Calculator className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <FileBarChart className="h-8 w-8 text-accent" /> États Financiers SCF
          </h1>
          <p className="text-muted-foreground text-sm">Bilan et Compte de Résultat conformes au Système Comptable Financier.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF}><Printer className="mr-2 h-4 w-4" /> PDF Professionnel</Button>
          <Button variant="outline" size="sm"><FileDown className="mr-2 h-4 w-4" /> Exporter Excel</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground shadow-lg border-none">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs uppercase font-bold opacity-80">Résultat Net Période</p>
                <h2 className="text-3xl font-bold">{formatValue(netResult)} DA</h2>
              </div>
              <TrendingUp className="h-8 w-8 opacity-20" />
            </div>
            <Badge className={`mt-4 ${netResult >= 0 ? 'bg-emerald-500' : 'bg-destructive'}`}>
              {netResult >= 0 ? "Bénéfice Net" : "Déficit Net"}
            </Badge>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <p className="text-xs uppercase font-bold text-muted-foreground">Total Bilan (Actif)</p>
            <h2 className="text-3xl font-bold text-blue-600">{formatValue(totalActif)} DA</h2>
            <p className="text-[10px] text-muted-foreground mt-2 italic">Équilibre financier vérifié.</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-accent">
          <CardContent className="pt-6">
            <p className="text-xs uppercase font-bold text-muted-foreground">Capitaux Propres</p>
            <h2 className="text-3xl font-bold text-accent">{formatValue(financialData?.passif.capitaux || 0)} DA</h2>
            <p className="text-[10px] text-muted-foreground mt-2 italic">Solidité financière du dossier.</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bilan" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="bilan" className="flex items-center gap-2">
            <Landmark className="h-4 w-4" /> Bilan (Actif / Passif)
          </TabsTrigger>
          <TabsTrigger value="resultat" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" /> Compte de Résultat (TCR)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bilan" className="space-y-6">
          {!mounted ? (
            <div className="text-center py-20 text-muted-foreground italic">Génération des tableaux...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border-t-4 border-t-blue-500 shadow-md">
                <CardHeader className="bg-blue-50/50">
                  <CardTitle className="text-lg text-blue-800">Bilan - ACTIF</CardTitle>
                  <CardDescription>Emplois des ressources (Ce que l'entreprise possède)</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Rubriques</TableHead>
                        <TableHead className="text-right">Montant Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Immobilisations (Incorporelles & Corporelles)</TableCell>
                        <TableCell className="text-right font-mono">{formatValue(financialData?.actif.immobilisations || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Stocks et En-cours</TableCell>
                        <TableCell className="text-right font-mono">{formatValue(financialData?.actif.stocks || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Créances Clients et Tiers</TableCell>
                        <TableCell className="text-right font-mono">{formatValue(financialData?.actif.creances || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Disponibilités (Banque & Caisse)</TableCell>
                        <TableCell className="text-right font-mono">{formatValue(financialData?.actif.tresorerie || 0)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-blue-600 text-white hover:bg-blue-700 font-bold">
                        <TableCell className="uppercase">Total Actif</TableCell>
                        <TableCell className="text-right text-lg font-mono">{formatValue(totalActif)} DA</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-accent shadow-md">
                <CardHeader className="bg-accent/5">
                  <CardTitle className="text-lg text-accent-foreground">Bilan - PASSIF</CardTitle>
                  <CardDescription>Origine des ressources (Ce que l'entreprise doit)</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Rubriques</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Capitaux Propres & Réserves</TableCell>
                        <TableCell className="text-right font-mono">{formatValue(financialData?.passif.capitaux || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Dettes Fournisseurs & Tiers</TableCell>
                        <TableCell className="text-right font-mono">{formatValue(financialData?.passif.dettes || 0)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Découverts Bancaires</TableCell>
                        <TableCell className="text-right font-mono">{formatValue(financialData?.passif.decouverts || 0)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/30 italic">
                        <TableCell className="font-medium">Résultat de l'exercice (Bénéfice/Perte)</TableCell>
                        <TableCell className={`text-right font-mono font-bold ${netResult >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                          {formatValue(netResult)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold">
                        <TableCell className="uppercase">Total Passif</TableCell>
                        <TableCell className="text-right text-lg font-mono">{formatValue(totalPassifExclResult + netResult)} DA</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="resultat">
          <Card className="border-t-4 border-t-primary shadow-xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <PieChart className="h-6 w-6 text-primary" /> Tableau des Comptes de Résultats (TCR)
              </CardTitle>
              <CardDescription>Analyse de la rentabilité de l'exercice en cours.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!mounted ? (
                <div className="text-center py-20 text-muted-foreground italic">Calcul du résultat...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/80">
                      <TableHead className="w-[400px]">Éléments de Gestion</TableHead>
                      <TableHead className="text-right">Charges (-)</TableHead>
                      <TableHead className="text-right">Produits (+)</TableHead>
                      <TableHead className="text-right">Solde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Chiffre d'Affaires (Ventes de biens et services)</TableCell>
                      <TableCell className="text-right font-mono">-</TableCell>
                      <TableCell className="text-right font-mono">{formatValue(financialData?.resultat.produits || 0)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatValue(financialData?.resultat.produits || 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Charges d'Exploitation (Achats, Services, Salaires)</TableCell>
                      <TableCell className="text-right font-mono">{formatValue(financialData?.resultat.charges || 0)}</TableCell>
                      <TableCell className="text-right font-mono">-</TableCell>
                      <TableCell className="text-right font-mono text-destructive">-{formatValue(financialData?.resultat.charges || 0)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/5 border-t-2 font-bold">
                      <TableCell className="uppercase">Résultat Brut d'Exploitation</TableCell>
                      <TableCell colSpan={2} className="text-right"></TableCell>
                      <TableCell className={`text-right text-lg font-mono ${netResult >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {formatValue(netResult)} DA
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
              <div className="p-6 bg-muted/20 flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div className="text-xs text-muted-foreground italic leading-relaxed">
                  Ce compte de résultat est généré dynamiquement à partir du Livre-Journal. 
                  Il respecte la nomenclature SCF et constitue la base de calcul pour votre liasse fiscale annuelle G4.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}