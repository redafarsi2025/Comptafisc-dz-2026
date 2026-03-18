"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Landmark, Download, FileCheck, Info, Loader2, Calculator } from "lucide-react"
import { getIFURate } from "@/lib/calculations"

export default function G12Declaration() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formatAmount = (val: number) => mounted ? val.toLocaleString() : "..."

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "invoices"),
      where(`tenantMembers.${user.uid}`, "!=", null)
    );
  }, [db, currentTenant, user]);
  const { data: invoices } = useCollection(invoicesQuery);

  const ifuRate = getIFURate(currentTenant?.secteurActivite || "SERVICES", currentTenant?.formeJuridique || "");
  
  const stats = React.useMemo(() => {
    const ca = invoices?.reduce((sum, inv) => sum + (inv.totalAmountExcludingTax || 0), 0) || 0;
    return { ca, ifu: ca * ifuRate };
  }, [invoices, ifuRate]);

  if (!currentTenant) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Landmark className="h-8 w-8 text-accent" /> Déclaration G n° 12 (IFU)
          </h1>
          <p className="text-muted-foreground text-sm">Déclaration annuelle de l'Impôt Forfaitaire Unique.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
          <Button className="bg-primary">Valider la déclaration</Button>
        </div>
      </div>

      {currentTenant.regimeFiscal !== "IFU" && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6 flex items-center gap-3">
            <Info className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              Note : Votre dossier est paramétré en régime <strong>{currentTenant.regimeFiscal}</strong>. 
              Cette déclaration G12 n'est applicable qu'au régime de l'IFU.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="text-lg">Calcul de l'Impôt Forfaitaire</CardTitle>
            <CardDescription>Base imposable sur le Chiffre d'Affaires réalisé.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted/20 rounded-lg">
              <span className="text-sm">Chiffre d'Affaires Global (HT)</span>
              <span className="font-bold">{formatAmount(stats.ca)} DA</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted/20 rounded-lg">
              <span className="text-sm">Taux IFU Applicable ({ifuRate * 100}%)</span>
              <span className="font-bold text-primary">{formatAmount(stats.ifu)} DA</span>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold uppercase">Net à payer (Annuel)</span>
                <Badge className="bg-primary text-lg px-4 py-1">{formatAmount(stats.ifu)} DA</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-t-4 border-t-accent">
          <CardHeader>
            <CardTitle className="text-lg">Modalités de Paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">1</div>
              <p>Paiement du minimum légal (10 000 DA) lors du dépôt de la G12 prévisionnelle (avant le 30 juin).</p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">2</div>
              <p>Liquidation du solde lors du dépôt de la déclaration définitive (avant le 20 janvier N+1).</p>
            </div>
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">3</div>
              <p>Possibilité de paiement fractionné (50%, 25%, 25%) sur demande à la recette des impôts.</p>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 p-4">
            <p className="text-[10px] italic">Conformément à l'Article 282 bis du CIDTA.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}