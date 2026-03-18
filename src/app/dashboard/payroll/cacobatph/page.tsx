"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { HardHat, Download, ShieldCheck, Info, Loader2, AlertCircle, Smartphone } from "lucide-react"
import { PAYROLL_CONSTANTS } from "@/lib/calculations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function CacobatphPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)

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

  const employeesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "employees"),
      where(`tenantMembers.${user.uid}`, "!=", null)
    );
  }, [db, currentTenant, user]);
  const { data: employees, isLoading } = useCollection(employeesQuery);

  const isBTP = currentTenant?.secteurActivite === "BTP";

  const stats = React.useMemo(() => {
    if (!employees) return { assiette: 0, cp: 0, ci: 0, total: 0 };
    const assiette = employees.reduce((sum, emp) => sum + (Number(emp.baseSalary) || 0) + (Number(emp.primesImposables) || 0), 0);
    const cp = assiette * PAYROLL_CONSTANTS.CACOBATPH_CP;
    const ciPatronale = assiette * PAYROLL_CONSTANTS.CACOBATPH_CI_EMPLOYER;
    return {
      assiette,
      cp,
      ci: ciPatronale,
      total: cp + ciPatronale
    };
  }, [employees]);

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <HardHat className="h-8 w-8 text-accent" /> CACOBATPH (BTP) 2026
          </h1>
          <p className="text-muted-foreground text-sm">Gestion des cotisations CP & CI - Transition Zéro Papier Tasrihatcom.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!isBTP}><Download className="mr-2 h-4 w-4" /> Bordereau CI</Button>
          <Button className="bg-primary shadow-lg" disabled={!isBTP}><Download className="mr-2 h-4 w-4" /> Bordereau CP</Button>
        </div>
      </div>

      <Alert className="bg-emerald-50 border-emerald-200">
        <Smartphone className="h-4 w-4 text-emerald-600" />
        <AlertTitle className="text-emerald-800 font-bold">Innovation Tasrihatcom</AlertTitle>
        <AlertDescription className="text-xs">
          Le portail CACOBATPH est désormais totalement optimisé pour mobile. Soumettez vos DAC et déclarations d'intempéries directement via votre smartphone en quelques clics.
        </AlertDescription>
      </Alert>

      {!isBTP && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Module Inactif</AlertTitle>
          <AlertDescription>
            Les cotisations CACOBATPH sont exclusivement réservées au secteur <strong>BTP (Construction)</strong>. Votre dossier est configuré en : {currentTenant?.secteurActivite}.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase opacity-80">Congés Payés (12.21%)</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-3xl font-bold">{formatAmount(stats.cp)} DA</h2>
            <p className="text-xs mt-2 opacity-70">Part Patronale (Annuelle).</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Chômage-Intempéries (0.75%)</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl font-bold text-amber-600">{formatAmount(stats.ci)} DA</h2>
            <p className="text-xs text-muted-foreground mt-1 italic">Partagé 50/50 (0.375% x 2).</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">À Verser ce mois</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl font-bold text-emerald-600">{formatAmount(stats.total)} DA</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="border-t-4 border-t-primary shadow-lg overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg">Déclinaison des Rubriques BTP</CardTitle>
          <CardDescription>Assiette de calcul basée sur le Salaire de Poste (Vérifié 2026).</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Libellé de la Cotisation</TableHead>
                <TableHead className="text-right">Assiette (Poste)</TableHead>
                <TableHead className="text-center">Taux</TableHead>
                <TableHead className="text-right font-bold">Montant dû</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Cotisation Congés Payés (CP)</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatAmount(stats.assiette)}</TableCell>
                <TableCell className="text-center text-xs">12.21%</TableCell>
                <TableCell className="text-right font-mono text-xs text-primary">{formatAmount(stats.cp)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Cotisation Chômage-Intempéries (CI)</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatAmount(stats.assiette)}</TableCell>
                <TableCell className="text-center text-xs">0.75%</TableCell>
                <TableCell className="text-right font-mono text-xs text-primary">{formatAmount(stats.ci)}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter className="bg-primary/5">
              <TableRow className="font-bold">
                <TableCell colSpan={3}>TOTAL À VERSER À LA CACOBATPH</TableCell>
                <TableCell className="text-right font-mono text-lg text-primary">{formatAmount(stats.total)} DA</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 border rounded-xl bg-blue-50 border-blue-200 flex items-start gap-4">
        <Info className="h-6 w-6 text-blue-600 shrink-0" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold mb-1 underline">Rappel Réglementaire CACOBATPH :</p>
          <p>
            Le versement des DAC doit s'effectuer au plus tard le 20 du mois suivant. N'oubliez pas que la DAS 2025 (Annuelle) 
            devait être soumise avant le 31 janvier 2026 via la nouvelle version allégée de l'application Tasrihatcom.
          </p>
        </div>
      </div>
    </div>
  )
}
