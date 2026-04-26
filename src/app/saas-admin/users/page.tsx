
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ShieldCheck, ShieldAlert, Search, UserPlus, Loader2, 
  Mail, Ban, MoreVertical, ExternalLink, Download
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SaaSUsersManagement() {
  const db = useFirestore()
  const { user: currentUser } = useUser()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const profilesQuery = useMemoFirebase(() => db ? query(collection(db, "userProfiles"), orderBy("updatedAt", "desc")) : null, [db]);
  const { data: profiles, isLoading: isLoadingProfiles } = useCollection(profilesQuery);

  const adminsQuery = useMemoFirebase(() => db ? collection(db, "saas_admins") : null, [db]);
  const { data: admins } = useCollection(adminsQuery);

  const tenantsQuery = useMemoFirebase(() => db ? collection(db, "tenants") : null, [db]);
  const { data: tenants } = useCollection(tenantsQuery);

  const isAdmin = (userId: string) => admins?.some(a => a.id === userId);

  const getDossiersCount = (userId: string) => {
    if (!tenants) return 0;
    return tenants.filter(t => t.members?.[userId] || t.createdByUserId === userId).length;
  };

  const handleToggleAdmin = async (targetUser: any) => {
    if (!db || !currentUser) return;
    if (targetUser.id === currentUser.uid) {
      toast({ variant: "destructive", title: "Action impossible", description: "Vous ne pouvez pas retirer vos propres droits." });
      return;
    }

    const adminRef = doc(db, "saas_admins", targetUser.id);
    if (isAdmin(targetUser.id)) {
      deleteDocumentNonBlocking(adminRef);
      toast({ title: "Privilèges révoqués" });
    } else {
      setDocumentNonBlocking(adminRef, { promotedBy: currentUser.uid, promotedAt: new Date().toISOString(), email: targetUser.email, id: targetUser.id }, { merge: true });
      toast({ title: "Utilisateur promu Admin" });
    }
  }

  const filteredProfiles = React.useMemo(() => {
    if (!profiles) return [];
    return profiles.filter(p => 
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [profiles, searchTerm]);

  if (!mounted || isLoadingProfiles) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-black text-slate-400 mt-4 uppercase tracking-widest">Base de données Live...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">Utilisateurs & Abos</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">User Management Console</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-2xl border-slate-200 bg-white"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
          <Button className="bg-primary shadow-lg shadow-primary/20 rounded-2xl px-6 font-bold"><UserPlus className="mr-2 h-4 w-4" /> Ajouter</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white group hover:translate-y-[-4px] transition-all">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Profils Actifs</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-primary tracking-tighter">{profiles?.length || 0} comptes</div></CardContent>
        </Card>
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white group hover:translate-y-[-4px] transition-all">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Administrateurs</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-emerald-600 tracking-tighter">{admins?.length || 0} nodes</div></CardContent>
        </Card>
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white group hover:translate-y-[-4px] transition-all">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dossiers Totaux</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-blue-600 tracking-tighter">{tenants?.length || 0} instances</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <TabsList className="bg-slate-100 border border-slate-200 p-1.5 rounded-3xl h-auto">
            <TabsTrigger value="all" className="rounded-2xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Tous les comptes</TabsTrigger>
            <TabsTrigger value="admins" className="rounded-2xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Admins</TabsTrigger>
          </TabsList>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Rechercher par nom ou email..." 
              className="pl-10 h-10 w-96 bg-white rounded-2xl border-slate-200 shadow-sm focus:ring-primary/20" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="all" className="animate-in fade-in duration-300">
          <Card className="shadow-2xl shadow-slate-200/50 border-none overflow-hidden rounded-3xl ring-1 ring-slate-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-8">Utilisateur</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Identifiants</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Parc Dossiers</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Dernière activité</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 text-right px-8">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((p) => {
                    const isSaaSAdmin = isAdmin(p.id);
                    const dossiersCount = getDossiersCount(p.id);
                    return (
                      <TableRow key={p.id} className="hover:bg-slate-50 transition-colors group">
                        <TableCell className="py-6 px-8">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-white shadow-md rounded-2xl">
                              <AvatarImage src={`https://picsum.photos/seed/${p.id}/40`} />
                              <AvatarFallback className="rounded-2xl bg-slate-100 text-slate-600 font-bold uppercase">{p.firstName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 tracking-tight">{p.firstName} {p.lastName}</span>
                              <div className="flex items-center gap-2 mt-1">
                                {isSaaSAdmin && <Badge className="bg-primary text-white text-[8px] h-4 font-black">ADMIN</Badge>}
                                <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">ID:{p.id.substring(0, 8)}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-6">
                          <div className="flex items-center gap-2 text-slate-600 font-medium">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="text-xs">{p.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-6">
                          <Badge variant="outline" className="rounded-xl px-3 py-1 font-black text-[9px] bg-slate-50 border-slate-200 text-slate-600 group-hover:bg-white group-hover:border-primary/30 transition-all">
                            {dossiersCount} DOSSIER(S)
                          </Badge>
                        </TableCell>
                        <TableCell className="py-6 text-xs font-bold text-slate-500">
                          {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="py-6 text-right px-8">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white border border-transparent hover:border-slate-100"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 shadow-2xl">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-4 py-3">Governance</DropdownMenuLabel>
                              <DropdownMenuItem className="cursor-pointer rounded-xl font-bold py-3 px-4" onClick={() => handleToggleAdmin(p)}>
                                {isSaaSAdmin ? <><ShieldAlert className="mr-3 h-4 w-4 text-destructive" /> Révoquer Admin</> : <><ShieldCheck className="mr-3 h-4 w-4 text-primary" /> Promouvoir Admin</>}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer rounded-xl font-bold py-3 px-4">
                                <ExternalLink className="mr-3 h-4 w-4 text-slate-400" /> Dossiers Client
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-2" />
                              <DropdownMenuItem className="text-destructive cursor-pointer rounded-xl font-black py-3 px-4 uppercase text-[10px] tracking-widest">
                                <Ban className="mr-3 h-4 w-4" /> Suspendre Node
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
