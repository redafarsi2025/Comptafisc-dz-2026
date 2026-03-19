
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Layout, Database, Save, Eye, Wand2, Loader2, 
  ChevronLeft, Trash2, MousePointer2, FileText, 
  UploadCloud, AlertCircle, FileUp, Sparkles, Layers,
  CheckCircle2, Clock, History
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { analyzeFormLayout } from "@/ai/flows/form-layout-analysis"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function DgiFormsEditor() {
  const db = useFirestore()
  const { user } = useUser()
  const [selectedForm, setSelectedForm] = React.useState<any>(null)
  const [activeTab, setActiveTab] = React.useState("library")
  const [currentPageIdx, setCurrentPageIdx] = React.useState(0)
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch published templates from Firestore
  const templatesQuery = useMemoFirebase(() => 
    db ? query(collection(db, "dgi_templates"), orderBy("updatedAt", "desc")) : null
  , [db]);
  const { data: storedTemplates, isLoading: isTemplatesLoading } = useCollection(templatesQuery);

  // Smart Import State
  const [smartImport, setSmartImport] = React.useState({ title: "", file: null as File | null })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSmartImport({ ...smartImport, file: e.target.files[0] });
    }
  };

  const handleSmartImport = async () => {
    if (!smartImport.file || !smartImport.title) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(smartImport.file!);
      });

      const fileDataUri = await base64Promise;
      
      // Validation de taille pour Firestore (limite 1Mo par document)
      if (fileDataUri.length > 1000000) {
        throw new Error("Le document est trop volumineux pour être stocké directement sur Firestore. Veuillez compresser votre image.");
      }

      const analysis = await analyzeFormLayout({ 
        fileDataUri, 
        documentTitle: smartImport.title 
      });

      const isPdf = smartImport.file.type === 'application/pdf';

      const newForm = {
        id: `template_${Date.now()}`,
        type: smartImport.title.includes('50') ? 'G50' : 'G4',
        version: '2026.1',
        name: smartImport.title,
        status: "Draft",
        lastUpdate: new Date().toISOString(),
        pages: [
          {
            pageNumber: 1,
            title: "Page 1",
            backgroundImage: fileDataUri,
            isPdf: isPdf,
            fields: analysis.detectedFields.map(f => ({
              ...f,
              id: `f_${Math.random().toString(36).substr(2, 9)}`,
              variable: f.variableSuggestion || ""
            }))
          }
        ]
      };

      setSelectedForm(newForm);
      setCurrentPageIdx(0);
      setActiveTab("editor");
      toast({ 
        title: "Analyse IA Terminée", 
        description: `${analysis.detectedFields.length} champs détectés.` 
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Erreur lors de l'analyse.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  const handlePublish = async () => {
    if (!db || !selectedForm || !user) return;
    setIsPublishing(true);

    try {
      const templateRef = doc(db, "dgi_templates", selectedForm.id);
      const publishData = {
        ...selectedForm,
        status: "Published",
        publishedAt: new Date().toISOString(),
        publishedBy: user.uid,
        updatedAt: new Date().toISOString()
      };

      await setDocumentNonBlocking(templateRef, publishData, { merge: true });
      
      toast({ 
        title: "Template Enregistré sur Firestore", 
        description: `Le formulaire "${selectedForm.name}" est sauvegardé et accessible.` 
      });
      setSelectedForm(publishData);
      setActiveTab("library");
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur Firestore" });
    } finally {
      setIsPublishing(false);
    }
  }

  const handleDeleteTemplate = (id: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, "dgi_templates", id));
    toast({ title: "Template supprimé" });
  }

  const handleUpdateField = (fieldId: string, updates: any) => {
    const updatedForm = { ...selectedForm }
    const fieldIdx = updatedForm.pages[currentPageIdx].fields.findIndex((f: any) => f.id === fieldId)
    if (fieldIdx > -1) {
      updatedForm.pages[currentPageIdx].fields[fieldIdx] = { ...updatedForm.pages[currentPageIdx].fields[fieldIdx], ...updates }
      setSelectedForm(updatedForm)
    }
  }

  const handleRemoveField = (fieldId: string) => {
    const updatedForm = { ...selectedForm }
    updatedForm.pages[currentPageIdx].fields = updatedForm.pages[currentPageIdx].fields.filter((f: any) => f.id !== fieldId)
    setSelectedForm(updatedForm)
  }

  const handleAddField = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode || !selectedForm) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newField = {
      id: `f_${Date.now()}`,
      name: "Nouveau Champ",
      x: Math.round(x),
      y: Math.round(y),
      width: 150,
      type: "text",
      variable: ""
    }

    const updatedForm = { ...selectedForm }
    updatedForm.pages[currentPageIdx].fields.push(newField)
    setSelectedForm(updatedForm)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Layout className="text-accent h-8 w-8" /> Studio de Formulaires DGI
          </h1>
          <p className="text-muted-foreground font-medium">Ingestion automatique, stockage Firestore et publication au catalogue.</p>
        </div>
        <div className="flex gap-2">
          {selectedForm && (
            <Button variant="outline" className="bg-white shadow-sm" onClick={() => { setActiveTab("library"); setSelectedForm(null); }}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Retour au Catalogue
            </Button>
          )}
          <Button 
            className="bg-primary shadow-xl h-11 px-6" 
            disabled={!selectedForm || isPublishing}
            onClick={handlePublish}
          >
            {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Enregistrer sur Firestore
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 border p-1 mb-6">
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Database className="h-4 w-4" /> Bibliothèque Firestore
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2" disabled={!selectedForm}>
            <Wand2 className="h-4 w-4" /> Éditeur Canva IA
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2" disabled={!selectedForm}>
            <Eye className="h-4 w-4" /> Simulation Remplissage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-8">
          <Card className="border-primary/20 bg-primary/5 shadow-inner">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5 text-accent" /> Importer un Document (PDF/JPG)
              </CardTitle>
              <CardDescription>L'IA analyse le document, crée les zones et les stocke dans Firestore.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Titre du document</Label>
                  <Input 
                    placeholder="Ex: G50 - Mars 2026" 
                    value={smartImport.title} 
                    onChange={e => setSmartImport({...smartImport, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Fichier source</Label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-muted/50 transition-colors border-primary/20">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-2 text-primary opacity-50" />
                        <p className="text-xs text-muted-foreground">
                          {smartImport.file ? <span className="font-bold text-primary">{smartImport.file.name}</span> : "Cliquez pour uploader (Max 1Mo)"}
                        </p>
                      </div>
                      <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileChange} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white/50 rounded-xl border border-dashed flex flex-col items-center justify-center text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Database className="h-6 w-6 text-emerald-600" />
                </div>
                <h4 className="text-sm font-bold">Stockage Cloud Direct</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Vos templates sont persistés dans Firestore. Les clients du SaaS les verront automatiquement lors de la génération de leurs déclarations.
                </p>
              </div>
            </CardContent>
            {error && (
              <div className="px-6 pb-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erreur</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}
            <CardFooter className="flex justify-end border-t bg-white/50 p-4">
              <Button 
                onClick={handleSmartImport} 
                disabled={isAnalyzing || !smartImport.file || !smartImport.title}
                className="bg-accent text-primary font-bold shadow-lg"
              >
                {isAnalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse IA...</> : <><Wand2 className="mr-2 h-4 w-4" /> Lancer l'IA Vision</>}
              </Button>
            </CardFooter>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Bibliothèque des Formulaires</h3>
            {isTemplatesLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : !storedTemplates?.length ? (
              <Card className="border-dashed py-12 text-center text-muted-foreground">Aucun template stocké dans Firestore.</Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {storedTemplates.map((t) => (
                  <Card key={t.id} className="hover:shadow-xl transition-all cursor-pointer group border-l-4 border-l-primary bg-white">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="bg-primary/10 p-2 rounded-lg text-primary"><FileText className="h-5 w-5" /></div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleDeleteTemplate(t.id)}><Trash2 className="h-4 w-4" /></Button>
                          <Badge className="bg-emerald-500 text-white text-[8px]">{t.status}</Badge>
                        </div>
                      </div>
                      <CardTitle className="text-sm mt-4">{t.name}</CardTitle>
                      <CardDescription className="text-[9px] font-mono">{t.id}</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-0 justify-between">
                      <span className="text-[10px] text-muted-foreground italic flex items-center gap-1"><Clock className="h-2 w-2" /> {new Date(t.updatedAt).toLocaleDateString()}</span>
                      <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => { setSelectedForm(t); setActiveTab("editor"); }}>Éditer</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="editor">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Card className="shadow-lg border-t-4 border-t-primary bg-white">
                <CardHeader className="bg-muted/30 pb-2">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase">
                    <Layers className="h-4 w-4 text-primary" /> Champs Détectés
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="divide-y">
                      {selectedForm?.pages[currentPageIdx]?.fields.map((field: any) => (
                        <div key={field.id} className="p-4 space-y-3 hover:bg-primary/5 transition-colors">
                          <div className="flex justify-between items-center">
                            <Input 
                              value={field.name} 
                              onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                              className="h-7 text-[10px] font-bold border-none bg-transparent focus-visible:ring-0 p-0"
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveField(field.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[8px] uppercase font-bold text-muted-foreground">Variable liée</Label>
                            <Select value={field.variable} onValueChange={(v) => handleUpdateField(field.id, { variable: v })}>
                              <SelectTrigger className="h-7 text-[9px] bg-white"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TENANT_NAME">Raison Sociale</SelectItem>
                                <SelectItem value="TENANT_NIF">NIF Client</SelectItem>
                                <SelectItem value="TOTAL_TVA">Total TVA (101)</SelectItem>
                                <SelectItem value="IRG_AMT">IRG Salaires</SelectItem>
                                <SelectItem value="TAP_AMT">TAP HT</SelectItem>
                                <SelectItem value="STAMP_DUTY">Droits de Timbre</SelectItem>
                                <SelectItem value="PERIOD">Période</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl">
                <div className="flex items-center gap-2 text-primary font-bold text-xs mb-2">
                  <MousePointer2 className="h-4 w-4" /> Ajustement Visuel
                </div>
                <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                  Cliquez sur le document pour ajouter une zone. Les templates sont stockés avec leur fond graphique Base64.
                </p>
                <Button 
                  variant={isEditMode ? "default" : "outline"} 
                  className="w-full mt-4 h-8 text-[10px]"
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  {isEditMode ? "QUITTER ÉDITION" : "ACTIVER PLACEMENT"}
                </Button>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-slate-200 rounded-2xl p-8 overflow-auto flex justify-center min-h-[1000px] border shadow-inner">
                {selectedForm?.pages[currentPageIdx]?.backgroundImage && (
                  <div 
                    className="relative bg-white shadow-2xl transition-all origin-top border"
                    style={{ 
                      width: '800px', 
                      height: '1131px', 
                      backgroundImage: `url(${selectedForm.pages[currentPageIdx].backgroundImage})`, 
                      backgroundSize: 'cover'
                    }}
                    onClick={handleAddField}
                  >
                    {selectedForm.pages[currentPageIdx].fields.map((field: any) => (
                      <div 
                        key={field.id}
                        className={`absolute border-2 flex items-center justify-center cursor-move transition-all ${field.variable ? 'border-emerald-500 bg-emerald-500/20' : 'border-primary/50 bg-primary/10'}`}
                        style={{ left: `${field.x}px`, top: `${field.y}px`, width: `${field.width}px`, height: '24px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className={`text-[8px] font-black truncate px-1 ${field.variable ? 'text-emerald-800' : 'text-primary'}`}>
                          {field.variable || field.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div className="flex flex-col items-center bg-slate-300 p-12 rounded-2xl space-y-12">
            <Alert className="max-w-2xl bg-white border-primary shadow-lg">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <AlertTitle className="font-bold">Rendu Client Final</AlertTitle>
              <AlertDescription>Voici comment vos clients recevront le document généré depuis Firestore.</AlertDescription>
            </Alert>
            
            {selectedForm?.pages.map((page: any, idx: number) => (
              <Card 
                key={idx} 
                className="relative bg-white shadow-2xl overflow-hidden" 
                style={{ 
                  width: '800px', 
                  height: '1131px', 
                  backgroundImage: `url(${page.backgroundImage})`, 
                  backgroundSize: 'cover' 
                }}
              >
                {page.fields.map((field: any) => {
                  let value = "";
                  if (field.variable === "TENANT_NAME") value = "SARL BENSALEM COMMERCE";
                  if (field.variable === "TENANT_NIF") value = "001216000123456";
                  if (field.variable === "TOTAL_TVA") value = "245,600.00";
                  if (field.variable === "PERIOD") value = "AVRIL 2026";

                  return (
                    <div 
                      key={field.id}
                      className="absolute font-mono text-[12px] text-blue-900 font-bold flex items-center px-1"
                      style={{ left: `${field.x}px`, top: `${field.y}px`, width: `${field.width}px`, height: '24px' }}
                    >
                      {value || ""}
                    </div>
                  );
                })}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
