"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { SCF_ACCOUNTS, JournalEntryLine } from "@/lib/scf-accounts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, CheckCircle, Calculator } from "lucide-react"

export default function AccountingJournal() {
  const [lines, setLines] = React.useState<JournalEntryLine[]>([
    { accountCode: "607", accountName: "Achats de marchandises", debit: 0, credit: 0 },
    { accountCode: "4456", accountName: "TVA déductible", debit: 0, credit: 0 },
    { accountCode: "401", accountName: "Fournisseurs", debit: 0, credit: 0 },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Journal des Achats</h1>
          <p className="text-muted-foreground">Saisie d'écritures conformes au SCF Algérien.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addLine}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter ligne
          </Button>
          <Button disabled={!isBalanced} className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle className="mr-2 h-4 w-4" /> Valider l'écriture
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">Libellé de l'opération</label>
              <Input placeholder="Ex: Achat marchandises Facture N° 123/24" />
            </div>
            <div className="w-48 space-y-1">
              <label className="text-sm font-medium">Date</label>
              <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="w-48 space-y-1">
              <label className="text-sm font-medium">Référence</label>
              <Input placeholder="N° Pièce" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Compte SCF</TableHead>
                <TableHead>Intitulé du compte</TableHead>
                <TableHead className="w-[150px] text-right">Débit</TableHead>
                <TableHead className="w-[150px] text-right">Crédit</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select
                      value={line.accountCode}
                      onValueChange={(val) => updateLine(index, "accountCode", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Compte" />
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
                      className="bg-muted/30"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="text-right"
                      value={line.debit}
                      onChange={(e) => updateLine(index, "debit", parseFloat(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="text-right"
                      value={line.credit}
                      onChange={(e) => updateLine(index, "credit", parseFloat(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
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
              <span className="font-semibold">Vérification des soldes :</span>
              {isBalanced ? (
                <Badge className="bg-emerald-500">Equilibré</Badge>
              ) : (
                <Badge variant="destructive">Déséquilibré (Diff: {Math.abs(totals.debit - totals.credit).toFixed(2)})</Badge>
              )}
            </div>
            <div className="flex gap-12 text-lg font-bold">
              <div className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground uppercase">Total Débit</span>
                <span className="text-primary">{totals.debit.toLocaleString()} DZD</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-muted-foreground uppercase">Total Crédit</span>
                <span className="text-primary">{totals.credit.toLocaleString()} DZD</span>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}