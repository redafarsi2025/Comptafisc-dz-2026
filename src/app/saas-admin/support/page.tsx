
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  LifeBuoy, Search, Filter, MessageSquare, 
  Clock, CheckCircle2, AlertCircle, User, 
  ArrowRight, FileText, BookOpen, Send
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const tickets = [
  { id: "TK-4521", user: "Mohamed Bensalem", plan: "PRO", subject: "Erreur calcul IRG 2026", status: "open", priority: "high", date: "2026-03-18", sla: "2h" },
  { id: "TK-4519", user: "Samira Bouzid", plan: "CABINET", subject: "Import XML DAC rejeté", status: "pending", priority: "critical", date: "2026-03-18", sla: "15min" },
  { id: "TK-4510", user: "Yasmine Hamdi", plan: "ESSENTIEL", subject: "Accès multi-dossier", status: "closed", priority: "medium", date: "2026-03-15", sla: "Done" },
]

export default function SupportAdmin() {
  const [selectedTicket, setSelectedTicket] = React.useState<any>(null)

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
          <Button variant="outline"><BookOpen className="mr-2 h-4 w-4" /> Knowledge Base</Button>
          <Button className="bg-primary shadow-lg">Nouveau Ticket Manuel</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-12rem)]">
        {/* Liste des Tickets */}
        <Card className="lg:col-span-1 flex flex-col overflow-hidden border-none shadow-xl ring-1 ring-border">
          <CardHeader className="bg-muted/30 border-b p-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Chercher un ticket..." className="pl-9 h-9 text-xs" />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="divide-y">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`w-full p-4 text-left hover:bg-muted/50 transition-all ${selectedTicket?.id === t.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">{t.id}</span>
                      <Badge variant="outline" className={`text-[8px] h-4 ${t.priority === 'critical' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700'}`}>
                        {t.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <h4 className="text-xs font-bold truncate">{t.subject}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground truncate">{t.user}</span>
                      <Badge className="ml-auto text-[8px] h-4 bg-slate-100 text-slate-600">{t.sla}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Détail du Ticket / Conversation */}
        <div className="lg:col-span-2 flex flex-col gap-6 overflow-hidden">
          {selectedTicket ? (
            <>
              <Card className="flex-1 flex flex-col overflow-hidden shadow-2xl border-none ring-1 ring-border">
                <CardHeader className="bg-primary text-white p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="bg-white/20 text-white border-white/30 text-[10px] uppercase font-black">{selectedTicket.plan}</Badge>
                        <span className="text-xs text-white/70">{selectedTicket.id} — Créé le {selectedTicket.date}</span>
                      </div>
                      <CardTitle className="text-xl font-bold">{selectedTicket.subject}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="h-8 text-xs">Clôturer Ticket</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 bg-muted/5">
                  <ScrollArea className="h-full p-6">
                    <div className="space-y-6">
                      <div className="flex justify-start">
                        <div className="bg-white border rounded-2xl p-4 shadow-sm max-w-[80%]">
                          <p className="text-sm leading-relaxed">
                            "Bonjour, je constate un écart entre le calcul IRG de ComptaFisc-DZ et mon ancien logiciel pour un salaire de 45 000 DA. Pouvez-vous vérifier si le barème 2026 est bien actif ?"
                          </p>
                          <span className="text-[10px] text-muted-foreground mt-2 block font-bold uppercase">{selectedTicket.user} • 09:30</span>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="bg-primary text-primary-foreground rounded-2xl p-4 shadow-md max-w-[80%]">
                          <p className="text-sm">
                            "Bonjour Mohamed. Nous vérifions votre dossier. Le barème 2026 applique un abattement plafonné à 1500 DA. Je reviens vers vous dans 15 minutes."
                          </p>
                          <span className="text-[10px] opacity-70 mt-2 block font-bold uppercase tracking-widest">Agent Support #12 • 10:15</span>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="p-4 bg-white border-t flex gap-2">
                  <Input placeholder="Répondre à l'utilisateur..." className="flex-1" />
                  <Button className="shrink-0 bg-primary"><Send className="h-4 w-4" /></Button>
                </CardFooter>
              </Card>
            </>
          ) : (
            <Card className="flex-1 flex items-center justify-center border-dashed border-2 bg-muted/10">
              <div className="text-center space-y-4">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-inner">
                  <MessageSquare className="h-10 w-10 text-muted-foreground opacity-20" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-primary">Aucun ticket sélectionné</h3>
                  <p className="text-sm text-muted-foreground">Sélectionnez une demande dans la liste de gauche pour répondre.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
