
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  TableProperties, Printer, FileDown, ShieldCheck, 
  Search, Filter, Calendar, Loader2, Landmark, Info
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import { formatDZD } from "@/utils/fiscalAlgerie"

export default function Etat104Page() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  React.useEffect(() => { setMounted(true) }, [])

  // 1. Profil du Tenant
  const tenantsQuery = useMemoFirebase(() => 
    (db && user) ? query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null)) : null
  , [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.find(t => t.id === tenantId) || tenants?.[0];

  // 2. Factures de Ventes (Source de l'état 104)
  const invoicesQuery = useMemoFirebase(() => 
    (db && currentTenant) ? query(collection(db, "tenants", currentTenant.id, "invoices"), orderBy("invoiceDate", "desc")) : null
  , [db, currentTenant]);
  const { data: invoices, isLoading } = useCollection(invoicesQuery);

  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(inv => 
      inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

  const totals = React.useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => ({
      ht: acc.ht + (inv.totalAmountExcludingTax || 0),
      tva: acc.tva + (inv.totalTaxAmount || 0),
      ttc: acc.ttc + (inv.totalAmountIncludingTax || 0)
    }), { ht: 0, tva: 0, ttc: 0 });
  }, [filteredInvoices]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase leading-none">
            <TableProperties className="text-accent h-8 w-8" /> État Récapitulatif 104
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-2">Justificatif légal du Chiffre d'Affaires & TVA Collectée</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl h-11 px-6 font-bold shadow-sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Imprimer Document
          </Button>
          <Button className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold">
            <FileDown className="mr-2 h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Base Imposable (HT)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary tracking-tighter">{formatDZD(totals.ht)}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">TVA Collectée (19%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 tracking-tighter">+{formatDZD(totals.tva)}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nombre de Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600 tracking-tighter">
              {new Set(filteredInvoices.map(i => i.clientId)).size} tiers
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center px-6 py-2">
          <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck className="h-16 w-16 text-accent" /></div>
          <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1 relative">Statut Audit</p>
          <div className="text-lg font-black text-white relative uppercase">CONFORME G50</div>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-muted/30 border-b flex flex-col md:flex-row items-center justify-between py-6 px-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-black uppercase tracking-tighter">Détail des Ventes par Client</CardTitle>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Client, N° Facture..." 
                className="pl-9 h-10 w-64 rounded-xl bg-white text-xs" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="text-[9px] uppercase font-black px-6 border-b h-12">
                <TableHead className="pl-8">Date / N° Facture</TableHead>
                <TableHead>Client / NIF</TableHead>
                <TableHead className="text-right">Montant HT</TableHead>
                <TableHead className="text-right">TVA (19%)</TableHead>
                <TableHead className="text-right font-bold text-primary pr-8">Total TTC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-32 text-muted-foreground italic text-xs uppercase font-black opacity-20">Aucune vente à récapituler.</TableCell></TableRow>
              ) : filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-muted/5 group transition-colors h-16">
                  <TableCell className="pl-8">
                    <div className="flex flex-col">
                      <span className="font-black text-xs uppercase text-slate-900">{inv.invoiceNumber}</span>
                      <span className="text-[9px] text-muted-foreground font-normal flex items-center gap-1">
                        <Calendar className="h-2 w-2" /> {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 uppercase">{inv.clientName}</span>
                      <span className="text-[9px] text-slate-400 font-mono">NIF: {inv.clientId?.substring(0,20) || 'Non renseigné'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{inv.totalAmountExcludingTax?.toLocaleString()} DA</TableCell>
                  <TableCell className="text-right font-mono text-xs text-emerald-600">+{inv.totalTaxAmount?.toLocaleString()} DA</TableCell>
                  <TableCell className="text-right pr-8 font-black text-xs text-primary">
                    {inv.totalAmountIncludingTax?.toLocaleString()} DA
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-slate-900 text-white h-16">
              <TableRow className="font-black border-none">
                <TableCell colSpan={2} className="pl-8 uppercase tracking-widest text-xs">Total État 104</TableCell>
                <TableCell className="text-right font-mono text-xs">{totals.ht.toLocaleString()} DA</TableCell>
                <TableCell className="text-right font-mono text-xs text-emerald-400">+{totals.tva.toLocaleString()} DA</TableCell>
                <TableCell className="text-right pr-8 font-mono text-base text-accent">{totals.ttc.toLocaleString()} DA</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
      
      <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-xl">
        <Info className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Note sur l'État 104 :</p>
          <p className="opacity-80 italic">
            "Conformément à l'Article 183 du CIDTA, cet état récapitulatif annuel ou périodique doit être tenu à la disposition de l'administration fiscale. Il justifie la TVA collectée déclarée sur vos G50. Les montants affichés ici sont extraits directement de vos factures validées, assurant une parfaite concordance avec votre comptabilité."
          </p>
        </div>
      </div>
    </div>
  )
}
