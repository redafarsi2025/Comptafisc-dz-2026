
"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Eye, RefreshCw, Sparkles, Database, 
  Settings2, ShieldAlert, CheckCircle2, XCircle, Loader2
} from "lucide-react"
import { scrapeDgiNews } from "@/lib/dgi-watch/scraper"
import { analyzeDgiPublication } from "@/ai/flows/dgi-analysis-flow"
import { toast } from "@/hooks/use-toast"

export default function DgiWatchAdmin() {
  const db = useFirestore()
  const [isProcessing, setIsProcessing] = React.useState(false)

  const publicationsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "dgi_publications"), orderBy("detectedAt", "desc")) : null
  , [db]);
  const { data: publications } = useCollection(publicationsQuery);

  const handleSyncAndAnalyze = async () => {
    if (!db) return
    setIsProcessing(true)
    try {
      const news = await scrapeDgiNews()
      
      for (const item of news) {
        // Enregistrement initial
        const pubRef = doc(db, "dgi_publications", item.id)
        
        // Simuler une analyse IA pour chaque nouvelle publication
        // Dans une version réelle, on ne le ferait que pour les IDs non existants
        const analysis = await analyzeDgiPublication({ 
          title: item.title, 
          content: item.title // On utilise le titre pour l'instant
        })

        await setDocumentNonBlocking(pubRef, {
          ...item,
          ...analysis,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      }

      toast({ title: "Sync & Analyse Terminée", description: "Le catalogue DGI a été mis à jour." })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Erreur Sync" })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Eye className="text-accent h-8 w-8" /> Console DGI Watch
          </h1>
          <p className="text-muted-foreground">Supervision du scraper et validation des alertes réglementaires.</p>
        </div>
        <Button onClick={handleSyncAndAnalyze} disabled={isProcessing} className="bg-primary shadow-xl h-12 px-6">
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Forcer Sync & Analyse IA
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-t-4 border-t-emerald-500 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Fréquence Scraper</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">Toutes les 6h</div>
            <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Statut : ACTIF
            </p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-primary shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Dernière Vérification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">Aujourd'hui, 10:45</div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-amber-500 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Consommation Gemini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">1.2k tokens / jour</div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold opacity-80">Mises à jour Moteur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">4 auto-proposées</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-none">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-lg">Journal des Analyses IA</CardTitle>
          <CardDescription>Flux brut des données extraites du site officiel.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {publications?.map((pub) => (
              <div key={pub.id} className="p-4 flex items-start justify-between hover:bg-muted/5 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge variant={pub.impactLevel === 'critique' ? 'destructive' : 'secondary'} className="text-[8px]">
                      {pub.impactLevel.toUpperCase()}
                    </Badge>
                    <h4 className="font-bold text-sm text-primary">{pub.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-3xl italic">"{pub.summary}"</p>
                  <div className="flex gap-2">
                    {pub.affectedModules?.map((m: string) => (
                      <Badge key={m} variant="outline" className="text-[8px] border-primary/20 text-primary bg-primary/5">{m}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-[10px]">
                    <Settings2 className="h-3 w-3 mr-1" /> Configurer
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
