
"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Eye, RefreshCw, Sparkles, CheckCircle2, Loader2, 
  ArrowRight, FileText, Calendar, Zap, AlertTriangle, ListChecks, DatabaseZap, History, Clock, ExternalLink
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

  const handleSyncAndAnalyze = async () => {
    if (!db) return
    setIsProcessing(true)
    try {
      const news = await scrapeDgiNews()
      
      for (const item of news) {
        const pubRef = doc(db, "dgi_publications", item.id)
        
        // On demande à l'IA d'analyser le titre et les métadonnées
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
      toast({ variant: "destructive", title: "Erreur lors de la synchronisation" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleInjectVariables = async (pub: any) => {
    if (!db || !pub.extractedVariables || pub.extractedVariables.length === 0) return;
    
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
        description: `${pub.extractedVariables.length} variables ont été injectées avec succès.` 
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
          <p className="text-muted-foreground">Surveillance réglementaire en temps réel et extraction intelligente de données.</p>
        </div>
        <Button onClick={handleSyncAndAnalyze} disabled={isProcessing} className="bg-primary shadow-xl h-12 px-6">
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Forcer la Synchronisation & Analyse IA
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Dernière Synchronisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-500" />
              {publications?.[0] ? new Date(publications[0].detectedAt).toLocaleString('fr-DZ') : "Aucune"}
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Publications Indexées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{publications?.length || 0} documents</div>
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
            <CardTitle className="text-[10px] uppercase font-bold opacity-80">État du Moteur Fiscal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> CONFORME 2026
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analyses" className="w-full">
        <TabsList className="bg-muted/50 border p-1">
          <TabsTrigger value="analyses" className="flex items-center gap-2">
            <Zap className="h-4 w-4" /> Analyses Détaillées
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Archive & Traçabilité
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyses" className="mt-6 space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-6">
              {publications?.map((pub) => (
                <Card key={pub.id} className={`overflow-hidden border-none shadow-lg ring-1 ring-border ${pub.isApplied ? 'bg-emerald-50/10' : ''}`}>
                  <CardHeader className="bg-muted/30 border-b py-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            pub.impactLevel === 'critique' ? 'destructive' : 
                            pub.impactLevel === 'important' ? 'default' : 'secondary'
                          } className="text-[8px] uppercase">
                            Impact {pub.impactLevel}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Détecté le {new Date(pub.detectedAt).toLocaleDateString()}
                          </span>
                          {pub.isApplied && (
                            <Badge className="bg-emerald-500 text-white text-[8px] h-4 ml-2">APPLIQUÉ AU SYSTÈME</Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg text-primary">{pub.title}</CardTitle>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="h-8 text-[10px]">
                        <a href={pub.url} target="_blank" rel="noopener noreferrer">Source officielle <ArrowRight className="ml-1 h-3 w-3" /></a>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                            <Zap className="h-3 w-3 text-accent" /> Résumé Exécutif IA
                          </h4>
                          <p className="text-sm leading-relaxed italic text-foreground/80">"{pub.summary || 'Analyse en cours...'}"</p>
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

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                          <ListChecks className="h-3 w-3 text-primary" /> Points de Vigilance Extraits
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

                      <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-dashed border-primary/20">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                            <DatabaseZap className="h-3 w-3 text-emerald-600" /> Données pour le Moteur
                          </h4>
                          {pub.extractedVariables && pub.extractedVariables.length > 0 && !pub.isApplied && (
                            <Button 
                              size="sm" 
                              className="h-6 text-[8px] bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleInjectVariables(pub)}
                              disabled={isInjecting === pub.id}
                            >
                              {isInjecting === pub.id ? <Loader2 className="h-2 w-2 animate-spin mr-1" /> : <DatabaseZap className="h-2 w-2 mr-1" />}
                              APPROUVER & INJECTER
                            </Button>
                          )}
                        </div>
                        
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
                          </div>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground italic text-xs">
                            <AlertTriangle className="h-4 w-4 mx-auto mb-2 opacity-50" />
                            Aucune variable structurée détectée.
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card className="border-none shadow-xl ring-1 ring-border overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" /> Journal de Traçabilité des Parutions
              </CardTitle>
              <CardDescription>Documents analysés et état de synchronisation avec le moteur fiscal.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Statut</TableHead>
                    <TableHead>Titre de la Publication / Document</TableHead>
                    <TableHead>Parution (Site)</TableHead>
                    <TableHead>Mise à jour SaaS</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
                  ) : !publications?.length ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">Aucun document dans l'archive.</TableCell></TableRow>
                  ) : (
                    publications.map((pub) => (
                      <TableRow key={pub.id} className="hover:bg-muted/5 group">
                        <TableCell>
                          {pub.isApplied ? (
                            <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black uppercase tracking-tighter">Appliqué</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter">Analysé IA</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[400px]">
                          <div className="flex flex-col">
                            <span className="font-bold text-xs line-clamp-1">{pub.title}</span>
                            <span className="text-[10px] text-muted-foreground italic truncate">{pub.summary || "Contenu textuel traité par Gemini"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {pub.publishedDate}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <Clock className="h-3 w-3 text-primary" />
                              {pub.appliedAt ? new Date(pub.appliedAt).toLocaleDateString() : new Date(pub.detectedAt).toLocaleDateString()}
                            </div>
                            <span className="text-[9px] text-muted-foreground ml-4.5">
                              à {pub.appliedAt ? new Date(pub.appliedAt).toLocaleTimeString() : new Date(pub.detectedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild title="Voir la source">
                            <a href={pub.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
