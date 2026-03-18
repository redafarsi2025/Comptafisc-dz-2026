
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, doc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ShieldCheck, ShieldAlert, Search, UserPlus, Trash2, Loader2, Mail, Info } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function SaaSUsersManagement() {
  const db = useFirestore()
  const { user: currentUser } = useUser()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // 1. Charger tous les profils utilisateurs
  const profilesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "userProfiles");
  }, [db]);
  const { data: profiles, isLoading: isLoadingProfiles } = useCollection(profilesQuery);

  // 2. Charger la liste des admins SaaS pour le croisement
  const adminsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "saas_admins");
  }, [db]);
  const { data: admins, isLoading: isLoadingAdmins } = useCollection(adminsQuery);

  const isAdmin = (userId: string) => {
    return admins?.some(a => a.id === userId);
  }

  const handleToggleAdmin = async (targetUser: any) => {
    if (!db || !currentUser) return;
    
    if (targetUser.id === currentUser.uid) {
      toast({
        variant: "destructive",
        title: "Action impossible",
        description: "Vous ne pouvez pas retirer vos propres droits d'administration.",
      });
      return;
    }

    const adminRef = doc(db, "saas_admins", targetUser.id);
    
    if (isAdmin(targetUser.id)) {
      try {
        deleteDocumentNonBlocking(adminRef);
        toast({
          title: "Privilèges retirés",
          description: `${targetUser.firstName} ${targetUser.lastName} n'est plus administrateur SaaS.`,
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        setDocumentNonBlocking(adminRef, {
          promotedBy: currentUser.uid,
          promotedAt: new Date().toISOString(),
          email: targetUser.email,
          id: targetUser.id // Pour respecter isRelationalValid
        }, { merge: true });
        
        toast({
          title: "Administrateur créé",
          description: `${targetUser.firstName} ${targetUser.lastName} a été promu administrateur SaaS.`,
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  const filteredProfiles = React.useMemo(() => {
    if (!profiles) return [];
    return profiles.filter(p => 
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [profiles, searchTerm]);

  if (!mounted) return null;

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <ShieldCheck className="text-primary h-8 w-8" /> Utilisateurs & Administrateurs
          </h1>
          <p className="text-slate-400">Gérez les accès globaux à la plateforme SaaS ComptaFisc-DZ.</p>
        </div>
      </div>

      <Alert className="bg-primary/10 border-primary/20 text-slate-300">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary font-bold">Sécurité du Système</AlertTitle>
        <AlertDescription className="text-xs">
          Le rôle d'administrateur SaaS donne un accès complet à tous les dossiers clients, aux revenus et à la configuration des taxes. 
          Attribuez ce rôle avec parcimonie.
        </AlertDescription>
      </Alert>

      <Card className="bg-slate-950 border-slate-800 shadow-2xl">
        <CardHeader className="border-b border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle>Registre des Utilisateurs</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Chercher par nom ou email..." 
                className="bg-slate-900 border-slate-800 pl-9 w-80 text-sm" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-900/50">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">Utilisateur</TableHead>
                <TableHead className="text-slate-400">Email</TableHead>
                <TableHead className="text-slate-400">Rôle Actuel</TableHead>
                <TableHead className="text-slate-400">Dernière Connexion</TableHead>
                <TableHead className="text-right text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingProfiles || isLoadingAdmins ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-slate-500 text-sm">Chargement des comptes...</p>
                  </TableCell>
                </TableRow>
              ) : filteredProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-slate-500">
                    Aucun utilisateur trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProfiles.map((p) => {
                  const isSaaSAdmin = isAdmin(p.id);
                  return (
                    <TableRow key={p.id} className="border-slate-800 hover:bg-slate-900/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-slate-700">
                            <AvatarImage src={`https://picsum.photos/seed/${p.id}/32`} />
                            <AvatarFallback>{p.firstName?.[0]}{p.lastName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-200">{p.firstName} {p.lastName}</span>
                            <span className="text-[10px] font-mono text-slate-500">{p.id}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {p.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isSaaSAdmin ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30 flex items-center w-fit gap-1">
                            <ShieldCheck className="h-3 w-3" /> SAAS ADMIN
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 border-slate-800">
                            Utilisateur
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs font-mono">
                        {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant={isSaaSAdmin ? "destructive" : "default"} 
                          size="sm"
                          className={isSaaSAdmin ? "h-8" : "h-8 bg-primary hover:bg-primary/90 text-white"}
                          onClick={() => handleToggleAdmin(p)}
                        >
                          {isSaaSAdmin ? (
                            <><ShieldAlert className="mr-2 h-3 w-3" /> Destituer</>
                          ) : (
                            <><UserPlus className="mr-2 h-3 w-3" /> Promouvoir Admin</>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
