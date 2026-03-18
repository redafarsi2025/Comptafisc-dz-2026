"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Landmark, Download, FileCheck, Info, Calendar, Calculator, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"
import { getIFURate, getIFUMinimum } from "@/lib/calculations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function G12Declaration() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)
  const [forecastCA, setForecastCA] = React.useState<number>(0)
  const [isFractioned, setIsFractioned] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formatAmount = (val: number) => mounted ? Math.round(val).toLocaleString() : "..."

  // 1. Fetch Tenant
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  // 2. Fetch Actual Invoices (for G12 bis)
  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "invoices"),
      where(`tenantMembers.${user.uid}`, "!=", null)
    );
  }, [db, currentTenant, user]);
  const { data: invoices } = useCollection(invoicesQuery);

  const ifuRate = getIFURate(currentTenant?.secteurActivite || "SERVICES", currentTenant?.formeJuridique || "");
  const minTax = getIFUMinimum(currentTenant?.formeJuridique || "");
  
  const actualCA = React.useMemo(() => {
    return invoices?.reduce((sum, inv) => sum + (inv.totalAmountExcludingTax || 0), 0) || 0;
  }, [invoices]);

  const calcTax = (ca: number) => Math.max(minTax, ca * ifuRate);

  const forecastTax = calcTax(forecastCA);
  const actualTax = calcTax(actualCA);
  const regularisation = Math.max(0, actualTax - forecastTax);

  if (!currentTenant) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Landmark className="h-8 w-8 text-accent" /> Impôt Forfaitaire Unique (IFU)
          </h1>
          <p className="text-muted-foreground text-sm">Gestion des déclarations G12 (Prévisionnelle) et G12 bis (Définitive).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Formulaires DGI (PDF)</Button>
          <Button className="bg-primary shadow-lg">Enregistrer la déclaration</Button>
        </div>
      </div>

      {currentTenant.regimeFiscal !== "IFU" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Attention</AlertTitle>
          <AlertDescription>
            Votre dossier est configuré en régime <strong>{currentTenant.regimeFiscal}</strong>. 
            L'IFU est réservé aux TPE et auto-entrepreneurs éligibles.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="g12" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 h-auto p-1 bg-muted/50">
          <TabsTrigger value="g12" className="py-2">G12 : Déclaration Prévisionnelle</TabsTrigger>
          <TabsTrigger value="g12bis" className="py-2">G12 bis : Déclaration Définitive</TabsTrigger>
        </TabsList>

        <TabsContent value="g12" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-t-4 border-t-primary shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Calcul de l'Impôt Prévisionnel</CardTitle>
                <CardDescription>Estimation du Chiffre d'Affaires pour l'exercice {new Date().getFullYear()}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">CA Prévisionnel (DA)</label>
                    <Input 
                      type="number" 
                      placeholder="Ex: 5 000 000" 
                      value={forecastCA || ""} 
                      onChange={(e) => setForecastCA(parseFloat(e.target.value) || 0)}
                      className="text-lg font-bold"
                    />
                  </div>
                  <div className="p-4 bg-primary/5 border rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">Taux IFU ({ifuRate * 100}%)</span>
                      <span className="font-mono">{formatAmount(forecastCA * ifuRate)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-sm font-bold">Impôt dû</span>
                      <span className="text-xl font-black text-primary">{formatAmount(forecastTax)} DA</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 italic">Minimum légal de {formatAmount(minTax)} DA appliqué.</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Modalités de Paiement (Fractionnement)
                  </h4>
                  <div className="flex items-center gap-4 mb-6">
                    <Button 
                      variant={!isFractioned ? "default" : "outline"} 
                      onClick={() => setIsFractioned(false)}
                      className="flex-1"
                    >
                      Paiement Intégral (100%)
                    </Button>
                    <Button 
                      variant={isFractioned ? "default" : "outline"} 
                      onClick={() => setIsFractioned(true)}
                      className="flex-1"
                    >
                      Paiement Fractionné
                    </Button>
                  </div>

                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Tranche</TableHead>
                        <TableHead>Échéance</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!isFractioned ? (
                        <TableRow>
                          <TableCell className="font-medium">Totalité de l'impôt</TableCell>
                          <TableCell>Avant le 30 Juin {new Date().getFullYear()}</TableCell>
                          <TableCell className="text-right font-bold">{formatAmount(forecastTax)} DA</TableCell>
                        </TableRow>
                      ) : (
                        <>
                          <TableRow>
                            <TableCell className="font-medium">1ère Tranche (50%)</TableCell>
                            <TableCell>Au dépôt (Avant le 30 Juin)</TableCell>
                            <TableCell className="text-right font-bold">{formatAmount(forecastTax * 0.5)} DA</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">2ème Tranche (25%)</TableCell>
                            <TableCell>Du 1er au 15 Septembre</TableCell>
                            <TableCell className="text-right font-bold">{formatAmount(forecastTax * 0.25)} DA</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">3ème Tranche (25%)</TableCell>
                            <TableCell>Du 1er au 15 Décembre</TableCell>
                            <TableCell className="text-right font-bold">{formatAmount(forecastTax * 0.25)} DA</TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-emerald-50 border-emerald-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" /> Rappel Règlementaire
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-emerald-700 leading-relaxed">
                  La déclaration G12 prévisionnelle doit être déposée entre le 1er Janvier et le 30 Juin. 
                  Le minimum d'imposition ({formatAmount(minTax)} DA) doit être versé en totalité dès le premier versement.
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Registre des Achats</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">Obligatoire pour l'IFU</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Doit être coté et paraphé par l'inspection des impôts.</p>
                  <Button variant="link" className="p-0 h-auto text-xs text-primary mt-2">Générer le registre PDF</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="g12bis">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-t-4 border-t-accent shadow-xl overflow-hidden">
              <CardHeader className="bg-accent/5">
                <CardTitle className="text-lg">G12 bis : Déclaration Définitive</CardTitle>
                <CardDescription>Régularisation basée sur le CA réel de l'exercice précédent.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Désignation</TableHead>
                      <TableHead className="text-right">Montant (DA)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Chiffre d'Affaires Réel (Ventes)</TableCell>
                      <TableCell className="text-right font-mono text-lg">{formatAmount(actualCA)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Impôt Définitif ({ifuRate * 100}%)</TableCell>
                      <TableCell className="text-right font-mono text-lg">{formatAmount(actualTax)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/20">
                      <TableCell>Moins : Impôt déjà versé (G12 Prévisionnelle)</TableCell>
                      <TableCell className="text-right font-mono text-destructive">-{formatAmount(forecastTax)}</TableCell>
                    </TableRow>
                  </TableBody>
                  <TableFooter className="bg-accent/10">
                    <TableRow>
                      <TableCell className="font-bold text-lg">SOLDE À PAYER (Régularisation)</TableCell>
                      <TableCell className="text-right font-black text-2xl text-primary">
                        {formatAmount(regularisation)} DA
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
                
                <div className="p-6 bg-muted/10 border-t flex items-start gap-4">
                  <Calculator className="h-6 w-6 text-primary shrink-0" />
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    Si le CA réel est supérieur au CA prévisionnel, le complément d'impôt est exigible lors du dépôt de la G12 bis (avant le 20 janvier). 
                    Si le CA réel est inférieur, aucun remboursement n'est effectué mais aucune somme supplémentaire n'est due (sous réserve du minimum légal).
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-primary text-primary-foreground shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-xs uppercase font-bold opacity-80">Statut G12 bis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${regularisation > 0 ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                    <span className="font-bold">{regularisation > 0 ? "Complément dû" : "Dossier régularisé"}</span>
                  </div>
                  <p className="text-xs opacity-70">
                    Échéance légale : 20 Janvier {new Date().getFullYear() + 1}
                  </p>
                  <Button className="w-full bg-white text-primary hover:bg-white/90">
                    <FileCheck className="mr-2 h-4 w-4" /> Préparer le versement
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-dashed border-2">
                <CardHeader>
                  <CardTitle className="text-sm">Vérification des registres</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Ventes enregistrées</span>
                    <Badge variant="secondary">{invoices?.length || 0} factures</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Conformité CA</span>
                    <Badge className="bg-emerald-500">Vérifié</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
