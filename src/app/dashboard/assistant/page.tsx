"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { askFiscalQuestion, AiFiscalAssistantOutput } from "@/ai/flows/ai-fiscal-assistant"
import { MessageSquare, Send, Bot, User, BookOpen, Sparkles, Loader2 } from "lucide-react"

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  citations?: string[]
}

export default function FiscalAssistant() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant fiscal ComptaFisc-DZ. Comment puis-je vous aider avec la réglementation algérienne (TVA, IRG, SCF...) aujourd\'hui ?'
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
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            Assistant Fiscal IA <Sparkles className="h-6 w-6 text-accent" />
          </h1>
          <p className="text-muted-foreground">Recherche intelligente dans le corpus juridique (CIDTA, CTCA, LF 2024-2026).</p>
        </div>
        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
          <Bot className="mr-1 h-3 w-3" /> Propulsé par Gemini 2.5
        </Badge>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-xl border-t-4 border-t-primary">
        <CardContent className="flex-1 p-0">
          <ScrollArea ref={scrollRef} className="h-[500px] p-6">
            <div className="space-y-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[80%] gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-accent' : 'bg-primary'}`}>
                      {m.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                    </div>
                    <div className={`space-y-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`p-4 rounded-2xl shadow-sm text-sm ${m.role === 'user' ? 'bg-accent/10 text-foreground' : 'bg-muted/50 text-foreground'}`}>
                        {m.content}
                      </div>
                      {m.citations && m.citations.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {m.citations.map((cit, idx) => (
                            <div key={idx} className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
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
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center animate-pulse">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-muted/50 p-4 rounded-2xl flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground italic">L'assistant analyse le corpus fiscal...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 border-t bg-card">
          <div className="flex w-full gap-2">
            <Input
              placeholder="Ex: Quel est le taux de TVA pour le matériel informatique en 2026 ?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 focus-visible:ring-primary"
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:bg-primary/5 transition-colors border-dashed" onClick={() => setInput("Quels sont les barèmes de l'IRG pour 2024 ?")}>
          <CardHeader className="p-4">
            <CardTitle className="text-xs uppercase text-muted-foreground">IRG & Salaires</CardTitle>
            <p className="text-sm font-medium">Voir les barèmes IRG</p>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:bg-primary/5 transition-colors border-dashed" onClick={() => setInput("Expliquez le calcul du droit de timbre sur facture.")}>
          <CardHeader className="p-4">
            <CardTitle className="text-xs uppercase text-muted-foreground">Invoicing</CardTitle>
            <p className="text-sm font-medium">Timbre Fiscal Progressif</p>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover:bg-primary/5 transition-colors border-dashed" onClick={() => setInput("Quelles sont les obligations IFU pour une EURL ?")}>
          <CardHeader className="p-4">
            <CardTitle className="text-xs uppercase text-muted-foreground">Fiscalité</CardTitle>
            <p className="text-sm font-medium">Régime IFU vs Réel</p>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}