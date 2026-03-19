"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, ShieldCheck, Info, Loader2, Calendar, FileSpreadsheet } from "lucide-react"
import { PAYROLL_CONSTANTS } from "@/lib/calculations"

export default function DacPage() {
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
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "employees");
  }, [db, currentTenant]);
  const { data: employees, isLoading } = useCollection(employeesQuery);

  const dacData = React.useMemo(() => {
    if (!employees) return { assiette: 0, partOuvriere: 0, partPatronale: 0, total: 0 };
    const assiette = employees.reduce((sum, emp) => sum + (Number(emp.baseSalary) || 0) + (Number(emp.primesImposables) || 0), 0);
    const partOuvriere = assiette * PAYROLL_CONSTANTS.CNAS_EMPLOYEE;
    const partPatronale = assiette * PAYROLL_CONSTANTS.CNAS_EMPLOYER;
    return {
      assiette,
      partOuvriere,
      partPatronale,
      total: partOuvriere + partPatronale
    };
  }, [employees]);

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <FileText className="h-8 w-8 text-accent" /> Bordereau DAC (CNAS)
          </h1>
          <p className="text-muted-foreground text-sm">Déclaration d'Assiette de Cotisation mensuelle ou trimestrielle.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Calendar className="mr-2 h-4 w-4" /> Période en cours</Button>
          <Button className="bg-primary shadow-lg"><Download className="mr-2 h-4 w-4" /> Télécharger DAC (PDF)</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase opacity-80">Total à Reverser (35%)</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-3xl font-bold">{formatAmount(dacData.total)} DA</h2>
            <p className="text-xs mt-2 opacity-70">Calculé sur une assiette de {formatAmount(dacData.assiette)} DA.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Part Ouvrière (9%)</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl font-bold text-blue-600">{formatAmount(dacData.partOuvriere)} DA</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Part Patronale (26%)</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl font-bold text-emerald-600">{formatAmount(dacData.partPatronale)} DA</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="border-t-4 border-t-primary shadow-lg overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg">Détail des Cotisations</CardTitle>
          <CardDescription>Consolidation des assiettes CNAS pour le mois de {mounted ? new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' }) : "..."}.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Désignation</TableHead>
                <TableHead className="text-right">Assiette (DA)</TableHead>
                <TableHead className="text-center">Taux</TableHead>
                <TableHead className="text-right font-bold">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Assurances Sociales / Retraite (Part Ouvrière)</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatAmount(dacData.assiette)}</TableCell>
                <TableCell className="text-center text-xs">9%</TableCell>
                <TableCell className="text-right font-mono text-xs text-primary">{formatAmount(dacData.partOuvriere)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Cotisations Employeur (Globales)</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatAmount(dacData.assiette)}</TableCell>
                <TableCell className="text-center text-xs">26%</TableCell>
                <TableCell className="text-right font-mono text-xs text-primary">{formatAmount(dacData.partPatronale)}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter className="bg-primary/5">
              <TableRow className="font-bold">
                <TableCell colSpan={3}>MONTANT TOTAL À PAYER</TableCell>
                <TableCell className="text-right font-mono text-lg text-primary">{formatAmount(dacData.total)} DA</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-4">
        <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
        <div className="text-xs text-emerald-900 space-y-2">
          <p className="font-bold">Vérification de Conformité Damancom</p>
          <p>
            Ce bordereau est généré à partir de votre livre de paie. L'assiette déclarée ici correspond exclusivement 
            au Salaire de Poste (Brut - Indemnités de frais). Les indemnités de panier et de transport sont exclues de l'assiette CNAS conformément à la réglementation.
          </p>
        </div>
      </div>
    </div>
  )
}