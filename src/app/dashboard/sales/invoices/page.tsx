
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy, limit, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Receipt, Plus, Search, Filter, 
  Loader2, Printer, CheckCircle2,
  ArrowRight, FileText, Layout, TrendingUp, 
  Wallet, Banknote, ShieldCheck, Truck, Calendar
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function IssuedInvoicesListing() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user?.uid]);
  const { data: tenants } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants) return null;
    if (tenantId) return tenants.find(t => t.id === tenantId);
    return tenants[0];
  }, [tenants, tenantId]);

  const isTransport = currentTenant?.secteurActivite === "TRANSPORT";

  const invoicesQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "invoices"), orderBy("createdAt", "desc"), limit(100)) : null
  , [db, tenantId]);
  const { data: invoices, isLoading } = useCollection(invoicesQuery);

  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(inv => 
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

  const stats = React.useMemo(() => {
    if (!invoices) return { totalHT: 0, totalTVA: 0, count: 0 };
    return invoices.reduce((acc, inv) => ({
      totalHT: acc.totalHT + (inv.totalAmountExcludingTax || 0),
      totalTVA: acc.totalTVA + (inv.totalTaxAmount || 0),
      count: acc.count + 1
    }), { totalHT: 0, totalTVA: 0, count: 0 });
  }, [invoices]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <Receipt className="text-accent h-8 w-8" /> Factures Émises
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Registre légal des ventes et prestations de services</p>
        </div>
        <Button className="bg-primary shadow-xl rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest" disabled={!tenantId} asChild>
          <Link href={`/dashboard/invoicing?tenantId=${tenantId}`}>
            <Plus className="mr-2 h-4 w-4" /> Créer une Facture
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl p-6 relative overflow-hidden flex flex-col justify-center">
           <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="h-16 w-16 text-accent" /></div>
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Chiffre d'Affaires HT</p>
           <h2 className="text-3xl font-black">{stats.totalHT.toLocaleString()} <span className="text-xs font-normal opacity-50">DA</span></h2>
        </Card>
        
        <Card className="border-l-4 border-l-primary shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">TVA Collectée (G50)</p>
           <h2 className="text-2xl font-black text-primary">+{stats.totalTVA.toLocaleString()} DA</h2>
           <p className="text-[9px] text-muted-foreground mt-1 italic">Prêt pour déclaration mensuelle</p>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Encours Clients</p>
           <h2 className="text-2xl font-black text-amber-600">{(stats.totalHT + stats.totalTVA).toLocaleString()} DA</h2>
           <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-amber-500 uppercase">
              <Wallet className="h-3 w-3" /> À lettrer en Compte 411
           </div>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 border border-l-4 border-l-emerald-500 p-6 flex items-center gap-4">
           <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
             <ShieldCheck className="h-6 w-6 text-emerald-600" />
           </div>
           <div>
             <p className="text-[10px] font-black text-emerald-800 uppercase leading-tight">Authenticité</p>
             <p className="text-[11px] text-emerald-600 font-medium">Traceur Fiscal Actif</p>
           </div>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-muted/30 border-b flex flex-col md:flex-row items-center justify-between py-6 px-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-black uppercase tracking-tighter italic">Journal Chronologique des Ventes</CardTitle>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="N° Facture, Client..." 
                className="pl-9 h-10 w-64 rounded-xl bg-white text-xs" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl"><Filter className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="text-[9px] uppercase font-black px-6 border-b h-12">
                <TableHead className="pl-8">Référence / Date</TableHead>
                <TableHead>Client Destinataire</TableHead>
                {isTransport && <TableHead className="text-center">Véhicule / Unité</TableHead>}
                <TableHead className="text-right">Montant HT</TableHead>
                <TableHead className="text-right">TVA (19%)</TableHead>
                <TableHead className="text-right font-bold text-primary pr-8">Total TTC</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={isTransport ? 8 : 7} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow><TableCell colSpan={isTransport ? 8 : 7} className="text-center py-32 text-muted-foreground italic text-xs uppercase font-black opacity-20">Aucune facture enregistrée dans ce dossier.</TableCell></TableRow>
              ) : filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-muted/5 group transition-colors h-20">
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
                      <span className="text-[9px] text-slate-400 font-medium">{inv.paymentMethod}</span>
                    </div>
                  </TableCell>
                  {isTransport && (
                    <TableCell className="text-center">
                       {inv.vehiclePlate ? (
                         <div className="flex flex-col items-center">
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 text-[9px] font-black h-5 uppercase">
                              <Truck className="h-2 w-2 mr-1" /> {inv.vehiclePlate}
                            </Badge>
                            {inv.missionRoute && (
                              <span className="text-[8px] text-slate-400 font-bold mt-1 uppercase truncate w-24">
                                {inv.missionRoute.from} → {inv.missionRoute.to}
                              </span>
                            )}
                         </div>
                       ) : (
                         <span className="text-[8px] text-slate-300 italic">Prestation libre</span>
                       )}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono text-xs">{inv.totalAmountExcludingTax?.toLocaleString()} DA</TableCell>
                  <TableCell className="text-right font-mono text-xs text-emerald-600">+{inv.totalTaxAmount?.toLocaleString()} DA</TableCell>
                  <TableCell className="text-right pr-8 font-black text-xs text-primary">
                    {inv.totalAmountIncludingTax?.toLocaleString()} DA
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn(
                      "text-[8px] font-black uppercase h-5",
                      inv.status === 'Issued' ? "bg-blue-500" : "bg-emerald-500"
                    )}>
                      {inv.status === 'Issued' ? 'ÉMISE' : 'PAYÉE'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all pr-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-xl hover:bg-primary/5">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" asChild>
                        <Link href={`/dashboard/sales/invoices/${inv.id}?tenantId=${tenantId}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-xl">
        <ShieldCheck className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Contrôle de l'Image Fidèle (SCF) :</p>
          <p className="opacity-80 italic">
            "Le registre des factures émises constitue le journal auxiliaire des ventes. Chaque pièce est automatiquement lettrée avec votre Grand Livre pour garantir l'exactitude de la Classe 7 et de la TVA collectée (4457). En cas d'annulation, veillez à émettre une facture d'avoir pour régulariser votre comptabilité."
          </p>
        </div>
      </div>
    </div>
  )
}
