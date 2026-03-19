
"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Eye, RefreshCw, Sparkles, CheckCircle2, Loader2, 
  ArrowRight, FileText, Calendar, Zap, AlertTriangle, ListChecks
} from "lucide-react"
import { scrapeDgiNews } from "@/lib/dgi-watch/scraper"
import { analyzeDgiPublication } from "@/ai/flows/dgi-analysis-flow"
import { toast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function DgiWatchAdmin() {
  const db = useFirestore()
  const [isProcessing, setIsProcessing] = React.useState(false)

  const publicationsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "dgi_publications"), orderBy("detectedAt", "desc")) : null
  , [db]);
  const { data: publications, isLoading } = useCollection(publicationsQuery);

  const handleSyncAndAnalyze = async () => {
    if (!db) return
    setIsProcessing(true)
    try {
      const news = await scrapeDgiNews()
      
      for (const item of news) {
        const pubRef = doc(db, "dgi_publications", item.id)
        
        // On analyse systématiquement pour le prototype, ou seulement si non analysé
        const analysis = await analyzeDgiPublication({ 
          title: item.title, 
          content: item.title 
        })

        await setDocumentNonBlocking(pubRef, {
          ...item,
          ...analysis,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      }

      toast({ title: "Sync & Analyse Terminée", description: "Le catalogue DGI a été mis à jour avec les extractions IA." })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Erreur Sync" })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Eye className="text-accent h-8 w-8" /> Console DGI Watch
          </h1>
          <p className="text-muted-foreground">Surveillance réglementaire et extraction de données via Gemini 2.5.</p>
        </div>
        <Button onClick={handleSyncAndAnalyze} disabled={isProcessing} className="bg-primary shadow-xl h-12 px-6">
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Forcer Sync & Analyse IA
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Dernière Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-500" />
              {publications?.[0] ? new Date(publications[0].detectedAt).toLocaleString('fr-DZ') : "Jamais"}
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Indexées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{publications?.length || 0} publications</div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Alertes Critiques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">
              {publications?.filter(p => p.impactLevel === 'critique').length || 0} détectées
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold opacity-80">Moteur Fiscal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> CONFORME 2026
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Journal Détaillé des Analyses
        </h3>
        
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-6">
            {publications?.map((pub) => (
              <Card key={pub.id} className="overflow-hidden border-none shadow-lg ring-1 ring-border">
                <CardHeader className="bg-muted/30 border-b py-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          pub.impactLevel === 'critique' ? 'destructive' : 
                          pub.impactLevel === 'important' ? 'default' : 'secondary'
                        } className="text-[8px] uppercase">
                          {pub.impactLevel}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Détecté le {new Date(pub.detectedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="text-lg text-primary">{pub.title}</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="h-8 text-[10px]">
                      <a href={pub.url} target="_blank" rel="noopener noreferrer">Source <ArrowRight className="ml-1 h-3 w-3" /></a>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Colonne 1 : Résumé & Modules */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                          <Zap className="h-3 w-3 text-accent" /> Résumé Exécutif
                        </h4>
                        <p className="text-sm leading-relaxed italic text-foreground/80">"{pub.summary}"</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Modules SaaS Impactés</h4>
                        <div className="flex flex-wrap gap-2">
                          {pub.affectedModules?.map((m: string) => (
                            <Badge key={m} variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">{m}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Colonne 2 : Points Clés */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                        <ListChecks className="h-3 w-3 text-primary" /> Points de Vigilance IA
                      </h4>
                      <ul className="space-y-2">
                        {pub.keyPoints?.map((pt: string, idx: number) => (
                          <li key={idx} className="text-xs flex items-start gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Colonne 3 : Variables Extraites */}
                    <div className="space-y-4 bg-muted/20 p-4 rounded-xl">
                      <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                        <Zap className="h-3 w-3 text-emerald-600" /> Données Structurées
                      </h4>
                      {pub.extractedVariables && pub.extractedVariables.length > 0 ? (
                        <div className="space-y-3">
                          {pub.extractedVariables.map((v: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border shadow-sm">
                              <div>
                                <p className="text-[10px] font-bold text-primary truncate w-32">{v.name}</p>
                                <p className="text-[8px] text-muted-foreground">Code: {v.code}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-black text-emerald-600">{v.value}</p>
                                <p className="text-[8px] text-muted-foreground">Effet: {v.effectiveDate}</p>
                              </div>
                            </div>
                          ))}
                          <Button size="sm" className="w-full h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700">
                            Injecter dans le Moteur
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground italic text-xs">
                          <AlertTriangle className="h-4 w-4 mx-auto mb-2 opacity-50" />
                          Aucune variable numérique détectée.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
