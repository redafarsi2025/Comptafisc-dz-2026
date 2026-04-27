
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { 
  Plus, Trash2, CheckCircle, Calculator, Loader2, BookOpen, 
  Search, Briefcase, Sparkles, Library, AlertTriangle
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useUser, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, doc, orderBy } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"
import { useLocale } from "@/context/LocaleContext"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function AccountingJournal() {
  const db = useFirestore()
  const { user } = useUser()
  const { t, isRtl } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [description, setDescription] = React.useState("")
  const [entryDate, setEntryDate] = React.useState("")
  const [reference, setReference] = React.useState("")
  const [journalType, setJournalType] = React.useState<any>("ACHATS")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [searchAccount, setSearchAccount] = React.useState("")

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
    if (!tenants || tenants.length === 0) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const currentTenantId = currentTenant?.id;

  // CHARGER LE PLAN COMPTABLE RÉEL DU CLIENT
  const accountsQuery = useMemoFirebase(() => 
    (db && currentTenantId) ? query(collection(db, "tenants", currentTenantId, "accounts"), orderBy("accountNumber", "asc")) : null
  , [db, currentTenantId]);
  const { data: clientAccounts, isLoading: isAccountsLoading } = useCollection(accountsQuery);

  const sectionsQuery = useMemoFirebase(() => {
    if (!db || !currentTenantId) return null;
    return query(collection(db, "tenants", currentTenantId, "sectionsAnalytiques"), where("actif", "==", true));
  }, [db, currentTenantId]);
  const { data: sections } = useCollection(sectionsQuery);

  const [lines, setLines] = React.useState<any[]>([
    { accountCode: "", accountName: "Code PCE", debit: 0, credit: 0, sectionId: "none" },
    { accountCode: "", accountName: "Code PCE", debit: 0, credit: 0, sectionId: "none" },
  ])

  const totals = React.useMemo(() => {
    return lines.reduce((acc, line) => ({
      debit: acc.debit + (Number(line.debit) || 0),
      credit: acc.credit + (Number(line.credit) || 0)
    }), { debit: 0, credit: 0 })
  }, [lines])

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01 && totals.debit > 0

  const addLine = () => {
    setLines([...lines, { accountCode: "", accountName: "Compte PCE", debit: 0, credit: 0, sectionId: "none" }])
  }

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }
    if (field === "accountCode") {
      const account = clientAccounts?.find(a => a.accountNumber === value)
      if (account) newLines[index].accountName = account.label
    }
    setLines(newLines)
  }

  const handleValidate = async () => {
    if (!db || !user || !currentTenantId || !isBalanced) return
    
    setIsSubmitting(true)
    const journalEntriesRef = collection(db, "tenants", currentTenantId, "journal_entries")
    
    const timestamp = new Date().toISOString()
    const entryData = {
      tenantId: currentTenantId,
      tenantMembers: currentTenant.members,
      entryDate: new Date(entryDate).toISOString(),
      description,
      documentReference: reference,
      journalType,
      status: 'Validated',
      createdAt: timestamp,
      createdByUserId: user.uid,
      lines: lines.map(l => ({ 
        accountCode: l.accountCode, 
        accountName: l.accountName, 
        debit: Number(l.debit) || 0, 
        credit: Number(l.credit) || 0,
        sectionId: l.sectionId === "none" ? "" : l.sectionId
      }))
    }

    try {
      await addDocumentNonBlocking(journalEntriesRef, entryData);
      toast({ title: "Écritures validées", description: "Comptabilité mise à jour." });
      setLines([{ accountCode: "", accountName: "Code PCE", debit: 0, credit: 0, sectionId: "none" }, { accountCode: "", accountName: "Code PCE", debit: 0, credit: 0, sectionId: "none" }]);
      setDescription(""); setReference("");
    } catch (e) { console.error(e); } finally { setIsSubmitting(false) }
  }

  const groupedAccounts = React.useMemo(() => {
    if (!clientAccounts) return {};
    const search = searchAccount.toLowerCase();
    const filtered = clientAccounts.filter(a => a.accountNumber.includes(search) || a.label.toLowerCase().includes(search) || (a.labelAr && a.labelAr.includes(search)));
    const groups: Record<number, any[]> = {};
    filtered.forEach(acc => {
      if (!groups[acc.class]) groups[acc.class] = [];
      groups[acc.class].push(acc);
    });
    return groups;
  }, [clientAccounts, searchAccount]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-accent" /> {t.Accounting.journal_master}
          </h1>
          <p className="text-muted-foreground text-sm">{t.Accounting.journal_desc}</p>
        </div>
        <div className="flex gap-2">
          {clientAccounts?.length === 0 && (
            <Button variant="outline" className="border-amber-500 text-amber-600 rounded-xl" asChild>
              <Link href={`/dashboard/accounting/chart?tenantId=${currentTenantId}`}><Library className="mr-2 h-4 w-4" /> Configurer le Plan Comptable</Link>
            </Button>
          )}
          <Button 
            disabled={!isBalanced || isSubmitting || !currentTenantId} 
            onClick={handleValidate}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg h-11 px-8 rounded-xl font-bold"
          >
            {isSubmitting ? <Loader2 className={cn(isRtl ? "ml-2" : "mr-2", "h-4 w-4 animate-spin")} /> : <CheckCircle className={cn(isRtl ? "ml-2" : "mr-2", "h-4 w-4")} />}
            {t.Accounting.validate_entry}
          </Button>
        </div>
      </div>

      {clientAccounts?.length === 0 && !isAccountsLoading && (
        <Card className="bg-amber-50 border-amber-200 border-l-4 border-l-amber-500">
           <CardContent className="pt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <p className="text-xs font-bold text-amber-800">Le plan comptable de ce dossier n'est pas encore initialisé. La saisie est restreinte.</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 border-amber-600 text-amber-700" asChild>
                <Link href={`/dashboard/accounting/chart?tenantId=${currentTenantId}`}>Initialiser maintenant</Link>
              </Button>
           </CardContent>
        </Card>
      )}

      <Card className="border-t-4 border-t-primary shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Journal</label>
              <Select value={journalType} onValueChange={(v: any) => setJournalType(v)}>
                <SelectTrigger className="bg-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACHATS">ACHATS</SelectItem>
                  <SelectItem value="VENTES">VENTES</SelectItem>
                  <SelectItem value="BANQUE">BANQUE</SelectItem>
                  <SelectItem value="CAISSE">CAISSE</SelectItem>
                  <SelectItem value="OD">O.D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">{t.Accounting.piece_ref}</label>
              <Input placeholder="Ex: FAC-2026-001" value={reference} onChange={(e) => setReference(e.target.value)} className="bg-white rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">{t.Accounting.label}</label>
              <Input placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">{t.Accounting.entry_date}</label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="bg-white rounded-xl" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center gap-2 max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Chercher un compte PCE..." value={searchAccount} onChange={(e) => setSearchAccount(e.target.value)} className="h-8 text-xs bg-muted/20 border-none rounded-lg" />
          </div>
          <Table>
            <TableHeader><TableRow className="bg-slate-50">
              <TableHead className="font-black text-[10px] uppercase">Compte PCE</TableHead>
              <TableHead className={cn("text-right font-black text-[10px] uppercase", isRtl && "text-left")}>{t.Accounting.debit}</TableHead>
              <TableHead className={cn("text-right font-black text-[10px] uppercase", isRtl && "text-left")}>{t.Accounting.credit}</TableHead>
              <TableHead className="font-black text-[10px] uppercase">{t.Accounting.analytic_section}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {lines.map((line, index) => (
                <TableRow key={index} className="hover:bg-muted/5 h-16">
                  <TableCell>
                    <Select value={line.accountCode} onValueChange={(val) => updateLine(index, "accountCode", val)}>
                      <SelectTrigger className="h-12 font-mono rounded-xl">
                        <SelectValue placeholder="Code PCE" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(groupedAccounts).map(([cls, accounts]) => (
                          <SelectGroup key={cls}>
                            <SelectLabel className="bg-muted/50 py-1 text-[10px] font-bold uppercase">Classe {cls}</SelectLabel>
                            {accounts.map((acc:any) => (
                              <SelectItem key={acc.accountNumber} value={acc.accountNumber}>
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-primary text-xs">{acc.accountNumber}</span>
                                    <span className="text-[11px] font-bold">{acc.label}</span>
                                  </div>
                                  {acc.labelAr && <span className="text-[13px] text-slate-500 font-bold" dir="rtl">{acc.labelAr}</span>}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input type="number" className="text-right font-mono rounded-xl h-10" value={line.debit || ""} onChange={(e) => updateLine(index, "debit", e.target.value)} /></TableCell>
                  <TableCell><Input type="number" className="text-right font-mono rounded-xl h-10" value={line.credit || ""} onChange={(e) => updateLine(index, "credit", e.target.value)} /></TableCell>
                  <TableCell>
                    <Select value={line.sectionId} onValueChange={(val) => updateLine(index, "sectionId", val)}>
                      <SelectTrigger className="h-10 text-[10px] bg-white border-dashed rounded-xl">
                        <SelectValue placeholder="Aucune section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune section</SelectItem>
                        {sections?.map(s => (
                          <SelectItem key={s.id} value={s.id} className="text-[10px]">
                            <span className={cn("font-black", isRtl ? "ml-2" : "mr-2")}>[{s.axeCode}] {s.code}</span>
                            <span>{s.libelle}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setLines(lines.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" size="sm" onClick={addLine} className="mt-4 border-dashed w-full rounded-xl h-10 font-bold">
            <Plus className={cn(isRtl ? "ml-2" : "mr-2", "h-4 w-4")} /> {t.Accounting.add_line}
          </Button>
        </CardContent>
        <CardFooter className="flex justify-between items-center border-t bg-muted/20 p-6">
          <div className="flex items-center gap-4">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isBalanced ? 'bg-emerald-100 text-emerald-600' : 'bg-destructive/10 text-destructive animate-pulse'}`}>
              {isBalanced ? <CheckCircle className="h-6 w-6" /> : <Calculator className="h-6 w-6" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">{t.Accounting.balance_status}</p>
              <p className={`text-sm font-black ${isBalanced ? 'text-emerald-600' : 'text-destructive'}`}>
                {isBalanced ? t.Accounting.balanced : `ÉCART: ${Math.abs(totals.debit - totals.credit).toLocaleString()} DA`}
              </p>
            </div>
          </div>
          <div className="flex gap-12">
            <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase">{t.Accounting.total_debit}</p><p className="text-xl font-black text-primary">{totals.debit.toLocaleString()} DA</p></div>
            <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase">{t.Accounting.total_credit}</p><p className="text-xl font-black text-primary">{totals.credit.toLocaleString()} DA</p></div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
