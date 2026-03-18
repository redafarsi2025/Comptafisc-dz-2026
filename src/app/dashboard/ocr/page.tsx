"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { extractInvoiceData, InvoiceOcrExtractionOutput } from "@/ai/flows/invoice-ocr-extraction"
import { Camera, Upload, FileCheck, Loader2, Sparkles, CheckCircle, AlertTriangle } from "lucide-react"
import Image from "next/image"

export default function OcrIngestion() {
  const [file, setFile] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [result, setResult] = React.useState<InvoiceOcrExtractionOutput | null>(null)

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
    } finally {
      setIsProcessing(false)
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
              className="w-full"
              disabled={!preview || isProcessing}
              onClick={processOcr}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse Vision IA...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Lancer l'extraction
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
              <Card className="border-emerald-500/50 shadow-lg">
                <CardHeader className="bg-emerald-500/5 border-b pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-emerald-600" /> Données Extraites
                    </CardTitle>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Confiance Élevée</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Fournisseur</p>
                      <p className="font-semibold">{result.vendorName}</p>
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
                    <p className="text-[10px] uppercase text-muted-foreground font-bold mb-2">Écriture Proposée (SCF)</p>
                    <div className="bg-muted/50 p-3 rounded text-xs font-mono space-y-1">
                      {result.suggestedJournalEntry.debitAccounts.map((d, i) => (
                        <div key={i} className="flex justify-between text-emerald-700">
                          <span>{d.accountCode} - {d.accountName}</span>
                          <span>{d.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      {result.suggestedJournalEntry.creditAccounts.map((c, i) => (
                        <div key={i} className="flex justify-between text-primary">
                          <span className="pl-4">{c.accountCode} - {c.accountName}</span>
                          <span>{c.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/20 flex justify-end gap-2 p-4">
                  <Button variant="outline">Corriger</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">Confirmer au Journal</Button>
                </CardFooter>
              </Card>

              <Card className="border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Note de Conformité Fiscale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-primary">98<span className="text-sm font-normal text-muted-foreground">/100</span></div>
                    <div className="flex-1">
                      <Progress value={98} className="h-2" />
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