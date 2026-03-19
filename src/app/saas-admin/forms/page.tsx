"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileEdit, Settings2, Eye, Save, 
  Layout, Database, ArrowRight, CheckCircle2,
  FileText, Download, UploadCloud, 
  ChevronLeft, Plus, MousePointer2, Type, Trash2, Image as ImageIcon,
  Layers, Settings, PlusCircle, Sparkles, Loader2, Link as LinkIcon, Wand2,
  AlertCircle, FileUp, Upload
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
  const [selectedForm, setSelectedForm] = React.useState<any>(null)
  const [activeTab, setActiveTab] = React.useState("library")
  const [currentPageIdx, setCurrentPageIdx] = React.useState(0)
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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
      const analysis = await analyzeFormLayout({ 
        fileDataUri, 
        documentTitle: smartImport.title 
      });

      // Pour l'affichage en fond dans le Studio, si c'est un PDF, 
      // on prévient que l'affichage visuel nécessite une image pour le moment
      const isPdf = smartImport.file.type === 'application/pdf';

      const newForm = {
        id: `ai_${Date.now()}`,
        type: smartImport.title.includes('50') ? 'G50' : 'G4',
        version: '1.0 (AI)',
        name: smartImport.title,
        status: "Draft",
        lastUpdate: new Date().toISOString().split('T')[0],
        pages: [
          {
            pageNumber: 1,
            title: "Analyse IA - Page 1",
            backgroundImage: isPdf ? "" : fileDataUri, // Le base64 de l'image sert de fond
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
        description: `${analysis.detectedFields.length} champs détectés et positionnés.` 
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Erreur lors de l'analyse du document.");
      toast({ variant: "destructive", title: "Erreur Analyse", description: "Le format de fichier est peut-être corrompu." });
    } finally {
      setIsAnalyzing(false);
    }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Layout className="text-accent h-8 w-8" /> Ingestion Intelligente DGI
          </h1>
          <p className="text-muted-foreground font-medium">Analyse et mapping automatique des fonds officiels par IA Vision.</p>
        </div>
        <div className="flex gap-2">
          {selectedForm && (
            <Button variant="outline" className="bg-white shadow-sm" onClick={() => { setActiveTab("library"); setSelectedForm(null); }}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
          )}
          <Button className="bg-primary shadow-xl" disabled={!selectedForm}>
            <Save className="mr-2 h-4 w-4" /> Publier Template
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 border p-1 mb-6">
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Database className="h-4 w-4" /> Catalogue
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2" disabled={!selectedForm}>
            <Wand2 className="h-4 w-4" /> Éditeur IA
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2" disabled={!selectedForm}>
            <Eye className="h-4 w-4" /> Aperçu Réel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-8">
          <Card className="border-primary/20 bg-primary/5 shadow-inner">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5 text-accent" /> Importer un Document Officiel
              </CardTitle>
              <CardDescription>Uploadez un PDF ou une Image (JPG/PNG). L'IA détectera les cases automatiquement.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Titre du document</Label>
                  <Input 
                    placeholder="Ex: G N° 50 - 2026 (Recto)" 
                    value={smartImport.title} 
                    onChange={e => setSmartImport({...smartImport, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Fichier source (PDF ou Image)</Label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-muted/50 transition-colors border-primary/20">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-2 text-primary opacity-50" />
                        <p className="text-xs text-muted-foreground">
                          {smartImport.file ? <span className="font-bold text-primary">{smartImport.file.name}</span> : "Cliquez ou glissez votre PDF/Image ici"}
                        </p>
                      </div>
                      <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileChange} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white/50 rounded-xl border border-dashed flex flex-col items-center justify-center text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Wand2 className="h-6 w-6 text-accent" />
                </div>
                <h4 className="text-sm font-bold">Puissance de l'IA Vision</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Notre moteur analyse la géométrie du document pour positionner les champs de texte au pixel près et les lier aux variables fiscales.
                </p>
              </div>
            </CardContent>
            {error && (
              <div className="px-6 pb-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erreur d'importation</AlertTitle>
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
                {isAnalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse Vision en cours...</> : <><Wand2 className="mr-2 h-4 w-4" /> Analyser & Créer</>}
              </Button>
            </CardFooter>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-t-4 border-t-emerald-500 hover:shadow-xl transition-all cursor-pointer bg-white">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="bg-emerald-500 p-2 rounded-lg text-white shadow-lg"><FileText className="h-5 w-5" /></div>
                  <Badge className="bg-emerald-100 text-emerald-700">ACTIF</Badge>
                </div>
                <CardTitle className="text-base mt-4">G N° 50 - Standard</CardTitle>
                <CardDescription>Dernière révision : Janv 2026</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="editor">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Card className="shadow-lg border-t-4 border-t-primary bg-white">
                <CardHeader className="bg-muted/30 pb-2">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase">
                    <Layers className="h-4 w-4 text-primary" /> Structure Détectée
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
                  <MousePointer2 className="h-4 w-4" /> Ajustement Manuel
                </div>
                <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                  L'IA a pré-positionné les champs. Cliquez sur le document pour en ajouter un nouveau si nécessaire.
                </p>
                <Button 
                  variant={isEditMode ? "default" : "outline"} 
                  className="w-full mt-4 h-8 text-[10px]"
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  {isEditMode ? "DÉSACTIVER ÉDITION" : "ACTIVER ÉDITION MANUELLE"}
                </Button>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-slate-200 rounded-2xl p-8 overflow-auto flex justify-center min-h-[1000px] border shadow-inner">
                {selectedForm?.pages[currentPageIdx]?.backgroundImage ? (
                  <div 
                    className="relative bg-white shadow-2xl transition-all origin-top"
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
                        className={`absolute border-2 flex items-center justify-center cursor-move transition-all ${field.variable ? 'border-emerald-500 bg-emerald-500/10' : 'border-primary/50 bg-primary/10'}`}
                        style={{ left: `${field.x}px`, top: `${field.y}px`, width: `${field.width}px`, height: '24px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className={`text-[8px] font-black truncate px-1 ${field.variable ? 'text-emerald-700' : 'text-primary'}`}>
                          {field.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card className="w-[800px] h-[1131px] flex items-center justify-center bg-white border-dashed border-4">
                    <div className="text-center space-y-4 max-w-md">
                      <FileUp className="h-16 w-16 mx-auto text-muted-foreground opacity-20" />
                      <h3 className="text-lg font-bold">Document PDF Chargé</h3>
                      <p className="text-sm text-muted-foreground">
                        L'IA a terminé l'analyse du PDF. Pour visualiser le fond visuel dans cet éditeur, veuillez uploader une image (JPG/PNG) du formulaire.
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div className="flex justify-center bg-slate-300 p-12 rounded-2xl">
            <div className="flex flex-col gap-12">
              {selectedForm?.pages.map((page: any, idx: number) => (
                <Card key={idx} className="relative bg-white shadow-2xl" style={{ width: '800px', height: '1131px', backgroundImage: page.backgroundImage ? `url(${page.backgroundImage})` : 'none', backgroundSize: 'cover' }}>
                  {!page.backgroundImage && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                      <FileText className="h-64 w-64" />
                    </div>
                  )}
                  {page.fields.map((field: any) => (
                    <div 
                      key={field.id}
                      className="absolute font-mono text-[11px] text-blue-900 font-bold flex items-center px-1"
                      style={{ left: `${field.x}px`, top: `${field.y}px`, width: `${field.width}px`, height: '24px' }}
                    >
                      {field.variable ? `[${field.variable}]` : ""}
                    </div>
                  ))}
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
