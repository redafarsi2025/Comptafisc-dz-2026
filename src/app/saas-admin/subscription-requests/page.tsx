"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, doc, arrayUnion } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CheckCircle2, XCircle, Loader2, Clock, 
  ShoppingBag, ShieldCheck, Mail, Building2,
  Filter, Search, Info, Landmark
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function SubscriptionRequestsAdmin() {
  const db = useFirestore()
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null)

  React.useEffect(() => { setMounted(true) }, [])

  const requestsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "subscription_requests"), orderBy("requestedAt", "desc")) : null
  , [db]);
  const { data: requests, isLoading } = useCollection(requestsQuery);

  const handleApprove = async (request: any) => {
    if (!db) return;
    setIsProcessing(request.id);
    try {
      // 1. Mettre à jour le tenant pour activer l'addon
      const tenantRef = doc(db, "tenants", request.tenantId);
      await updateDocumentNonBlocking(tenantRef, {
        activeAddons: arrayUnion(request.addonId),
        updatedAt: new Date().toISOString()
      });

      // 2. Marquer la requête comme approuvée
      const requestRef = doc(db, "subscription_requests", request.id);
      await updateDocumentNonBlocking(requestRef, {
        status: "APPROVED",
        processedAt: new Date().toISOString()
      });

      toast({ title: "Souscription approuvée", description: `Le service ${request.addonName} est actif pour ${request.tenantName}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur lors de l'approbation" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (request: any) => {
    if (!db) return;
    setIsProcessing(request.id);
    try {
      const requestRef = doc(db, "subscription_requests", request.id);
      await updateDocumentNonBlocking(requestRef, {
        status: "REJECTED",
        processedAt: new Date().toISOString()
      });
      toast({ title: "Souscription rejetée" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredRequests = React.useMemo(() => {
    if (!requests) return [];
    return requests.filter(r => 
      r.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.addonName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requests, searchTerm]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20 text-start">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <ShoppingBag className="text-accent h-10 w-10" /> Demandes Premium
          </h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest">Validation manuelle des souscriptions aux add-ons</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 tracking-tighter">
              {requests?.filter(r => r.status === 'PENDING').length || 0} demandes
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Approuvées (Total)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 tracking-tighter">
              {requests?.filter(r => r.status === 'APPROVED').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden flex flex-col justify-center p-6 md:col-span-2">
           <ShieldCheck className="absolute -right-4 -top-4 h-24 w-24 opacity-10 text-accent" />
           <p className="text-[10px] uppercase font-black text-accent tracking-widest mb-1">Status Moteur</p>
           <h2 className="text-lg font-black uppercase">Validation Manuelle Active</h2>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
           <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg font-black uppercase tracking-tighter">Flux des Souscriptions</CardTitle>
           </div>
           <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Dossier ou service..." 
                className="pl-10 h-10 w-80 rounded-2xl bg-white border-slate-200" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-100">
              <TableRow>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 px-8">Client / Demandeur</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Service Demandé</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Date de Demande</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-center">Statut</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-right px-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></TableCell></TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 italic text-slate-400">Aucune demande trouvée.</TableCell></TableRow>
              ) : filteredRequests.map((r) => (
                <TableRow key={r.id} className="hover:bg-slate-50 transition-colors group">
                  <TableCell className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 uppercase tracking-tight">{r.tenantName}</span>
                      <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1"><Mail className="h-2 w-2" /> {r.userEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[10px] px-3">
                      {r.addonName}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-6 text-xs font-bold text-slate-500">
                    {new Date(r.requestedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="py-6 text-center">
                    <Badge className={cn(
                      "text-[8px] font-black uppercase px-2 h-5",
                      r.status === 'PENDING' ? "bg-amber-500" : r.status === 'APPROVED' ? "bg-emerald-500" : "bg-red-500"
                    )}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-6 text-right px-8">
                    {r.status === 'PENDING' && (
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:bg-red-50 h-8 w-8"
                          onClick={() => handleReject(r)}
                          disabled={isProcessing === r.id}
                        >
                          <XCircle className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-emerald-600 hover:bg-emerald-50 h-8 w-8"
                          onClick={() => handleApprove(r)}
                          disabled={isProcessing === r.id}
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="p-8 bg-blue-50 border border-blue-200 rounded-3xl flex items-start gap-6 shadow-sm">
        <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center border border-blue-100 shrink-0 shadow-sm">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
        </div>
        <div className="text-xs text-blue-900 leading-relaxed space-y-4">
          <p className="font-black text-blue-800 uppercase tracking-widest">Protocole de Validation SaaS :</p>
          <p className="font-medium">
            L'approbation d'une demande déclenche deux actions atomiques : l'injection de l'ID du service dans le champ `activeAddons` du dossier client (tenant) et l'archivage de la requête. Le client bénéficie alors immédiatement de la fonctionnalité sans rechargement de page.
          </p>
        </div>
      </div>
    </div>
  )
}