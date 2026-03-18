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
import { Landmark, Download, FileCheck, Info, Calendar, Calculator, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { getIFURate, getIFUMinimum, TAX_RATES } from "@/lib/calculations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function G12Declaration() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)
  const [forecastCA, setForecastCA] = React.useState<number>(0)
  const [isFractioned, setIsFractioned] = React.useState(true)

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
            <Landmark className="h-8 w-8 text-accent" /> IFU : G12 & G12 bis
          </h1>
          <p className="text-muted-foreground text-sm">Gestion conforme Loi de Finances 2026 et directives DGI (Prorogations inclues).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Formulaires DGI (PDF)</Button>
          <Button className="bg-primary shadow-lg">Enregistrer la déclaration</Button>
        </div>
      </div>

      <Alert className="bg-amber-50 border-amber-200">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 font-bold">Mesure Exceptionnelle 2026</AlertTitle>
        <AlertDescription className="text-amber-700 text-xs">
          Le délai de dépôt de la <strong>G12 bis (Définitive 2025)</strong> a été prorogé au <strong>1er Mars 2026</strong>. 
          Aucune pénalité ne sera appliquée pour les dépôts effectués avant cette date.
        </AlertDescription>
      </Alert>

      {currentTenant.regimeFiscal !== "IFU" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Attention</AlertTitle>
          <AlertDescription>
            Votre dossier est configuré en régime <strong>{currentTenant.regimeFiscal}</strong>. 
            L'IFU est réservé aux CA &le; {TAX_RATES.IFU_THRESHOLD.toLocaleString()} DA.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="g12" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 h-auto p-1 bg-muted/50">
          <TabsTrigger value="g12" className="py-2">G12 : Prévisionnelle 2026</TabsTrigger>
          <TabsTrigger value="g12bis" className="py-2">G12 bis : Définitive 2025</TabsTrigger>
        </TabsList>

        <TabsContent value="g12" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-t-4 border-t-primary shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Calcul de l'Impôt Prévisionnel 2026</CardTitle>
                <CardDescription>Estimation basée sur vos prévisions d'activité.</CardDescription>
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
                    <p className="text-[10px] text-muted-foreground mt-2 italic">Minimum légal : {formatAmount(minTax)} DA.</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Fractionnement 2026 (Règle 50/25/25)
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
                      Fractionné (3 Tranches)
                    </Button>
                  </div>

                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Tranche</TableHead>
                        <TableHead>Échéance 2026</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!isFractioned ? (
                        <TableRow>
                          <TableCell className="font-medium">Totalité de l'impôt</TableCell>
                          <TableCell>Avant le 30 Juin 2026</TableCell>
                          <TableCell className="text-right font-bold">{formatAmount(forecastTax)} DA</TableCell>
                        </TableRow>
                      ) : (
                        <>
                          <TableRow>
                            <TableCell className="font-medium">1ère Tranche (50%)</TableCell>
                            <TableCell>Au dépôt (Avant 30 Juin)</TableCell>
                            <TableCell className="text-right font-bold">{formatAmount(forecastTax * 0.5)} DA</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">2ème Tranche (25%)</TableCell>
                            <TableCell>1er - 15 Septembre</TableCell>
                            <TableCell className="text-right font-bold">{formatAmount(forecastTax * 0.25)} DA</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">3ème Tranche (25%)</TableCell>
                            <TableCell>1er - 15 Décembre</TableCell>
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
                    <CheckCircle2 className="h-4 w-4" /> Rappel IFU 2026
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-emerald-700 leading-relaxed space-y-2">
                  <p>La G12 doit être souscrite au plus tard le 30 Juin.</p>
                  <p>Le versement spontané du minimum ({formatAmount(minTax)} DA) est obligatoire dès le premier paiement.</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Registre Global</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">Zéro Papier 2026</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Utilisez le portail Jibayatic pour vos télé-déclarations dès rétablissement.</p>
                  <Button variant="link" className="p-0 h-auto text-xs text-primary mt-2">Générer registre PDF</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="g12bis">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-t-4 border-t-accent shadow-xl overflow-hidden">
              <CardHeader className="bg-accent/5">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">G12 bis : Régularisation Exercice 2025</CardTitle>
                    <CardDescription>Calcul du solde basé sur le CA Réel 2025.</CardDescription>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">Délai : 01/03/2026</Badge>
                </div>
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
                      <TableCell className="font-medium">Chiffre d'Affaires Réel (Ventes 2025)</TableCell>
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
                    Si le CA réel est supérieur au CA prévisionnel, le complément d'impôt est exigible lors du dépôt de la G12 bis. 
                    En cas de CA réel inférieur, le minimum légal de {formatAmount(minTax)} DA reste acquis à l'administration.
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-primary text-primary-foreground shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-xs uppercase font-bold opacity-80">Statut G12 bis 2025</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${regularisation > 0 ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                    <span className="font-bold">{regularisation > 0 ? "Régularisation Requise" : "En Règle"}</span>
                  </div>
                  <p className="text-xs opacity-70">
                    Échéance exceptionnelle : <strong>1er Mars 2026</strong>
                  </p>
                  <Button className="w-full bg-white text-primary hover:bg-white/90">
                    <FileCheck className="mr-2 h-4 w-4" /> Préparer le Versement
                  </Button>
                </CardContent>
              </Card>

              <div className="p-4 bg-blue-50 border rounded-lg flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-[10px] text-blue-800 italic">Auto-entrepreneur ? Minimum 10 000 DA applicable.</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
