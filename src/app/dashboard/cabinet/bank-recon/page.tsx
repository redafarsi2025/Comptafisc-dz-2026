
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Landmark, FileUp, ShieldCheck, ArrowRightLeft, Loader2, Info, Search, CheckCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

export default function BankReconciliation() {
  const [isUploading, setIsUploading] = React.useState(false)
  const [reconProgress, setReconProgress] = React.useState(0)

  const handleUpload = () => {
    setIsUploading(true)
    let p = 0
    const interval = setInterval(() => {
      p += 10
      setReconProgress(p)
      if (p >= 100) {
        clearInterval(interval)
        setIsUploading(false)
      }
    }, 200)
  }

  const transactions = [
    { id: 1, date: "2026-03-01", label: "VIREMENT CLIENT ABC", amount: 150000, status: "matched", match: "Facture FAC-2026-045" },
    { id: 2, date: "2026-03-02", label: "FRAIS BANCAIRES MARS", amount: -1500, status: "suggested", match: "Compte 627 - Services bancaires" },
    { id: 3, date: "2026-03-05", label: "VERSEMENT ESPECES", amount: 45000, status: "unmatched", match: null },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Landmark className="h-8 w-8 text-accent" /> Rapprochement Bancaire
          </h1>
          <p className="text-muted-foreground text-sm">Matching automatique entre vos relevés bancaires (CIB/SWIFT) et votre comptabilité.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleUpload} disabled={isUploading}>
            <FileUp className="mr-2 h-4 w-4" /> Importer Fichier (CIB/CSV)
          </Button>
        </div>
      </div>

      {isUploading && (
        <Card className="bg-primary/5 border-primary/20 animate-pulse">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-primary uppercase">Analyse du relevé bancaire par l'IA...</span>
              <span className="text-xs font-mono">{reconProgress}%</span>
            </div>
            <Progress value={reconProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-emerald-800">Match Automatique (IA)</p>
            <h2 className="text-3xl font-bold text-emerald-600">85%</h2>
            <p className="text-[10px] text-emerald-700 mt-1 italic">Taux de confiance élevé sur les libellés.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Transactions à Pointer</p>
            <h2 className="text-3xl font-bold text-primary">12</h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Écart de Rapprochement</p>
            <h2 className="text-3xl font-bold text-amber-600">0.00 DA</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader className="bg-muted/20 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Matching Relevé vs Journal de Banque</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Chercher une ligne..." className="pl-9 h-9 w-64 bg-white" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libellé Relevé</TableHead>
                <TableHead className="text-right">Débit</TableHead>
                <TableHead className="text-right">Crédit</TableHead>
                <TableHead className="text-center">Correspondance Comptable</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/5">
                  <TableCell className="text-xs">{t.date}</TableCell>
                  <TableCell className="font-medium text-xs">{t.label}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{t.amount < 0 ? Math.abs(t.amount).toLocaleString() : "-"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{t.amount > 0 ? t.amount.toLocaleString() : "-"}</TableCell>
                  <TableCell className="text-center">
                    {t.status === "matched" && (
                      <div className="flex flex-col items-center">
                        <Badge className="bg-emerald-500 h-4 text-[8px] mb-1">AUTO-MATCH</Badge>
                        <span className="text-[9px] text-muted-foreground">{t.match}</span>
                      </div>
                    )}
                    {t.status === "suggested" && (
                      <div className="flex flex-col items-center">
                        <Badge variant="outline" className="border-primary text-primary h-4 text-[8px] mb-1">SUGGESTION IA</Badge>
                        <span className="text-[9px] text-muted-foreground">{t.match}</span>
                      </div>
                    )}
                    {t.status === "unmatched" && (
                      <Badge variant="destructive" className="h-4 text-[8px]">À RECHERCHER</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {t.status === "matched" ? (
                      <Button variant="ghost" size="icon" className="text-emerald-600"><CheckCircle className="h-4 w-4" /></Button>
                    ) : (
                      <Button variant="outline" size="sm" className="h-7 text-[10px]">Pointer</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="p-4 bg-muted/30 border-t flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
            <Info className="h-4 w-4 text-primary" /> Note: Le matching se base sur le montant exact et la proximité sémantique des libellés.
          </div>
          <Button className="bg-primary shadow-md">
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Générer Écritures de Banque
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
