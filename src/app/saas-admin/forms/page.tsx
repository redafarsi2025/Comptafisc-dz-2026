"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useFirebase } from "@/firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Layout, Database, Save, Eye, Wand2, Loader2, 
  ChevronLeft, Trash2, MousePointer2, FileText, 
  UploadCloud, AlertCircle, Sparkles, Layers,
  CheckCircle2, Clock, History, Send, LayoutGrid
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
  const { firestore: db, storage } = useFirebase()
  const { user } = useUser()
  const [selectedForm, setSelectedForm] = React.useState<any>(null)
  const [activeTab, setActiveTab] = React.useState("library")
  const [currentPageIdx, setCurrentPageIdx] = React.useState(0)
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const templatesQuery = useMemoFirebase(() => 
    db ? query(collection(db, "dgi_templates"), orderBy("updatedAt", "desc")) : null
  , [db]);
  const { data: storedTemplates, isLoading: isTemplatesLoading } = useCollection(templatesQuery);

  const [smartImport, setSmartImport] = React.useState({ title: "", file: null as File | null })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSmartImport({ ...smartImport, file: e.target.files[0] });
    }
  };

  const handleSmartImport = async () => {
    if (!smartImport.file || !smartImport.title || !db || !storage) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const templateId = `template_${Date.now()}`;
      
      // 1. Upload du fichier vers Firebase Storage (pour supporter les fichiers > 1Mo)
      const storageRef = ref(storage, `dgi_templates/${templateId}/${smartImport.file.name}`);
      const uploadResult = await uploadBytes(storageRef, smartImport.file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      // 2. Conversion en base64 temporaire pour l'analyse par l'IA (Vision Gemini)
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(smartImport.file!);
      });

      const fileDataUri = await base64Promise;

      // 3. Appel à l'IA pour détecter les champs
      const analysis = await analyzeFormLayout({ 
        fileDataUri, 
        documentTitle: smartImport.title 
      });

      const isPdf = smartImport.file.type === 'application/pdf';

      const newForm = {
        id: templateId,
        type: smartImport.title.toLowerCase().includes('50') ? 'G50' : 'AUTRE',
        name: smartImport.title,
        status: "Draft",
        pages: [
          {
            pageNumber: 1,
            backgroundImage: downloadUrl, // On stocke l'URL Cloud, pas le Base64
            isPdf: isPdf,
            fields: analysis.detectedFields.map(f => ({
              ...f,
              id: `f_${Math.random().toString(36).substr(2, 9)}`,
              variable: f.variableSuggestion || ""
            }))
          }
        ],
        updatedAt: new Date().toISOString()
      };

      setSelectedForm(newForm);
      setCurrentPageIdx(0);
      setActiveTab("editor");
      toast({ title: "Analyse terminée", description: `${analysis.detectedFields.length} champs mappés par l'IA.` });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Échec de l'importation.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  const handlePublish = async () => {
    if (!db || !selectedForm || !user) return;
    setIsPublishing(true);
    try {
      const templateRef = doc(db, "dgi_templates", selectedForm.id);
      await setDocumentNonBlocking(templateRef, {
        ...selectedForm,
        status: "Published",
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: "Template publié", description: "Le formulaire est maintenant disponible pour tous les clients." });
      setActiveTab("library");
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsPublishing(false);
    }
  }

  const handleAddField = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode || !selectedForm) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newField = {
      id: `f_${Date.now()}`,
      name: "Nouveau Champ",
      x: Math.round(x),
      y: Math.round(y),
      width: 120,
      variable: ""
    };

    const updated = { ...selectedForm };
    updated.pages[currentPageIdx].fields.push(newField);
    setSelectedForm(updated);
  };

  const updateField = (id: string, updates: any) => {
    const updated = { ...selectedForm };
    const idx = updated.pages[currentPageIdx].fields.findIndex((f: any) => f.id === id);
    if (idx > -1) {
      updated.pages[currentPageIdx].fields[idx] = { ...updated.pages[currentPageIdx].fields[idx], ...updates };
      setSelectedForm(updated);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <LayoutGrid className="text-accent h-8 w-8" /> Studio de Formulaires
          </h1>
          <p className="text-muted-foreground font-medium">Capture Vision IA & Stockage Cloud Illimité.</p>
        </div>
        <div className="flex gap-2">
          {selectedForm && (
            <Button variant="outline" onClick={() => { setSelectedForm(null); setActiveTab("library"); }}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Annuler
            </Button>
          )}
          <Button 
            className="bg-primary shadow-xl" 
            disabled={!selectedForm || isPublishing}
            onClick={handlePublish}
          >
            {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Publier sur Firestore
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 border p-1 mb-6">
          <TabsTrigger value="library" className="flex items-center gap-2"><History className="h-4 w-4" /> Catalogue</TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2" disabled={!selectedForm}><Wand2 className="h-4 w-4" /> Édition IA</TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2" disabled={!selectedForm}><Eye className="h-4 w-4" /> Aperçu Réel</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-8">
          <Card className="border-primary/20 bg-primary/5 shadow-inner">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary"><Sparkles className="h-5 w-5 text-accent" /> Ingestion Haute Définition</CardTitle>
              <CardDescription>Uploadez un PDF/JPG (jusqu'à 20 Mo). L'IA extrait la structure et le fichier est stocké sur Firebase Storage.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Titre du document</Label>
                  <Input 
                    placeholder="Ex: G50 - Format 2026" 
                    value={smartImport.title} 
                    onChange={e => setSmartImport({...smartImport, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Fichier Source (PDF/JPG)</Label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-muted/50 transition-colors border-primary/20">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-2 text-primary opacity-50" />
                        <p className="text-xs text-muted-foreground">{smartImport.file ? smartImport.file.name : "Cliquez pour sélectionner (Max 20 Mo)"}</p>
                      </div>
                      <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileChange} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center bg-white/50 p-6 rounded-xl border border-dashed text-center">
                <Database className="h-12 w-12 text-primary mx-auto mb-4 opacity-20" />
                <h4 className="font-bold text-sm">Gestion Hybride Firestore/Storage</h4>
                <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">Les templates lourds sont désormais acceptés. L'image est stockée sur Storage et les métadonnées sur Firestore pour une performance optimale.</p>
              </div>
            </CardContent>
            {error && <div className="px-6 pb-4"><Alert variant="destructive"><AlertTitle>Erreur d'importation</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></div>}
            <CardFooter className="flex justify-end border-t bg-white/50 p-4">
              <Button onClick={handleSmartImport} disabled={isAnalyzing || !smartImport.file || !smartImport.title} className="bg-accent text-primary font-bold">
                {isAnalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse & Upload...</> : <><Send className="mr-2 h-4 w-4" /> Lancer l'IA</>}
              </Button>
            </CardFooter>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Bibliothèque Cloud</h3>
            {isTemplatesLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {storedTemplates?.map((t) => (
                  <Card key={t.id} className="hover:shadow-lg transition-all border-l-4 border-l-primary group">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <FileText className="h-6 w-6 text-primary" />
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteDocumentNonBlocking(doc(db, "dgi_templates", t.id))}><Trash2 className="h-4 w-4" /></Button>
                          <Badge className="bg-emerald-500 text-white text-[8px]">{t.status}</Badge>
                        </div>
                      </div>
                      <CardTitle className="text-sm mt-4">{t.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="justify-between pt-0 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-2 w-2" /> {new Date(t.updatedAt).toLocaleDateString()}</span>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => { setSelectedForm(t); setActiveTab("editor"); }}>Éditer</Button>
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
              <Card className="shadow-lg">
                <CardHeader className="bg-muted/30 pb-2"><CardTitle className="text-xs font-bold uppercase">Zones IA Détectées</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="divide-y">
                      {selectedForm?.pages[currentPageIdx]?.fields.map((f: any) => (
                        <div key={f.id} className="p-4 space-y-3 hover:bg-primary/5 transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold truncate w-32">{f.name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => {
                              const updated = {...selectedForm};
                              updated.pages[currentPageIdx].fields = updated.pages[currentPageIdx].fields.filter((field: any) => field.id !== f.id);
                              setSelectedForm(updated);
                            }}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                          <Select value={f.variable} onValueChange={(v) => updateField(f.id, { variable: v })}>
                            <SelectTrigger className="h-7 text-[9px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TENANT_NAME">Raison Sociale</SelectItem>
                              <SelectItem value="TENANT_NIF">NIF Client</SelectItem>
                              <SelectItem value="TOTAL_TVA">Total TVA</SelectItem>
                              <SelectItem value="PERIOD">Période</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Button 
                variant={isEditMode ? "default" : "outline"} 
                className="w-full h-10 text-xs font-bold" 
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <MousePointer2 className="mr-2 h-4 w-4" /> {isEditMode ? "QUITTER ÉDITION" : "AJOUTER ZONES"}
              </Button>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-slate-200 rounded-2xl p-8 overflow-auto flex justify-center min-h-[1000px] border shadow-inner">
                {selectedForm?.pages[currentPageIdx]?.backgroundImage && (
                  <div 
                    className={`relative bg-white shadow-2xl transition-all border ${isEditMode ? 'cursor-crosshair' : ''}`}
                    style={{ 
                      width: '800px', 
                      height: '1131px', 
                      backgroundImage: `url(${selectedForm.pages[currentPageIdx].backgroundImage})`, 
                      backgroundSize: 'cover'
                    }}
                    onClick={handleAddField}
                  >
                    {selectedForm.pages[currentPageIdx].fields.map((f: any) => (
                      <div 
                        key={f.id}
                        className={`absolute border-2 flex items-center justify-center transition-all ${f.variable ? 'border-emerald-500 bg-emerald-500/10' : 'border-primary/50 bg-primary/10'}`}
                        style={{ left: `${f.x}px`, top: `${f.y}px`, width: `${f.width}px`, height: '22px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className={`text-[8px] font-black truncate px-1 ${f.variable ? 'text-emerald-800' : 'text-primary'}`}>{f.variable || f.name}</span>
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
            <Alert className="max-w-2xl bg-white border-primary shadow-lg"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><AlertTitle className="font-bold">Rendu Client Final</AlertTitle><AlertDescription>Aperçu du document rempli tel qu'il sera généré depuis Firestore.</AlertDescription></Alert>
            <Card 
              className="relative bg-white shadow-2xl overflow-hidden" 
              style={{ width: '800px', height: '1131px', backgroundImage: `url(${selectedForm?.pages[currentPageIdx].backgroundImage})`, backgroundSize: 'cover' }}
            >
              {selectedForm?.pages[currentPageIdx].fields.map((f: any) => {
                let val = "";
                if (f.variable === "TENANT_NAME") val = "SARL BENSALEM COMMERCE";
                if (f.variable === "TENANT_NIF") val = "001216000123456";
                if (f.variable === "TOTAL_TVA") val = "456,700.00";
                return <div key={f.id} className="absolute font-mono text-[12px] font-bold text-blue-900" style={{ left: `${f.x}px`, top: `${f.y}px`, width: `${f.width}px` }}>{val}</div>
              })}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
