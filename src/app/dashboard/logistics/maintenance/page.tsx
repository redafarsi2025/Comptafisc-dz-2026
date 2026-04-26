
/**
 * @fileOverview Moniteur du Carnet d'Entretien Flotte.
 * Pilotage de la maintenance préventive et analytique des coûts.
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
  Wrench, Plus, Search, Filter, Loader2, 
  History, ShieldCheck, Gauge, Landmark,
  ArrowRight, Calculator, AlertTriangle, Settings, Calendar, CheckCircle2
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { formatDZD } from "@/utils/fiscalAlgerie"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

export default function MaintenanceLogsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isProcessingId, setIsProcessingId] = React.useState<string | null>(null)

  React.useEffect(() => { setMounted(true) }, [])

  const maintenanceQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "maintenance_logs"), orderBy("date", "desc"), limit(50)) : null
  , [db, tenantId]);
  const { data: logs, isLoading } = useCollection(maintenanceQuery);

  const vehiclesQuery = useMemoFirebase(() => 
    (db && tenantId) ? collection(db, "tenants", tenantId, "vehicles") : null
  , [db, tenantId]);
  const { data: vehicles } = useCollection(vehiclesQuery);

  const stats = React.useMemo(() => {
    if (!logs?.length) return { totalCost: 0, pendingAlerts: 0, count: 0 };
    const totalCost = logs.reduce((acc, l) => acc + (l.totalAmount || 0), 0);
    
    // Alertes si l'odomètre actuel dépasse l'odomètre prévu de maintenance
    let pendingAlerts = 0;
    if (vehicles) {
      vehicles.forEach(v => {
        const lastLog = logs.find(l => l.vehicleId === v.id);
        if (lastLog?.nextMaintenanceOdo && v.currentOdometer >= lastLog.nextMaintenanceOdo) {
          pendingAlerts++;
        }
      });
    }

    return { totalCost, pendingAlerts, count: logs.length };
  }, [logs, vehicles]);

  const handlePostToAccounting = async (log: any) => {
    if (!db || !tenantId || !user) return;
    setIsProcessingId(log.id);

    try {
      const journalEntriesRef = collection(db, "tenants", tenantId, "journal_entries");
      const entryData = {
        tenantId,
        entryDate: log.date,
        description: `MAINTENANCE ${log.type} - ${log.vehiclePlate} (${log.provider})`,
        documentReference: log.documentRef || "FACTURE",
        journalType: "ACHATS",
        status: 'Validated',
        createdAt: new Date().toISOString(),
        createdByUserId: user.uid,
        tenantMembers: { [user.uid]: 'owner' },
        lines: [
          { 
            accountCode: "615", 
            accountName: "Entretien et réparations", 
            debit: log.totalAmount, 
            credit: 0,
            sectionId: log.vehiclePlate 
          },
          { 
            accountCode: "401", 
            accountName: "Fournisseurs", 
            debit: 0, 
            credit: log.totalAmount 
          }
        ]
      };

      await addDocumentNonBlocking(journalEntriesRef, entryData);

      await updateDocumentNonBlocking(doc(db, "tenants", tenantId, "maintenance_logs", log.id), {
        isComptabilise: true,
        accountingEntryDate: new Date().toISOString()
      });

      toast({ 
        title: "Écrition générée", 
        description: "L'intervention a été enregistrée en charges d'entretien (615)." 
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
      l.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <Wrench className="text-accent h-8 w-8" /> Carnet d'Entretien
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Maintenance préventive & Historique technique des unités</p>
        </div>
        <Button className="bg-primary shadow-xl rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest" disabled={!tenantId} asChild>
          <Link href={`/dashboard/logistics/maintenance/new?tenantId=${tenantId}`}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle Intervention
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-2xl p-6 relative overflow-hidden flex flex-col justify-center">
           <div className="absolute top-0 right-0 p-4 opacity-10"><Wrench className="h-16 w-16 text-accent" /></div>
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Budget Maintenance (TTC)</p>
           <h2 className="text-3xl font-black">{formatDZD(stats.totalCost)}</h2>
        </Card>
        
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Alertes Échéances</p>
           <h2 className={cn("text-2xl font-black", stats.pendingAlerts > 0 ? "text-red-500" : "text-emerald-600")}>
             {stats.pendingAlerts} véhicule(s)
           </h2>
        </Card>

        <Card className="border-l-4 border-l-primary shadow-sm bg-white p-6 flex flex-col justify-center">
           <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Interventions Indexées</p>
           <h2 className="text-2xl font-black text-primary">{stats.count} fiches</h2>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 border border-l-4 border-l-emerald-500 p-6 flex items-center gap-4">
           <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
             <ShieldCheck className="h-6 w-6 text-emerald-600" />
           </div>
           <div>
             <p className="text-[10px] font-black text-emerald-800 uppercase leading-tight">Valorisation Analytique</p>
             <p className="text-[11px] text-emerald-600 font-medium">Liaison 615 / VEH</p>
           </div>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-muted/30 border-b flex flex-col md:flex-row items-center justify-between py-4 px-6 gap-4">
          <CardTitle className="text-lg font-black uppercase tracking-tighter">Historique Technique de la Flotte</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="Véhicule, Type d'opération..." 
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
                <TableHead>Opération / Type</TableHead>
                <TableHead className="text-right">Index (KM)</TableHead>
                <TableHead className="text-right">Montant (DA)</TableHead>
                <TableHead className="text-center">Prochaine Échéance</TableHead>
                <TableHead className="text-center">Compta</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary opacity-20" /></TableCell></TableRow>
              ) : !filteredLogs.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20 text-muted-foreground italic text-xs uppercase font-black opacity-20">Aucune intervention enregistrée.</TableCell></TableRow>
              ) : filteredLogs.map((log) => {
                const vehicle = vehicles?.find(v => v.id === log.vehicleId);
                const isOverdue = log.nextMaintenanceOdo && vehicle?.currentOdometer >= log.nextMaintenanceOdo;
                
                return (
                  <TableRow key={log.id} className="hover:bg-muted/5 group transition-colors h-16">
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-black text-xs uppercase text-slate-900">{log.vehicleName}</span>
                        <span className="text-[9px] font-mono text-primary font-bold uppercase">{log.vehiclePlate} • {new Date(log.date).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{log.type}</span>
                        <span className="text-[8px] font-black uppercase text-slate-400">Prestataire: {log.provider}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">{log.odometer?.toLocaleString()} KM</TableCell>
                    <TableCell className="text-right font-black text-xs text-primary">{log.totalAmount?.toLocaleString()} DA</TableCell>
                    <TableCell className="text-center">
                      {log.nextMaintenanceOdo ? (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1">
                            <span className={cn("text-xs font-black", isOverdue ? "text-red-500 animate-pulse" : "text-slate-700")}>
                              {log.nextMaintenanceOdo.toLocaleString()}
                            </span>
                            {isOverdue && <AlertTriangle className="h-3 w-3 text-red-500" />}
                          </div>
                          <span className="text-[7px] font-black uppercase opacity-40">KM CIBLE</span>
                        </div>
                      ) : (
                        <span className="text-[8px] text-slate-300 italic">Non définie</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[8px] font-black uppercase h-5", log.isComptabilise ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                        {log.isComptabilise ? 'AUDITÉ GL' : 'ATTENTE OD'}
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
                          Journaliser
                        </Button>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="p-6 bg-slate-900 text-white rounded-3xl flex items-start gap-4 shadow-xl">
        <Settings className="h-6 w-6 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-2">
          <p className="font-bold text-accent uppercase tracking-widest">Maintenance Master Node :</p>
          <div className="grid md:grid-cols-2 gap-8 mt-4">
             <div className="space-y-2 border-l-2 border-accent/20 pl-4">
                <p className="font-bold text-white uppercase text-[10px]">Maintenance Préventive</p>
                <p className="opacity-70 leading-relaxed italic">
                  Le système surveille l'odomètre "technique" du véhicule (mis à jour via les tickets carburant). Une alerte ⚠️ est déclenchée dès que le kilométrage actuel dépasse l'odomètre de maintenance cible saisi dans la dernière intervention.
                </p>
             </div>
             <div className="space-y-2 border-l-2 border-emerald-500/20 pl-4">
                <p className="font-bold text-white uppercase text-[10px]">Optimisation Classe 6</p>
                <p className="opacity-70 leading-relaxed italic">
                  Chaque facture de garage comptabilisée alimente le compte 615. L'imputation analytique automatique permet au SEAD de calculer le ratio "Dépense Entretien / KM" pour détecter les unités devenues trop coûteuses à l'exploitation.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
