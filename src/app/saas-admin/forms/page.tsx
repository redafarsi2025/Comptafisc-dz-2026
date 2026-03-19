
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
  Layers, Settings, PlusCircle
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Couleurs officielles DGI Algérie
const DGI_THEMES = {
  G50: { primary: "bg-[#008751]", text: "text-[#008751]", border: "border-[#008751]", label: "G N° 50 (Mensuel)", color: "#008751" },
  G12: { primary: "bg-[#0055A4]", text: "text-[#0055A4]", border: "border-[#0055A4]", label: "G N° 12 (IFU)", color: "#0055A4" },
  G4: { primary: "bg-[#8B5CF6]", text: "text-[#8B5CF6]", border: "border-[#8B5CF6]", label: "G N° 4 (IBS)", color: "#8B5CF6" },
  ANNEXE: { primary: "bg-[#F59E0B]", text: "text-[#F59E0B]", border: "border-[#F59E0B]", label: "Annexe I (Apprentissage)", color: "#F59E0B" }
}

const INITIAL_TEMPLATES = [
  { 
    id: 'g50_v2026', 
    type: 'G50', 
    version: '2.4', 
    name: "Bordereau Avis de Versement (G50)", 
    status: "Active", 
    lastUpdate: "2026-01-15", 
    pages: [
      {
        pageNumber: 1,
        title: "Page Principale - Liquidations",
        backgroundImage: "https://picsum.photos/seed/g50p1/1200/1600",
        fields: [
          { id: "f1", name: "Raison Sociale", x: 150, y: 220, width: 300, type: "text", variable: "TENANT_NAME" },
          { id: "f2", name: "NIF", x: 600, y: 220, width: 200, type: "text", variable: "TENANT_NIF" },
          { id: "f3", name: "TVA Ventes (101)", x: 800, y: 450, width: 150, type: "number", variable: "TVA_COLLECTED" },
        ]
      }
    ]
  },
  { 
    id: 'g4_v2026', 
    type: 'G4', 
    version: '1.0', 
    name: "Liasse Fiscale (G N°4)", 
    status: "Active", 
    lastUpdate: "2026-02-01", 
    pages: [
      { pageNumber: 1, title: "Tableau 1 : Bilan Actif", backgroundImage: "https://picsum.photos/seed/g4p1/1200/1600", fields: [] },
      { pageNumber: 2, title: "Tableau 2 : Bilan Passif", backgroundImage: "https://picsum.photos/seed/g4p2/1200/1600", fields: [] }
    ]
  }
]

