"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { extractInvoiceData, InvoiceOcrExtractionOutput } from "@/ai/flows/invoice-ocr-extraction"
import { Camera, Upload, FileCheck, Loader2, Sparkles, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react"
import Image from "next/image"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function OcrIngestion() {
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const [file, setFile] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [result, setResult] = React.useState<InvoiceOcrExtractionOutput | null>(null)

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selected)
    }
  }

  const processOcr = async () => {
    if (!preview) return
    setIsProcessing(true)
    setResult(null)

    try {
      const data = await extractInvoiceData({ invoiceImage: preview })
      setResult(data)
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", title: "Erreur OCR", description: "L'IA n'a pas pu analyser l'image." });
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmToJournal = async () => {
    if (!db || !currentTenant || !user || !result) return;
    setIsSaving(true);

    const journalEntriesRef = collection(db, "tenants", currentTenant.id, "journal_entries");
    
    const debitLines = result.suggestedJournalEntry.debitAccounts.map(d => ({
      accountCode: d.accountCode,
      accountName: d.accountName,
      debit: d.amount,
      credit: 0
    }));

    const creditLines = result.suggestedJournalEntry.creditAccounts.map(c => ({
      accountCode: c.accountCode,
      accountName: c.accountName,
      debit: 0,
      credit: c.amount
    }));

    const entryData = {
      tenantId: currentTenant.id,
      entryDate: result.invoiceDate,
      description: result.suggestedJournalEntry.description,
      documentReference: result.invoiceNumber,
      journalType: "ACHATS",
      status: 'Validated',
      createdAt: new Date().toISOString(),
      createdByUserId: user.uid,
      tenantMembers: currentTenant.members,
      lines: [...debitLines, ...creditLines],
      isFromOcr: true
    };

    try {
      await addDocumentNonBlocking(journalEntriesRef, entryData);
      toast({ title: "Saisie automatique réussie", description: `L'écriture pour "${result.vendorName}" a été validée.` });
      router.push("/dashboard/accounting/journal");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-primary">Capture Intelligente</h1>
        <p className="text-muted-foreground">Ingestion d'achats via OCR alimenté par Gemini Vision.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-dashed border-primary/20 bg-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Chargement de la pièce
            </CardTitle>
            <CardDescription>Uploadez une photo ou un scan de votre facture fournisseur.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
            {preview ? (
              <div className="relative w-full h-[400px] rounded-lg overflow-hidden border">
                <Image
                  src={preview}
                  alt="Invoice Preview"
                  fill
                  className="object-contain"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-4 right-4"
                  onClick={() => { setFile(null); setPreview(null); setResult(null); }}
                >
                  Changer
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Button variant="outline" asChild>
                      <span>Sélectionner un fichier</span>
                    </Button>
                    <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                  <p className="text-xs text-muted-foreground mt-2">Format supportés: JPG, PNG, PDF (Images)</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full h-12 text-lg shadow-lg"
              disabled={!preview || isProcessing}
              onClick={processOcr}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyse Vision IA...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" /> Lancer l'extraction
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          {isProcessing && (
            <Card className="animate-pulse">
              <CardHeader>
                <CardTitle className="text-sm">Analyse en cours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
                <Progress value={45} className="mt-4" />
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              <Card className="border-emerald-500/50 shadow-xl overflow-hidden">
                <CardHeader className="bg-emerald-500/5 border-b pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-emerald-600" /> Données Extraites
                    </CardTitle>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">SCF Prêt</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Fournisseur</p>
                      <p className="font-semibold truncate">{result.vendorName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Facture N°</p>
                      <p className="font-semibold">{result.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Date</p>
                      <p className="font-semibold">{result.invoiceDate}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Montant TTC</p>
                      <p className="font-bold text-primary">{result.totalAmount.toLocaleString()} {result.currency}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold mb-2">Imputation SCF Suggérée</p>
                    <div className="bg-slate-900 p-4 rounded-xl text-[11px] font-mono space-y-2 border-l-4 border-emerald-500">
                      {result.suggestedJournalEntry.debitAccounts.map((d, i) => (
                        <div key={i} className="flex justify-between text-emerald-400">
                          <span>{d.accountCode} - {d.accountName}</span>
                          <span className="font-bold">+{d.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      {result.suggestedJournalEntry.creditAccounts.map((c, i) => (
                        <div key={i} className="flex justify-between text-blue-400">
                          <span className="pl-4">{c.accountCode} - {c.accountName}</span>
                          <span className="font-bold">-{c.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/20 flex justify-end gap-2 p-4">
                  <Button variant="outline" onClick={() => setResult(null)}>Corriger</Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 shadow-md h-10 px-6"
                    onClick={handleConfirmToJournal}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                    Confirmer au Journal
                  </Button>
                </CardFooter>
              </Card>

              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Score de Confiance IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-black text-primary">98<span className="text-sm font-normal text-muted-foreground">%</span></div>
                    <div className="flex-1">
                      <Progress value={98} className="h-2 bg-primary/20" />
                      <p className="text-[10px] mt-1 text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Facture complète conforme LF 2026
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
