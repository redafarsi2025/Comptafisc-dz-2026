
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Download, CheckCircle, Clock, AlertTriangle, Building2, Calculator } from "lucide-react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { getTAPRate } from "@/lib/calculations"

export default function DeclarationsPage() {
  const db = useFirestore()
  const { user } = useUser()
  
  // Fetch active tenant
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  const isIFU = currentTenant?.regimeFiscal === "IFU";
  const tapRate = getTAPRate(currentTenant?.secteurActivite || "SERVICES");

  // Fetch real invoices for calculation with security filter
  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "invoices"),
      where(`tenantMembers.${user.uid}`, "!=", null)
    );
  }, [db, currentTenant, user]);
  const { data: invoices } = useCollection(invoicesQuery);

  const stats = React.useMemo(() => {
    if (!invoices) return { tva: 0, tap: 0, ca: 0 };
    return invoices.reduce((acc, inv) => ({
      tva: acc.tva + (inv.totalTaxAmount || 0),
      tap: acc.tap + ((inv.totalAmountExcludingTax || 0) * tapRate),
      ca: acc.ca + (inv.totalAmountExcludingTax || 0)
    }), { tva: 0, tap: 0, ca: 0 });
  }, [invoices, tapRate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Déclarations Fiscales</h1>
          <div className="text-muted-foreground flex items-center gap-2 mt-1">
            <span>Dossier :</span>
            <span className="font-semibold text-foreground">{currentTenant?.raisonSociale || "..."}</span> 
            <Badge variant="secondary">{currentTenant?.regimeFiscal || "Réel"}</Badge>
            {currentTenant?.assujettissementTva && <Badge className="bg-emerald-100 text-emerald-700">Assujetti TVA</Badge>}
          </div>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Calculator className="mr-2 h-4 w-4" /> 
          {isIFU ? "Générer G12 Annuel" : "Simuler G50 du mois"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        <Card className="border-l-4 border-l-accent shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">TAP à Payer ({(tapRate * 100).toFixed(1)}%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {stats.tap.toLocaleString()} <span className="text-sm font-normal">DZD</span>
            </div>
          </CardContent>
        </Card>
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
                Calculs basés sur le régime {currentTenant?.regimeFiscal} et le secteur {currentTenant?.secteurActivite}.
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
                      <h4 className="font-bold">Déclaration G n° 12 (IFU)</h4>
                      <p className="text-sm text-muted-foreground">Impôt Forfaitaire Unique Annuel • Base taxable : {stats.ca.toLocaleString()} DZD</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Calculer acomptes</Button>
                    <Button size="sm">Télécharger G12</Button>
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
                      <p className="text-sm text-muted-foreground">Période : {new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })} • TAP + TVA estimées.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                      <Clock className="mr-1 h-3 w-3" /> Échéance : 20 du mois prochain
                    </Badge>
                    <Button size="sm" variant="secondary">Détail G50</Button>
                  </div>
                </div>
              )}
              
              <div className="p-6 border rounded-xl opacity-60 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold">Déclaration Sociale (CNAS)</h4>
                    <p className="text-sm text-muted-foreground">Période : {currentTenant?.periodiciteDeclaration === 'TRIMESTRIEL' ? 'Trimestre en cours' : 'Mois en cours'}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500">Conforme</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardContent className="py-20 flex flex-col items-center justify-center text-muted-foreground">
              <Download className="h-10 w-10 mb-4 opacity-20" />
              <p className="text-lg font-medium">Aucune archive scellée pour le moment.</p>
              <p className="text-sm">Vos déclarations validées apparaîtront ici avec signature SHA-256.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
