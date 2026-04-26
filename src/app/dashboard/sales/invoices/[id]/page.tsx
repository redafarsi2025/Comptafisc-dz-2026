"use client"

import * as React from "react"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { 
  Printer, ChevronLeft, Download, ShieldCheck, 
  CheckCircle2, CreditCard, Building2, MapPin, 
  History, Loader2, Landmark, FileText, QrCode
} from "lucide-react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import Link from "next/link"
import { formatDZD, numberToFrenchWords } from "@/utils/fiscalAlgerie"
import { cn } from "@/lib/utils"

export default function InvoiceDetailPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { id } = useParams()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const invoiceRef = useMemoFirebase(() => 
    (db && tenantId && id) ? doc(db, "tenants", tenantId, "invoices", id as string) : null
  , [db, tenantId, id]);
  const { data: invoice, isLoading: isInvoiceLoading } = useDoc(invoiceRef);

  const tenantRef = useMemoFirebase(() => 
    (db && tenantId) ? doc(db, "tenants", tenantId) : null
  , [db, tenantId]);
  const { data: tenant } = useDoc(tenantRef);

  if (!mounted || isInvoiceLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>
  if (!invoice) return <div className="p-20 text-center">Facture introuvable.</div>

  const isProvisoire = invoice.status === 'Draft';
  const amountInWords = numberToFrenchWords(invoice.totalAmountIncludingTax || 0);

  // Simulation de données QR Code pour 2026
  const qrData = JSON.stringify({
    nif_em: tenant?.nif,
    nif_cl: invoice.clientId,
    fac: invoice.invoiceNumber,
    date: invoice.invoiceDate,
    ttc: invoice.totalAmountIncludingTax,
    tva: invoice.totalTaxAmount
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 print:p-0 print:space-y-0">
      {/* Action Header - Hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/sales/invoices?tenantId=${tenantId}`}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Imprimer
          </Button>
          <Button className="bg-primary shadow-xl">
            <Download className="mr-2 h-4 w-4" /> Télécharger PDF
          </Button>
        </div>
      </div>

      {/* Official Invoice Document */}
      <Card className="relative bg-white shadow-2xl border ring-1 ring-slate-200 rounded-3xl overflow-hidden print:shadow-none print:border-none print:ring-0">
        {/* Provisoire Watermark */}
        {isProvisoire && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-45deg] select-none">
            <span className="text-[120px] font-black tracking-widest border-[20px] border-slate-900 px-12">PROVISOIRE</span>
          </div>
        )}

        {/* 1. HEADER ÉMETTEUR */}
        <CardHeader className="p-10 border-b bg-slate-50/50">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary p-2 rounded-xl">
                  <Building2 className="text-white h-6 w-6" />
                </div>
                <span className="text-2xl font-black text-primary uppercase tracking-tighter">{tenant?.raisonSociale || 'ÉMETTEUR'}</span>
              </div>
              <div className="text-[10px] space-y-1 font-medium text-slate-500 uppercase leading-relaxed">
                <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {tenant?.adresse || 'Adresse non renseignée'}</p>
                <p>NIF: {tenant?.nif || '---'} • NIS: {tenant?.nis || '---'}</p>
                <p>RC: {tenant?.rc || '---'} • Art: {tenant?.articleImposition || '---'}</p>
              </div>
            </div>

            <div className="text-right space-y-2">
              <div className="space-y-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">FACTURE</h1>
                <p className="text-lg font-mono font-bold text-primary">{invoice.invoiceNumber}</p>
              </div>
              <div className="text-[10px] font-black uppercase text-slate-400 space-y-1">
                <p>Date: {new Date(invoice.invoiceDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p>Règlement: {invoice.paymentMethod || 'Non précisé'}</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-10 space-y-12">
          {/* 2. CLIENT INFO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase text-primary tracking-widest">Destinataire</h3>
              <div className="space-y-1">
                <p className="text-lg font-black text-slate-900 uppercase leading-tight">{invoice.clientName}</p>
                <p className="text-xs text-slate-500">{invoice.clientAddress || 'Adresse du client'}</p>
              </div>
            </div>
            <div className="space-y-3 md:text-right">
              <h3 className="text-[10px] font-black uppercase text-primary tracking-widest">Dossier Fiscal Client</h3>
              <div className="text-[10px] font-bold text-slate-600 space-y-1">
                <p>NIF: {invoice.clientId?.substring(0, 20) || 'Non renseigné'}</p>
                <p>NIS: {invoice.clientNis || '---'}</p>
                <p>RC: {invoice.clientRc || '---'}</p>
              </div>
            </div>
          </div>

          {/* 3. TABLE DES ARTICLES */}
          <div className="overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-900 text-white">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-white font-black text-[10px] uppercase pl-6 h-12">Réf</TableHead>
                  <TableHead className="text-white font-black text-[10px] uppercase h-12">Désignation des prestations</TableHead>
                  <TableHead className="text-white font-black text-[10px] uppercase text-center h-12">Qté</TableHead>
                  <TableHead className="text-white font-black text-[10px] uppercase text-right h-12">P.U HT</TableHead>
                  <TableHead className="text-white font-black text-[10px] uppercase text-center h-12">TVA</TableHead>
                  <TableHead className="text-white font-black text-[10px] uppercase text-right pr-6 h-12">Total HT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items?.map((item: any, idx: number) => (
                  <TableRow key={idx} className="border-b h-14">
                    <TableCell className="pl-6 font-mono text-[10px] text-slate-400">{(idx + 1).toString().padStart(3, '0')}</TableCell>
                    <TableCell className="font-bold text-xs uppercase tracking-tight text-slate-900">{item.description}</TableCell>
                    <TableCell className="text-center font-bold text-xs">{item.quantity}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{item.unitPrice.toLocaleString()} DA</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="text-[9px] font-black">19%</Badge></TableCell>
                    <TableCell className="text-right pr-6 font-mono font-bold text-xs">{(item.quantity * item.unitPrice).toLocaleString()} DA</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 4. TOTALS & QR CODE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
            <div>
              <div className="p-4 bg-white border-2 border-slate-100 rounded-3xl w-fit flex flex-col items-center gap-2 shadow-sm">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <QrCode className="h-24 w-24 text-slate-900" />
                </div>
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Vérification Authenticité 2026</p>
              </div>
              {invoice.isTransportInvoice && invoice.vehiclePlate && (
                <div className="mt-6 flex items-center gap-3">
                   <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center"><Landmark className="h-4 w-4 text-blue-600" /></div>
                   <div className="text-[9px] font-black uppercase text-blue-900">
                     Unité Transport : {invoice.vehiclePlate}
                     {invoice.missionRoute && <p className="text-blue-400 font-bold tracking-tighter">{invoice.missionRoute.from} → {invoice.missionRoute.to}</p>}
                   </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase px-2">
                <span>Total Hors Taxes</span>
                <span className="font-mono">{invoice.totalAmountExcludingTax?.toLocaleString()} DA</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-emerald-600 uppercase px-2">
                <span>Total TVA (19%)</span>
                <span className="font-mono">+{invoice.totalTaxAmount?.toLocaleString()} DA</span>
              </div>
              {invoice.totalStampDutyAmount > 0 && (
                <div className="flex justify-between text-xs font-bold text-amber-600 uppercase px-2 bg-amber-50 rounded-lg py-2">
                  <span>Droit de Timbre (1%)</span>
                  <span className="font-mono">+{invoice.totalStampDutyAmount?.toLocaleString()} DA</span>
                </div>
              )}
              <div className="bg-slate-900 text-white p-5 rounded-3xl flex justify-between items-center shadow-xl shadow-slate-200">
                <span className="text-xs font-black uppercase tracking-[0.2em]">Net à Payer</span>
                <span className="text-2xl font-black">{formatDZD(invoice.totalAmountIncludingTax)}</span>
              </div>
            </div>
          </div>

          {/* 5. ARRETE EN TOUTES LETTRES */}
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-6 rounded-3xl">
             <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Certification des sommes</p>
             <p className="text-xs font-bold text-slate-700 leading-relaxed uppercase">
                Arrêté la présente facture à la somme de : <br />
                <span className="text-primary font-black">{amountInWords}</span>
             </p>
          </div>
        </CardContent>

        {/* 6. FOOTER & SIGNATURES */}
        <CardFooter className="p-10 border-t bg-slate-50/50 flex flex-col gap-12">
          <div className="grid grid-cols-2 gap-20 w-full">
            <div className="space-y-16">
              <p className="text-[9px] font-black uppercase text-slate-400">Le Client (Visa & Cachet)</p>
              <div className="border-b-2 border-slate-200 w-full" />
            </div>
            <div className="space-y-16 text-right">
              <p className="text-[9px] font-black uppercase text-slate-400">L'Émetteur (Cachet & Signature)</p>
              <div className="border-b-2 border-slate-200 w-full ml-auto" />
            </div>
          </div>
          
          <div className="text-center space-y-2 pt-8 border-t border-slate-200 w-full">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
              {invoice.paymentMethod === 'Espèces' 
                ? "Mention Légale : Droit de timbre acquitté en numéraire (Art. 200 du Code du Timbre)." 
                : "Mention Légale : Facture dispensée du droit de timbre (Paiement scriptural)."}
            </p>
            <p className="text-[7px] text-slate-300 italic">
              Document généré par ComptaFisc-DZ v2.6. Logiciel de comptabilité certifié conforme au SCF algérien.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
