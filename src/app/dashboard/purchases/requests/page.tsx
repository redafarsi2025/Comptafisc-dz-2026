
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  FilePlus2, Plus, Search, Filter, 
  Loader2, ClipboardList, ArrowRight,
  AlertCircle, CheckCircle2, Clock, XCircle
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function PurchaseRequestsListing() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !tenantId) return null;
    return query(collection(db, "tenants", tenantId, "purchase_requests"), orderBy("createdAt", "desc"));
  }, [db, tenantId]);
  const { data: requests, isLoading } = useCollection(requestsQuery);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase text-[9px] font-black"><Clock className="h-2 w-2 mr-1" /> En attente</Badge>;
      case 'VALIDATED': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 uppercase text-[9px] font-black"><CheckCircle2 className="h-2 w-2 mr-1" /> Validée</Badge>;
      case 'REJECTED': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 uppercase text-[9px] font-black"><XCircle className="h-2 w-2 mr-1" /> Rejetée</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredRequests = React.useMemo(() => {
    if (!requests) return [];
    return requests.filter(r => 
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requests, searchTerm]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <FilePlus2 className="text-accent h-8 w-8" /> Demandes d'Achat (DA)
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Expression des besoins internes & Workflow de validation</p>
        </div>
        <Button className="bg-primary shadow-lg h-11 px-6" disabled={!tenantId} asChild>
          <Link href={`/dashboard/purchases/requests/new?tenantId=${tenantId}`}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle Demande
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Total Période</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-black text-primary">{requests?.length || 0}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">À Valider</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-black text-amber-600">{requests?.filter(r => r.status === 'PENDING').length || 0}</div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Approuvées</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-black text-emerald-600">{requests?.filter(r => r.status === 'VALIDATED').length || 0}</div></CardContent>
        </Card>
        <Card className="bg-primary text-white border-none shadow-lg">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] uppercase font-bold opacity-70">Contrôle Interne</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold">ACTIF</div></CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="bg-muted/20 border-b flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">Registre des Expressions de Besoins</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Chercher titre, service..." 
                className="pl-9 h-9 w-64 bg-white text-xs" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9"><Filter className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] uppercase font-black">
                <TableHead>Référence / Date</TableHead>
                <TableHead>Titre de la Demande</TableHead>
                <TableHead>Service / Demandeur</TableHead>
                <TableHead className="text-center">Urgence</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-32 text-muted-foreground italic flex flex-col items-center gap-4">
                    <ClipboardList className="h-16 w-16 opacity-10" />
                    <div className="space-y-1">
                      <p className="font-bold text-lg">Aucune demande trouvée</p>
                      <p className="text-sm">Commencez par exprimer un nouveau besoin d'achat.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req) => (
                  <TableRow key={req.id} className="hover:bg-muted/5 group">
                    <TableCell className="text-xs font-mono font-bold">
                      <div className="flex flex-col">
                        <span>DA-{req.id.substring(0, 6).toUpperCase()}</span>
                        <span className="text-[9px] text-muted-foreground font-normal">{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-primary">{req.title}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-bold">{req.department}</span>
                        <span className="text-[10px] text-muted-foreground">{req.requesterName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={req.urgency === 'HIGH' ? 'destructive' : 'outline'} className="text-[8px] h-4">
                        {req.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(req.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                        <Link href={`/dashboard/purchases/requests/${req.id}?tenantId=${tenantId}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
        <div className="text-xs text-blue-900 leading-relaxed space-y-2">
          <p className="font-bold underline uppercase tracking-tighter">Note sur le Workflow d'Achat :</p>
          <p>
            La <strong>Demande d'Achat (DA)</strong> est un document interne non comptable. Elle permet d'initier le processus de contrôle interne. 
            Une fois validée, elle autorise le service achat à consulter les fournisseurs et à émettre un Bon de Commande (BC) engageant l'entité juridiquement.
          </p>
        </div>
      </div>
    </div>
  )
}
