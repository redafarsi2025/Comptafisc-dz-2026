
"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Eye, RefreshCw, Sparkles, CheckCircle2, Loader2, 
  FileText, Calendar, Zap, ListChecks, DatabaseZap, History, Clock, ExternalLink, Inbox, BellRing, TrendingUp, AlertTriangle, ShieldAlert, PlusCircle, Edit3, Send
} from "lucide-react"
import { scrapeDgiNews } from "@/lib/dgi-watch/scraper"
import { analyzeDgiPublication } from "@/ai/flows/dgi-analysis-flow"
import { toast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function DgiWatchAdmin() {
  const db = useFirestore()
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isInjecting, setIsInjecting] = React.useState<string | null>(null)
  const [lastSyncStatus, setLastSyncStatus] = React.useState<'idle' | 'success' | 'empty' | 'error'>('idle')
  
  // State for manual entry
  const [isManualDialogOpen, setIsManualDialogOpen] = React.useState(false)
  const [isAnalyzingManual, setIsAnalyzingManual] = React.useState(false)
  const [manualEntry, setManualEntry] = React.useState({ title: "", content: "" })

  const publicationsQuery = useMemoFirebase(() => 
    db ? query(collection(db, "dgi_publications"), orderBy("detectedAt", "desc")) : null
  , [db]);
  const { data: publications, isLoading } = useCollection(publicationsQuery);

  const isFromThisMonth = (dateStr: string) => {
    if (!dateStr) return false;
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonthFr = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(now).toLowerCase();
    const d = dateStr.toLowerCase();
    return d.includes(currentYear) && (d.includes(currentMonthFr) || d.includes((now.getMonth() + 1).toString().padStart(2, '0')));
  };

  const pendingItems = React.useMemo(() => publications?.filter(p => !p.isApplied) || [], [publications]);
  const newsThisMonth = React.useMemo(() => publications?.filter(p => isFromThisMonth(p.publishedDate)) || [], [publications]);
  const currentMonthName = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date());

  const handleSyncAndAnalyze = async () => {
    if (!db) return
    setIsProcessing(true)
    setLastSyncStatus('idle')
    
    try {
      toast({ title: "Interrogation DGI...", description: "Recherche de nouveautés sur mfdgi.gov.dz" });
      
      const news = await scrapeDgiNews()
      
      if (news.length === 0) {
        setLastSyncStatus('empty')
        toast({ 
          variant: "destructive", 
          title: "Aucun résultat", 
          description: "Le site de la DGI est inaccessible ou n'affiche aucune nouveauté pour le moment." 
        });
        setIsProcessing(false);
        return;
      }

      setLastSyncStatus('success')
      for (const item of news) {
        await setDocumentNonBlocking(doc(db, "dgi_publications", item.id), {
          ...item,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      }

      toast({ title: "Titres récupérés", description: `${news.length} parutions indexées. Analyse IA en cours...` })

      for (const item of news) {
        try {
          const analysis = await analyzeDgiPublication({ title: item.title, content: item.title });
          await setDocumentNonBlocking(doc(db, "dgi_publications", item.id), {
            ...analysis,
            analysisCompleted: true,
            updatedAt: new Date().toISOString()
          }, { merge: true })
        } catch (err) {
          console.error(`Erreur analyse IA pour ${item.id}`);
        }
      }
    } catch (e) {
      setLastSyncStatus('error')
      toast({ variant: "destructive", title: "Échec de synchronisation" });
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualSubmit = async () => {
    if (!db || !manualEntry.title || !manualEntry.content) return;
    setIsAnalyzingManual(true);
    
    const docId = `MANUAL_${Date.now()}`;
    const manualDoc = {
      id: docId,
      title: manualEntry.title,
      url: "Saisie Manuelle",
      publishedDate: new Date().toISOString().split('T')[0],
      detectedAt: new Date().toISOString(),
      category: 'manuel',
      isApplied: false,
      analysisCompleted: false,
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Enregistrer le document
      await setDocumentNonBlocking(doc(db, "dgi_publications", docId), manualDoc, { merge: true });
      setIsManualDialogOpen(false);
      setManualEntry({ title: "", content: "" });
      toast({ title: "Document enregistré", description: "L'IA commence l'analyse du texte saisi." });

      // 2. Analyser via IA
      const analysis = await analyzeDgiPublication({ 
        title: manualEntry.title, 
        content: manualEntry.content 
      });

      await setDocumentNonBlocking(doc(db, "dgi_publications", docId), {
        ...analysis,
        analysisCompleted: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast({ title: "Analyse terminée", description: "Le document manuel a été traité avec succès." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur lors de l'analyse" });
    } finally {
      setIsAnalyzingManual(false);
    }
  };

  const handleInjectVariables = async (pub: any) => {
    if (!db || !pub.extractedVariables?.length) return;
    setIsInjecting(pub.id);
    try {
      const lawId = `AUTO_${pub.id.substring(0, 8)}`;
      await setDocumentNonBlocking(doc(db, "fiscal_laws", lawId), {
        id: lawId,
        name: pub.title,
        description: `Injection auto DGI Watch. Source: ${pub.url}`,
        effectiveStartDate: pub.extractedVariables[0]?.effectiveDate || new Date().toISOString().split('T')[0],
        publicationDate: pub.publishedDate || new Date().toISOString().split('T')[0]
      }, { merge: true });

      for (const v of pub.extractedVariables) {
        await setDocumentNonBlocking(doc(db, "fiscal_variable_types", v.code), {
          id: v.code, code: v.code, name: v.name, unit: v.value.includes('%') ? '%' : 'DA', dataType: 'number'
        }, { merge: true });

        const valId = `VAL_${lawId}_${v.code}`;
        await setDocumentNonBlocking(doc(db, "fiscal_variable_values", valId), {
          id: valId, fiscalLawId: lawId, fiscalVariableTypeId: v.code,
          value: v.value.replace(/[^0-9.]/g, ''),
          effectiveStartDate: v.effectiveDate || new Date().toISOString().split('T')[0]
        }, { merge: true });
      }

      await setDocumentNonBlocking(doc(db, "dgi_publications", pub.id), { isApplied: true, appliedAt: new Date().toISOString() }, { merge: true });
      toast({ title: "Variables injectées avec succès" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur injection" });
    } finally { setIsInjecting(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Eye className="text-accent h-8 w-8" /> Console DGI Watch
          </h1>
          <p className="text-muted-foreground">Veille automatisée sur mfdgi.gov.dz & Ingestion Manuelle intelligente.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-accent text-accent hover:bg-accent/5">
                <PlusCircle className="mr-2 h-4 w-4" /> Saisie Manuelle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-primary" /> Analyser un Texte Officiel
                </DialogTitle>
                <DialogDescription>
                  Copiez ici un communiqué, une procédure ou un texte réglementaire pour l'extraire dans le moteur fiscal.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-title">Titre de la parution</Label>
                  <Input 
                    id="manual-title" 
                    placeholder="Ex: Communiqué DGI - Prorogation G12 bis" 
                    value={manualEntry.title}
                    onChange={e => setManualEntry({...manualEntry, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-content">Contenu textuel complet</Label>
                  <Textarea 
                    id="manual-content" 
                    placeholder="Collez ici le texte à analyser..." 
                    className="min-h-[250px]"
                    value={manualEntry.content}
                    onChange={e => setManualEntry({...manualEntry, content: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleManualSubmit} 
                  disabled={isAnalyzingManual || !manualEntry.title || !manualEntry.content}
                  className="w-full bg-primary"
                >
                  {isAnalyzingManual ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse IA en cours...</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" /> Soumettre pour Analyse IA</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={handleSyncAndAnalyze} disabled={isProcessing} className="bg-primary shadow-xl">
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Vérifier les Nouveautés
          </Button>
        </div>
      </div>

      {lastSyncStatus === 'empty' && (
        <Card className="bg-amber-50 border-amber-200 p-4 flex items-center gap-3 text-amber-800">
          <ShieldAlert className="h-5 w-5" />
          <p className="text-sm font-medium">Le site de la DGI semble inaccessible. Utilisez la "Saisie Manuelle" pour intégrer des nouveautés externes.</p>
        </Card>
      )}

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-blue-50 border-blue-200 border-l-4 border-l-blue-500">
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
        <Card className="bg-amber-50 border-amber-200 border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-amber-800">Inbox (À traiter)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 flex items-center gap-2">
              <Inbox className="h-6 w-6" />
              {pendingItems.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-primary shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Index total</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-black">{publications?.length || 0}</div></CardContent>
        </Card>
        <Card className="bg-primary text-white border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold opacity-80">État Moteur</CardTitle>
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
            {pendingItems.length > 0 && <Badge className="ml-2 bg-amber-500 text-white">{pendingItems.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Archive & Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-6 space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : pendingItems.length === 0 ? (
            <Card className="border-dashed border-2 py-20 text-center text-muted-foreground bg-white">
              <div className="flex flex-col items-center gap-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 opacity-20" />
                <p className="font-bold text-lg">Aucune nouvelle parution à traiter.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSyncAndAnalyze}>Relancer la recherche</Button>
                  <Button variant="secondary" onClick={() => setIsManualDialogOpen(true)}>Saisie manuelle</Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {pendingItems.map((pub) => {
                const isRecent = isFromThisMonth(pub.publishedDate);
                const isManual = pub.category === 'manuel';
                return (
                  <Card key={pub.id} className={`overflow-hidden border-none shadow-lg ring-1 ${isRecent ? 'ring-blue-200' : 'ring-border'}`}>
                    <CardHeader className={`${isRecent ? 'bg-blue-50/50' : 'bg-muted/30'} border-b py-4`}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isRecent && <Badge className="bg-blue-600 text-white text-[8px]">RÉCENT</Badge>}
                            {isManual && <Badge className="bg-accent text-primary text-[8px]">MANUEL</Badge>}
                            <Badge variant="outline" className="text-[8px] uppercase">{pub.category}</Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {isManual ? 'Saisi le' : 'Paru le'} {pub.publishedDate}
                            </span>
                          </div>
                          <CardTitle className="text-lg text-primary">{pub.title}</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="h-8 text-[10px]">
                          {pub.url !== "Saisie Manuelle" ? (
                            <a href={pub.url} target="_blank" rel="noopener noreferrer">Source <ExternalLink className="ml-1 h-3 w-3" /></a>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground">Saisie Manuelle <Edit3 className="h-3 w-3" /></span>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {!pub.analysisCompleted ? (
                        <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-xl border border-dashed">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <p className="text-xs text-muted-foreground italic">L'IA Gemini analyse le contenu de cette publication...</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3 text-accent" /> Analyse IA</h4>
                            <p className="text-sm italic">"{pub.summary}"</p>
                            <div className="flex flex-wrap gap-2">
                              {pub.affectedModules?.map((m: string) => <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>)}
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><ListChecks className="h-3 w-3 text-primary" /> Points Clés</h4>
                            <ul className="space-y-2">{pub.keyPoints?.map((pt: string, i: number) => <li key={i} className="text-xs flex gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5" />{pt}</li>)}</ul>
                          </div>
                          <div className="bg-white p-4 rounded-xl border-2 border-primary/10">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-[10px] font-bold uppercase flex items-center gap-1"><DatabaseZap className="h-3 w-3 text-emerald-600" /> Données</h4>
                              <Button size="sm" className="h-7 text-[9px] bg-emerald-600" onClick={() => handleInjectVariables(pub)} disabled={isInjecting === pub.id}>
                                {isInjecting === pub.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "APPROUVER"}
                              </Button>
                            </div>
                            {pub.extractedVariables?.map((v: any, i: number) => (
                              <div key={i} className="flex justify-between p-2 bg-muted/30 rounded border mb-2 text-[9px]">
                                <div><p className="font-bold text-primary">{v.name}</p><p>{v.code}</p></div>
                                <div className="text-right"><p className="font-black text-emerald-600">{v.value}</p><p>Effet: {v.effectiveDate}</p></div>
                              </div>
                            ))}
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
          <Card className="border-none shadow-xl ring-1 ring-border overflow-hidden bg-white">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Historique d'Audit</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Statut</TableHead>
                    <TableHead>Publication</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Parution</TableHead>
                    <TableHead>Mise à jour SaaS</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {publications?.map((pub) => (
                    <TableRow key={pub.id}>
                      <TableCell>{pub.isApplied ? <Badge className="bg-emerald-500 text-white text-[9px]">APPLIQUÉ</Badge> : <Badge variant="outline" className="text-[9px]">EN ATTENTE</Badge>}</TableCell>
                      <TableCell className="max-w-[300px] font-bold text-xs">
                        <div className="flex flex-col">
                          <span>{pub.title}</span>
                          {pub.category === 'manuel' && <span className="text-[8px] text-accent font-black">SAISIE MANUELLE</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground uppercase">{pub.category}</TableCell>
                      <TableCell className="text-xs">{pub.publishedDate}</TableCell>
                      <TableCell className="text-[10px]">{pub.appliedAt ? new Date(pub.appliedAt).toLocaleString() : '---'}</TableCell>
                      <TableCell className="text-right">
                        {pub.url !== "Saisie Manuelle" ? (
                          <Button variant="ghost" size="icon" asChild><a href={pub.url} target="_blank"><ExternalLink className="h-4 w-4" /></a></Button>
                        ) : (
                          <Edit3 className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
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
