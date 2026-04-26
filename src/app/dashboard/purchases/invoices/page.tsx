
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Receipt, ShieldCheck, CheckCircle2, AlertTriangle, 
  Calculator, Loader2, Search, ArrowRight,
  FileCheck, FileText, Landmark, Plus
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export default function SupplierInvoicesMatching() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isMatching, setIsMatching] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Simulation de factures à rapprocher (BC vs BR vs Facture)
  const [pendingMatches, setPendingMatches] = React.useState([
    { 
      id: "MATCH_001",
      supplier: "IT SOLUTIONS DZ",
      invoiceNum: "FAC-2026-99",
      bcAmount: 120000,
      brQty: 10,
      invAmount: 120000,
      invQty: 10,
      status: "CONFORME"
    },
    { 
      id: "MATCH_002",
      supplier: "BTP MATÉRIEL",
      invoiceNum: "FAC-887",
      bcAmount: 45000,
      brQty: 50,
      invAmount: 48000,
      invQty: 50,
      status: "ÉCART_PRIX"
    }
  ])

  const handleValidateInvoice = async (matchId: string) => {
    if (!db || !tenantId || !user) return;
    setIsMatching(true);
    
    // Logique simulée de validation
    try {
      toast({ title: "Facture Validée", description: "Écritures SCF (30/4456/401) générées automatiquement." });
      setPendingMatches(prev => prev.filter(m => m.id !== matchId));
    } finally {
      setIsMatching(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Receipt className="text-accent h-8 w-8" /> Contrôle Factures Fournisseurs
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Logiciel de Rapprochement 3-Way Matching</p>
        </div>
        <Button className="bg-primary shadow-lg"><Plus className="mr-2 h-4 w-4" /> Enregistrer Facture</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-emerald-50 border-emerald-200 border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-emerald-800">Prêt pour Comptabilisation</p>
            <h2 className="text-3xl font-black text-emerald-600">12 dossiers</h2>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200 border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-amber-800">Écarts à Justifier</p>
            <h2 className="text-3xl font-black text-amber-600">3 factures</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary shadow-sm bg-white">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">TVA Récupérable (Période)</p>
            <h2 className="text-3xl font-black text-primary">84,500 DA</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">File d'attente de Rapprochement</CardTitle>
            <CardDescription>Comparaison automatisée entre Engagement, Réception et Facturation.</CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Chercher fournisseur..." className="pl-9 h-9 w-64 bg-white" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] uppercase font-black">
                <TableHead>Fournisseur / Facture</TableHead>
                <TableHead className="text-center">BC (Engagement)</TableHead>
                <TableHead className="text-center">BR (Réception)</TableHead>
                <TableHead className="text-center">FACTURE (Reçue)</TableHead>
                <TableHead className="text-center">Verdict IA</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingMatches.map((match) => (
                <TableRow key={match.id} className="hover:bg-muted/5 group">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs">{match.supplier}</span>
                      <span className="text-[9px] font-mono text-muted-foreground">{match.invoiceNum}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">{match.bcAmount.toLocaleString()} DA</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[9px]">{match.brQty} unités</Badge>
                  </TableCell>
                  <TableCell className="text-center font-bold text-xs">{match.invAmount.toLocaleString()} DA</TableCell>
                  <TableCell className="text-center">
                    {match.status === "CONFORME" ? (
                      <Badge className="bg-emerald-500 text-white text-[8px] flex items-center gap-1 mx-auto w-fit">
                        <CheckCircle2 className="h-2 w-2" /> CONFORME
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[8px] flex items-center gap-1 mx-auto w-fit animate-pulse">
                        <AlertTriangle className="h-2 w-2" /> ÉCART PRIX
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      className={`h-7 text-[10px] font-bold ${match.status === 'CONFORME' ? 'bg-primary' : 'bg-muted text-muted-foreground'}`}
                      onClick={() => handleValidateInvoice(match.id)}
                      disabled={isMatching}
                    >
                      {isMatching ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileCheck className="h-3 w-3 mr-1" />}
                      Valider & Imputer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-t-4 border-t-primary shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" /> Schéma Comptable SCF Automatisé
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-slate-950 p-6 rounded-xl font-mono text-[11px] text-emerald-400 space-y-2">
            <p className="opacity-50">// Écriture générée à la validation</p>
            <div className="flex justify-between border-b border-white/10 pb-1">
              <span>(D) 30 - Stocks de marchandises</span>
              <span>100,840.34</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-1">
              <span>(D) 4456 - TVA déductible (19%)</span>
              <span>19,159.66</span>
            </div>
            <div className="flex justify-between text-blue-400 pt-1">
              <span className="pl-4">(C) 401 - Fournisseurs de stocks</span>
              <span>120,000.00</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 flex flex-col justify-center items-center text-center p-8 bg-muted/10">
          <FileText className="h-12 w-12 text-primary opacity-20 mb-4" />
          <h4 className="font-bold text-sm">Génération de l'Avoir</h4>
          <p className="text-[10px] text-muted-foreground max-w-xs mt-2">
            En cas d'écart de prix non justifié par le fournisseur, générez automatiquement une demande d'avoir pour corriger la balance.
          </p>
          <Button variant="outline" size="sm" className="mt-4">Procéder à l'ajustement</Button>
        </Card>
      </div>
    </div>
  )
}
