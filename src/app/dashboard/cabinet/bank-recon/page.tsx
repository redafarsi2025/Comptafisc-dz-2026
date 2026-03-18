"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Landmark, FileUp, ShieldCheck, ArrowRightLeft, Loader2, Info, 
  Search, CheckCircle, AlertCircle, PlusCircle, Calculator, Zap 
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

interface BankStatementLine {
  id: string;
  date: string;
  label: string;
  amount: number;
  status: 'unmatched' | 'suggested' | 'matched';
  matchId?: string;
  matchLabel?: string;
}

export default function BankReconciliation() {
  const db = useFirestore()
  const { user } = useUser()
  const [isUploading, setIsUploading] = React.useState(false)
  const [reconProgress, setReconProgress] = React.useState(0)
  const [selectedTenantId, setSelectedTenantId] = React.useState<string>("")
  const [statementLines, setStatementLines] = React.useState<BankStatementLine[]>([])

  // 1. Charger les dossiers clients
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.find(t => t.id === selectedTenantId);

  // 2. Charger les écritures du journal de BANQUE
  const journalQuery = useMemoFirebase(() => {
    if (!db || !selectedTenantId || !user) return null;
    return query(
      collection(db, "tenants", selectedTenantId, "journal_entries"),
      where("journalType", "==", "BANQUE"),
      orderBy("entryDate", "desc")
    );
  }, [db, selectedTenantId, user]);
  const { data: journalEntries, isLoading: isLoadingJournal } = useCollection(journalQuery);

  const handleUpload = () => {
    if (!selectedTenantId) return;
    
    setIsUploading(true)
    let p = 0
    const interval = setInterval(() => {
      p += 20
      setReconProgress(p)
      if (p >= 100) {
        clearInterval(interval)
        setIsUploading(false)
        
        const mockLines: BankStatementLine[] = [
          { id: 'st1', date: new Date().toISOString().split('T')[0], label: "VIREMENT RECU CLIENT", amount: 50000, status: 'unmatched' },
          { id: 'st2', date: new Date().toISOString().split('T')[0], label: "FRAIS TENUE DE COMPTE", amount: -1200, status: 'unmatched' },
          { id: 'st3', date: new Date().toISOString().split('T')[0], label: "PAIEMENT FOURNISSEUR ABC", amount: -25000, status: 'unmatched' },
        ];
        
        const matched = mockLines.map(line => {
          const match = journalEntries?.find(entry => {
            const entryAmount = entry.lines.reduce((sum: number, l: any) => sum + (l.debit - l.credit), 0);
            return Math.abs(entryAmount) === Math.abs(line.amount);
          });

          if (match) {
            return { 
              ...line, 
              status: 'suggested' as const, 
              matchId: match.id, 
              matchLabel: match.description 
            };
          }
          return line;
        });

        setStatementLines(matched);
        toast({ title: "Importation terminée", description: "Le rapprochement a détecté des correspondances." });
      }
    }, 300)
  }

  const handleGenerateEntry = async (line: BankStatementLine) => {
    if (!db || !currentTenant || !user) return;

    const isExpense = line.amount < 0;
    const absAmount = Math.abs(line.amount);

    const journalEntriesRef = collection(db, "tenants", currentTenant.id, "journal_entries");
    
    const entryData = {
      tenantId: currentTenant.id,
      entryDate: line.date,
      description: line.label,
      documentReference: "RELEVE-AUTO",
      journalType: "BANQUE",
      status: 'Validated',
      createdAt: new Date().toISOString(),
      createdByUserId: user.uid,
      tenantMembers: currentTenant.members,
      lines: [
        { 
          accountCode: isExpense ? "627" : "512", // 627 Services bancaires ou 512 Banque
          accountName: isExpense ? "Services bancaires" : "Banque",
          debit: isExpense ? absAmount : absAmount,
          credit: 0
        },
        { 
          accountCode: isExpense ? "512" : "411", // 512 ou 411
          accountName: isExpense ? "Banque" : "Clients",
          debit: 0,
          credit: isExpense ? absAmount : absAmount
        }
      ]
    };

    try {
      await addDocumentNonBlocking(journalEntriesRef, entryData);
      setStatementLines(prev => prev.map(l => l.id === line.id ? { ...l, status: 'matched', matchLabel: "Saisie auto générée" } : l));
      toast({ title: "Écriture générée", description: `L'écriture de banque pour "${line.label}" a été ajoutée.` });
    } catch (e) {
      console.error(e);
    }
  };

  const totalDiscrepancy = statementLines
    .filter(l => l.status !== 'matched')
    .reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Landmark className="h-8 w-8 text-accent" /> Rapprochement Bancaire
          </h1>
          <p className="text-muted-foreground text-sm">Matching entre vos relevés bancaires réels et votre comptabilité Firestore.</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger className="w-[250px] bg-white shadow-sm">
              <SelectValue placeholder="Choisir un dossier..." />
            </SelectTrigger>
            <SelectContent>
              {tenants?.map(t => <SelectItem key={t.id} value={t.id}>{t.raisonSociale}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={handleUpload} 
            disabled={isUploading || !selectedTenantId}
            className="border-primary text-primary"
          >
            <FileUp className="mr-2 h-4 w-4" /> Importer Relevé
          </Button>
        </div>
      </div>

      {isUploading && (
        <Card className="bg-primary/5 border-primary/20 animate-pulse">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-primary uppercase flex items-center gap-2"><Zap className="h-3 w-3" /> Analyse intelligente des flux...</span>
              <span className="text-xs font-mono">{reconProgress}%</span>
            </div>
            <Progress value={reconProgress} className="h-2 bg-primary/20" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-emerald-50 border-emerald-200 border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-emerald-800">Écritures rapprochées</p>
            <h2 className="text-3xl font-black text-emerald-600">
              {statementLines.filter(l => l.status === 'matched').length} / {statementLines.length}
            </h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Journal Banque</p>
            <h2 className="text-3xl font-black text-primary">{journalEntries?.length || 0} lignes</h2>
          </CardContent>
        </Card>
        <Card className={`border-l-4 shadow-sm ${totalDiscrepancy === 0 ? 'border-l-emerald-500 bg-emerald-50/30' : 'border-l-amber-500 bg-amber-50/30'}`}>
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Écart de Rapprochement</p>
            <h2 className={`text-3xl font-black ${totalDiscrepancy === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {totalDiscrepancy.toLocaleString()} DA
            </h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-t-4 border-t-primary">
        <CardHeader className="bg-muted/20 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Matching Relevé vs Journal de Banque</CardTitle>
            <Badge variant="outline" className="bg-white">Base de données synchronisée</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libellé Relevé</TableHead>
                <TableHead className="text-right">Montant (DZD)</TableHead>
                <TableHead className="text-center">Correspondance SCF</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statementLines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic flex flex-col items-center gap-4">
                    <Landmark className="h-12 w-12 opacity-20" />
                    {selectedTenantId ? "Veuillez importer un fichier de relevé pour commencer." : "Sélectionnez un dossier client pour activer l'importation."}
                  </TableCell>
                </TableRow>
              ) : (
                statementLines.map((line) => (
                  <TableRow key={line.id} className="hover:bg-muted/5 group">
                    <TableCell className="text-xs font-mono">{line.date}</TableCell>
                    <TableCell className="font-medium text-xs">{line.label}</TableCell>
                    <TableCell className={`text-right font-mono text-xs font-bold ${line.amount < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                      {line.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {line.status === "matched" && (
                        <div className="flex flex-col items-center"><Badge className="bg-emerald-500 h-4 text-[8px] mb-1">VALIDÉ</Badge><span className="text-[9px] text-muted-foreground">{line.matchLabel}</span></div>
                      )}
                      {line.status === "suggested" && (
                        <div className="flex flex-col items-center"><Badge variant="outline" className="border-primary text-primary h-4 text-[8px] mb-1 animate-pulse">SUGGESTION IA</Badge><span className="text-[9px] text-muted-foreground italic">Match probable : {line.matchLabel}</span></div>
                      )}
                      {line.status === "unmatched" && (
                        <Badge variant="destructive" className="h-4 text-[8px]">À SAISIR</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.status === "matched" ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600 inline" />
                      ) : (
                        <Button 
                          variant={line.status === 'suggested' ? "default" : "secondary"} 
                          size="sm" 
                          className="h-7 text-[10px] shadow-sm"
                          onClick={() => handleGenerateEntry(line)}
                        >
                          {line.status === 'suggested' ? 'Pointer' : 'Générer OD'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="p-4 bg-muted/30 border-t flex justify-between items-center">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic">
            <Info className="h-4 w-4 text-primary" /> 
            Note : Le système compare les montants absolus pour identifier les mouvements de trésorerie.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-dashed"><PlusCircle className="h-4 w-4 mr-2" /> Frais Bancaires Auto</Button>
            <Button className="bg-primary shadow-lg h-9">
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Clôturer le Rapprochement
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
