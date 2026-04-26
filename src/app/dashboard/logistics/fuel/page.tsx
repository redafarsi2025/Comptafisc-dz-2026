
/**
 * @fileOverview Moniteur de Consommation Carburant Master Node.
 * Intégration de la comptabilisation automatique des tickets.
 */

"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Fuel, Plus, Search, Filter, Loader2, 
  TrendingUp, TrendingDown, History, 
  Zap, ShieldCheck, Gauge, Landmark,
  ArrowRight, CreditCard, Droplets, CheckCircle2, Calculator
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { formatDZD } from "@/utils/fiscalAlgerie"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

export default function FuelManagementPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isProcessingId, setIsProcessingId] = React.useState<string | null>(null)

  React.useEffect(() => { setMounted(true) }, [])

  const fuelQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "fuel_logs"), orderBy("date", "desc"), limit(50)) : null
  , [db, tenantId]);
  const { data: logs, isLoading } = useCollection(fuelQuery);

  const stats = React.useMemo(() => {
    if (!logs?.length) return { totalLiters: 0, totalCost: 0, avgEfficiency: 0 };
    const totalLiters = logs.reduce((acc, l) => acc + (l.liters || 0), 0);
    const totalCost = logs.reduce((acc, l) => acc + (l.totalAmount || 0), 0);
    const withEfficiency = logs.filter(l => (l.efficiency || 0) > 0);
    const avgEfficiency = withEfficiency.length > 0 
      ? withEfficiency.reduce((acc, l) => acc + l.efficiency, 0) / withEfficiency.length 
      : 0;

    return { totalLiters, totalCost, avgEfficiency };
  }, [logs]);

  const handlePostToAccounting = async (log: any) => {
    if (!db || !tenantId || !user) return;
    setIsProcessingId(log.id);

    try {
      // 1. Générer l'écriture comptable (OD ou Caisse)
      const journalEntriesRef = collection(db, "tenants", tenantId, "journal_entries");
      const entryData = {
        tenantId,
        entryDate: log.date,
        description: `CARBURANT ${log.fuelType} - ${log.vehiclePlate} (${log.gasStation})`,
        documentReference: log.documentRef || "TICKET",
        journalType: "CAISSE",
        status: 'Validated',
        createdAt: new Date().toISOString(),
        createdByUserId: user.uid,
        tenantMembers: { [user.uid]: 'owner' },
        lines: [
          { 
            accountCode: "6061", 
            accountName: "Fournitures non stockables (Carburant)", 
            debit: log.totalAmount, 
            credit: 0,
            sectionId: log.vehiclePlate // Liaison analytique par plaque
          },
          { 
            accountCode: "53", 
            accountName: "Caisse", 
            debit: 0, 
            credit: log.totalAmount 
          }
        ]
      };

      await addDocumentNonBlocking(journalEntriesRef, entryData);

      // 2. Mettre à jour le statut du log
      await updateDocumentNonBlocking(doc(db, "tenants", tenantId, "fuel_logs", log.id), {
        isComptabilise: true,
        accountingEntryDate: new Date().toISOString()
      });

      toast({ 
        title: "Écriture générée", 
        description: `Le ticket de ${log.vehiclePlate} a été intégré au journal de Caisse.` 
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur comptabilisation" });
    } finally {
      setIsProcessingId(null);
    }
  };

  const filteredLogs = React.useMemo(() => {
    if (!logs) return [];
    return logs.filter(l => 
      l.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.gasStation.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <Fuel className="text-accent h-8 w-8" /> Consommation Carburant
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Surveillance des flux d'énergie et efficience thermique</p>
        </div>
        <Button className="bg-primary shadow-xl rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest" disabled={!tenantId} asChild>
          <Link href={`/dashboard/logistics/fuel/new?tenantId=${tenantId}`}>
            <Plus className="mr-2 h-4 w-4" /> Enregistrer un Plein
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl p-6 relative overflow-hidden flex flex-col justify-center">
           <div className="absolute top-0 right-0 p-4 opacity-10"><Droplets className="h-16 w-16 text-accent" /></div>
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Volume Consommé (L)</p>
           <h2 className="text-3xl font-black">{stats.totalLiters.toLocaleString()} <span className="text-xs font-normal opacity-50">L</span></h2>
        </Card>
        
        <Card className="border-l-4 border-l-primary shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Dépense Totale (TTC)</p>
           <h2 className="text-2xl font-black text-primary">{formatDZD(stats.totalCost)}</h2>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Moyenne Flotte</p>
           <h2 className="text-2xl font-black text-emerald-600">{stats.avgEfficiency.toFixed(1)} <span className="text-xs font-normal opacity-50 text-muted-foreground">L/100</span></h2>
        </Card>

        <Card className="bg-blue-50 border-blue-100 border border-l-4 border-l-blue-500 p-6 flex items-center gap-4">
           <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
             <Landmark className="h-6 w-6 text-blue-600" />
           </div>
           <div>
             <p className="text-[10px] font-black text-blue-800 uppercase leading-tight">TVA Récupérable</p>
             <p className="text-[11px] text-blue-600 font-medium">G50 Auto-calculée</p>
           </div>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-muted/30 border-b flex flex-col md:flex-row items-center justify-between py-4 px-6 gap-4">
          <CardTitle className="text-lg font-black uppercase tracking-tighter italic">Journal des Approvisionnements</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="Véhicule, Station..." 
              className="pl-8 h-9 text-[10px] w-64 rounded-xl bg-white" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="text-[9px] uppercase font-black px-6">
                <TableHead className="pl-6">Véhicule / Date</TableHead>
                <TableHead>Station / Lieu</TableHead>
                <TableHead className="text-right">Volume (L)</TableHead>
                <TableHead className="text-right">Montant (DA)</TableHead>
                <TableHead className="text-center">Efficience</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : !filteredLogs.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20 text-muted-foreground italic text-xs uppercase font-black opacity-20">Aucun ticket de carburant trouvé.</TableCell></TableRow>
              ) : filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/5 group transition-colors h-16">
                  <TableCell className="pl-6">
                    <div className="flex flex-col">
                      <span className="font-black text-xs uppercase text-slate-900">{log.vehicleName}</span>
                      <span className="text-[9px] font-mono text-primary font-bold uppercase">{log.vehiclePlate} • {new Date(log.date).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-700">{log.gasStation}</span>
                      <span className="text-[8px] font-black uppercase text-slate-400">Réf: {log.documentRef || 'Ticket'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold">{log.liters} L</TableCell>
                  <TableCell className="text-right font-black text-xs text-primary">{log.totalAmount.toLocaleString()} DA</TableCell>
                  <TableCell className="text-center">
                    {log.efficiency ? (
                      <div className="flex flex-col items-center">
                        <span className={cn("text-xs font-black", log.efficiency > 35 ? "text-red-500" : "text-emerald-600")}>
                          {log.efficiency.toFixed(1)}
                        </span>
                        <span className="text-[7px] font-black uppercase opacity-40">L/100KM</span>
                      </div>
                    ) : (
                      <span className="text-[8px] text-slate-300 italic">Initial</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn("text-[8px] font-black uppercase h-5", log.isComptabilise ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                      {log.isComptabilise ? 'POINTÉ GL' : 'ATTENTE OD'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    {!log.isComptabilise ? (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-[9px] font-black uppercase border-primary/20 text-primary hover:bg-primary/5"
                        onClick={() => handlePostToAccounting(log)}
                        disabled={isProcessingId === log.id}
                      >
                        {isProcessingId === log.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Calculator className="h-3 w-3 mr-1" />}
                        Comptabiliser
                      </Button>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-xl">
        <Zap className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Explication de la Logique de Calcul :</p>
          <div className="grid md:grid-cols-2 gap-8 mt-4">
             <div className="space-y-2 border-l-2 border-accent/20 pl-4">
                <p className="font-bold text-white uppercase text-[10px]">Efficience (L/100km)</p>
                <p className="opacity-70 leading-relaxed italic">
                  Calculée automatiquement selon la formule : `(Volume du plein / (Index Actuel - Index Précédent)) * 100`. 
                  Cela permet de détecter instantanément les vols de carburant ou les moteurs fatigués.
                </p>
             </div>
             <div className="space-y-2 border-l-2 border-emerald-500/20 pl-4">
                <p className="font-bold text-white uppercase text-[10px]">Liaison Comptable & Analytique</p>
                <p className="opacity-70 leading-relaxed italic">
                  L'action "Comptabiliser" transforme un ticket technique en écriture légale. Le montant TTC alimente le compte 6061 et réduit votre solde de Caisse (53), tout en s'imputant au véhicule pour son calcul de ROI.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
