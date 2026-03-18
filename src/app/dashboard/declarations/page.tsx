"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Download, CheckCircle, Clock, Building2, Calculator, Info, ShieldAlert, Sparkles } from "lucide-react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { getTAPRate, getIFURate } from "@/lib/calculations"
import { findActivityByNap } from "@/lib/nap-data"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function DeclarationsPage() {
  const db = useFirestore()
  const { user } = useUser()
  
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  const isIFU = currentTenant?.regimeFiscal === "IFU";
  const tapRate = getTAPRate(currentTenant?.secteurActivite || "SERVICES", currentTenant?.activiteNAP);
  const ifuRate = isIFU ? getIFURate(currentTenant?.secteurActivite || "SERVICES", currentTenant?.formeJuridique || "") : 0;
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isIFU ? (
          <Card className="md:col-span-2 border-l-4 border-l-primary shadow-sm bg-primary/5">
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
          </>
        )}
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Chiffre d'Affaires HT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats.ca.toLocaleString()} <span className="text-sm font-normal">DZD</span>
            </div>
          </CardContent>
        </Card>
      </div>

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
                      <Building2 className="h-6 w-6 text-primary" />
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
                      <Clock className="mr-1 h-3 w-3" /> Échéance : 20 du mois prochain
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
