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
  Filter, Search, Info, Landmark, Edit
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { PLANS } from "@/lib/plans"

export default function SubscriptionRequestsAdmin() {
  const db = useFirestore()
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null)

  React.useEffect(() => { setMounted(true) }, [])

  const requestsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "subscription_requests"), orderBy("createdAt", "desc")) : null
  , [db]);
  const { data: requests, isLoading } = useCollection(requestsQuery);

  const tenantsQuery = useMemoFirebase(() => db ? query(collection(db, "tenants"), orderBy("raisonSociale", "asc")) : null, [db]);
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);

  const handleApprove = async (request: any) => {
    if (!db) return;
    setIsProcessing(request.id);
    try {
      const tenantRef = doc(db, "tenants", request.tenantId);
      if (request.type === 'PLAN_UPGRADE') {
        await updateDocumentNonBlocking(tenantRef, { planId: request.requestedPlanId });
      } else if (request.type === 'ADDON_PURCHASE') {
        await updateDocumentNonBlocking(tenantRef, { activeAddons: arrayUnion(request.requestedAddonId) });
      }
      const requestRef = doc(db, "subscription_requests", request.id);
      await updateDocumentNonBlocking(requestRef, { status: "APPROVED" });
      toast({ title: "Souscription approuvée" });
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
      await updateDocumentNonBlocking(requestRef, { status: "REJECTED" });
      toast({ title: "Souscription rejetée" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDirectPlanChange = async (tenantId: string, newPlanId: string) => {
    if (!db) return;
    setIsProcessing(tenantId);
    try {
        const tenantRef = doc(db, "tenants", tenantId);
        await updateDocumentNonBlocking(tenantRef, { planId: newPlanId });
        toast({ title: "Plan modifié", description: `Le plan a été changé avec succès.` });
    } catch (e) {
        toast({ variant: "destructive", title: "Erreur de modification" });
    } finally {
        setIsProcessing(null);
    }
  };

  const filteredRequests = React.useMemo(() => requests?.filter(r => r.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())) || [], [requests, searchTerm]);
  const filteredTenants = React.useMemo(() => tenants?.filter(t => t.raisonSociale.toLowerCase().includes(searchTerm.toLowerCase())) || [], [tenants, searchTerm]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20 text-start">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <ShoppingBag className="text-accent h-10 w-10" /> Abonnements & Plans
          </h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase text-[10px] tracking-widest">Gestion des demandes et modification directe des plans</p>
        </div>
      </div>

      {/* ... KIPs ... */}

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
        <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
           <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg font-black uppercase tracking-tighter">Flux des Demandes</CardTitle>
           </div>
           <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Rechercher par email..." 
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
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 px-8">Client / Email</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Type</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Détail</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-center">Statut</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-right px-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></TableCell></TableRow>
              ) : filteredRequests.map((r) => (
                <TableRow key={r.id} className="hover:bg-slate-50 transition-colors group">
                  <TableCell className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 uppercase tracking-tight">{r.tenantRaisonSociale}</span>
                      <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1"><Mail className="h-2 w-2" /> {r.userEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                  <TableCell>{r.type === 'PLAN_UPGRADE' ? `Vers: ${r.requestedPlanId}` : r.requestedAddonName}</TableCell>
                  <TableCell className="py-6 text-center">
                    <Badge className={cn("text-[8px] font-black uppercase px-2 h-5", r.status === 'PENDING' ? "bg-amber-500" : r.status === 'APPROVED' ? "bg-emerald-500" : "bg-red-500")}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="py-6 text-right px-8">
                    {r.status === 'PENDING' && (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleReject(r)} disabled={isProcessing === r.id}><XCircle className="h-5 w-5 text-red-500" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleApprove(r)} disabled={isProcessing === r.id}><CheckCircle2 className="h-5 w-5 text-emerald-600" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl mt-12">
        <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
           <div className="flex items-center gap-3">
              <Edit className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg font-black uppercase tracking-tighter">Gestion Directe des Abonnements</CardTitle>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-100">
              <TableRow>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 px-8">Client / Dossier</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6">Plan Actuel</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest py-6 text-right px-8">Changer de Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTenantsLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-20"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></TableCell></TableRow>
              ) : filteredTenants.map((t) => (
                <TableRow key={t.id} className="hover:bg-slate-50 transition-colors group">
                  <TableCell className="px-8 py-6 font-black text-slate-900 uppercase tracking-tight">{t.raisonSociale}</TableCell>
                  <TableCell><Badge>{t.planId || 'GRATUIT'}</Badge></TableCell>
                  <TableCell className="px-8 py-6 text-right">
                    <Select onValueChange={(newPlan) => handleDirectPlanChange(t.id, newPlan)} defaultValue={t.planId}>
                        <SelectTrigger className="w-48 rounded-lg font-bold">
                            <SelectValue placeholder="Changer de plan..." />
                        </SelectTrigger>
                        <SelectContent>
                            {PLANS.map(plan => (
                                <SelectItem key={plan.id} value={plan.id} className="font-bold">
                                    {plan.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  )
}