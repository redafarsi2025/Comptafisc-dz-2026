"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { SCF_ACCOUNTS, JournalEntryLine, JournalType } from "@/lib/scf-accounts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, CheckCircle, Calculator, Loader2, BookOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useUser, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { useCollection, useMemoFirebase } from "@/firebase"
import { toast } from "@/hooks/use-toast"

export default function AccountingJournal() {
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
  const [description, setDescription] = React.useState("")
  const [entryDate, setEntryDate] = React.useState(new Date().toISOString().split('T')[0])
  const [reference, setReference] = React.useState("")
  const [journalType, setJournalType] = React.useState<JournalType>("ACHATS")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  const [lines, setLines] = React.useState<JournalEntryLine[]>([
    { accountCode: "", accountName: "Sélectionnez un compte", debit: 0, credit: 0 },
    { accountCode: "", accountName: "Sélectionnez un compte", debit: 0, credit: 0 },
  ])

  const totals = React.useMemo(() => {
    return lines.reduce((acc, line) => ({
      debit: acc.debit + (Number(line.debit) || 0),
      credit: acc.credit + (Number(line.credit) || 0)
    }), { debit: 0, credit: 0 })
  }, [lines])

  const isBalanced = totals.debit === totals.credit && totals.debit > 0

  const addLine = () => {
    setLines([...lines, { accountCode: "", accountName: "Nouveau compte", debit: 0, credit: 0 }])
  }

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const updateLine = (index: number, field: keyof JournalEntryLine, value: any) => {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }
    if (field === "accountCode") {
      const account = SCF_ACCOUNTS.find(a => a.code === value)
      if (account) newLines[index].accountName = account.name
    }
    setLines(newLines)
  }

  const handleValidate = async () => {
    if (!db || !user || !currentTenant || !isBalanced) return
    
    setIsSubmitting(true)
    const journalEntriesRef = collection(db, "tenants", currentTenant.id, "journal_entries")
    
    const entryData = {
      tenantId: currentTenant.id,
      entryDate: new Date(entryDate).toISOString(),
      description,
      documentReference: reference,
      journalType,
      status: 'Validated',
      createdAt: new Date().toISOString(),
      createdByUserId: user.uid,
      tenantMembers: currentTenant.members,
      lines: lines.map(l => ({ 
        accountCode: l.accountCode, 
        accountName: l.accountName, 
        debit: l.debit, 
        credit: l.credit 
      }))
    }

    try {
      addDocumentNonBlocking(journalEntriesRef, entryData);
      toast({
        title: "Écriture enregistrée",
        description: `L'écriture a été ajoutée au journal ${journalType} avec succès.`,
      });
      setLines([
        { accountCode: "", accountName: "Sélectionnez un compte", debit: 0, credit: 0 },
        { accountCode: "", accountName: "Sélectionnez un compte", debit: 0, credit: 0 },
      ]);
      setDescription("");
      setReference("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-accent" /> Saisie Comptable (SCF)
          </h1>
          <p className="text-muted-foreground text-sm">Saisie d'écritures pour les journaux auxiliaires du dossier.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addLine}>
            <Plus className="mr-2 h-4 w-4" /> Ligne
          </Button>
          <Button 
            disabled={!isBalanced || isSubmitting || !currentTenant} 
            onClick={handleValidate}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-md"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Valider l'écriture
          </Button>
        </div>
      </div>

      <Card className="border-t-4 border-t-primary">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Journal Auxiliaire</label>
              <Select value={journalType} onValueChange={(v: JournalType) => setJournalType(v)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACHATS">Journal des Achats</SelectItem>
                  <SelectItem value="VENTES">Journal des Ventes</SelectItem>
                  <SelectItem value="BANQUE">Journal de Banque</SelectItem>
                  <SelectItem value="CAISSE">Journal de Caisse</SelectItem>
                  <SelectItem value="OD">Opérations Diverses (OD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Libellé de l'opération</label>
              <Input 
                placeholder="Ex: Facture N° 456 - Fournisseur ABC" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Date d'opération</label>
              <Input 
                type="date" 
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[180px]">Compte SCF</TableHead>
                <TableHead>Intitulé</TableHead>
                <TableHead className="w-[150px] text-right">Débit</TableHead>
                <TableHead className="w-[150px] text-right">Crédit</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, index) => (
                <TableRow key={index} className="hover:bg-muted/20">
                  <TableCell>
                    <Select
                      value={line.accountCode}
                      onValueChange={(val) => updateLine(index, "accountCode", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Code" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCF_ACCOUNTS.map(acc => (
                          <SelectItem key={acc.code} value={acc.code}>{acc.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.accountName}
                      readOnly
                      className="bg-muted/30 border-none shadow-none text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="text-right font-mono"
                      value={line.debit || ""}
                      onChange={(e) => updateLine(index, "debit", parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="text-right font-mono"
                      value={line.credit || ""}
                      onChange={(e) => updateLine(index, "credit", parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => removeLine(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t bg-muted/20 p-6">
          <div className="flex w-full justify-between items-center">
            <div className="flex items-center gap-2 text-sm">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Statut d'équilibre :</span>
              {isBalanced ? (
                <Badge className="bg-emerald-500">Document Équilibré</Badge>
              ) : (
                <Badge variant="destructive">Écart: {Math.abs(totals.debit - totals.credit).toLocaleString()} DA</Badge>
              )}
            </div>
            <div className="flex gap-12 text-lg font-bold">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Débit Total</span>
                <span className="text-primary font-mono">{totals.debit.toLocaleString()} DA</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Crédit Total</span>
                <span className="text-primary font-mono">{totals.credit.toLocaleString()} DA</span>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
      
      <div className="p-4 bg-primary/5 border rounded-lg flex items-start gap-3">
        <div className="mt-1 h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
        <p className="text-xs text-muted-foreground italic">
          Rappel SCF : Les livres comptables doivent être conservés pendant 10 ans. 
          Cette saisie alimentera automatiquement le Livre-Journal Centralisateur et le Grand Livre du dossier.
        </p>
      </div>
    </div>
  )
}
