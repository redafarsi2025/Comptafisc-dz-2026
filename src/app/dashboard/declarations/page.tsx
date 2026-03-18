"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { FileText, Calculator, Info, Landmark, Sparkles, TrendingDown } from "lucide-react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { getTAPRate, getIFURate, getIBSRate, calculateIBS, TAX_RATES } from "@/lib/calculations"
import { findActivityByNap } from "@/lib/nap-data"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function DeclarationsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [estimatedProfit, setEstimatedProfit] = React.useState<number>(0)
  const [reinvestedAmount, setReinvestedAmount] = React.useState<number>(0)
  
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  const isIFU = currentTenant?.regimeFiscal === "IFU";
  const tapRate = getTAPRate(currentTenant?.secteurActivite || "SERVICES", currentTenant?.activiteNAP);
  const ifuRate = isIFU ? getIFURate(currentTenant?.secteurActivite || "SERVICES", currentTenant?.formeJuridique || "") : 0;
  const ibsRate = !isIFU ? getIBSRate(currentTenant?.secteurActivite || "SERVICES", currentTenant?.activiteNAP) : 0;
  const activityInfo = findActivityByNap(currentTenant?.activiteNAP || "");

  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "invoices"),
      where(`tenantMembers.${user.uid}`, "!=", null)
    );
  }, [db, currentTenant, user]);
  const { data: invoices } = useCollection(invoicesQuery);

  const stats = React.useMemo(() => {
    if (!invoices) return { tva: 0, tap: 0, ca: 0, ifu: 0 };
    return invoices.reduce((acc, inv) => ({
      tva: acc.tva + (inv.totalTaxAmount || 0),
      tap: acc.tap + ((inv.totalAmountExcludingTax || 0) * tapRate),
      ca: acc.ca + (inv.totalAmountExcludingTax || 0),
      ifu: acc.ifu + ((inv.totalAmountExcludingTax || 0) * ifuRate)
    }), { tva: 0, tap: 0, ca: 0, ifu: 0 });
  }, [invoices, tapRate, ifuRate]);

  const projectedIBS = React.useMemo(() => {
    return calculateIBS(estimatedProfit, ibsRate, reinvestedAmount);
  }, [estimatedProfit, ibsRate, reinvestedAmount]);

  const taxSavings = React.useMemo(() => {
    const standardIBS = calculateIBS(estimatedProfit, ibsRate, 0);
    return Math.max(0, standardIBS - projectedIBS);
  }, [estimatedProfit, ibsRate, projectedIBS]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Déclarations Fiscales</h1>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
            <span>Dossier :</span>
            <span className="font-semibold text-foreground">{currentTenant?.raisonSociale || "..."}</span> 
            <Badge variant="secondary">{currentTenant?.regimeFiscal || "Réel"}</Badge>
            {activityInfo && <Badge variant="outline" className="text-[10px]">{activityInfo.label}</Badge>}
          </div>
        </div>
        <Button className="bg-primary hover:bg-primary/90 shadow-md">
          <Calculator className="mr-2 h-4 w-4" /> 
          {isIFU ? "Générer G12 Annuel" : "Simuler G50 Mensuel"}
        </Button>
      </div>

      <Alert className="bg-emerald-50 border-emerald-200">
        <Sparkles className="h-4 w-4 text-emerald-600" />
        <AlertTitle className="text-emerald-800 font-bold">Loi de Finances 2024</AlertTitle>
        <AlertDescription className="text-emerald-700 text-sm">
          La <strong>TAP (Taxe sur l'Activité Professionnelle)</strong> a été officiellement supprimée pour l'ensemble des contribuables. Votre taux actuel est de <strong>0 %</strong>.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {isIFU ? (
          <Card className="md:col-span-3 border-l-4 border-l-primary shadow-sm bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                Impôt Forfaitaire Unique ({(ifuRate * 100).toFixed(1)}%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {stats.ifu.toLocaleString()} <span className="text-sm font-normal">DZD</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Info className="h-3 w-3" /> Taxe globale remplaçant TVA + TAP + IRG/IBS.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-l-4 border-l-primary shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">TVA Collectée</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {currentTenant?.assujettissementTva ? stats.tva.toLocaleString() : "0"} <span className="text-sm font-normal">DZD</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500 shadow-sm opacity-60">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                  TAP (Supprimée LF 2024)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  0 <span className="text-sm font-normal">DZD</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Taux 0% appliqué systématiquement.</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-600 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Provision IBS (Simulation)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {projectedIBS.toLocaleString()} <span className="text-sm font-normal">DZD</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Min. légal de 10 000 DA inclus.</p>
              </CardContent>
            </Card>
          </>
        )}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Chiffre d'Affaires HT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.ca.toLocaleString()} <span className="text-sm font-normal">DZD</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {!isIFU && (
        <Card className="border-amber-200 bg-amber-50 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
              <Landmark className="h-5 w-5" /> Simulateur IBS & Réinvestissement (Exercice 2024/2025)
            </CardTitle>
            <CardDescription className="text-amber-700">
              Optimisez votre IBS en réinvestissant vos bénéfices. Bénéficiez du taux réduit de <strong>{(TAX_RATES.IBS_REINVESTMENT * 100).toFixed(0)}%</strong> au lieu de {(ibsRate * 100).toFixed(0)}%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-amber-900">1. Bénéfice Net Imposable (DA)</label>
                  <Input 
                    type="number" 
                    placeholder="Ex: 1 000 000" 
                    className="bg-white border-amber-300 focus-visible:ring-amber-500"
                    value={estimatedProfit || ""}
                    onChange={(e) => setEstimatedProfit(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-amber-900 flex items-center gap-2">
                    2. Part à Réinvestir (Equipements/Social) 
                    <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Eco-Taux 10%</Badge>
                  </label>
                  <Input 
                    type="number" 
                    placeholder="Montant du réinvestissement" 
                    className="bg-white border-emerald-300 focus-visible:ring-emerald-500"
                    value={reinvestedAmount || ""}
                    onChange={(e) => setReinvestedAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 bg-white border border-amber-300 rounded-lg shadow-inner">
                  <p className="text-xs uppercase text-muted-foreground font-bold mb-1">IBS Total à payer</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-amber-600">{projectedIBS.toLocaleString()}</span>
                    <span className="text-sm font-medium text-amber-600">DZD</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">Calculé au taux hybride {(estimatedProfit > 0 && reinvestedAmount > 0) ? "Cible" : "Standard"}.</p>
                </div>

                {taxSavings > 0 && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-700 uppercase flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> Économie d'impôt réalisée
                      </p>
                      <p className="text-xl font-bold text-emerald-600">-{taxSavings.toLocaleString()} DA</p>
                    </div>
                    <Badge className="bg-emerald-600 text-white animate-pulse">Gain Fiscal</Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Échéances en cours</TabsTrigger>
          <TabsTrigger value="history">Historique & Archives</TabsTrigger>
        </TabsList>
        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Documents à soumettre</CardTitle>
              <CardDescription>
                Calculs basés sur le régime {currentTenant?.regimeFiscal} et la conformité LF 2024.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isIFU ? (
                <div className="p-6 border rounded-xl border-primary/20 bg-primary/5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold">Déclaration G n° 12 (IFU Annuel)</h4>
                      <p className="text-sm text-muted-foreground">Impôt estimé : {stats.ifu.toLocaleString()} DZD • Base : {stats.ca.toLocaleString()} DZD</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Calculer acomptes</Button>
                    <Button size="sm" className="bg-primary">Générer G12</Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 border rounded-xl hover:bg-muted/30 transition-all flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold">Déclaration G n° 50 (Mensuelle)</h4>
                      <p className="text-sm text-muted-foreground">Période : {new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                      <Info className="mr-1 h-3 w-3" /> Échéance : 20 du mois prochain
                    </Badge>
                    <Button size="sm">Détail G50</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
