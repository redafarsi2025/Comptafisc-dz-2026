
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc, arrayUnion } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  LifeBuoy, Search, Filter, MessageSquare, 
  Clock, CheckCircle2, AlertCircle, User, 
  ArrowRight, FileText, BookOpen, Send, Bot, Loader2, ShieldCheck, Mail
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"

export default function SupportAdmin() {
  const db = useFirestore()
  const { user } = useUser()
  const [selectedTicket, setSelectedTicket] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [replyText, setReplyText] = React.useState("")

  const ticketsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "support_tickets"), orderBy("updatedAt", "desc"));
  }, [db]);
  const { data: tickets, isLoading } = useCollection(ticketsQuery);

  const filteredTickets = React.useMemo(() => {
    if (!tickets) return [];
    return tickets.filter(t => 
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tickets, searchTerm]);

  const handleReply = async () => {
    if (!db || !user || !selectedTicket || !replyText.trim()) return;

    const messageObj = {
      senderId: user.uid,
      senderName: "Support ComptaFisc-DZ",
      text: replyText.trim(),
      timestamp: new Date().toISOString(),
      isAdmin: true
    };

    try {
      const ticketRef = doc(db, "support_tickets", selectedTicket.id);
      await updateDocumentNonBlocking(ticketRef, {
        messages: arrayUnion(messageObj),
        updatedAt: new Date().toISOString(),
        status: "pending" // En attente du client
      });
      setReplyText("");
      toast({ title: "Réponse envoyée" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    if (!db) return;
    try {
      const ticketRef = doc(db, "support_tickets", ticketId);
      await updateDocumentNonBlocking(ticketRef, {
        status: "closed",
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Ticket clôturé" });
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({...selectedTicket, status: 'closed'});
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <LifeBuoy className="text-accent h-8 w-8" /> Centre de Support
          </h1>
          <p className="text-muted-foreground">Gestion des tickets utilisateurs et base de connaissances interne.</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 px-4 py-2 font-bold text-sm">
            Temps de réponse moyen : 14 min
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-15rem)]">
        {/* Liste des Tickets */}
        <Card className="lg:col-span-1 flex flex-col overflow-hidden border-none shadow-xl ring-1 ring-border bg-white">
          <CardHeader className="bg-muted/30 border-b p-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Chercher par sujet, nom, email..." 
                className="pl-9 h-9 text-xs bg-white" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="p-12 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>
              ) : !filteredTickets.length ? (
                <div className="p-12 text-center text-muted-foreground italic text-sm">Aucun ticket trouvé.</div>
              ) : (
                <div className="divide-y">
                  {filteredTickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`w-full p-4 text-left hover:bg-muted/50 transition-all ${selectedTicket?.id === t.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <Badge variant="outline" className={`text-[8px] h-4 ${t.priority === 'critical' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700'}`}>
                          {t.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={`text-[8px] h-4 ${t.status === 'closed' ? 'bg-slate-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {t.status.toUpperCase()}
                        </Badge>
                      </div>
                      <h4 className="text-xs font-bold truncate mt-1">{t.subject}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground truncate font-bold">{t.userName}</span>
                        <span className="ml-auto text-[8px] text-slate-400">{new Date(t.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Détail du Ticket / Conversation */}
        <div className="lg:col-span-2 flex flex-col gap-6 overflow-hidden">
          {selectedTicket ? (
            <>
              <Card className="flex-1 flex flex-col overflow-hidden shadow-2xl border-none ring-1 ring-border bg-white">
                <CardHeader className="bg-primary text-white p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-black uppercase">{selectedTicket.priority}</Badge>
                        <span className="text-[10px] text-white/70 font-mono">ID: {selectedTicket.id}</span>
                      </div>
                      <CardTitle className="text-xl font-bold">{selectedTicket.subject}</CardTitle>
                      <div className="flex items-center gap-4 text-[10px] text-white/80">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {selectedTicket.userName}</span>
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {selectedTicket.userEmail}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="h-8 text-xs font-bold" onClick={() => handleCloseTicket(selectedTicket.id)} disabled={selectedTicket.status === 'closed'}>
                        {selectedTicket.status === 'closed' ? "Déjà fermé" : "Fermer le ticket"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 bg-muted/5">
                  <ScrollArea className="h-full p-6">
                    <div className="space-y-6">
                      {selectedTicket.messages.map((m: any, idx: number) => (
                        <div key={idx} className={`flex ${m.isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex max-w-[80%] gap-3 ${m.isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${m.isAdmin ? 'bg-accent shadow-lg shadow-accent/20' : 'bg-primary shadow-lg shadow-primary/20'}`}>
                              {m.isAdmin ? <ShieldCheck className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-white" />}
                            </div>
                            <div className={`space-y-1 ${m.isAdmin ? 'text-right' : 'text-left'}`}>
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{m.senderName}</p>
                              <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${m.isAdmin ? 'bg-accent text-primary font-medium' : 'bg-white border text-foreground'}`}>
                                {m.text}
                              </div>
                              <p className="text-[8px] text-muted-foreground">{new Date(m.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 bg-white border-t flex gap-2">
                  <Input 
                    placeholder="Répondre à l'utilisateur..." 
                    className="flex-1 h-12"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleReply()}
                    disabled={selectedTicket.status === 'closed'}
                  />
                  <Button className="shrink-0 bg-primary h-12 px-6" onClick={handleReply} disabled={!replyText.trim() || selectedTicket.status === 'closed'}>
                    <Send className="h-4 w-4 mr-2" /> Répondre
                  </Button>
                </CardFooter>
              </Card>
            </>
          ) : (
            <Card className="flex-1 flex items-center justify-center border-dashed border-2 bg-muted/10">
              <div className="text-center space-y-4">
                <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center mx-auto border shadow-inner">
                  <MessageSquare className="h-12 w-12 text-primary opacity-20" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-primary">Aucun ticket sélectionné</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">Choisissez une demande dans la liste de gauche pour démarrer la résolution.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
