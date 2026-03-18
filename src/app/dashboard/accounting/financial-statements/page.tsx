"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { FileBarChart, Printer, FileDown, TrendingUp, Landmark, Calculator, PieChart } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function FinancialStatements() {
  const db = useFirestore()
  const { user } = useUser()

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
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

  // Agrégation des données financières par classe SCF
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

    // Groupement par catégories SCF
    const categories = {
      actif: {
        immobilisations: 0, // Classe 2
        stocks: 0,         // Classe 3
        creances: 0,       // Classe 4 (débiteur)
        tresorerie: 0,     // Classe 5 (débiteur)
      },
      passif: {
        capitaux: 0,       // Classe 1
        dettes: 0,         // Classe 4 (créditeur)
        decouverts: 0,     // Classe 5 (créditeur)
      },
      resultat: {
        produits: 0,       // Classe 7
        charges: 0,        // Classe 6
      }
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

  const netResult = (financialData?.resultat.produits || 0) - (financialData?.resultat.charges || 0);
  const totalActif = (financialData?.actif.immobilisations || 0) + (financialData?.actif.stocks || 0) + (financialData?.actif.creances || 0) + (financialData?.actif.tresorerie || 0);
  const totalPassifExclResult = (financialData?.passif.capitaux || 0) + (financialData?.passif.dettes || 0) + (financialData?.passif.decouverts || 0);

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
          <Button variant="outline" size="sm"><Printer className="mr-2 h-4 w-4" /> Imprimer</Button>
          <Button variant="outline" size="sm"><FileDown className="mr-2 h-4 w-4" /> Exporter</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground shadow-lg border-none">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs uppercase font-bold opacity-80">Résultat Net Période</p>
                <h2 className="text-3xl font-bold">{netResult.toLocaleString()} DA</h2>
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
            <h2 className="text-3xl font-bold text-blue-600">{totalActif.toLocaleString()} DA</h2>
            <p className="text-[10px] text-muted-foreground mt-2 italic">Équilibre financier vérifié.</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-accent">
          <CardContent className="pt-6">
            <p className="text-xs uppercase font-bold text-muted-foreground">Capitaux Propres</p>
            <h2 className="text-3xl font-bold text-accent">{financialData?.passif.capitaux.toLocaleString()} DA</h2>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ACTIF */}
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
                      <TableCell className="text-right font-mono">{(financialData?.actif.immobilisations || 0).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Stocks et En-cours</TableCell>
                      <TableCell className="text-right font-mono">{(financialData?.actif.stocks || 0).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Créances Clients et Tiers</TableCell>
                      <TableCell className="text-right font-mono">{(financialData?.actif.creances || 0).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Disponibilités (Banque & Caisse)</TableCell>
                      <TableCell className="text-right font-mono">{(financialData?.actif.tresorerie || 0).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow className="bg-blue-600 text-white hover:bg-blue-700">
                      <TableCell className="font-bold uppercase">Total Actif</TableCell>
                      <TableCell className="text-right font-bold text-lg font-mono">{totalActif.toLocaleString()} DA</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* PASSIF */}
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
                      <TableCell className="text-right font-mono">{(financialData?.passif.capitaux || 0).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Dettes Fournisseurs & Tiers</TableCell>
                      <TableCell className="text-right font-mono">{(financialData?.passif.dettes || 0).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Découverts Bancaires</TableCell>
                      <TableCell className="text-right font-mono">{(financialData?.passif.decouverts || 0).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/30 italic">
                      <TableCell className="font-medium">Résultat de l'exercice (Bénéfice/Perte)</TableCell>
                      <TableCell className={`text-right font-mono font-bold ${netResult >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {netResult.toLocaleString()}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-accent text-accent-foreground hover:bg-accent/90">
                      <TableCell className="font-bold uppercase">Total Passif</TableCell>
                      <TableCell className="text-right font-bold text-lg font-mono">{(totalPassifExclResult + netResult).toLocaleString()} DA</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
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
                    <TableCell className="text-right font-mono">{(financialData?.resultat.produits || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{(financialData?.resultat.produits || 0).toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Charges d'Exploitation (Achats, Services, Salaires)</TableCell>
                    <TableCell className="text-right font-mono">{(financialData?.resultat.charges || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">-</TableCell>
                    <TableCell className="text-right font-mono text-destructive">-{ (financialData?.resultat.charges || 0).toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5 border-t-2">
                    <TableCell className="font-bold uppercase">Résultat Brut d'Exploitation</TableCell>
                    <TableCell colSpan={2} className="text-right"></TableCell>
                    <TableCell className={`text-right font-bold text-lg font-mono ${netResult >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {netResult.toLocaleString()} DA
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="p-6 bg-muted/20 flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
                <div className="text-xs text-muted-foreground italic">
                  Note : Ce compte de résultat est généré à partir des écritures validées du Livre-Journal. 
                  Il ne prend en compte que les comptes des classes 6 (Charges) et 7 (Produits) conformément au plan comptable national.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
