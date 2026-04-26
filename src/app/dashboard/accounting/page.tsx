
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { SCF_ACCOUNTS, JournalEntryLine, JournalType, ACCOUNTING_TEMPLATES, JournalEntry } from "@/lib/scf-accounts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { 
  Plus, Trash2, CheckCircle, Calculator, Loader2, BookOpen, 
  Search, PlusCircle, Zap, ShieldAlert, Sparkles, FileDown 
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useUser, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit, getDocs } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useSearchParams } from "next/navigation"

export default function AccountingJournal() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [description, setDescription] = React.useState("")
  const [entryDate, setEntryDate] = React.useState("")
  const [reference, setReference] = React.useState("")
  const [journalType, setJournalType] = React.useState<JournalType>("ACHATS")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [searchAccount, setSearchAccount] = React.useState("")
  const [duplicateWarning, setDuplicateWarning] = React.useState<string | null>(null)

  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false)
  const [newAccountData, setNewAccountData] = React.useState({ code: "", name: "" })

  React.useEffect(() => {
    setMounted(true)
    setEntryDate(new Date().toISOString().split('T')[0])
  }, [])

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user?.uid]);
  const { data: tenants } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const currentTenantId = currentTenant?.id;

  const customAccountsQuery = useMemoFirebase(() => {
    if (!db || !currentTenantId || !user) return null;
    return query(collection(db, "tenants", currentTenantId, "accounts"));
  }, [db, currentTenantId, user?.uid]);
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

  React.useEffect(() => {
    const checkDuplicate = async () => {
      if (!db || !currentTenantId || !reference || reference.length < 3) {
        setDuplicateWarning(null);
        return;
      }
      const q = query(
        collection(db, "tenants", currentTenantId, "journal_entries"),
        where("documentReference", "==", reference),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setDuplicateWarning(`Attention : Une pièce avec la référence "${reference}" existe déjà.`);
      } else {
        setDuplicateWarning(null);
      }
    };
    checkDuplicate();
  }, [db, currentTenantId, reference]);

  const totals = React.useMemo(() => {
    return lines.reduce((acc, line) => ({
      debit: acc.debit + (Number(line.debit) || 0),
      credit: acc.credit + (Number(line.credit) || 0)
    }), { debit: 0, credit: 0 })
  }, [lines])

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01 && totals.debit > 0

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

  const handleAutoTva = (index: number) => {
    const line = lines[index];
    const amount = Number(line.debit) || Number(line.credit);
    if (amount <= 0) return;

    const tva = Math.round(amount * 0.19 * 100) / 100;
    const isPurchase = line.accountCode.startsWith('6');
    const tvaAccount = isPurchase ? '4456' : '4457';
    const counterAccount = isPurchase ? '401' : '411';

    const newLines = [...lines];
    newLines.push({ 
      accountCode: tvaAccount, 
      accountName: allAccounts.find(a => a.code === tvaAccount)?.name || "TVA", 
      debit: isPurchase ? tva : 0, 
      credit: isPurchase ? 0 : tva 
    });
    newLines.push({ 
      accountCode: counterAccount, 
      accountName: allAccounts.find(a => a.code === counterAccount)?.name || "Tiers", 
      debit: isPurchase ? 0 : amount + tva, 
      credit: isPurchase ? amount + tva : 0 
    });
    
    setLines(newLines);
    toast({ title: "Auto-Ventilation SCF", description: "TVA 19% et Tiers ajoutés automatiquement." });
  }

  const applyTemplate = (templateId: string) => {
    const template = ACCOUNTING_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setJournalType(template.journal as JournalType);
    setDescription(template.description);
    
    const newLines = template.lines.map(l => {
      const account = allAccounts.find(a => a.code === l.accountCode);
      return {
        accountCode: l.accountCode,
        accountName: account?.name || "Compte",
        debit: 0,
        credit: 0
      };
    });
    setLines(newLines);
    toast({ title: "Modèle appliqué", description: `Structure pour "${template.name}" chargée.` });
  }

  const handleValidate = async () => {
    if (!db || !user || !currentTenantId || !isBalanced) return
    
    setIsSubmitting(true)
    const journalEntriesRef = collection(db, "tenants", currentTenantId, "journal_entries")
    
    const entryData = {
      tenantId: currentTenantId,
      tenantMembers: currentTenant.members,
      entryDate: new Date(entryDate).toISOString(),
      description,
      documentReference: reference,
      journalType,
      status: 'Validated',
      createdAt: new Date().toISOString(),
      createdByUserId: user.uid,
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
        title: "Écritures enregistrée",
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
    if (!db || !currentTenantId || !newAccountData.code || !newAccountData.name) return;

    const rootCode = newAccountData.code.substring(0, 2);
    const rootAccount = SCF_ACCOUNTS.find(a => a.code === rootCode && a.isRoot);

    if (!rootAccount) {
      toast({
        variant: "destructive",
        title: "Racine invalide",
        description: "Le compte doit commencer par une racine SCF valide (2 chiffres).",
      });
      return;
    }

    const accountRef = collection(db, "tenants", currentTenantId, "accounts");
    const accountData = {
      code: newAccountData.code,
      name: newAccountData.name,
      rootCode,
      class: rootAccount.class,
      tenantId: currentTenantId,
      tenantMembers: currentTenant.members,
      category: rootAccount.category
    };

    try {
      addDocumentNonBlocking(accountRef, accountData);
      toast({ title: "Compte créé", description: `Le compte ${newAccountData.code} a été ajouté.` });
      setIsAccountDialogOpen(false);
      setNewAccountData({ code: "", name: "" });
    } catch (e) {
      console.error(e);
    }
  };

  const groupedAccounts = React.useMemo(() => {
    const search = searchAccount.toLowerCase();
    const filtered = allAccounts.filter(a => a.code.includes(search) || a.name.toLowerCase().includes(search));
    const groups: Record<number, typeof SCF_ACCOUNTS> = {};
    filtered.forEach(acc => {
      if (!groups[acc.class]) groups[acc.class] = [];
      groups[acc.class].push(acc);
    });
    return groups;
  }, [allAccounts, searchAccount]);

  if (!mounted) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-accent" /> Saisie Assistée SCF
          </h1>
          <p className="text-muted-foreground text-sm">Automatisation des écritures et ventilation intelligente de la TVA.</p>
        </div>
        <div className="flex gap-2">
          <Select onValueChange={applyTemplate}>
            <SelectTrigger className="w-[200px] border-accent text-accent">
              <Zap className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Saisie Rapide" />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNTING_TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Nouveau Compte</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer un sous-compte PCE</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4 text-foreground">
                <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Code</Label><Input className="col-span-3" value={newAccountData.code} onChange={(e) => setNewAccountData({...newAccountData, code: e.target.value})} /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Intitulé</Label><Input className="col-span-3" value={newAccountData.name} onChange={(e) => setNewAccountData({...newAccountData, name: e.target.value})} /></div>
              </div>
              <DialogFooter><Button onClick={handleCreateAccount}>Enregistrer</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Button 
            disabled={!isBalanced || isSubmitting || !currentTenantId} 
            onClick={handleValidate}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Valider l'écriture
          </Button>
        </div>
      </div>

      {duplicateWarning && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Risque de Doublon</AlertTitle>
          <AlertDescription>{duplicateWarning}</AlertDescription>
        </Alert>
      )}

      <Card className="border-t-4 border-t-primary shadow-xl">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Journal</label>
              <Select value={journalType} onValueChange={(v: JournalType) => setJournalType(v)}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACHATS">ACHATS</SelectItem>
                  <SelectItem value="VENTES">VENTES</SelectItem>
                  <SelectItem value="BANQUE">BANQUE</SelectItem>
                  <SelectItem value="CAISSE">CAISSE</SelectItem>
                  <SelectItem value="OD">O.D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Réf. Pièce</label>
              <Input placeholder="Ex: FAC-2026-001" value={reference} onChange={(e) => setReference(e.target.value)} className="bg-white" />
            </div>
            <div className="md:col-span-1 space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Libellé</label>
              <Input placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Date</label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="bg-white" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center gap-2 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filtrer les comptes..." value={searchAccount} onChange={(e) => setSearchAccount(e.target.value)} className="h-8 text-xs bg-muted/20 border-none" />
          </div>
          <Table>
            <TableHeader><TableRow className="bg-muted/50"><TableHead>Compte PCE</TableHead><TableHead className="text-right">Débit</TableHead><TableHead className="text-right">Crédit</TableHead><TableHead className="w-[100px]"></TableHead></TableRow></TableHeader>
            <TableBody>
              {lines.map((line, index) => (
                <TableRow key={index} className="hover:bg-muted/10">
                  <TableCell>
                    <Select value={line.accountCode} onValueChange={(val) => updateLine(index, "accountCode", val)}>
                      <SelectTrigger className="h-9 font-mono">
                        <SelectValue placeholder="Code PCE" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(groupedAccounts).map(([cls, accounts]) => (
                          <SelectGroup key={cls}>
                            <SelectLabel className="bg-muted/50 py-1 text-[10px] font-bold uppercase">Classe {cls}</SelectLabel>
                            {accounts.map(acc => (
                              <SelectItem key={acc.code} value={acc.code}>
                                <span className="font-mono font-bold mr-2 text-primary">{acc.code}</span>
                                <span className="text-xs opacity-70">{acc.name}</span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input type="number" className="text-right font-mono" value={line.debit || ""} onChange={(e) => updateLine(index, "debit", e.target.value)} /></TableCell>
                  <TableCell><Input type="number" className="text-right font-mono" value={line.credit || ""} onChange={(e) => updateLine(index, "credit", e.target.value)} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(line.accountCode.startsWith('6') || line.accountCode.startsWith('7')) && (
                        <Button variant="ghost" size="icon" onClick={() => handleAutoTva(index)} className="text-accent hover:bg-accent/10" title="Calculer TVA auto">
                          <Calculator className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeLine(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" size="sm" onClick={addLine} className="mt-4 border-dashed w-full">
            <Plus className="mr-2 h-4 w-4" /> Ajouter une ligne d'imputation
          </Button>
        </CardContent>
        <CardFooter className="flex justify-between items-center border-t bg-muted/20 p-6">
          <div className="flex items-center gap-4">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isBalanced ? 'bg-emerald-100 text-emerald-600' : 'bg-destructive/10 text-destructive animate-pulse'}`}>
              {isBalanced ? <CheckCircle className="h-6 w-6" /> : <Calculator className="h-6 w-6" />}
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Statut d'Équilibre</p>
              <p className={`text-sm font-black ${isBalanced ? 'text-emerald-600' : 'text-destructive'}`}>
                {isBalanced ? "ÉQUILIBRÉ" : `ÉCART: ${Math.abs(totals.debit - totals.credit).toLocaleString()} DA`}
              </p>
            </div>
          </div>
          <div className="flex gap-12">
            <div className="text-right"><p className="text-[10px] font-bold text-muted-foreground uppercase">Total Débit</p><p className="text-xl font-black text-primary">{totals.debit.toLocaleString()} DA</p></div>
            <div className="text-right"><p className="text-[10px] font-bold text-muted-foreground uppercase">Total Crédit</p><p className="text-xl font-black text-primary">{totals.credit.toLocaleString()} DA</p></div>
          </div>
        </CardFooter>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" /> Aide SCF Contextuelle</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground italic leading-relaxed">
            La saisie assistée applique automatiquement les principes du SCF. Les comptes de charges (Classe 6) doivent être compensés par des comptes de tiers (401) ou de trésorerie (512). 
            La TVA (4456) est déductible pour les contribuables au régime réel.
          </CardContent>
        </Card>
        <Card className="border-dashed flex items-center justify-center p-6">
          <Button variant="outline" className="h-full w-full py-8 text-muted-foreground border-2 border-dashed flex flex-col gap-2">
            <FileDown className="h-8 w-8" />
            <span>Générer Export FEC Algérien (XML/CSV)</span>
          </Button>
        </Card>
      </div>
    </div>
  )
}
