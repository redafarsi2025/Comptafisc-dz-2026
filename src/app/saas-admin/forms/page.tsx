
"use client"

import * as React from "react"
import { useFirestore } from "@/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileEdit, Settings2, Eye, Save, 
  History, FileCheck, Search, Layout,
  Palette, Database, ArrowRight, CheckCircle2,
  FileText, Download, UploadCloud, Printer,
  AlertTriangle, ShieldCheck, Landmark, ChevronLeft, ChevronRight, Copy,
  Plus, MousePointer2, Move, Type, Trash2, Image as ImageIcon
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
        backgroundImage: "https://picsum.photos/seed/g50p1/1200/1600", // Simulation du fond PDF
        fields: [
          { id: "f1", name: "Raison Sociale", x: 150, y: 220, width: 300, type: "text", variable: "TENANT_NAME" },
          { id: "f2", name: "NIF", x: 600, y: 220, width: 200, type: "text", variable: "TENANT_NIF" },
          { id: "f3", name: "TVA Ventes (101)", x: 800, y: 450, width: 150, type: "number", variable: "TVA_COLLECTED" },
        ]
      },
      {
        pageNumber: 2,
        title: "Détails & Acomptes IBS",
        backgroundImage: "https://picsum.photos/seed/g50p2/1200/1600",
        fields: [
          { id: "f4", name: "Acompte 1", x: 800, y: 300, width: 150, type: "number", variable: "IBS_ACOMPTE_1" },
        ]
      }
    ]
  },
  { 
    id: 'g12_v2026', 
    type: 'G12', 
    version: '2.0', 
    name: "Déclaration IFU (G12)", 
    status: "Active", 
    lastUpdate: "2026-01-10", 
    pages: [
      {
        pageNumber: 1,
        title: "Déclaration Prévisionnelle",
        backgroundImage: "https://picsum.photos/seed/g12p1/1200/1600",
        fields: []
      }
    ]
  }
]

