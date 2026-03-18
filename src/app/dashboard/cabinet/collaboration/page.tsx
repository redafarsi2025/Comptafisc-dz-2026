
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessagesSquare, Send, Paperclip, Search, FileUp, Info, User, ShieldCheck } from "lucide-react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy, limit } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"

export default function CollaborationHub() {
  const db = useFirestore()
  const { user } = useUser()
  const [selectedClient, setSelectedClient] = React.useState<any>(null)
  const [message, setMessage] = React.useState("")

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <MessagesSquare className="h-8 w-8 text-accent" /> Collaboration Cabinet
          </h1>
          <p className="text-muted-foreground text-sm">Échangez avec vos clients, demandez des justificatifs et partagez des rapports.</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 overflow-hidden">
        {/* Liste des conversations (Clients) */}
        <Card className="md:col-span-1 flex flex-col overflow-hidden border-t-4 border-t-primary">
          <CardHeader className="p-4 border-b bg-muted/20">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Chercher un client..." className="pl-9 h-9 text-xs" />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <ScrollArea className="h-full">
              <div className="divide-y">
                {tenants?.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedClient(t)}
                    className={`w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left ${selectedClient?.id === t.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                  >
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={`https://picsum.photos/seed/${t.id}/40`} />
                      <AvatarFallback>CL</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs truncate">{t.raisonSociale}</span>
                        <span className="text-[8px] text-muted-foreground">10:45</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate italic">"Bonjour, j'ai déposé les factures..."</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Espace Chat & Documents */}
        <div className="md:col-span-3 flex flex-col gap-4 overflow-hidden">
          {selectedClient ? (
            <>
              <Card className="flex-1 flex flex-col overflow-hidden shadow-lg border-none ring-1 ring-border">
                <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="border-2 border-white/20">
                      <AvatarImage src={`https://picsum.photos/seed/${selectedClient.id}/40`} />
                      <AvatarFallback>CL</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm font-bold">{selectedClient.raisonSociale}</CardTitle>
                      <CardDescription className="text-white/70 text-[10px] flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Espace sécurisé • {selectedClient.regimeFiscal}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="h-8 text-xs"><FileUp className="h-3 w-3 mr-1" /> Demander une pièce</Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 bg-muted/5">
                  <ScrollArea className="h-[400px] p-6">
                    <div className="space-y-6">
                      <div className="flex justify-start">
                        <div className="bg-white border rounded-2xl p-4 shadow-sm max-w-[70%]">
                          <p className="text-xs">Bonjour, nous avons besoin des relevés bancaires du mois de Janvier 2026 pour clôturer la G50.</p>
                          <span className="text-[8px] text-muted-foreground mt-2 block">Cabinet Expert • 09:30</span>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="bg-primary text-primary-foreground rounded-2xl p-4 shadow-md max-w-[70%]">
                          <p className="text-xs">Bonjour ! Je viens de les uploader dans l'onglet documents.</p>
                          <span className="text-[8px] opacity-70 mt-2 block">Client • 10:15</span>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Badge variant="outline" className="text-[8px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          PIÈCE DÉPOSÉE : Releve_Janvier_2026.pdf
                        </Badge>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 bg-white border-t flex gap-2">
                  <Button variant="ghost" size="icon" className="shrink-0"><Paperclip className="h-4 w-4" /></Button>
                  <Input 
                    placeholder="Écrire un message au client..." 
                    className="flex-1"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                  />
                  <Button className="shrink-0 bg-primary"><Send className="h-4 w-4" /></Button>
                </CardFooter>
              </Card>
            </>
          ) : (
            <Card className="flex-1 flex items-center justify-center border-dashed border-2">
              <div className="text-center space-y-4">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <MessagesSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Aucun dossier sélectionné</h3>
                  <p className="text-sm text-muted-foreground">Choisissez un client dans la liste pour démarrer la collaboration.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
