
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  ClipboardCheck, Plus, Search, Calendar, 
  ArrowRight, Loader2, AlertCircle, FileText, 
  History, CheckCircle2, ShieldCheck, Boxes
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export default function InventoryDashboard() {
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [newSession, setNewSession] = React.useState({
    name: "",
    type: "ANNUAL",
    warehouse: "Dépôt Principal",
  })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const sessionsQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return query(collection(db, "tenants", currentTenant.id, "inventory_sessions"), orderBy("createdAt", "desc"));
  }, [db, currentTenant?.id]);
  const { data: sessions, isLoading } = useCollection(sessionsQuery);

  const handleCreateSession = async () => {
    if (!db || !currentTenant || !user || !newSession.name) return;
    setIsSaving(true);

    const sessionData = {
      ...newSession,
      status: "DRAFT",
      tenantId: currentTenant.id,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
      counts: []
    };

    try {
      const docRef = await addDocumentNonBlocking(collection(db, "tenants", currentTenant.id, "inventory_sessions"), sessionData);
      if (docRef) {
        toast({ title: "Session créée", description: "La session d'inventaire est prête." });
        setIsCreateOpen(false);
        router.push(`/dashboard/inventory/session/${docRef.id}?tenantId=${currentTenant.id}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT": return <Badge variant="outline" className="bg-slate-50">BROUILLON</Badge>;
      case "IN_PROGRESS": return <Badge className="bg-blue-500">EN COURS</Badge>;
      case "RECONCILIATION": return <Badge className="bg-amber-500">RAPPROCHEMENT</Badge>;
      case "CLOSED": return <Badge className="bg-emerald-500">CLÔTURÉ</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8 text-accent" /> Sessions d'Inventaire
          </h1>
          <p className="text-muted-foreground text-sm">Gestion des comptages physiques et régularisation SCF.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary shadow-lg" disabled={!currentTenant}>
              <Plus className="mr-2 h-4 w-4" /> Nouvelle Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lancer un inventaire</DialogTitle>
              <DialogDescription>Définissez les paramètres de la session de comptage.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nom de la session</Label>
                <Input value={newSession.name} onChange={e => setNewSession({...newSession, name: e.target.value})} placeholder="Ex: Inventaire Fin d'Année 2026" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Type d'inventaire</Label>
                  <Select value={newSession.type} onValueChange={v => setNewSession({...newSession, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANNUAL">Annuel Obligatoire</SelectItem>
                      <SelectItem value="ROTATING">Tournant (Cycle Count)</SelectItem>
                      <SelectItem value="AUDIT">Audit Ponctuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Lieu / Entrepôt</Label>
                  <Input value={newSession.warehouse} onChange={e => setNewSession({...newSession, warehouse: e.target.value})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateSession} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Initialiser l'inventaire
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Sessions Actives</p>
            <h2 className="text-3xl font-black text-primary">
              {sessions?.filter(s => s.status === 'IN_PROGRESS' || s.status === 'RECONCILIATION').length || 0}
            </h2>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Clôturées (Exercice)</p>
            <h2 className="text-3xl font-black text-emerald-600">
              {sessions?.filter(s => s.status === 'CLOSED').length || 0}
            </h2>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-dashed border-2">
          <CardContent className="pt-6">
            <p className="text-[10px] font-bold uppercase text-primary">Prochain Inventaire</p>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-bold text-sm">31 Décembre 2026</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader className="bg-muted/20 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Historique des Sessions</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher une session..." className="pl-9 h-9 w-64 bg-white" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date Création</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin inline mr-2 h-4 w-4" /> Chargement...</TableCell></TableRow>
              ) : !sessions?.length ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">Aucune session enregistrée.</TableCell></TableRow>
              ) : (
                sessions.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/5">
                    <TableCell className="font-bold text-sm">{s.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{s.type}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(s.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/inventory/session/${s.id}?tenantId=${currentTenant?.id}`}>
                          Accéder <ArrowRight className="ml-2 h-3 w-3" />
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

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-4">
        <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
        <div className="text-xs text-blue-900 leading-relaxed space-y-2">
          <p className="font-bold underline uppercase">Rappel Réglementaire (Art. 12 SCF) :</p>
          <p>
            L'inventaire physique des actifs et des stocks est une obligation légale de fin d'exercice. 
            Il doit permettre de justifier le solde des comptes de classe 2 (Immos) et classe 3 (Stocks) 
            figurant au bilan. Toute différence entre le stock théorique et le comptage physique doit donner lieu à une écriture de régularisation.
          </p>
        </div>
      </div>
    </div>
  )
}
