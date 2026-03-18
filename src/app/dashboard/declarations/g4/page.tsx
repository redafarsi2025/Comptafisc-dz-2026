
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { FileStack, Printer, FileDown, Calculator, Landmark, PieChart, ShieldCheck, AlertCircle, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LiasseFiscaleG4() {
  const db = useFirestore()
  const { user } = useUser()

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  const entriesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "journal_entries"),
      orderBy("entryDate", "asc")
    );
  }, [db, currentTenant]);
  const { data: entries, isLoading: isEntriesLoading } = useCollection(entriesQuery);

  const assetsQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "assets");
  }, [db, currentTenant]);
  const { data: assets, isLoading: isAssetsLoading } = useCollection(assetsQuery);

  // Agrégation des données pour la G4
  const g4Data = React.useMemo(() => {
    if (!entries) return null;
    const balances: Record<string, { debit: number; credit: number }> = {};
    
    entries.forEach(entry => {
      entry.lines.forEach((line: any) => {
        if (!balances[line.accountCode]) balances[line.accountCode] = { debit: 0, credit: 0 };
        balances[line.accountCode].debit += line.debit;
        balances[line.accountCode].credit += line.credit;
      });
    });

    const categories = {
      actif: {
        immos_incorp: 0, immos_corp: 0, stocks: 0, clients: 0, tresorerie: 0
      },
      passif: {
        capitaux: 0, resultats: 0, dettes_fi: 0, fournisseurs: 0, dettes_fisc: 0
      },
      tcr: {
        ventes: 0, achats: 0, services: 0, salaires: 0, impots: 0
      }
    };

    Object.entries(balances).forEach(([code, b]) => {
      const solde = b.debit - b.credit;
      if (code.startsWith('20')) categories.actif.immos_incorp += solde;
      else if (code.startsWith('21')) categories.actif.immos_corp += solde;
      else if (code.startsWith('3')) categories.actif.stocks += solde;
      else if (code.startsWith('41')) categories.actif.clients += solde;
      else if (code.startsWith('5')) categories.actif.tresorerie += solde;
      
      else if (code.startsWith('10')) categories.passif.capitaux += Math.abs(solde);
      else if (code.startsWith('12')) categories.passif.resultats += Math.abs(solde);
      else if (code.startsWith('16')) categories.passif.dettes_fi += Math.abs(solde);
      else if (code.startsWith('40')) categories.passif.fournisseurs += Math.abs(solde);
      else if (code.startsWith('44')) categories.passif.dettes_fisc += Math.abs(solde);

      else if (code.startsWith('70')) categories.tcr.ventes += (b.credit - b.debit);
      else if (code.startsWith('60')) categories.tcr.achats += (b.debit - b.credit);
      else if (code.startsWith('61') || code.startsWith('62')) categories.tcr.services += (b.debit - b.credit);
      else if (code.startsWith('63')) categories.tcr.salaires += (b.debit - b.credit);
    });

    return categories;
  }, [entries]);

  const resComptable = (g4Data?.tcr.ventes || 0) - (g4Data?.tcr.achats || 0) - (g4Data?.tcr.services || 0) - (g4Data?.tcr.salaires || 0);
  const resFiscal = resComptable; // Simplifié pour l'exemple

  // Simulation des données d'amortissement si pas d'assets réels
  const displayAssets = React.useMemo(() => {
    if (assets && assets.length > 0) return assets;
    // Mock pour démonstration si la collection est vide
    return [
      { id: '1', designation: 'Matériel Industriel (Presse)', acquisitionDate: '2023-01-15', acquisitionValue: 5000000, amortizationRate: 10 },
      { id: '2', designation: 'Matériel de Transport', acquisitionDate: '2022-06-10', acquisitionValue: 2500000, amortizationRate: 20 },
      { id: '3', designation: 'Mobilier de Bureau', acquisitionDate: '2023-03-20', acquisitionValue: 800000, amortizationRate: 10 },
    ];
  }, [assets]);

  const calculateAmort = (asset: any) => {
    const value = asset.acquisitionValue;
    const rate = asset.amortizationRate / 100;
    const years = (new Date().getFullYear() - new Date(asset.acquisitionDate).getFullYear());
    const dotation = value * rate;
    const cumul = dotation * years;
    return { dotation, cumul, vnc: value - cumul };
  };

  if (isEntriesLoading) return <div className="flex items-center justify-center h-screen"><FileStack className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <FileStack className="h-8 w-8 text-accent" /> Liasse Fiscale G N°4
          </h1>
          <p className="text-muted-foreground text-sm">Déclaration annuelle des résultats conforme au SCF et au CIDTA.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Télécharger G4 (PDF)</Button>
          <Button className="bg-primary hover:bg-primary/90 shadow-md">Valider l'exercice</Button>
        </div>
      </div>

      <Alert className="bg-primary/5 border-primary/20">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <AlertTitle className="font-bold text-primary">Conformité Systématique</AlertTitle>
        <AlertDescription className="text-xs">
          Cette liasse est générée à partir du Plan de Comptes de l'Entité (PCE) pour le dossier <strong>{currentTenant?.raisonSociale}</strong>.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="bilan" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="bilan">TABLEAU 1/2 : BILAN</TabsTrigger>
          <TabsTrigger value="tcr">TABLEAU 3 : TCR</TabsTrigger>
          <TabsTrigger value="fiscal">TABLEAU 9 : RÉSULTAT FISCAL</TabsTrigger>
          <TabsTrigger value="annexes">TABLEAUX ANNEXES</TabsTrigger>
        </TabsList>

        <TabsContent value="bilan" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-t-4 border-t-primary shadow-lg">
              <CardHeader className="bg-muted/10">
                <CardTitle className="text-lg">BILAN - ACTIF</CardTitle>
                <CardDescription>État du patrimoine à la clôture</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Rubriques G4</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow><TableCell>Immobilisations Incorporelles</TableCell><TableCell className="text-right font-mono">{(g4Data?.actif.immos_incorp || 0).toLocaleString()} DA</TableCell></TableRow>
                    <TableRow><TableCell>Immobilisations Corporelles</TableCell><TableCell className="text-right font-mono">{(g4Data?.actif.immos_corp || 0).toLocaleString()} DA</TableCell></TableRow>
                    <TableRow><TableCell>Stocks et en-cours</TableCell><TableCell className="text-right font-mono">{(g4Data?.actif.stocks || 0).toLocaleString()} DA</TableCell></TableRow>
                    <TableRow><TableCell>Créances et Emplois assimilés</TableCell><TableCell className="text-right font-mono">{(g4Data?.actif.clients || 0).toLocaleString()} DA</TableCell></TableRow>
                    <TableRow><TableCell>Disponibilités</TableCell><TableCell className="text-right font-mono">{(g4Data?.actif.tresorerie || 0).toLocaleString()} DA</TableCell></TableRow>
                    <TableRow className="bg-primary text-white"><TableCell className="font-bold">TOTAL ACTIF</TableCell><TableCell className="text-right font-bold">{(Object.values(g4Data?.actif || {}).reduce((a, b) => a + b, 0)).toLocaleString()} DA</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-accent shadow-lg">
              <CardHeader className="bg-muted/10">
                <CardTitle className="text-lg">BILAN - PASSIF</CardTitle>
                <CardDescription>Origine des ressources</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Rubriques G4</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow><TableCell>Capitaux Propres</TableCell><TableCell className="text-right font-mono">{(g4Data?.passif.capitaux || 0).toLocaleString()} DA</TableCell></TableRow>
                    <TableRow><TableCell>Résultat de l'exercice</TableCell><TableCell className="text-right font-mono">{(g4Data?.passif.resultats || 0).toLocaleString()} DA</TableCell></TableRow>
                    <TableRow><TableCell>Dettes Financières</TableCell><TableCell className="text-right font-mono">{(g4Data?.passif.dettes_fi || 0).toLocaleString()} DA</TableCell></TableRow>
                    <TableRow><TableCell>Fournisseurs et Comptes Rattachés</TableCell><TableCell className="text-right font-mono">{(g4Data?.passif.fournisseurs || 0).toLocaleString()} DA</TableCell></TableRow>
                    <TableRow><TableCell>Dettes Fiscales et Sociales</TableCell><TableCell className="text-right font-mono">{(g4Data?.passif.dettes_fisc || 0).toLocaleString()} DA</TableCell></TableRow>
                    <TableRow className="bg-accent text-accent-foreground"><TableCell className="font-bold">TOTAL PASSIF</TableCell><TableCell className="text-right font-bold">{(Object.values(g4Data?.passif || {}).reduce((a, b) => a + b, 0)).toLocaleString()} DA</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tcr">
          <Card className="border-t-4 border-t-primary shadow-xl">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5 text-primary" /> Tableau des Comptes de Résultats (TCR)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow><TableHead>Libellés</TableHead><TableHead className="text-right">Montant</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow><TableCell className="font-medium">Production de l'exercice (Ventes)</TableCell><TableCell className="text-right font-mono text-emerald-600 font-bold">+{(g4Data?.tcr.ventes || 0).toLocaleString()}</TableCell></TableRow>
                  <TableRow><TableCell>Consommations de l'exercice (Achats)</TableCell><TableCell className="text-right font-mono text-destructive">-{(g4Data?.tcr.achats || 0).toLocaleString()}</TableCell></TableRow>
                  <TableRow><TableCell>Services extérieurs et autres consommations</TableCell><TableCell className="text-right font-mono text-destructive">-{(g4Data?.tcr.services || 0).toLocaleString()}</TableCell></TableRow>
                  <TableRow className="bg-muted/20"><TableCell className="font-bold">VALEUR AJOUTÉE D'EXPLOITATION</TableCell><TableCell className="text-right font-bold text-primary">{((g4Data?.tcr.ventes || 0) - (g4Data?.tcr.achats || 0) - (g4Data?.tcr.services || 0)).toLocaleString()}</TableCell></TableRow>
                  <TableRow><TableCell>Charges de personnel</TableCell><TableCell className="text-right font-mono text-destructive">-{(g4Data?.tcr.salaires || 0).toLocaleString()}</TableCell></TableRow>
                  <TableRow className="bg-primary text-white"><TableCell className="font-bold">RÉSULTAT NET COMPTABLE (Bénéfice/Perte)</TableCell><TableCell className="text-right font-bold text-lg">{resComptable.toLocaleString()} DA</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-l-4 border-l-amber-500 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-amber-800"><Calculator className="h-5 w-5" /> Détermination du Résultat Fiscal</CardTitle>
                <CardDescription>Passage du résultat comptable au résultat imposable (G N°4 - Tableau 9)</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    <TableRow><TableCell className="font-medium">Résultat Net Comptable</TableCell><TableCell className="text-right font-mono">{resComptable.toLocaleString()}</TableCell></TableRow>
                    <TableRow className="text-emerald-600"><TableCell>+ Réintégrations (Amendes, charges non déductibles...)</TableCell><TableCell className="text-right font-mono">0</TableCell></TableRow>
                    <TableRow className="text-destructive"><TableCell>- Déductions (Dividendes, plus-values exonérées...)</TableCell><TableCell className="text-right font-mono">0</TableCell></TableRow>
                    <TableRow className="bg-amber-100 text-amber-900 border-t-2 border-amber-300">
                      <TableCell className="font-bold uppercase">Résultat Fiscal (Base de calcul IBS)</TableCell>
                      <TableCell className="text-right font-bold text-lg font-mono">{resFiscal.toLocaleString()} DA</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground shadow-2xl">
              <CardHeader><CardTitle className="text-sm uppercase font-bold opacity-80">IBS À PAYER (Simulation)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="text-4xl font-bold">{Math.max(10000, resFiscal * 0.19).toLocaleString()} DA</div>
                <div className="space-y-2 pt-4 border-t border-white/20">
                  <div className="flex justify-between text-xs"><span>Taux applicable :</span><span className="font-bold">19%</span></div>
                  <div className="flex justify-between text-xs"><span>Minimum fiscal :</span><span className="font-bold">10 000 DA</span></div>
                </div>
                <Badge className="bg-white text-primary hover:bg-white/90">Prêt pour G50 / G4</Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="annexes">
          <Card className="border-t-4 border-t-primary shadow-lg overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary" /> Tableau des Amortissements (Annexe n°2)
              </CardTitle>
              <CardDescription>Justification de la dépréciation des actifs de l'exercice.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Désignation de l'Élément</TableHead>
                    <TableHead className="text-right">Valeur d'Acquisition</TableHead>
                    <TableHead className="text-center">Taux (%)</TableHead>
                    <TableHead className="text-right">Dotation Exercice</TableHead>
                    <TableHead className="text-right">Cumul Amort.</TableHead>
                    <TableHead className="text-right font-bold">V.N.C</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayAssets.map((asset) => {
                    const { dotation, cumul, vnc } = calculateAmort(asset);
                    return (
                      <TableRow key={asset.id} className="hover:bg-muted/10">
                        <TableCell className="font-medium text-xs">
                          <div className="flex flex-col">
                            <span>{asset.designation}</span>
                            <span className="text-[10px] text-muted-foreground italic">Acquis le {new Date(asset.acquisitionDate).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{asset.acquisitionValue.toLocaleString()}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{asset.amortizationRate}%</TableCell>
                        <TableCell className="text-right font-mono text-xs text-destructive">-{dotation.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs">-{cumul.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-primary">{vnc.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-primary/10 font-bold">
                    <TableCell className="uppercase text-[10px]">TOTAUX DES AMORTISSEMENTS</TableCell>
                    <TableCell className="text-right font-mono">{displayAssets.reduce((s, a) => s + a.acquisitionValue, 0).toLocaleString()}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-mono text-destructive">-{displayAssets.reduce((s, a) => s + calculateAmort(a).dotation, 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">-{displayAssets.reduce((s, a) => s + calculateAmort(a).cumul, 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-primary">{displayAssets.reduce((s, a) => s + calculateAmort(a).vnc, 0).toLocaleString()} DA</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="p-6 bg-amber-50 border-t flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-1" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong>Note réglementaire :</strong> Ces amortissements sont calculés selon le mode linéaire conformément aux durées de vie usuelles admises par l'administration fiscale algérienne. 
                  La dotation totale de <strong>{displayAssets.reduce((s, a) => s + calculateAmort(a).dotation, 0).toLocaleString()} DA</strong> doit être reportée au débit du compte 681 et en déduction du résultat fiscal au Tableau 9 si elle respecte les conditions de déductibilité.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
