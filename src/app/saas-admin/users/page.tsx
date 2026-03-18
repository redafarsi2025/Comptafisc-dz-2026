
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ShieldCheck, ShieldAlert, Search, UserPlus, Loader2, Mail, Info } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function SaaSUsersManagement() {
  const db = useFirestore()
  const { user: currentUser } = useUser()
  const [searchTerm, setSearchTerm] = React.useState("")

  const profilesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "userProfiles");
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
      toast({ title: "Privilèges retirés" });
    } else {
      setDocumentNonBlocking(adminRef, { promotedBy: currentUser.uid, promotedAt: new Date().toISOString(), email: targetUser.email, id: targetUser.id }, { merge: true });
      toast({ title: "Administrateur promu" });
    }
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
            <ShieldCheck className="text-accent h-8 w-8" /> Utilisateurs & Admins
          </h1>
          <p className="text-muted-foreground">Gestion des accès globaux à la plateforme SaaS.</p>
        </div>
      </div>

      <Alert className="bg-primary/5 border-primary/20 shadow-sm">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary font-bold">Sécurité Système</AlertTitle>
        <AlertDescription className="text-xs">
          Les administrateurs SaaS disposent d'un contrôle total sur les revenus, les plans et les dossiers clients.
        </AlertDescription>
      </Alert>

      <Card className="shadow-md border-none overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">Registre des Comptes</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un utilisateur..." 
                className="pl-9 w-80 bg-background" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingProfiles ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredProfiles.map((p) => {
                const isSaaSAdmin = isAdmin(p.id);
                return (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border">
                          <AvatarImage src={`https://picsum.photos/seed/${p.id}/32`} />
                          <AvatarFallback>{p.firstName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{p.firstName} {p.lastName}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{p.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium"><div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {p.email}</div></TableCell>
                    <TableCell>
                      {isSaaSAdmin ? (
                        <Badge className="bg-primary text-white flex items-center w-fit gap-1"><ShieldCheck className="h-3 w-3" /> SAAS ADMIN</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Utilisateur standard</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant={isSaaSAdmin ? "destructive" : "default"} 
                        size="sm"
                        className="h-8"
                        onClick={() => handleToggleAdmin(p)}
                      >
                        {isSaaSAdmin ? <><ShieldAlert className="mr-2 h-3 w-3" /> Révoquer</> : <><UserPlus className="mr-2 h-3 w-3" /> Promouvoir</>}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
