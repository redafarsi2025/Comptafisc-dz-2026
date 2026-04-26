/**
 * @fileOverview Traçabilité des Lots & Dates de Péremption (Pharmacie / Clinique).
 */

"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FlaskConical, Search, Filter, Loader2, 
  AlertTriangle, ShieldCheck, Calendar,
  History, Database, Tag, ShieldAlert, Clock
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import { isBefore, addMonths, parseISO, format } from "date-fns"
import { cn } from "@/lib/utils"

export default function HealthLotsTracking() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  React.useEffect(() => { setMounted(true) }, [])

  // Simuler des données de lots (En production, ce serait une sous-collection de products)
  const mockLots = [
    { id: 'L1', productName: 'PARACETAMOL 500mg', code: 'PHA-001', lotNumber: 'BN-2024-X', expiryDate: '2026-05-15', qty: 450, status: 'GOOD' },
    { id: 'L2', productName: 'AUGMENTIN 1g', code: 'PHA-042', lotNumber: 'BN-2024-Y', expiryDate: '2026-03-10', qty: 120, status: 'EXPIRED' },
    { id: 'L3', productName: 'INSULINE LANTUS', code: 'PHA-105', lotNumber: 'LOT-998', expiryDate: '2026-04-01', qty: 85, status: 'WARNING' },
    { id: 'L4', productName: 'VACCIN GRIPAL', code: 'PHA-221', lotNumber: 'BN-2025-A', expiryDate: '2027-01-20', qty: 300, status: 'GOOD' },
  ];

  const filteredLots = mockLots.filter(l => 
    l.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.lotNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (expiryDate: string) => {
    const expiry = parseISO(expiryDate);
    const now = new Date();
    const criticalDate = addMonths(now, 3);

    if (isBefore(expiry, now)) return <Badge className="bg-red-500 text-[8px] font-black">PÉRIMÉ</Badge>;
    if (isBefore(expiry, criticalDate)) return <Badge className="bg-amber-500 text-[8px] font-black">PROCHE PÉREMPTION</Badge>;
    return <Badge className="bg-emerald-500 text-[8px] font-black">VALIDE</Badge>;
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <FlaskConical className="text-accent h-8 w-8" /> Traçabilité Santé
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Gestion des lots, dates de péremption & psychotropes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl h-11 px-6 font-bold shadow-sm">
             <ShieldAlert className="mr-2 h-4 w-4 text-red-500" /> Registre Psychotropes
          </Button>
          <Button className="bg-primary shadow-xl h-11 px-6 rounded-xl font-bold">
            Importer Inventaire Lot
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-primary">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Total Lots Actifs</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-primary tracking-tighter">{mockLots.length}</div></CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-red-500">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Périmés / À Retirer</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-red-600">1</div></CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-amber-500">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Alerte &lt; 3 mois</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-amber-600">1</div></CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center px-6">
          <ShieldCheck className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
          <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1 relative">Certification Santé</p>
          <div className="text-lg font-black text-white relative uppercase">Audit Ready</div>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4 px-6">
          <CardTitle className="text-lg font-black uppercase tracking-tighter">Moniteur des Péremptions</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Chercher produit ou lot..." 
              className="pl-9 h-9 w-64 bg-white text-xs rounded-xl" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] uppercase font-black px-6">
                <TableHead className="pl-6">Produit / Désignation</TableHead>
                <TableHead>Numéro de Lot</TableHead>
                <TableHead className="text-center">Date Péremption</TableHead>
                <TableHead className="text-right">Stock Réel</TableHead>
                <TableHead className="text-center">Statut Alerte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLots.map((lot) => (
                <TableRow key={lot.id} className="hover:bg-muted/5 group transition-colors h-16">
                  <TableCell className="pl-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs uppercase text-slate-900">{lot.productName}</span>
                      <span className="text-[9px] font-mono text-muted-foreground uppercase">{lot.code}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-bold font-mono text-primary">{lot.lotNumber}</TableCell>
                  <TableCell className="text-center">
                     <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold">{lot.expiryDate}</span>
                        <div className="flex items-center gap-1 text-[8px] font-black uppercase opacity-40">
                           <Clock className="h-2 w-2" /> J-X jours
                        </div>
                     </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold">
                    {lot.qty} <span className="text-[9px] font-normal text-muted-foreground">U</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(lot.expiryDate)}
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
          <p className="font-bold text-accent uppercase tracking-widest">Rappel Réglementaire Santé (Algérie) :</p>
          <p className="opacity-80 italic">
            "Conformément à la réglementation du Ministère de la Santé, le retrait des lots périmés doit être immédiat et documenté par un PV de destruction visé par un huissier ou un service de contrôle. Le système génère automatiquement l'alerte à J-90 jours pour optimiser vos retours fournisseurs."
          </p>
        </div>
      </div>
    </div>
  )
}