export default function DgiFormsEditor() {
  const [templates, setTemplates] = React.useState(INITIAL_TEMPLATES)
  const [selectedForm, setSelectedForm] = React.useState<any>(null)
  const [activeTab, setActiveTab] = React.useState("library")
  const [currentPageIdx, setCurrentPageIdx] = React.useState(0)
  const [isEditMode, setIsEditMode] = React.useState(false)

  const handleSelectForm = (form: any) => {
    setSelectedForm(JSON.parse(JSON.stringify(form))) // Deep copy
    setCurrentPageIdx(0)
    setActiveTab("editor")
    toast({ title: "Template Chargé", description: `Édition du formulaire ${form.name} en cours.` })
  }

  const handleCreateBlankForm = () => {
    const newForm = {
      id: `custom_${Date.now()}`,
      type: 'G50',
      version: '1.0',
      name: "Nouveau Formulaire Personnalisé",
      status: "Draft",
      lastUpdate: new Date().toISOString().split('T')[0],
      pages: [
        {
          pageNumber: 1,
          title: "Page 1",
          backgroundImage: "https://placehold.co/1200x1600?text=Importez+votre+scan+PDF",
          fields: []
        }
      ]
    };
    setSelectedForm(newForm);
    setCurrentPageIdx(0);
    setActiveTab("editor");
    toast({ 
      title: "Nouveau formulaire créé", 
      description: "Commencez par importer une image de fond dans l'onglet Éditeur." 
    });
  }

  const handleAddField = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode) return
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

  const handleAddPage = () => {
    const updatedForm = { ...selectedForm }
    const nextNum = updatedForm.pages.length + 1
    updatedForm.pages.push({
      pageNumber: nextNum,
      title: `Nouvelle Page ${nextNum}`,
      backgroundImage: "https://placehold.co/1200x1600?text=Importez+votre+scan+PDF",
      fields: []
    })
    setSelectedForm(updatedForm)
    setCurrentPageIdx(updatedForm.pages.length - 1)
    toast({ title: "Page ajoutée", description: `Page ${nextNum} créée.` })
  }

  const handleDeletePage = (idx: number) => {
    if (selectedForm.pages.length <= 1) {
      toast({ variant: "destructive", title: "Action impossible", description: "Un document doit avoir au moins une page." })
      return
    }
    const updatedForm = { ...selectedForm }
    updatedForm.pages.splice(idx, 1)
    // Update numbers
    updatedForm.pages = updatedForm.pages.map((p: any, i: number) => ({ ...p, pageNumber: i + 1 }))
    setSelectedForm(updatedForm)
    setCurrentPageIdx(Math.max(0, idx - 1))
    toast({ title: "Page supprimée" })
  }

  const handleUpdatePageImage = (url: string) => {
    const updatedForm = { ...selectedForm }
    updatedForm.pages[currentPageIdx].backgroundImage = url
    setSelectedForm(updatedForm)
    toast({ title: "Fond mis à jour" })
  }

  const handleSaveTemplate = () => {
    setTemplates(prev => {
      const exists = prev.find(t => t.id === selectedForm.id);
      if (exists) {
        return prev.map(t => t.id === selectedForm.id ? selectedForm : t);
      } else {
        return [...prev, selectedForm];
      }
    })
    toast({ title: "Template enregistré", description: "Les modifications ont été sauvegardées localement." })
  }

  const theme = DGI_THEMES[selectedForm?.type as keyof typeof DGI_THEMES] || DGI_THEMES.G50

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Layout className="text-accent h-8 w-8" /> Studio de Formulaires DGI
          </h1>
          <p className="text-muted-foreground font-medium">Éditeur de fonds PDF multi-pages pour documents officiels.</p>
        </div>
        <div className="flex gap-2">
          {selectedForm && (
            <Button variant="outline" className="bg-white shadow-sm" onClick={() => { setActiveTab("library"); setSelectedForm(null); }}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Catalogue
            </Button>
          )}
          <Button className="bg-primary shadow-xl" onClick={handleSaveTemplate} disabled={!selectedForm}>
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
            <FileEdit className="h-4 w-4" /> Éditeur Canva
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2" disabled={!selectedForm}>
            <Eye className="h-4 w-4" /> Aperçu Complet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {templates.map((form) => {
              const fTheme = DGI_THEMES[form.type as keyof typeof DGI_THEMES] || DGI_THEMES.G50;
              return (
                <Card 
                  key={form.id} 
                  className={`group cursor-pointer hover:shadow-2xl transition-all duration-300 border-t-4 ${fTheme.border}`}
                  onClick={() => handleSelectForm(form)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-2">
                      <div className={`p-2 rounded-lg ${fTheme.primary} text-white shadow-lg`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className="text-[8px] uppercase font-black">{form.pages.length} PAGES</Badge>
                    </div>
                    <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">{form.name}</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-tighter">Version {form.version}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-[9px] text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className={`h-3 w-3 ${fTheme.text}`} /> {form.pages.reduce((acc: number, p: any) => acc + p.fields.length, 0)} champs totaux
                    </p>
                  </CardContent>
                  <CardFooter className="bg-muted/20 p-3 mt-4">
                    <Button variant="ghost" size="sm" className={`w-full text-[10px] font-black uppercase tracking-widest ${fTheme.text}`}>
                      Ouvrir l'Éditeur <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
            <Card 
              className="border-dashed border-2 flex flex-col items-center justify-center p-8 text-center bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={handleCreateBlankForm}
            >
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Nouveau Formulaire</CardTitle>
              <Button variant="outline" size="sm" className="mt-4 text-[10px] font-bold border-dashed">Démarrer à blanc</Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="editor">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
              {/* Navigation & Pages */}
              <Card className="shadow-lg border-t-4 border-t-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase">
                    <Layers className="h-4 w-4 text-primary" /> Structure Document
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    {selectedForm?.pages.map((p: any, i: number) => (
                      <div key={i} className="flex gap-1">
                        <Button 
                          variant={currentPageIdx === i ? "default" : "ghost"} 
                          size="sm" 
                          className="flex-1 justify-start text-[10px] h-8"
                          onClick={() => setCurrentPageIdx(i)}
                        >
                          Page {p.pageNumber} : {p.title}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePage(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full border-dashed h-8 text-[10px]" onClick={handleAddPage}>
                      <Plus className="mr-1 h-3 w-3" /> Ajouter une page
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Page Settings */}
              <Card className="shadow-lg border-t-4 border-t-accent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase">
                    <Settings className="h-4 w-4 text-accent" /> Fond de la page {currentPageIdx + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold">Image du Scan PDF (URL)</Label>
                    <Input 
                      value={selectedForm?.pages[currentPageIdx].backgroundImage || ""} 
                      onChange={(e) => handleUpdatePageImage(e.target.value)}
                      placeholder="Collez l'URL de l'image du scan..."
                      className="h-8 text-[10px]"
                    />
                    <p className="text-[9px] text-muted-foreground italic">Conseil : Utilisez un scan 300 DPI pour plus de précision.</p>
                  </div>
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-[10px] uppercase font-bold">Titre de la page</Label>
                    <Input 
                      value={selectedForm?.pages[currentPageIdx].title || ""} 
                      onChange={(e) => {
                        const updated = {...selectedForm};
                        updated.pages[currentPageIdx].title = e.target.value;
                        setSelectedForm(updated);
                      }}
                      className="h-8 text-[10px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Edit Mode Toggle */}
              <Card className="shadow-md bg-muted/20">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white border shadow-inner">
                    <div className="flex items-center gap-2">
                      <MousePointer2 className={`h-4 w-4 ${isEditMode ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-[10px] font-bold uppercase">Mode Placement</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant={isEditMode ? "default" : "outline"} 
                      className="h-7 px-3 text-[10px]"
                      onClick={() => setIsEditMode(!isEditMode)}
                    >
                      {isEditMode ? "ACTIF" : "OFF"}
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground italic leading-relaxed text-center">
                    Cliquez sur le document pour ajouter une zone de texte.
                  </p>
                </CardContent>
              </Card>

              {/* Fields List */}
              <Card className="shadow-lg">
                <CardHeader className="bg-muted/20 border-b py-2 px-4">
                  <CardTitle className="text-[10px] font-bold uppercase">Champs de cette page</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[300px]">
                    <div className="divide-y">
                      {selectedForm?.pages[currentPageIdx].fields.map((field: any) => (
                        <div key={field.id} className="p-3 space-y-2 hover:bg-muted/30 transition-colors group">
                          <div className="flex justify-between items-center">
                            <Input 
                              value={field.name} 
                              onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                              className="h-6 text-[10px] font-bold border-none bg-transparent focus-visible:ring-0 p-0"
                            />
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleRemoveField(field.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Select value={field.variable} onValueChange={(v) => handleUpdateField(field.id, { variable: v })}>
                              <SelectTrigger className="h-6 text-[8px]"><SelectValue placeholder="Lier Variable" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TENANT_NAME">Raison Sociale</SelectItem>
                                <SelectItem value="TENANT_NIF">NIF Client</SelectItem>
                                <SelectItem value="TVA_COLLECTED">TVA Collectée</SelectItem>
                                <SelectItem value="IBS_NET">IBS Brut</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              type="number" 
                              value={field.width} 
                              onChange={(e) => handleUpdateField(field.id, { width: parseInt(e.target.value) })}
                              className="h-6 text-[8px]" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <div className="bg-slate-300 rounded-xl p-8 overflow-auto flex justify-center min-h-[900px] border-inner shadow-inner relative">
                <div 
                  className="relative bg-white shadow-2xl transition-all"
                  style={{ 
                    width: '800px', 
                    height: '1131px', 
                    backgroundImage: `url(${selectedForm?.pages[currentPageIdx].backgroundImage})`, 
                    backgroundSize: 'cover' 
                  }}
                  onClick={handleAddField}
                >
                  {selectedForm?.pages[currentPageIdx].fields.map((field: any) => (
                    <div 
                      key={field.id}
                      className="absolute border-2 border-primary/50 bg-primary/10 flex items-center justify-center cursor-move group hover:border-primary hover:bg-primary/20 transition-all"
                      style={{ left: `${field.x}px`, top: `${field.y}px`, width: `${field.width}px`, height: '22px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[8px] font-bold text-primary truncate px-1">{field.name}</span>
                    </div>
                  ))}

                  {isEditMode && (
                    <div className="absolute inset-0 bg-primary/5 pointer-events-none flex items-center justify-center">
                      <div className="bg-primary/80 text-white text-[10px] font-bold px-4 py-2 rounded-full animate-pulse">
                        CLIQUEZ POUR PLACER UNE ZONE
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <ScrollArea className="h-[800px] bg-slate-200 p-12 rounded-xl border shadow-inner">
            <div className="flex flex-col items-center gap-12 pb-20">
              {selectedForm?.pages.map((page: any, pIdx: number) => (
                <div key={pIdx} className="relative bg-white shadow-2xl" style={{ width: '800px', height: '1131px', backgroundImage: `url(${page.backgroundImage})`, backgroundSize: 'cover' }}>
                  <div className="absolute top-4 right-4 bg-primary text-white text-[8px] font-bold px-2 py-1 rounded opacity-50">PAGE {pIdx + 1}</div>
                  {page.fields.map((field: any) => (
                    <div 
                      key={field.id}
                      className="absolute font-mono text-[10px] text-blue-800 font-bold flex items-center px-1"
                      style={{ left: `${field.x}px`, top: `${field.y}px`, width: `${field.width}px`, height: '22px' }}
                    >
                      {field.variable ? "DONNÉE_SIMULÉE" : ""}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
