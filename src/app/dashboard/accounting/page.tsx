
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { SCF_ACCOUNTS, JournalEntryLine, JournalType, SCF_Account } from "@/lib/scf-accounts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Plus, Trash2, CheckCircle, Calculator, Loader2, BookOpen, Search, PlusCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useUser, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export default function AccountingJournal() {
  const db = useFirestore()
  const { user } = useUser()
  const [description, setDescription] = React.useState("")
  const [entryDate, setEntryDate] = React.useState(new Date().toISOString().split('T')[0])
  const [reference, setReference] = React.useState("")
  const [journalType, setJournalType] = React.useState<JournalType>("ACHATS")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [searchAccount, setSearchAccount] = React.useState("")

  // New account state
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false)
  const [newAccountData, setNewAccountData] = React.useState({ code: "", name: "" })

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  // Fetch custom accounts with security filter
  const customAccountsQuery = useMemoFirebase(() => {
    if (!db || !currentTenant || !user) return null;
    return query(
      collection(db, "tenants", currentTenant.id, "accounts"),
      where(`tenantMembers.${user.uid}`, "!=", null)
    );
  }, [db, currentTenant, user]);
  const { data: customAccounts } = useCollection(customAccountsQuery);

  const allAccounts = React.useMemo(() => {
    const combined = [...SCF_ACCOUNTS];
    if (customAccounts) {
      customAccounts.forEach(acc => {
        if (!combined.find(c => c.code === acc.code)) {
          combined.push({
            code: acc.code,
            name: acc.name,
            category: acc.category || "Personnalisé",
            class: acc.class,
            isRoot: false
          });
        }
      });
    }
    return combined.sort((a, b) => a.code.localeCompare(b.code));
  }, [customAccounts]);

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
      const account = allAccounts.find(a => a.code === value)
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
        debit: Number(l.debit) || 0, 
        credit: Number(l.credit) || 0 
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

  const handleCreateAccount = async () => {
    if (!db || !currentTenant || !newAccountData.code || !newAccountData.name) return;

    const rootCode = newAccountData.code.substring(0, 2);
    const rootAccount = SCF_ACCOUNTS.find(a => a.code === rootCode && a.isRoot);

    if (!rootAccount) {
      toast({
        variant: "destructive",
        title: "Racine invalide",
        description: "Le code doit commencer par une racine SCF valide (2 chiffres).",
      });
      return;
    }

    const accountRef = collection(db, "tenants", currentTenant.id, "accounts");
    const accountData = {
      code: newAccountData.code,
      name: newAccountData.name,
      rootCode,
      class: rootAccount.class,
      tenantId: currentTenant.id,
      category: rootAccount.category,
      tenantMembers: currentTenant.members // Security filter field
    };

    try {
      addDocumentNonBlocking(accountRef, accountData);
      toast({
        title: "Compte créé",
        description: `Le compte ${newAccountData.code} a été ajouté à votre PCE.`,
      });
      setIsAccountDialogOpen(false);
      setNewAccountData({ code: "", name: "" });
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAccounts = React.useMemo(() => {
    const search = searchAccount.toLowerCase();
    return allAccounts.filter(a => 
      a.code.includes(search) || 
      a.name.toLowerCase().includes(search)
    );
  }, [allAccounts, searchAccount]);

  const groupedAccounts = React.useMemo(() => {
    const groups: Record<number, typeof SCF_ACCOUNTS> = {};
    filteredAccounts.forEach(acc => {
      if (!groups[acc.class]) groups[acc.class] = [];
      groups[acc.class].push(acc);
    });
    return groups;
  }, [filteredAccounts]);

  const classesLabels: Record<number, string> = {
    1: "Classe 1 - Capitaux",
    2: "Classe 2 - Immobilisations",
    3: "Classe 3 - Stocks",
    4: "Classe 4 - Tiers",
    5: "Classe 5 - Financiers",
    6: "Classe 6 - Charges",
    7: "Classe 7 - Produits",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-accent" /> Saisie Comptable (PCE)
          </h1>
          <p className="text-muted-foreground text-sm">Établissez votre Plan de Comptes de l'Entité en subdivisant les racines du SCF.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
                <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Compte PCE
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un sous-compte personnalisé</DialogTitle>
                <DialogDescription>
                  Subdivisez une racine SCF existante pour votre Plan de Comptes de l'Entité.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="code" className="text-right">Code</Label>
                  <Input 
                    id="code" 
                    placeholder="Ex: 3001" 
                    className="col-span-3" 
                    value={newAccountData.code}
                    onChange={(e) => setNewAccountData({...newAccountData, code: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Intitulé</Label>
                  <Input 
                    id="name" 
                    placeholder="Ex: Stocks - Alimentation" 
                    className="col-span-3" 
                    value={newAccountData.name}
                    onChange={(e) => setNewAccountData({...newAccountData, name: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateAccount} className="bg-accent text-accent-foreground">Enregistrer le compte</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={addLine}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter ligne
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
          <div className="mb-4 flex items-center gap-2 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher (ex: 3001, Alimentation...)" 
              value={searchAccount}
              onChange={(e) => setSearchAccount(e.target.value)}
              className="h-8 text-xs bg-muted/20"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[300px]">Compte (Racine ou Subdivision)</TableHead>
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
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Code PCE" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(groupedAccounts).map(([cls, accounts]) => (
                          <SelectGroup key={cls}>
                            <SelectLabel className="bg-muted/50 py-1 text-[10px] font-bold">{classesLabels[Number(cls)]}</SelectLabel>
                            {accounts.map(acc => (
                              <SelectItem key={acc.code} value={acc.code}>
                                <div className="flex flex-col">
                                  <span className={`font-mono ${acc.isRoot ? 'font-black text-primary' : 'font-medium'}`}>
                                    {acc.code}
                                  </span>
                                  <span className="text-[10px] opacity-70 truncate max-w-[200px]">{acc.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="text-right font-mono h-9"
                      value={line.debit || ""}
                      onChange={(e) => updateLine(index, "debit", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="text-right font-mono h-9"
                      value={line.credit || ""}
                      onChange={(e) => updateLine(index, "credit", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 h-8 w-8"
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
              <span className="font-semibold text-xs">Statut d'équilibre :</span>
              {isBalanced ? (
                <Badge className="bg-emerald-500 h-5 text-[10px]">Équilibré</Badge>
              ) : (
                <Badge variant="destructive" className="h-5 text-[10px]">Écart: {Math.abs(totals.debit - totals.credit).toLocaleString()} DA</Badge>
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
        <div className="text-xs text-muted-foreground">
          <p className="font-bold text-primary mb-1">Guide de Personnalisation (PCE)</p>
          <p className="italic">
            Vous utilisez la nomenclature officielle pour les racines (2 chiffres). 
            Vous êtes libre de subdiviser ces comptes (4 chiffres ou plus) pour détailler vos opérations 
            par type de produit (ex: 3001, 3002) ou par client spécifique.
          </p>
        </div>
      </div>
    </div>
  )
}
