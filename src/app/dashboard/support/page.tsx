
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, orderBy, doc, arrayUnion } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LifeBuoy, Send, MessageSquare, Plus, Clock, CheckCircle2, User, Bot, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function SupportUserPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [isNewTicketOpen, setIsNewTicketOpen] = React.useState(false)
  const [selectedTicket, setSelectedTicket] = React.useState<any>(null)
  const [newMessage, setNewMessage] = React.useState("")
  const [newTicket, setNewTicket] = React.useState({ subject: "", description: "", priority: "medium" })
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const ticketsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    // Corrected query: Now it filters by the current user's ID, which is allowed by the security rules.
    return query(collection(db, "support_tickets"), where("userId", "==", user.uid), orderBy("updatedAt", "desc"));
  }, [db, user]);

  const { data: tickets, isLoading } = useCollection(ticketsQuery);

  const handleCreateTicket = async () => {
    if (!db || !user || !newTicket.subject || !newTicket.description) return;
    setIsSubmitting(true);

    const ticketData = {
      userId: user.uid,
      userName: user.displayName || user.email?.split('@')[0] || "Client",
      userEmail: user.email,
      subject: newTicket.subject,
      status: "open",
      priority: newTicket.priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [{
        senderId: user.uid,
        senderName: user.displayName || "Moi",
        text: newTicket.description,
        timestamp: new Date().toISOString(),
        isAdmin: false
      }]
    };

    try {
      await addDocumentNonBlocking(collection(db, "support_tickets"), ticketData);
      toast({ title: "Ticket créé", description: "Notre équipe reviendra vers vous rapidement." });
      setIsNewTicketOpen(false);
      setNewTicket({ subject: "", description: "", priority: "medium" });
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur de création", description: "Impossible de créer le ticket. Vérifiez les règles de sécurité Firestore.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!db || !user || !selectedTicket || !newMessage.trim()) return;

    const messageObj = {
      senderId: user.uid,
      senderName: user.displayName || "Moi",
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isAdmin: false
    };

    try {
      const ticketRef = doc(db, "support_tickets", selectedTicket.id);
      await updateDocumentNonBlocking(ticketRef, {
        messages: arrayUnion(messageObj),
        updatedAt: new Date().toISOString(),
        status: "open" // Réouvrir si c'était fermé ou en attente
      });
      setNewMessage("");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <LifeBuoy className="h-8 w-8 text-accent" /> Assistance & Support
            </h1>
            <p className="text-muted-foreground text-sm">Posez vos questions techniques ou fiscales à nos experts.</p>
          </div>
          <Button onClick={() => setIsNewTicketOpen(true)} className="bg-primary shadow-lg">
            <Plus className="mr-2 h-4 w-4" /> Nouvelle Demande
          </Button>
        </div>
  
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Liste des tickets de l'utilisateur */}
          <Card className="lg:col-span-1 border-t-4 border-t-primary shadow-md overflow-hidden">
            <CardHeader className="bg-muted/20 border-b">
              <CardTitle className="text-sm font-bold uppercase">Mes Demandes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <div className="p-12 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></div>
                ) : !tickets?.length ? (
                  <div className="p-12 text-center text-muted-foreground italic text-sm">Vous n'avez aucun ticket en cours.</div>
                ) : (
                  <div className="divide-y">
                    {tickets.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`w-full p-4 text-left hover:bg-primary/5 transition-all ${selectedTicket?.id === t.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <Badge variant="outline" className={`text-[8px] h-4 ${t.status === 'closed' ? 'bg-slate-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            {t.status.toUpperCase()}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{new Date(t.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-xs font-bold truncate">{t.subject}</h4>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">{t.messages[t.messages.length - 1].text}</p>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
  
          {/* Détail du ticket ou Formulaire de création */}
          <div className="lg:col-span-2">
            {isNewTicketOpen ? (
              <Card className="shadow-xl border-t-4 border-t-accent">
                <CardHeader>
                  <CardTitle>Nouvelle demande d'assistance</CardTitle>
                  <CardDescription>Précisez votre problème pour une prise en charge rapide.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase">Sujet</label>
                    <Input 
                      placeholder="Ex: Erreur lors du calcul de la G50" 
                      value={newTicket.subject}
                      onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase">Priorité</label>
                    <Select value={newTicket.priority} onValueChange={v => setNewTicket({...newTicket, priority: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Basse</SelectItem>
                        <SelectItem value="medium">Moyenne</SelectItem>
                        <SelectItem value="high">Haute (Urgent)</SelectItem>
                        <SelectItem value="critical">Critique (Blocage métier)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase">Description détaillée</label>
                    <Textarea 
                      placeholder="Décrivez votre situation ici..." 
                      className="min-h-[150px]"
                      value={newTicket.description}
                      onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t pt-4">
                  <Button variant="ghost" onClick={() => setIsNewTicketOpen(false)}>Annuler</Button>
                  <Button onClick={handleCreateTicket} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Envoyer le ticket
                  </Button>
                </CardFooter>
              </Card>
            ) : selectedTicket ? (
              <Card className="flex flex-col h-[600px] shadow-xl overflow-hidden border-none ring-1 ring-border">
                <CardHeader className="bg-primary text-white p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-bold">{selectedTicket.subject}</CardTitle>
                      <CardDescription className="text-white/70 text-[10px]">Ouvert le {new Date(selectedTicket.createdAt).toLocaleString()}</CardDescription>
                    </div>
                    <Badge className="bg-white/20 text-white border-white/30">{selectedTicket.status.toUpperCase()}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 bg-muted/5">
                  <ScrollArea className="h-[420px] p-6">
                    <div className="space-y-6">
                      {selectedTicket.messages.map((m: any, idx: number) => (
                        <div key={idx} className={`flex ${m.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex max-w-[80%] gap-3 ${m.senderId === user?.uid ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${m.isAdmin ? 'bg-accent' : 'bg-primary'}`}>
                              {m.isAdmin ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-white" />}
                            </div>
                            <div className={`space-y-1 ${m.senderId === user?.uid ? 'text-right' : 'text-left'}`}>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase">{m.senderName}</p>
                              <div className={`p-3 rounded-2xl shadow-sm text-sm ${m.senderId === user?.uid ? 'bg-primary text-white' : 'bg-white border text-foreground'}`}>
                                {m.text}
                              </div>
                              <p className="text-[8px] text-muted-foreground">{new Date(m.timestamp).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 bg-white border-t flex gap-2">
                  <Input 
                    placeholder="Écrire une réponse..." 
                    className="flex-1"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    disabled={selectedTicket.status === 'closed'}
                  />
                  <Button size="icon" onClick={handleSendMessage} disabled={!newMessage.trim() || selectedTicket.status === 'closed'}>
                    <Send className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center border-dashed border-2 bg-muted/10">
                <div className="text-center space-y-4">
                  <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare className="h-10 w-10 text-muted-foreground opacity-20" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Aucun ticket sélectionné</h3>
                    <p className="text-sm text-muted-foreground">Sélectionnez une demande ou créez-en une nouvelle pour échanger avec nous.</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
  )
}
