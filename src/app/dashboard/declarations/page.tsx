"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { FileText, Calculator, Info, Landmark, Sparkles, TrendingDown, CalendarDays, AlertCircle, Clock, ShieldCheck, FileBadge, Loader2 } from "lucide-react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { getTAPRate, getIFURate, getIBSRate, calculateIBS, TAX_RATES, calculateIFU } from "@/lib/calculations"
import { findActivityByNap } from "@/lib/nap-data"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function DeclarationsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [estimatedProfit, setEstimatedProfit] = React.useState<number>(0)
  const [reinvestedAmount, setReinvestedAmount] = React.useState<number>(0)
  
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formatAmount = (val: number) => mounted ? val.toLocaleString() : "..."

  // 1. Fetch accessible tenants
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);
  
  // 2. Resolve current tenant based on URL
  const currentTenant = React.useMemo(() => {
    if (!tenants || tenants.length === 0) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const isIFU = currentTenant?.regimeFiscal === "IFU";
  const isAuto = currentTenant?.formeJuridique === "Auto-entrepreneur";
  const ifuRate = isIFU ? getIFURate(currentTenant?.secteurActivite || "SERVICES", currentTenant?.formeJuridique || "") : 0;
  const ibsRate = !isIFU ? getIBSRate(currentTenant?.secteurActivite || "SERVICES", currentTenant?.activiteNAP) : 0;

  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "invoices"),
      where(`tenantMembers.${user.uid}`, "!=", null)
    );
  }, [db, currentTenant?.id, user]);
  const { data: invoices } = useCollection(invoicesQuery);

  const stats = React.useMemo(() => {
    if (!invoices) return { tva: 0, ca: 0, ifu: 0 };
    return invoices.reduce((acc, inv) => ({
      tva: acc.tva + (inv.totalTaxAmount || 0),
      ca: acc.ca + (inv.totalAmountExcludingTax || 0),
      ifu: acc.ifu + calculateIFU(inv.totalAmountExcludingTax || 0, ifuRate, isAuto, currentTenant?.isStartup)
    }), { tva: 0, ca: 0, ifu: 0 });
  }, [invoices, ifuRate, isAuto, currentTenant]);

  const projectedIBS = React.useMemo(() => {
    return calculateIBS(estimatedProfit, ibsRate, reinvestedAmount);
  }, [estimatedProfit, ibsRate, reinvestedAmount]);

  if (isTenantsLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Déclarations Fiscales 2026</h1>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
            <span>Dossier :</span>
            <span className="font-semibold text-foreground">{currentTenant?.raisonSociale || "Sélectionnez un dossier"}</span> 
            <Badge variant="secondary">{currentTenant?.regimeFiscal || "Réel"}</Badge>
            {currentTenant?.isStartup && <Badge className="bg-emerald-600">Startup Exonérée</Badge>}
          </div>
        </div>
        <Button className="bg-primary hover:bg-primary/90 shadow-md">
          <Calculator className="mr-2 h-4 w-4" /> 
          {isIFU ? "Simuler G12 Annuel" : "Simuler G50 Mensuel"}
        </Button>
      </div>

      {isIFU && (
        <Alert className="bg-amber-50 border-amber-200">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 font-bold">Mesure IFU 2026</AlertTitle>
          <AlertDescription className="text-amber-700 text-xs">
            Le délai pour la <strong>G12 bis (Définitive 2025)</strong> est le **1er Mars 2026**. 
            Seuil IFU : {TAX_RATES.IFU_THRESHOLD.toLocaleString()} DA ({TAX_RATES.IFU_AUTO_THRESHOLD.toLocaleString()} DA pour Auto-entrepreneurs).
          </AlertDescription>
        </Alert>
      )}

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
                {currentTenant?.isStartup ? "0 (Exonéré)" : `${formatAmount(stats.ifu)} DZD`}
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Dossier: {currentTenant?.raisonSociale}
              </p>
            </CardContent>
          </Card>
        ) : (
          <React.Fragment>
            <Card className="border-l-4 border-l-primary shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">TVA Collectée</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {currentTenant?.assujettissementTva ? formatAmount(stats.tva) : "0"} <span className="text-sm font-normal">DZD</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-600 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Provision IBS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {formatAmount(projectedIBS)} <span className="text-sm font-normal">DZD</span>
                </div>
              </CardContent>
            </Card>
          </React.Fragment>
        )}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Chiffre d'Affaires HT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatAmount(stats.ca)} <span className="text-sm font-normal">DZD</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">Calendrier 2026</TabsTrigger>
          <TabsTrigger value="ibs-sim">Simulation IBS</TabsTrigger>
          <TabsTrigger value="onboarding">Démarrage Dossier</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Obligations Déclaratives IFU / Réel</CardTitle>
              <CardDescription>Échéances clés basées sur votre profil fiscal ({currentTenant?.regimeFiscal}).</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Déclaration</TableHead>
                    <TableHead>Échéance 2026</TableHead>
                    <TableHead>Objet</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isIFU ? (
                    <React.Fragment>
                      <TableRow>
                        <TableCell className="font-bold">Série G n°12 bis</TableCell>
                        <TableCell className="text-amber-600 font-bold">01 Mars 2026</TableCell>
                        <TableCell>Définitive Exercice 2025</TableCell>
                        <TableCell className="text-right"><Button size="sm" variant="outline" asChild><Link href={`/dashboard/declarations/g12?tenantId=${currentTenant?.id}`}>Générer</Link></Button></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-bold">Série G n°12</TableCell>
                        <TableCell>30 Juin 2026</TableCell>
                        <TableCell>Prévisionnelle Exercice 2026</TableCell>
                        <TableCell className="text-right"><Button size="sm" variant="outline" asChild><Link href={`/dashboard/declarations/g12?tenantId=${currentTenant?.id}`}>Générer</Link></Button></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-bold">Série G n°50 ter</TableCell>
                        <TableCell>20 du mois/trimestre</TableCell>
                        <TableCell>IRG Salariés (Retenue à la source)</TableCell>
                        <TableCell className="text-right"><Button size="sm" variant="outline" asChild><Link href={`/dashboard/declarations/g50ter?tenantId=${currentTenant?.id}`}>Générer</Link></Button></TableCell>
                      </TableRow>
                    </React.Fragment>
                  ) : (
                    <TableRow>
                      <TableCell className="font-bold">Série G n°50</TableCell>
                      <TableCell>20 du mois suivant</TableCell>
                      <TableCell>Mensuelle (TVA, IRG, IBS)</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="outline" asChild><Link href={`/dashboard/declarations/g50?tenantId=${currentTenant?.id}`}>Générer</Link></Button></TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="font-bold">Série G n°29</TableCell>
                    <TableCell>30 Avril 2026</TableCell>
                    <TableCell>Déclaration annuelle des salaires (NIN requis)</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" asChild><Link href={`/dashboard/payroll/das?tenantId=${currentTenant?.id}`}>Générer</Link></Button></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader>
              <CardTitle>Premières étapes obligatoires</CardTitle>
              <CardDescription>Déclarations à effectuer lors de la création de l'entreprise.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Déclaration</TableHead>
                    <TableHead>Délai légal</TableHead>
                    <TableHead>Sanction retard</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-bold">Série G n°8</TableCell>
                    <TableCell>30 jours après début</TableCell>
                    <TableCell className="text-destructive font-bold">30 000 DA</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="default" asChild className="bg-accent text-accent-foreground">
                        <Link href={`/dashboard/declarations/g8?tenantId=${currentTenant?.id}`}><FileBadge className="mr-2 h-4 w-4" /> Existence</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-4">
        <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
        <div className="text-xs text-emerald-900 space-y-2">
          <p className="font-bold">Audit de Conformité DGI 2026</p>
          <p>
            Les seuils IFU ont été vérifiés : 8 millions DA pour le régime général et 5 millions DA pour les auto-entrepreneurs. 
            Toute activité excédant ces seuils sera automatiquement basculée au régime du réel l'année suivante.
          </p>
        </div>
      </div>
    </div>
  )
}
