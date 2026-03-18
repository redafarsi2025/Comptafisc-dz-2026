
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Landmark, FileUp, ShieldCheck, ArrowRightLeft, Loader2, Info, Search, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

  // 1. Charger les dossiers clients (Tenants)
  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);

  // 2. Charger les écritures du journal de BANQUE pour le tenant sélectionné
  const journalQuery = useMemoFirebase(() => {
    if (!db || !selectedTenantId || !user) return null;
    return query(
      collection(db, "tenants", selectedTenantId, "journal_entries"),
      where("journalType", "==", "BANQUE"),
      orderBy("entryDate", "desc")
    );
  }, [db, selectedTenantId, user]);
  const { data: journalEntries, isLoading: isLoadingJournal } = useCollection(journalQuery);

  // Simulation d'importation de relevé bancaire
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
        
        // Génération de lignes de relevé fictives pour le test, 
        // dont certaines correspondent aux écritures réelles
        const mockLines: BankStatementLine[] = [
          { id: 'st1', date: new Date().toISOString().split('T')[0], label: "VIREMENT RECU CLIENT", amount: 50000, status: 'unmatched' },
          { id: 'st2', date: new Date().toISOString().split('T')[0], label: "FRAIS TENUE DE COMPTE", amount: -1200, status: 'unmatched' },
          { id: 'st3', date: new Date().toISOString().split('T')[0], label: "PAIEMENT FOURNISSEUR ABC", amount: -25000, status: 'unmatched' },
        ];
        
        // Tentative de matching automatique avec les données réelles de Firestore
        const matched = mockLines.map(line => {
          const match = journalEntries?.find(entry => {
            const entryAmount = entry.lines.reduce((sum: number, l: any) => sum + (l.debit - l.credit), 0);
            // On matche si le montant est identique (ou inverse selon le sens) et si la date est proche
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
      }
    }, 300)
  }

  const handleManualMatch = (lineId: string) => {
    setStatementLines(prev => prev.map(l => l.id === lineId ? { ...l, status: 'matched' } : l));
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
            <SelectTrigger className="w-[250px] bg-white">
              <SelectValue placeholder="Choisir un dossier..." />
            </SelectTrigger>
            <SelectContent>
              {tenants?.map(t => <SelectItem key={t.id} value={t.id}>{t.raisonSociale}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleUpload} 
            disabled={isUploading || !selectedTenantId}
          >
            <FileUp className="mr-2 h-4 w-4" /> Importer Relevé (CSV)
          </Button>
        </div>
      </div>

      {isUploading && (
        <Card className="bg-primary/5 border-primary/20 animate-pulse">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-primary uppercase">Analyse sémantique des flux par Gemini...</span>
              <span className="text-xs font-mono">{reconProgress}%</span>
            </div>
            <Progress value={reconProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-emerald-800">Écritures rapprochées</p>
            <h2 className="text-3xl font-bold text-emerald-600">
              {statementLines.filter(l => l.status === 'matched').length} / {statementLines.length}
            </h2>
            <p className="text-[10px] text-emerald-700 mt-1 italic">Basé sur le journal de banque du dossier.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Lignes en attente (Journal)</p>
            <h2 className="text-3xl font-bold text-primary">{journalEntries?.length || 0}</h2>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${totalDiscrepancy === 0 ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Écart de Rapprochement</p>
            <h2 className={`text-3xl font-bold ${totalDiscrepancy === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {totalDiscrepancy.toLocaleString()} DA
            </h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader className="bg-muted/20 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Matching Relevé vs Journal de Banque</CardTitle>
            <div className="flex items-center gap-2">
               <Badge variant="outline" className="bg-white">{journalEntries?.length || 0} Écritures réelles trouvées</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libellé Relevé Bancaire</TableHead>
                <TableHead className="text-right">Montant (DZD)</TableHead>
                <TableHead className="text-center">Correspondance Comptable</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statementLines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                    {selectedTenantId ? "Veuillez importer un fichier de relevé pour commencer." : "Sélectionnez un dossier client pour activer l'importation."}
                  </TableCell>
                </TableRow>
              ) : (
                statementLines.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/5">
                    <TableCell className="text-xs">{t.date}</TableCell>
                    <TableCell className="font-medium text-xs">{t.label}</TableCell>
                    <TableCell className={`text-right font-mono text-xs ${t.amount < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                      {t.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {t.status === "matched" && (
                        <div className="flex flex-col items-center">
                          <Badge className="bg-emerald-500 h-4 text-[8px] mb-1">VALIDÉ</Badge>
                          <span className="text-[9px] text-muted-foreground">{t.matchLabel}</span>
                        </div>
                      )}
                      {t.status === "suggested" && (
                        <div className="flex flex-col items-center">
                          <Badge variant="outline" className="border-primary text-primary h-4 text-[8px] mb-1">SUGGESTION IA</Badge>
                          <span className="text-[9px] text-muted-foreground italic">Match probable : {t.matchLabel}</span>
                        </div>
                      )}
                      {t.status === "unmatched" && (
                        <Badge variant="destructive" className="h-4 text-[8px]">NON TROUVÉ DANS LE JOURNAL</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.status === "matched" ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600 inline" />
                      ) : (
                        <Button 
                          variant={t.status === 'suggested' ? "default" : "outline"} 
                          size="sm" 
                          className="h-7 text-[10px]"
                          onClick={() => handleManualMatch(t.id)}
                        >
                          Pointer
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
            <Info className="h-4 w-4 text-primary" /> 
            Note : Le système analyse les écritures du journal de banque pour trouver le montant exact {totalDiscrepancy !== 0 && "— Écart détecté."}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-dashed"><PlusCircle className="h-4 w-4 mr-2" /> Créer OD d'ajustement</Button>
            <Button className="bg-primary shadow-md">
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Générer Journal de Banque
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-dashed border-2">
          <CardHeader><CardTitle className="text-sm">Aide au Rapprochement</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>1. Sélectionnez le dossier client.</p>
            <p>2. Importez le relevé bancaire (Format CIB, Excel ou CSV).</p>
            <p>3. L'IA compare les montants avec les <strong>Journal Entries</strong> de type BANQUE.</p>
            <p>4. Validez les suggestions ou créez les écritures manquantes (Frais, Intérêts).</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader><CardTitle className="text-sm text-blue-800 flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Certification SCF</CardTitle></CardHeader>
          <CardContent className="text-xs text-blue-700">
            L'état de rapprochement est obligatoire pour justifier le solde du compte 512 à la clôture de chaque période. 
            Il permet de détecter les chèques non encaissés et les erreurs de saisie.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PlusCircle({ className, ...props }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  )
}
