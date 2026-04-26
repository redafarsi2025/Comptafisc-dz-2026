
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  FileBadge, Plus, Search, Printer, 
  FileText, CheckCircle2, ShieldCheck, 
  Calculator, Landmark, History, Loader2, ArrowRight, Edit3, Clock
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import { calculateRetenueGarantie } from "@/lib/calculations"
import Link from "next/link"
import { isAfter, parseISO } from "date-fns"

export default function BtpSituationsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const situationsQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "situations"), orderBy("date", "desc")) : null
  , [db, tenantId]);
  const { data: situations, isLoading } = useCollection(situationsQuery);

  const stats = React.useMemo(() => {
    if (!situations) return { totalCertifie: 0, totalRetenue: 0, netEncaisser: 0, exigibleRetenue: 0 };
    const totalCertifie = situations.reduce((acc, s) => acc + (s.certifiedAmount || 0), 0);
    const totalRetenue = situations.reduce((acc, s) => acc + (s.totalRetenue || calculateRetenueGarantie(s.certifiedAmount || 0, 'BTP')), 0);
    
    // Calculer les retenues exigibles (date passée)
    const exigibleRetenue = situations.reduce((acc, s) => {
      if (s.warrantyReleaseDate && isAfter(new Date(), parseISO(s.warrantyReleaseDate))) {
        return acc + (s.totalRetenue || 0);
      }
      return acc;
    }, 0);

    return {
      totalCertifie,
      totalRetenue,
      exigibleRetenue,
      netEncaisser: totalCertifie - totalRetenue
    };
  }, [situations]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <FileBadge className="text-accent h-8 w-8" /> Situations de Travaux
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Facturation à l'avancement avec retenue de garantie (5%)</p>
        </div>
        <Button className="bg-primary shadow-lg rounded-xl font-bold h-11 px-6" disabled={!tenantId} asChild>
          <Link href={`/dashboard/btp/situations/manage?tenantId=${tenantId}`}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle Situation
          </Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-blue-50 border-blue-200 border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-blue-800">Total Certifié HT</p>
            <h2 className="text-2xl font-black text-blue-600">{stats.totalCertifie.toLocaleString()} DA</h2>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200 border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-amber-800">Retenues Immobilisées (4118)</p>
            <h2 className="text-2xl font-black text-amber-600">{stats.totalRetenue.toLocaleString()} DA</h2>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200 border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-emerald-800">Retenues Récupérables</p>
            <h2 className="text-2xl font-black text-emerald-600">{stats.exigibleRetenue.toLocaleString()} DA</h2>
            <p className="text-[9px] text-emerald-700 italic mt-1">Réceptions définitives acquises.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary shadow-sm bg-white">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Cash Encaissé (Net)</p>
            <h2 className="text-2xl font-black text-primary">{stats.netEncaisser.toLocaleString()} DA</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4 px-6">
          <CardTitle className="text-lg">Registre des Décomptes</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher projet..." className="pl-9 h-9 w-64 bg-white text-xs rounded-xl" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] uppercase font-black px-6">
                <TableHead className="pl-6">N° / Date</TableHead>
                <TableHead>Projet</TableHead>
                <TableHead className="text-center">Avancement</TableHead>
                <TableHead className="text-right">Montant Certifié</TableHead>
                <TableHead className="text-right text-amber-600">Retenue (5%)</TableHead>
                <TableHead className="text-center">Libération Prévue</TableHead>
                <TableHead className="text-center">Statut Visa</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : !situations?.length ? (
                <TableRow><TableCell colSpan={8} className="text-center py-20 text-muted-foreground italic flex flex-col items-center gap-4">
                  <FileText className="h-12 w-12 opacity-10" />
                  <span>Aucun décompte enregistré.</span>
                </TableCell></TableRow>
              ) : (
                situations.map((sit) => {
                  const isExigible = sit.warrantyReleaseDate && isAfter(new Date(), parseISO(sit.warrantyReleaseDate));
                  return (
                    <TableRow key={sit.id} className="hover:bg-muted/5 group transition-colors">
                      <TableCell className="text-xs font-bold pl-6">
                        <div className="flex flex-col">
                          <span>SIT-N°{sit.number}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">{sit.date}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium uppercase">{sit.projectName}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-black">{sit.progress}%</span>
                          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${sit.progress}%` }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{sit.certifiedAmount.toLocaleString()} DA</TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-600">-{sit.totalRetenue?.toLocaleString() || '0'} DA</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-[10px] font-bold ${isExigible ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {sit.warrantyReleaseDate || 'N/A'}
                          </span>
                          {isExigible && <Badge className="h-3 text-[7px] bg-emerald-500">EXIGIBLE</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={sit.isSigned ? "bg-emerald-500" : "bg-amber-500"}>
                          {sit.isSigned ? "VISÉ MAÎTRISE" : "EN ATTENTE VISA"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" asChild>
                          <Link href={`/dashboard/btp/situations/manage?tenantId=${tenantId}&id=${sit.id}`}>
                            <Edit3 className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-xl">
        <Landmark className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Expertise BTP - Retenue de Garantie :</p>
          <p className="opacity-80">
            Conformément aux usages du BTP en Algérie, la retenue de garantie de 5% est calculée sur le montant brut certifié de chaque situation. 
            Le système suit automatiquement ces montants exigibles pour optimiser votre recouvrement de fin de marché.
          </p>
        </div>
      </div>
    </div>
  )
}
