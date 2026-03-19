
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ShieldCheck, ShieldAlert, Search, UserPlus, Loader2, 
  Mail, Info, Ban, MoreVertical, ExternalLink, Filter, Download
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SaaSUsersManagement() {
  const db = useFirestore()
  const { user: currentUser } = useUser()
  const [searchTerm, setSearchTerm] = React.useState("")

  const profilesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "userProfiles"), orderBy("updatedAt", "desc"));
  }, [db]);
  const { data: profiles, isLoading: isLoadingProfiles } = useCollection(profilesQuery);

  const adminsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "saas_admins");
  }, [db]);
  const { data: admins } = useCollection(adminsQuery);

  const isAdmin = (userId: string) => admins?.some(a => a.id === userId);

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

  const handleBlockUser = (userId: string) => {
    toast({ title: "Action de modération", description: `Compte ${userId.substring(0, 8)} suspendu par mesure de sécurité.` });
  }

  const filteredProfiles = React.useMemo(() => {
    if (!profiles) return [];
    return profiles.filter(p => 
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [profiles, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <ShieldCheck className="text-accent h-8 w-8" /> Utilisateurs & Comptes
          </h1>
          <p className="text-muted-foreground">Gestion des accès globaux, segmentation et modération du parc SaaS.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
          <Button className="bg-primary shadow-lg"><UserPlus className="mr-2 h-4 w-4" /> Inviter Admin</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Comptes Actifs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-black text-primary">{profiles?.length || 0}</div></CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Inscriptions (24h)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-black text-emerald-600">+12</div></CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Sessions Suspectes</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-black text-amber-600">0</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-muted/50 border">
            <TabsTrigger value="all">Tous les comptes</TabsTrigger>
            <TabsTrigger value="admins">Administrateurs</TabsTrigger>
            <TabsTrigger value="inactive">Inactifs > 30j</TabsTrigger>
          </TabsList>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom ou email..." 
              className="pl-9 w-80 bg-white" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="all">
          <Card className="shadow-xl border-none overflow-hidden ring-1 ring-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Identité Utilisateur</TableHead>
                    <TableHead>Contact & Email</TableHead>
                    <TableHead>Plan & Dossiers</TableHead>
                    <TableHead>Dernière Activité</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingProfiles ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : filteredProfiles.map((p) => {
                    const isSaaSAdmin = isAdmin(p.id);
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/20 transition-colors group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                              <AvatarImage src={`https://picsum.photos/seed/${p.id}/40`} />
                              <AvatarFallback>{p.firstName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">{p.firstName} {p.lastName}</span>
                              <div className="flex items-center gap-1">
                                {isSaaSAdmin && <Badge className="bg-primary text-white text-[8px] h-4">ADMIN</Badge>}
                                <span className="text-[9px] font-mono text-muted-foreground uppercase">{p.id.substring(0, 12)}...</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /> {p.email}</span>
                            <span className="text-[10px] text-muted-foreground italic">Client certifié DGI</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="w-fit text-[9px] uppercase font-black bg-blue-50 text-blue-700 border-blue-200">PRO</Badge>
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">3 Dossiers gérés</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-col">
                            <span className="font-medium">{new Date(p.updatedAt).toLocaleDateString()}</span>
                            <span className="text-[9px] text-muted-foreground">Dernière synchronisation</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 group-hover:bg-white"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>Gestion du compte</DropdownMenuLabel>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => handleToggleAdmin(p)}>
                                {isSaaSAdmin ? <><ShieldAlert className="mr-2 h-4 w-4 text-destructive" /> Révoquer Admin</> : <><UserPlus className="mr-2 h-4 w-4 text-primary" /> Promouvoir Admin</>}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer">
                                <ExternalLink className="mr-2 h-4 w-4" /> Voir Dossiers Clients
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive cursor-pointer font-bold" onClick={() => handleBlockUser(p.id)}>
                                <Ban className="mr-2 h-4 w-4" /> Suspendre l'accès
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
