
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  FileBadge, Plus, Search, Printer, 
  FileText, CheckCircle2, ShieldCheck, 
  Calculator, Landmark, History, Loader2, ArrowRight
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"

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

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <FileBadge className="text-accent h-8 w-8" /> Situations de Travaux
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Facturation à l'avancement conforme aux marchés de travaux</p>
        </div>
        <Button className="bg-primary shadow-lg" disabled={!tenantId}>
          <Plus className="mr-2 h-4 w-4" /> Nouvelle Situation
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-blue-50 border-blue-200 border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-blue-800">Total Certifié HT</p>
            <h2 className="text-3xl font-black text-blue-600">12.4M DA</h2>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200 border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-amber-800">Retenues de Garantie (5%)</p>
            <h2 className="text-3xl font-black text-amber-600">620k DA</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Net à Encaisser</p>
            <h2 className="text-3xl font-black text-emerald-600">11.78M DA</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white">
        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">Registre des Décomptes</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher projet ou situation..." className="pl-9 h-9 w-64 bg-white text-xs" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] uppercase font-black">
                <TableHead>N° / Date</TableHead>
                <TableHead>Projet / Chantier</TableHead>
                <TableHead className="text-center">Avancement</TableHead>
                <TableHead className="text-right">Montant Brut HT</TableHead>
                <TableHead className="text-right font-bold text-primary">Montant Certifié</TableHead>
                <TableHead className="text-center">Statut Visa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
              ) : !situations?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic flex flex-col items-center gap-4">
                  <FileText className="h-12 w-12 opacity-10" />
                  <span>Aucun décompte enregistré.</span>
                </TableCell></TableRow>
              ) : (
                situations.map((sit) => (
                  <TableRow key={sit.id} className="hover:bg-muted/5 group transition-colors">
                    <TableCell className="text-xs font-bold">
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
                    <TableCell className="text-right font-mono text-xs">{sit.amountHT.toLocaleString()} DA</TableCell>
                    <TableCell className="text-right font-black text-xs text-primary">{sit.certifiedAmount.toLocaleString()} DA</TableCell>
                    <TableCell className="text-center">
                      <Badge className={sit.isSigned ? "bg-emerald-500" : "bg-amber-500"}>
                        {sit.isSigned ? "VISÉ MAÎTRISE" : "EN ATTENTE VISA"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-slate-900 text-white rounded-2xl flex items-start gap-4 shadow-xl">
        <Landmark className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Expertise BTP - Retenue de Garantie :</p>
          <p className="opacity-80">
            Le système calcule automatiquement la <strong>Retenue de Garantie (5%)</strong> et la <strong>Caution de Bonne Exécution</strong> si applicable. 
            Les écritures comptables de classe 4 (411/4457) sont générées uniquement sur la base du montant certifié par le Maître d'Ouvrage ou le Bureau d'Études.
          </p>
        </div>
      </div>
    </div>
  )
}
