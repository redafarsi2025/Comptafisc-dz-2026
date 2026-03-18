
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Repeat, FileCheck, Loader2, AlertCircle, ShieldCheck, Download, Calculator } from "lucide-react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function BulkG50() {
  const db = useFirestore()
  const { user } = useUser()
  const [selectedClients, setSelectedClients] = React.useState<string[]>([])
  const [isProcessing, setIsProcessing] = React.useState(false)

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants, isLoading } = useCollection(tenantsQuery);

  const handleSelectAll = (checked: boolean) => {
    if (checked && tenants) {
      setSelectedClients(tenants.map(t => t.id));
    } else {
      setSelectedClients([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedClients(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkProcess = async () => {
    if (selectedClients.length === 0) return;
    setIsProcessing(true);
    
    // Simulation du traitement groupé
    await new Promise(r => setTimeout(r, 2000));
    
    setIsProcessing(false);
    toast({
      title: "Traitement terminé",
      description: `${selectedClients.length} déclarations G50 ont été préparées avec succès.`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Repeat className="h-8 w-8 text-accent" /> Déclarations Groupées (Bulk)
          </h1>
          <p className="text-muted-foreground text-sm">Préparez et validez les G50 de plusieurs clients en une seule session.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={selectedClients.length === 0}><Download className="mr-2 h-4 w-4" /> Export ZIP</Button>
          <Button 
            className="bg-primary shadow-lg" 
            disabled={selectedClients.length === 0 || isProcessing}
            onClick={handleBulkProcess}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
            Calculer {selectedClients.length} dossiers
          </Button>
        </div>
      </div>

      <Card className="border-t-4 border-t-primary shadow-xl">
        <CardHeader className="bg-muted/20 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg">Session de Déclaration : Mars 2026</CardTitle>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Février 2026 complété</Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" /> Échéance : 20 Avril 2026
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={selectedClients.length === (tenants?.length || 0) && selectedClients.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">CA Mars (HT)</TableHead>
                <TableHead className="text-right">TVA à Verser</TableHead>
                <TableHead className="text-right">IRG Salarié</TableHead>
                <TableHead className="text-center">Prêt ?</TableHead>
                <TableHead className="text-right">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12">Chargement des dossiers...</TableCell></TableRow>
              ) : tenants?.map((t) => (
                <TableRow key={t.id} className={selectedClients.includes(t.id) ? "bg-primary/5" : ""}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedClients.includes(t.id)} 
                      onCheckedChange={() => toggleSelect(t.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs">{t.raisonSociale}</span>
                      <span className="text-[10px] text-muted-foreground">{t.regimeFiscal}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-[10px]">1,200,000.00</TableCell>
                  <TableCell className="text-right font-mono text-[10px] text-primary">228,000.00</TableCell>
                  <TableCell className="text-right font-mono text-[10px] text-accent">45,000.00</TableCell>
                  <TableCell className="text-center">
                    {t.onboardingComplete ? (
                      <Badge className="bg-emerald-500 h-4 text-[8px]">OUI</Badge>
                    ) : (
                      <Badge variant="destructive" className="h-4 text-[8px]">MANQUE PIÈCES</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="h-4 text-[8px] uppercase">En attente</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t p-4 flex justify-between items-center">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Validation certifiée par le moteur fiscal 2026
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Total TVA Groupée</p>
              <p className="text-lg font-black text-primary">456,000.00 DA</p>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={selectedClients.length === 0}>
              <FileCheck className="mr-2 h-4 w-4" /> Valider & Générer bordereaux
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
