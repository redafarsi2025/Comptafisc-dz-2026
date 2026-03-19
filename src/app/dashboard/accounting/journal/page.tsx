"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { BookText, Printer, FileDown, Search, Filter, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { JournalEntry, JournalEntryLine } from "@/lib/scf-accounts"

export default function LivreJournal() {
  const db = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  const entriesQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "journal_entries"),
      where(`tenantMembers.${user.uid}`, "!=", null), // Security filter for listing
      orderBy("entryDate", "desc"),
      limit(100)
    );
  }, [db, currentTenant, user]);
  const { data: entries, isLoading } = useCollection<JournalEntry>(entriesQuery);

  const formatAmount = (val: number) => mounted ? val.toLocaleString() : "..."

  const totalDebit = entries?.reduce((sum, e) => sum + e.lines.reduce((lsum, l) => lsum + (l.debit || 0), 0), 0) || 0
  const totalCredit = entries?.reduce((sum, e) => sum + e.lines.reduce((lsum, l) => lsum + (l.credit || 0), 0), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <BookText className="h-8 w-8 text-accent" /> Livre-Journal
          </h1>
          <p className="text-muted-foreground text-sm">Enregistrement chronologique de toutes les opérations comptables (SCF Art. 12).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" /> Imprimer
          </Button>
          <Button variant="outline" size="sm">
            <FileDown className="mr-2 h-4 w-4" /> Exporter (Excel)
          </Button>
        </div>
      </div>

      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Journal Général Centralisateur</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." className="pl-9 h-9 w-64 bg-white" />
              </div>
              <Button variant="ghost" size="icon"><Filter className="h-4 w-4" /></Button>
            </div>
          </div>
          <CardDescription>
            Toutes les écritures validées du dossier {currentTenant?.raisonSociale}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[100px]">Journal</TableHead>
                <TableHead className="w-[120px]">Compte</TableHead>
                <TableHead>Libellé / Intitulé</TableHead>
                <TableHead className="w-[150px] text-right">Débit</TableHead>
                <TableHead className="w-[150px] text-right">Crédit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground"><Loader2 className="animate-spin inline mr-2 h-4 w-4" />Chargement des écritures...</TableCell></TableRow>
              ) : !entries?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Aucune écriture enregistrée.</TableCell></TableRow>
              ) : (
                entries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <TableRow className="bg-primary/5 hover:bg-primary/5">
                      <TableCell className="font-bold text-[10px] text-primary" colSpan={6}>
                        PIÈCE: {entry.documentReference || 'N/A'} — {entry.description}
                      </TableCell>
                    </TableRow>
                    {entry.lines.map((line: JournalEntryLine, lidx: number) => (
                      <TableRow key={`${entry.id}-${lidx}`} className="hover:bg-muted/10 border-none">
                        <TableCell className="text-xs">{lidx === 0 ? new Date(entry.entryDate).toLocaleDateString() : ""}</TableCell>
                        <TableCell>
                          {lidx === 0 && (
                            <Badge variant="outline" className="text-[9px] uppercase font-bold">
                              {entry.journalType}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{line.accountCode}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{line.accountName}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{line.debit > 0 ? formatAmount(line.debit) : "-"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{line.credit > 0 ? formatAmount(line.credit) : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h4 className="text-xs font-bold uppercase text-blue-800 mb-1">Total Débits Période</h4>
            <p className="text-2xl font-bold text-blue-900">
              {formatAmount(totalDebit)} DA
            </p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-6">
            <h4 className="text-xs font-bold uppercase text-emerald-800 mb-1">Total Crédits Période</h4>
            <p className="text-2xl font-bold text-emerald-900">
              {formatAmount(totalCredit)} DA
            </p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <h4 className="text-xs font-bold uppercase text-amber-800 mb-1">Vérification Balance</h4>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${Math.abs(totalDebit - totalCredit) < 0.01 ? 'bg-emerald-500' : 'bg-destructive'}`} />
              <p className="text-sm font-bold text-amber-900 italic">
                {Math.abs(totalDebit - totalCredit) < 0.01 ? 'Journal Centralisateur Équilibré' : 'DÉSÉQUILIBRE DÉTECTÉ'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}