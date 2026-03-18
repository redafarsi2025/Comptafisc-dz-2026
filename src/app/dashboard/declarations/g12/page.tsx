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
import { getIFURate, TAX_RATES, calculateIFU } from "@/lib/calculations"
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

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(collection(db, "tenants", currentTenant.id, "invoices"), where(`tenantMembers.${user.uid}`, "!=", null));
  }, [db, currentTenant, user]);
  const { data: invoices } = useCollection(invoicesQuery);

  const ifuRate = getIFURate(currentTenant?.secteurActivite || "SERVICES", currentTenant?.formeJuridique || "");
  const isAuto = currentTenant?.formeJuridique === "Auto-entrepreneur";
  const minTax = isAuto ? TAX_RATES.IFU_MIN_AUTO : TAX_RATES.IFU_MIN_STANDARD;
  
  const actualCA = React.useMemo(() => {
    return invoices?.reduce((sum, inv) => sum + (inv.totalAmountExcludingTax || 0), 0) || 0;
  }, [invoices]);

  const forecastTax = calculateIFU(forecastCA, ifuRate, isAuto);
  const actualTax = calculateIFU(actualCA, ifuRate, isAuto);
  const regularisation = Math.max(0, actualTax - forecastTax);

  if (!currentTenant) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Landmark className="h-8 w-8 text-accent" /> IFU : G12 & G12 bis
          </h1>
          <p className="text-muted-foreground text-sm">Conformité Loi de Finances 2026 - Mesures exceptionnelles DGI.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Formulaires DGI</Button>
          <Button className="bg-primary shadow-lg">Soumettre au Cabinet</Button>
        </div>
      </div>

      <Alert className="bg-amber-50 border-amber-200">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 font-bold">Prorogation Exceptionnelle 2026</AlertTitle>
        <AlertDescription className="text-amber-700 text-xs">
          Le délai de dépôt de la <strong>G12 bis (Définitive 2025)</strong> est prorogé au <strong>1er Mars 2026</strong> en raison de la mise à jour du portail Jibayatic.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="g12" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="g12">G12 : Prévisionnelle 2026</TabsTrigger>
          <TabsTrigger value="g12bis">G12 bis : Définitive 2025</TabsTrigger>
        </TabsList>

        <TabsContent value="g12" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-t-4 border-t-primary shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Simulation Prévisionnelle 2026</CardTitle>
                <CardDescription>Basé sur le seuil de {isAuto ? '5M' : '8M'} DA.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Chiffre d'Affaires Estimé (DA)</Label>
                    <Input type="number" value={forecastCA || ""} onChange={(e) => setForecastCA(parseFloat(e.target.value) || 0)} className="text-lg font-bold" />
                  </div>
                  <div className="p-4 bg-primary/5 border rounded-lg">
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-sm font-bold">Impôt Spontané</span>
                      <span className="text-xl font-black text-primary">{formatAmount(forecastTax)} DA</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 italic">Taux appliqué : {ifuRate * 100}% | Min : {formatAmount(minTax)} DA.</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Mode de Paiement (Fractionnement 2026)
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 border rounded bg-muted/20">
                      <p className="text-[10px] font-bold text-muted-foreground">AU DÉPÔT (50%)</p>
                      <p className="text-sm font-black">{formatAmount(forecastTax * 0.5)} DA</p>
                    </div>
                    <div className="p-3 border rounded">
                      <p className="text-[10px] font-bold text-muted-foreground">SEPTEMBRE (25%)</p>
                      <p className="text-sm font-black">{formatAmount(forecastTax * 0.25)} DA</p>
                    </div>
                    <div className="p-3 border rounded">
                      <p className="text-[10px] font-bold text-muted-foreground">DÉCEMBRE (25%)</p>
                      <p className="text-sm font-black">{formatAmount(forecastTax * 0.25)} DA</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="space-y-4">
              <Card className="bg-emerald-50 border-emerald-200">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-emerald-800 uppercase">Points de vigilance</CardTitle></CardHeader>
                <CardContent className="text-[10px] text-emerald-700 leading-relaxed">
                  Le paiement du minimum d'imposition ({formatAmount(minTax)} DA) est obligatoire dès le dépôt de la G12 prévisionnelle. Le fractionnement n'est pas autorisé pour les dépôts hors délais.
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="g12bis">
          <Card className="border-t-4 border-t-accent shadow-xl">
            <CardHeader className="bg-accent/5">
              <CardTitle className="text-lg">G12 bis : Régularisation Exercice 2025</CardTitle>
              <CardDescription>Comparaison entre le CA Prévisionnel et le CA Réel réalisé.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow><TableHead>Libellé</TableHead><TableHead className="text-right">Montant (DA)</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Chiffre d'Affaires Réel (Extraction Invoices)</TableCell>
                    <TableCell className="text-right font-mono text-lg">{formatAmount(actualCA)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Impôt Définitif dû ({ifuRate * 100}%)</TableCell>
                    <TableCell className="text-right font-mono text-lg">{formatAmount(actualTax)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/20 text-destructive">
                    <TableCell>Impôt déjà versé (Acomptes G12)</TableCell>
                    <TableCell className="text-right font-mono">-{formatAmount(forecastTax)}</TableCell>
                  </TableRow>
                </TableBody>
                <TableFooter className="bg-accent/10">
                  <TableRow>
                    <TableCell className="font-bold text-lg">SOLDE DE RÉGULARISATION</TableCell>
                    <TableCell className="text-right font-black text-2xl text-primary">{formatAmount(regularisation)} DA</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return <label className={`text-sm font-medium ${className}`}>{children}</label>;
}
