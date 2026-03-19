
"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Eye, RefreshCw, Sparkles, CheckCircle2, Loader2, 
  FileText, Calendar, Zap, ListChecks, DatabaseZap, History, Clock, ExternalLink, Inbox, BellRing, TrendingUp, AlertTriangle
} from "lucide-react"
import { scrapeDgiNews } from "@/lib/dgi-watch/scraper"
import { analyzeDgiPublication } from "@/ai/flows/dgi-analysis-flow"
import { toast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DgiWatchAdmin() {
  const db = useFirestore()
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isInjecting, setIsInjecting] = React.useState<string | null>(null)

  const publicationsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "dgi_publications"), orderBy("detectedAt", "desc")) : null
  , [db]);
  const { data: publications, isLoading } = useCollection(publicationsQuery);

  // Helper pour détecter si un item est du mois en cours
  const isFromThisMonth = (dateStr: string) => {
    if (!dateStr) return false;
    const now = new Date();
    const currentMonthNum = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentYear = now.getFullYear().toString();
    const currentMonthFr = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(now).toLowerCase();
    
    const d = dateStr.toLowerCase();
    return (d.includes(currentMonthNum) && d.includes(currentYear)) || 
           (d.includes(currentMonthFr) && d.includes(currentYear)) ||
           (d.includes(currentYear) && d.includes(currentMonthNum));
  };

  const pendingItems = React.useMemo(() => publications?.filter(p => !p.isApplied) || [], [publications]);
  const newsThisMonth = React.useMemo(() => publications?.filter(p => isFromThisMonth(p.publishedDate)) || [], [publications]);

  const currentMonthName = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date());

  const handleSyncAndAnalyze = async () => {
    if (!db) return
    setIsProcessing(true)
    try {
      // 1. ÉTAPE : RÉCUPÉRATION DES TITRES (SCRAPPING)
      const news = await scrapeDgiNews()
      
      if (news.length === 0) {
        toast({ variant: "destructive", title: "Aucune donnée", description: "Le site de la DGI n'a renvoyé aucun résultat." });
        setIsProcessing(false);
        return;
      }

      // Enregistrer les titres immédiatement pour que l'utilisateur voit quelque chose
      for (const item of news) {
        const pubRef = doc(db, "dgi_publications", item.id)
        await setDocumentNonBlocking(pubRef, {
          ...item,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      }

      toast({ title: "Synchronisation réussie", description: `${news.length} parutions détectées. Lancement de l'analyse IA...` })

      // 2. ÉTAPE : ANALYSE IA (ENRICHSSEMENT)
      // On traite un par un pour ne pas surcharger Gemini
      for (const item of news) {
        try {
          const analysis = await analyzeDgiPublication({ 
            title: item.title, 
            content: item.title 
          })

          const pubRef = doc(db, "dgi_publications", item.id)
          await setDocumentNonBlocking(pubRef, {
            ...analysis,
            analysisCompleted: true,
            updatedAt: new Date().toISOString()
          }, { merge: true })
        } catch (err) {
          console.error(`Erreur analyse pour ${item.id}:`, err);
        }
      }

      toast({ title: "Mise à jour terminée", description: "Toutes les parutions ont été analysées par l'IA." })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Erreur lors de la synchronisation" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleInjectVariables = async (pub: any) => {
    if (!db || !pub.extractedVariables || pub.extractedVariables.length === 0) {
      toast({ variant: "destructive", title: "Impossible", description: "Aucune variable structurée à injecter." });
      return;
    }
    
    setIsInjecting(pub.id);
    try {
      const lawId = `AUTO_${pub.id.substring(0, 8)}`;
      await setDocumentNonBlocking(doc(db, "fiscal_laws", lawId), {
        id: lawId,
        name: pub.title,
        description: `Injection automatique depuis DGI Watch. Source: ${pub.url}`,
        effectiveStartDate: pub.extractedVariables[0]?.effectiveDate || new Date().toISOString().split('T')[0],
        publicationDate: pub.publishedDate || new Date().toISOString().split('T')[0],
        sourceUrl: pub.url
      }, { merge: true });

      for (const v of pub.extractedVariables) {
        await setDocumentNonBlocking(doc(db, "fiscal_variable_types", v.code), {
          id: v.code,
          code: v.code,
          name: v.name,
          unit: v.value.includes('%') ? '%' : 'DA',
          dataType: 'number',
          description: `Variable auto-détectée par IA : ${v.name}`
        }, { merge: true });

        const valId = `VAL_${lawId}_${v.code}`;
        await setDocumentNonBlocking(doc(db, "fiscal_variable_values", valId), {
          id: valId,
          fiscalLawId: lawId,
          fiscalVariableTypeId: v.code,
          value: v.value.replace(/[^0-9.]/g, ''),
          effectiveStartDate: v.effectiveDate || new Date().toISOString().split('T')[0],
          notes: `Injecté via DGI Watch - Analyse Gemini 2.5`
        }, { merge: true });
      }

      await setDocumentNonBlocking(doc(db, "dgi_publications", pub.id), {
        isApplied: true,
        appliedAt: new Date().toISOString()
      }, { merge: true });

      toast({ 
        title: "Moteur fiscal mis à jour", 
        description: `${pub.extractedVariables.length} variables injectées.` 
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Échec de l'injection" });
    } finally {
      setIsInjecting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Eye className="text-accent h-8 w-8" /> Console DGI Watch
          </h1>
          <p className="text-muted-foreground">Vérification des parutions officielles et mise à jour du moteur fiscal.</p>
        </div>
        <Button onClick={handleSyncAndAnalyze} disabled={isProcessing} className="bg-primary shadow-xl h-12 px-6">
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Vérifier les Nouveautés (Sync DGI)
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-blue-50 border-blue-200 border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-blue-800">Parutions en {currentMonthName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600 flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              {newsThisMonth.length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200 border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-amber-800">À traiter (Inbox)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 flex items-center gap-2">
              <Inbox className="h-6 w-6" />
              {pendingItems.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Total Indexé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{publications?.length || 0}</div>
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

      <Tabs defaultValue="inbox" className="w-full">
        <TabsList className="bg-muted/50 border p-1">
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <BellRing className="h-4 w-4" /> Nouveautés à traiter
            {pendingItems.length > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white animate-pulse">{pendingItems.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Archive & Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-6 space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : pendingItems.length === 0 ? (
            <Card className="border-dashed border-2 py-20 text-center text-muted-foreground">
              <div className="flex flex-col items-center gap-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 opacity-20" />
                <div>
                  <p className="font-bold text-lg">Tout est à jour !</p>
                  <p className="text-sm">Aucune parution DGI en attente.</p>
                </div>
                <Button variant="outline" onClick={handleSyncAndAnalyze}>Recharger les données</Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {pendingItems.map((pub) => {
                const isRecent = isFromThisMonth(pub.publishedDate);
                const hasAnalysis = !!pub.summary;
                return (
                  <Card key={pub.id} className={`overflow-hidden border-none shadow-lg ring-1 ${isRecent ? 'ring-blue-200 bg-blue-50/5' : 'ring-amber-200 bg-amber-50/10'}`}>
                    <CardHeader className={`${isRecent ? 'bg-blue-100/30' : 'bg-amber-100/30'} border-b py-4`}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isRecent && <Badge className="bg-blue-600 text-white text-[8px] h-4">RÉCENT</Badge>}
                            <Badge variant="outline" className="text-[8px] uppercase">{pub.category}</Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> Paru le {pub.publishedDate}
                            </span>
                          </div>
                          <CardTitle className="text-lg text-primary">{pub.title}</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="h-8 text-[10px]">
                          <a href={pub.url} target="_blank" rel="noopener noreferrer">Source officielle <ExternalLink className="ml-1 h-3 w-3" /></a>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {!hasAnalysis ? (
                        <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-xl border border-dashed">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <p className="text-xs text-muted-foreground italic">L'IA de ComptaFisc-DZ est en train d'analyser le contenu de cette publication...</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-accent" /> Analyse IA (Gemini)
                            </h4>
                            <p className="text-sm leading-relaxed text-foreground/80 italic">"{pub.summary}"</p>
                            <div>
                              <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Modules SaaS Impactés</h4>
                              <div className="flex flex-wrap gap-2">
                                {pub.affectedModules?.map((m: string) => (
                                  <Badge key={m} variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">{m}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                              <ListChecks className="h-3 w-3 text-primary" /> Points clés extraits
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

                          <div className="space-y-4 bg-white p-4 rounded-xl border-2 border-primary/10 shadow-inner">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                <DatabaseZap className="h-3 w-3 text-emerald-600" /> Données à Injecter
                              </h4>
                              <Button 
                                size="sm" 
                                className="h-7 text-[9px] bg-emerald-600 hover:bg-emerald-700 font-bold"
                                onClick={() => handleInjectVariables(pub)}
                                disabled={isInjecting === pub.id}
                              >
                                {isInjecting === pub.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <DatabaseZap className="h-3 w-3 mr-1" />}
                                APPROUVER
                              </Button>
                            </div>
                            
                            {pub.extractedVariables && pub.extractedVariables.length > 0 ? (
                              <div className="space-y-2">
                                {pub.extractedVariables.map((v: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center p-2 bg-muted/30 rounded border">
                                    <div>
                                      <p className="text-[9px] font-black text-primary truncate w-32">{v.name}</p>
                                      <p className="text-[8px] text-muted-foreground">{v.code}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs font-black text-emerald-600">{v.value}</p>
                                      <p className="text-[8px] text-muted-foreground">Effet: {v.effectiveDate}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-muted-foreground italic text-xs">Aucune variable numérique détectée.</div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="border-none shadow-xl ring-1 ring-border overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" /> Historique de Traitement
              </CardTitle>
              <CardDescription>Traçabilité des parutions analysées et appliquées.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Statut</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Parution</TableHead>
                    <TableHead>Mise à jour SaaS</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
                  ) : publications?.map((pub) => (
                    <TableRow key={pub.id} className="hover:bg-muted/5 group">
                      <TableCell>
                        {pub.isApplied ? (
                          <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black uppercase">Appliqué</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] font-black uppercase text-amber-600 border-amber-200">À traiter</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[400px]">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs line-clamp-1">{pub.title}</span>
                          <span className="text-[9px] text-muted-foreground italic truncate">{pub.summary || "Contenu indexé"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{pub.publishedDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <Clock className="h-3 w-3 text-primary" />
                          {pub.appliedAt ? new Date(pub.appliedAt).toLocaleString() : '---'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={pub.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