export default function DgiFormsEditor() {
  const [templates, setTemplates] = React.useState(INITIAL_TEMPLATES)
  const [selectedForm, setSelectedForm] = React.useState<any>(INITIAL_TEMPLATES[0])
  const [activeTab, setActiveTab] = React.useState("library")
  const [currentPageIdx, setCurrentPageIdx] = React.useState(0)
  const [isEditMode, setIsEditMode] = React.useState(false)

  const handleSelectForm = (form: any) => {
    setSelectedForm(form)
    setCurrentPageIdx(0)
    setActiveTab("editor")
    toast({ title: "Template Chargé", description: `Édition du formulaire ${form.name} en cours.` })
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
    toast({ title: "Champ ajouté", description: `Position : ${newField.x}, ${newField.y}` })
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

  const theme = DGI_THEMES[selectedForm?.type as keyof typeof DGI_THEMES] || DGI_THEMES.G50

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Layout className="text-accent h-8 w-8" /> Studio de Formulaires DGI
          </h1>
          <p className="text-muted-foreground font-medium">Utilisez les fonds PDF officiels et mappez les champs intelligemment.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white shadow-sm" onClick={() => setActiveTab("library")}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Retour Catalogue
          </Button>
          <Button className="bg-primary shadow-xl">
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
            <FileEdit className="h-4 w-4" /> Éditeur de Fond (PDF)
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2" disabled={!selectedForm}>
            <Eye className="h-4 w-4" /> Aperçu Réel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {templates.map((form) => {
              const fTheme = DGI_THEMES[form.type as keyof typeof DGI_THEMES];
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
                    <div className="space-y-2">
                      <p className="text-[9px] text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className={`h-3 w-3 ${fTheme.text}`} /> {form.pages[0].fields.length} champs mappés
                      </p>
                      <p className="text-[9px] text-muted-foreground flex items-center gap-2">
                        <ImageIcon className="h-3 w-3" /> Fond PDF configuré
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/20 p-3 mt-4">
                    <Button variant="ghost" size="sm" className={`w-full text-[10px] font-black uppercase tracking-widest ${fTheme.text}`}>
                      Ouvrir l'Éditeur <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
            <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 text-center bg-muted/10 hover:bg-muted/20 transition-colors">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Nouveau Formulaire</CardTitle>
              <Button variant="outline" size="sm" className="mt-4 text-[10px] font-bold border-dashed">Importer Image Fond</Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="editor">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Colonne de gauche : Contrôles */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="shadow-lg border-t-4 border-t-primary">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" /> Outils d'Édition
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border">
                    <span className="text-xs font-medium">Mode Placement</span>
                    <Button 
                      size="sm" 
                      variant={isEditMode ? "default" : "outline"} 
                      className="h-8 w-8 p-0"
                      onClick={() => setIsEditMode(!isEditMode)}
                    >
                      <MousePointer2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                    Activez le mode placement, puis cliquez n'importe où sur le document pour ajouter une case à remplir.
                  </p>
                  <div className="pt-4 border-t space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground">Navigation Pages</Label>
                    <div className="flex gap-2">
                      {selectedForm.pages.map((p: any, i: number) => (
                        <Button 
                          key={i} 
                          variant={currentPageIdx === i ? "default" : "outline"} 
                          size="sm" 
                          className="flex-1 text-[10px]"
                          onClick={() => setCurrentPageIdx(i)}
                        >
                          Page {i + 1}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="bg-muted/20 border-b">
                  <CardTitle className="text-sm font-bold">Champs de la page {currentPageIdx + 1}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <div className="divide-y">
                      {selectedForm.pages[currentPageIdx].fields.map((field: any) => (
                        <div key={field.id} className="p-3 space-y-2 hover:bg-muted/30 transition-colors group">
                          <div className="flex justify-between items-center">
                            <Input 
                              value={field.name} 
                              onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                              className="h-7 text-[10px] font-bold border-none bg-transparent focus-visible:ring-0 p-0"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
                              onClick={() => handleRemoveField(field.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[8px] uppercase">Variable Liée</Label>
                              <Select 
                                value={field.variable} 
                                onValueChange={(v) => handleUpdateField(field.id, { variable: v })}
                              >
                                <SelectTrigger className="h-6 text-[8px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="TENANT_NAME">Raison Sociale</SelectItem>
                                  <SelectItem value="TENANT_NIF">NIF</SelectItem>
                                  <SelectItem value="TVA_COLLECTED">TVA Collectée</SelectItem>
                                  <SelectItem value="IBS_ACOMPTE_1">Acompte IBS 1</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[8px] uppercase">Largeur (px)</Label>
                              <Input 
                                type="number" 
                                value={field.width} 
                                onChange={(e) => handleUpdateField(field.id, { width: parseInt(e.target.value) })}
                                className="h-6 text-[8px]" 
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Zone centrale : Le Canva PDF */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-slate-200 rounded-xl p-8 overflow-auto flex justify-center min-h-[800px] border-inner shadow-inner">
                <div 
                  className="relative bg-white shadow-2xl origin-top"
                  style={{ width: '800px', height: '1131px', backgroundImage: `url(${selectedForm.pages[currentPageIdx].backgroundImage})`, backgroundSize: 'cover' }}
                  onClick={handleAddField}
                >
                  {/* Overlay pour les champs */}
                  {selectedForm.pages[currentPageIdx].fields.map((field: any) => (
                    <div 
                      key={field.id}
                      className="absolute border-2 border-primary/50 bg-primary/10 flex items-center justify-center cursor-move group hover:border-primary hover:bg-primary/20 transition-all"
                      style={{ 
                        left: `${field.x}px`, 
                        top: `${field.y}px`, 
                        width: `${field.width}px`, 
                        height: '24px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[8px] font-bold text-primary truncate px-1">
                        {field.name}
                      </span>
                      <div className="absolute -top-4 left-0 hidden group-hover:block bg-primary text-white text-[7px] px-1 rounded">
                        {field.variable || 'NON LIÉ'}
                      </div>
                    </div>
                  ))}

                  {isEditMode && (
                    <div className="absolute inset-0 bg-primary/5 pointer-events-none flex items-center justify-center">
                      <div className="bg-primary/80 text-white text-[10px] font-bold px-4 py-2 rounded-full animate-pulse flex items-center gap-2">
                        <Plus className="h-3 w-3" /> CLIQUEZ SUR LE DOCUMENT POUR AJOUTER UNE CASE
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <ScrollArea className="h-[800px] bg-slate-200 p-12">
            <div className="flex flex-col items-center gap-12 pb-20">
              {selectedForm.pages.map((page: any, pIdx: number) => (
                <div key={pIdx} className="bg-white shadow-2xl relative" style={{ width: '800px', height: '1131px', backgroundImage: `url(${page.backgroundImage})`, backgroundSize: 'cover' }}>
                  {/* Remplissage fictif pour l'aperçu */}
                  {page.fields.map((field: any) => (
                    <div 
                      key={field.id}
                      className="absolute font-mono text-[10px] text-blue-800 font-bold flex items-center px-1"
                      style={{ 
                        left: `${field.x}px`, 
                        top: `${field.y}px`, 
                        width: `${field.width}px`, 
                        height: '24px'
                      }}
                    >
                      {field.variable === 'TENANT_NAME' ? "SARL BENSALEM COMMERCE" : 
                       field.variable === 'TENANT_NIF' ? "001216000123456" : 
                       field.variable === 'TVA_COLLECTED' ? "161 500,00" : "---"}
                    </div>
                  ))}
                  
                  {/* Filigrane Admin */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                    <div className="transform -rotate-45 text-slate-900 text-[100pt] font-black uppercase">SPECIMEN</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
