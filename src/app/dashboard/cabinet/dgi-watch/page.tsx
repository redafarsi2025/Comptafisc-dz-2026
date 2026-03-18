
"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Eye, Bell, ShieldCheck, ExternalLink, 
  Sparkles, AlertTriangle, Info, Calendar, RefreshCw
} from "lucide-react"
import { scrapeDgiNews } from "@/lib/dgi-watch/scraper"
import { toast } from "@/hooks/use-toast"

export default function DgiWatchDashboard() {
  const db = useFirestore()
  const [isSyncing, setIsSyncing] = React.useState(false)

  const publicationsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "dgi_publications"), orderBy("detectedAt", "desc"), limit(20)) : null
  , [db]);
  const { data: publications, isLoading } = useCollection(publicationsQuery);

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const news = await scrapeDgiNews()
      toast({ 
        title: "Synchronisation terminée", 
        description: `${news.length} publications analysées.` 
      })
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur Sync" })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Eye className="h-8 w-8 text-accent" /> DGI Watch
          </h1>
          <p className="text-muted-foreground text-sm">Veille réglementaire automatisée et analyse IA du site de la DGI.</p>
        </div>
        <Button onClick={handleManualSync} disabled={isSyncing} className="bg-primary shadow-lg">
          {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Vérifier les nouveautés
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-800">État du Moteur</p>
                <h2 className="text-2xl font-bold text-emerald-600">CONFORME LF 2026</h2>
              </div>
              <ShieldCheck className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-white border-none shadow-lg">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold opacity-80">Publications indexées</p>
            <h2 className="text-3xl font-bold">{publications?.length || 0}</h2>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase font-bold text-amber-800">Alertes IA en attente</p>
            <h2 className="text-3xl font-bold text-amber-600">0</h2>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Dernières parutions DGI
        </h3>
        
        {isLoading ? (
          <div className="flex justify-center py-20"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : !publications?.length ? (
          <Card className="border-dashed border-2 py-20 text-center text-muted-foreground">
            Aucune publication indexée pour le moment. Cliquez sur "Vérifier les nouveautés".
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {publications.map((pub) => (
              <Card key={pub.id} className="overflow-hidden border-l-4 border-l-primary hover:shadow-md transition-shadow">
                <CardHeader className="bg-muted/20 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[8px] uppercase">{pub.category}</Badge>
                        <span className="text-[10px] text-muted-foreground">{pub.publishedDate}</span>
                      </div>
                      <CardTitle className="text-base text-primary">{pub.title}</CardTitle>
                    </div>
                    <Badge className={
                      pub.impactLevel === 'critique' ? 'bg-destructive' : 
                      pub.impactLevel === 'important' ? 'bg-amber-500' : 'bg-blue-500'
                    }>
                      {pub.impactLevel.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{pub.summary || "Analyse IA en attente..."}</p>
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex gap-2">
                      {pub.affectedSaasModules?.map((m: string) => (
                        <Badge key={m} variant="secondary" className="text-[10px] bg-primary/5 text-primary">#{m}</Badge>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={pub.url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1">
                        Voir source <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
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
