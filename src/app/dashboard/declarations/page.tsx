
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Download, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"

export default function DeclarationsPage() {
  const db = useFirestore()
  const { user } = useUser()
  
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  // Fetch invoices for calculation (G50 preparation)
  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "invoices");
  }, [db, currentTenant]);
  const { data: invoices } = useCollection(invoicesQuery);

  const stats = React.useMemo(() => {
    if (!invoices) return { tva: 0, tap: 0, ca: 0 };
    return invoices.reduce((acc, inv) => ({
      tva: acc.tva + inv.totalTaxAmount,
      tap: acc.tap + (inv.totalAmountExcludingTax * 0.015),
      ca: acc.ca + inv.totalAmountExcludingTax
    }), { tva: 0, tap: 0, ca: 0 });
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Déclarations Fiscales</h1>
          <p className="text-muted-foreground">Génération automatique des formulaires G50, G12 et G11.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <FileText className="mr-2 h-4 w-4" /> Préparer G50 Juillet 2024
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">TVA Collectée (Période)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.tva.toLocaleString()} DZD</div>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">TAP à Payer (1.5%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.tap.toLocaleString()} DZD</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Chiffre d'Affaires HT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.ca.toLocaleString()} DZD</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Déclarations en cours</TabsTrigger>
          <TabsTrigger value="history">Historique & Archivage</TabsTrigger>
        </TabsList>
        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Formulaires à soumettre</CardTitle>
              <CardDescription>Échéances fiscales pour le dossier {currentTenant?.name || '...'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Série G n° 50 - Mensuelle</p>
                    <p className="text-xs text-muted-foreground">Période : Juin 2024 • À payer : {(stats.tva + stats.tap).toLocaleString()} DZD</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                    <Clock className="mr-1 h-3 w-3" /> Échéance : 20/07/2024
                  </Badge>
                  <Button size="sm">Télécharger PDF</Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors opacity-60">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-accent/10 rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">CNAS - DAC (Déclaration d'Assiette)</p>
                    <p className="text-xs text-muted-foreground">Période : 2ème Trimestre 2024</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                  <CheckCircle className="mr-1 h-3 w-3" /> Déjà soumise le 12/07
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center h-48 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p>Aucun archivage SHA-256 trouvé pour les périodes précédentes.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
