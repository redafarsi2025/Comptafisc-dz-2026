
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { askFiscalQuestion, AiFiscalAssistantOutput } from "@/ai/flows/ai-fiscal-assistant"
import { MessageSquare, Send, Bot, User, BookOpen, Sparkles, Loader2, Target, TrendingUp, ShieldCheck } from "lucide-react"

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  citations?: string[]
}

export default function FiscalAssistant() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis votre Conseiller Stratégique ComptaFisc-DZ. Au-delà de la réglementation, je peux vous proposer des optimisations pour votre trésorerie et votre fiscalité. Que souhaitez-vous améliorer aujourd\'hui ?'
    }
  ])
  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMsg = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsLoading(true)

    try {
      const result: AiFiscalAssistantOutput = await askFiscalQuestion({ question: userMsg })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.answer,
        citations: result.citations
      }])
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Désolé, je rencontre une difficulté technique. Veuillez réessayer plus tard."
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter">
            COACH STRATÉGIQUE <Sparkles className="h-6 w-6 text-accent" />
          </h1>
          <p className="text-muted-foreground font-medium">Recherche juridique CIDTA & Algorithmes d'optimisation financière.</p>
        </div>
        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary h-8 px-4 font-black uppercase text-[10px]">
          <Bot className="mr-2 h-3 w-3" /> ANALYSE 2026 ACTIVE
        </Badge>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        <Card className="lg:col-span-3 flex flex-col overflow-hidden shadow-2xl border-t-4 border-t-primary bg-white">
          <CardContent className="flex-1 p-0">
            <ScrollArea ref={scrollRef} className="h-[500px] p-6">
              <div className="space-y-6">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[80%] gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${m.role === 'user' ? 'bg-accent' : 'bg-primary'}`}>
                        {m.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                      </div>
                      <div className={`space-y-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${m.role === 'user' ? 'bg-accent/10 text-foreground border border-accent/20' : 'bg-muted/50 text-foreground border border-transparent'}`}>
                          {m.content}
                        </div>
                        {m.citations && m.citations.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {m.citations.map((cit, idx) => (
                              <div key={idx} className="flex items-center gap-1 text-[9px] font-black uppercase bg-primary/5 text-primary px-2 py-0.5 rounded border border-primary/20">
                                <BookOpen className="h-2 w-2" /> {cit}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center animate-pulse shadow-lg">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-muted/50 p-4 rounded-2xl flex items-center gap-3 border border-dashed border-primary/20">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Optimisation en cours...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-4 border-t bg-slate-50">
            <div className="flex w-full gap-2">
              <Input
                placeholder="Ex: Proposez-moi 3 leviers pour réduire mon BFR ce trimestre."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 focus-visible:ring-primary h-12 bg-white rounded-xl shadow-inner"
              />
              <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="h-12 w-12 rounded-xl shadow-lg">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>

        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-slate-900 text-white border-none shadow-xl">
             <CardHeader className="pb-2">
               <CardTitle className="text-[10px] font-black uppercase text-accent tracking-widest">Suggestions Coach</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <button onClick={() => setInput("Quelles dépenses sont déductibles pour réduire mon IBS ?")} className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                 <div className="flex items-center gap-2 text-[10px] font-black text-accent mb-1 uppercase"><TrendingUp className="h-3 w-3" /> Fiscalité</div>
                 <p className="text-[11px] opacity-70 group-hover:opacity-100">Optimiser l'IBS 2026</p>
               </button>
               <button onClick={() => setInput("Comment améliorer mon ratio de liquidité ?")} className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                 <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 mb-1 uppercase"><Target className="h-3 w-3" /> Management</div>
                 <p className="text-[11px] opacity-70 group-hover:opacity-100">Améliorer la solvabilité</p>
               </button>
               <button onClick={() => setInput("Quels sont les avantages fiscaux pour une Startup ?")} className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                 <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 mb-1 uppercase"><ShieldCheck className="h-3 w-3" /> Exonérations</div>
                 <p className="text-[11px] opacity-70 group-hover:opacity-100">Labels & Dispositifs</p>
               </button>
             </CardContent>
          </Card>
          
          <div className="p-4 bg-primary/5 rounded-2xl border border-dashed border-primary/20">
             <h5 className="text-[10px] font-black text-primary uppercase mb-2">Note Contextuelle</h5>
             <p className="text-[10px] text-muted-foreground leading-relaxed italic">
               "L'assistant utilise les données de votre Grand Livre et de vos factures pour personnaliser ses conseils en fonction de votre secteur (NAP)."
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
