
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  FileMinus, ShieldCheck, CheckCircle2, AlertTriangle, 
  Loader2, Search, Plus, Trash2, Save, FileText, Landmark
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export default function SupplierCreditNotesManagement() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const creditNotesQuery = useMemoFirebase(() => {
    if (!db || !tenantId) return null;
    return query(collection(db, "tenants", tenantId, "supplier_credit_notes"), orderBy("date", "desc"));
  }, [db, tenantId]);
  const { data: creditNotes, isLoading } = useCollection(creditNotesQuery);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <FileMinus className="text-accent h-8 w-8" /> Avoirs Fournisseurs
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Correction Fiscale & Comptable (SCF)</p>
        </div>
        <Button className="bg-primary shadow-lg" disabled={!tenantId}><Plus className="mr-2 h-4 w-4" /> Enregistrer Avoir</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">TVA à récupérer sur avoirs</p>
            <h2 className="text-3xl font-black text-emerald-600">5,420 DA</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary shadow-sm bg-white">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Crédit Fournisseur</p>
            <h2 className="text-3xl font-black text-primary">32,100 DA</h2>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200 border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-blue-800">Avoirs réconciliés</p>
            <h2 className="text-3xl font-black text-blue-600">100%</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
        <CardHeader className="bg-muted/30 border-b py-4">
          <CardTitle className="text-lg">Registre des Factures d'Avoir</CardTitle>
          <CardDescription>Justificatifs fiscaux annulant tout ou partie d'une dette fournisseur.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] uppercase font-black">
                <TableHead>N° Avoir / Date</TableHead>
                <TableHead>Facture Initiale</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead className="text-right">Montant HT</TableHead>
                <TableHead className="text-right font-bold text-primary">Montant TTC</TableHead>
                <TableHead className="text-center">Statut SCF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : !creditNotes?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic flex flex-col items-center gap-4">
                  <FileText className="h-12 w-12 opacity-10" />
                  <span>Aucun avoir enregistré.</span>
                </TableCell></TableRow>
              ) : (
                creditNotes.map((cn) => (
                  <TableRow key={cn.id} className="hover:bg-muted/5 group">
                    <TableCell className="text-xs font-bold">
                      <div className="flex flex-col">
                        <span>{cn.creditNoteNumber}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">{cn.date}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{cn.originalInvoiceRef}</TableCell>
                    <TableCell className="text-xs font-medium">{cn.supplierName}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{cn.amountHT.toLocaleString()} DA</TableCell>
                    <TableCell className="text-right font-black text-xs text-primary">{cn.amountTTC.toLocaleString()} DA</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-emerald-500 text-white text-[8px]">COMPTABILISÉ</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-t-4 border-t-primary shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" /> Schéma de Contre-Passation (SCF)
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-slate-950 p-6 rounded-xl font-mono text-[11px] text-emerald-400 space-y-2">
            <p className="opacity-50">// Écriture d'avoir générée automatiquement</p>
            <div className="flex justify-between border-b border-white/10 pb-1 text-blue-400">
              <span>(D) 401 - Fournisseurs de stocks</span>
              <span>12,000.00</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-1">
              <span>(C) 30 - Stocks de marchandises</span>
              <span className="pl-4">10,084.03</span>
            </div>
            <div className="flex justify-between text-white/50 pt-1">
              <span className="pl-4">(C) 4456 - TVA déductible (19%)</span>
              <span>1,915.97</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border border-blue-200 p-6 flex items-start gap-4">
          <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
          <div className="text-xs leading-relaxed space-y-2">
            <p className="font-bold text-blue-900 uppercase underline">Note Fiscale Algérie :</p>
            <p className="text-blue-800">
              L'avoir fournisseur est une pièce comptable qui réduit le montant de la TVA déductible précédemment enregistrée. 
              Sur votre déclaration G50, le montant total des avoirs doit être déduit de la base d'imposition pour rester conforme au CTCA.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
