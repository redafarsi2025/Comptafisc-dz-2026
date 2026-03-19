
"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileEdit, Settings2, Eye, Save, 
  History, FileCheck, Search, Layout,
  Palette, Database, ArrowRight, CheckCircle2,
  FileText, Download, UploadCloud, Printer,
  AlertTriangle, ShieldCheck
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"

// Simulation des thèmes de couleurs officiels DGI
const DGI_THEMES = {
  G50: { primary: "bg-[#008751]", text: "text-[#008751]", border: "border-[#008751]", label: "G N° 50 (Mensuel)" },
  G12: { primary: "bg-[#0055A4]", text: "text-[#0055A4]", border: "border-[#0055A4]", label: "G N° 12 (IFU)" },
  G4: { primary: "bg-[#8B5CF6]", text: "text-[#8B5CF6]", border: "border-[#8B5CF6]", label: "G N° 4 (IBS)" },
  ANNEXE: { primary: "bg-[#F59E0B]", text: "text-[#F59E0B]", border: "border-[#F59E0B]", label: "Annexe I (Apprentissage)" }
}

const FORM_TEMPLATES = [
  { id: 'g50_v2026', type: 'G50', version: '2.4', name: "Déclaration Mensuelle (G50)", status: "Active", lastUpdate: "2026-01-15", fields: 45 },
  { id: 'g12_v2026', type: 'G12', version: '2.0', name: "Déclaration IFU (G12)", status: "Active", lastUpdate: "2026-01-10", fields: 32 },
  { id: 'g4_v2026', type: 'G4', version: '3.1', name: "Liasse Fiscale (G4)", status: "Beta", lastUpdate: "2026-02-01", fields: 120 },
  { id: 'annexe1_v2026', type: 'ANNEXE', version: '1.8', name: "Taxe Apprentissage (Annexe I)", status: "Active", lastUpdate: "2025-12-20", fields: 12 },
]

export default function DgiFormsEditor() {
  const db = useFirestore()
  const [selectedForm, setSelectedForm] = React.useState<any>(null)
  const [activeTab, setActiveTab] = React.useState("library")

  const handleSelectForm = (form: any) => {
    setSelectedForm(form)
    setActiveTab("editor")
    toast({ title: "Template Chargé", description: `Édition du formulaire ${form.name} en cours.` })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Layout className="text-accent h-8 w-8" /> Templates DGI 2026
          </h1>
          <p className="text-muted-foreground font-medium">Éditeur de structure et mapping des formulaires officiels Algériens.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white"><History className="mr-2 h-4 w-4" /> Versions</Button>
          <Button className="bg-primary shadow-xl"><Save className="mr-2 h-4 w-4" /> Publier Mise à jour</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 border p-1 mb-6">
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Database className="h-4 w-4" /> Librairie des Formulaires
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2" disabled={!selectedForm}>
            <FileEdit className="h-4 w-4" /> Éditeur de Structure
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2" disabled={!selectedForm}>
            <Eye className="h-4 w-4" /> Aperçu Impression
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FORM_TEMPLATES.map((form) => {
              const theme = DGI_THEMES[form.type as keyof typeof DGI_THEMES];
              return (
                <Card 
                  key={form.id} 
                  className={`group cursor-pointer hover:shadow-2xl transition-all duration-300 border-t-4 ${theme.border}`}
                  onClick={() => handleSelectForm(form)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-2">
                      <div className={`p-2 rounded-lg ${theme.primary} text-white shadow-lg`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className="text-[8px] uppercase font-black">{form.status}</Badge>
                    </div>
                    <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">{form.name}</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-tighter">Version {form.version}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex justify-between text-xs border-b pb-2">
                      <span className="text-muted-foreground font-medium">Champs mappés :</span>
                      <span className="font-bold">{form.fields}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Dernière Sync :</span>
                      <span className="font-bold">{form.lastUpdate}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/20 p-3 group-hover:bg-primary/5 transition-colors">
                    <Button variant="ghost" size="sm" className={`w-full text-[10px] font-black uppercase tracking-widest ${theme.text}`}>
                      Configurer Structure <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
            <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 text-center bg-muted/10 hover:bg-muted/20 transition-colors">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
              <CardTitle className="text-sm font-bold text-muted-foreground">Importer nouveau PDF</CardTitle>
              <Button variant="ghost" size="sm" className="mt-4 text-[10px] font-bold">Sélectionner fichier</Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="editor">
          {selectedForm && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-none shadow-xl ring-1 ring-border overflow-hidden">
                  <CardHeader className={`bg-primary text-white p-6 ${DGI_THEMES[selectedForm.type as keyof typeof DGI_THEMES].primary}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">{selectedForm.name}</CardTitle>
                        <CardDescription className="text-white/70 text-xs font-bold italic">Structure de rendu conforme V{selectedForm.version}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" className="h-8 text-[10px] font-black"><Palette className="mr-1 h-3 w-3" /> Édition Visuelle</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px] bg-slate-50 p-8">
                      <div className="max-w-3xl mx-auto space-y-8 bg-white shadow-inner p-12 border-2 border-dashed border-slate-200 min-h-[1000px] relative">
                        {/* Simulation de zone de dessin de formulaire */}
                        <div className={`absolute top-0 left-0 w-full h-2 ${DGI_THEMES[selectedForm.type as keyof typeof DGI_THEMES].primary}`} />
                        <div className="flex justify-between items-start mb-12">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black">MINISTERE DES FINANCES</p>
                            <p className="text-[10px] font-black">DIRECTION GENERALE DES IMPOTS</p>
                          </div>
                          <div className={`p-4 border-2 font-black text-xl ${DGI_THEMES[selectedForm.type as keyof typeof DGI_THEMES].text} ${DGI_THEMES[selectedForm.type as keyof typeof DGI_THEMES].border}`}>
                            {selectedForm.type}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 opacity-40 select-none">
                          <div className="h-8 bg-slate-100 rounded" />
                          <div className="h-32 bg-slate-100 rounded" />
                          <div className="grid grid-cols-3 gap-4">
                            <div className="h-12 bg-slate-100 rounded" />
                            <div className="h-12 bg-slate-100 rounded" />
                            <div className="h-12 bg-slate-100 rounded border-2 border-primary border-solid opacity-100 flex items-center justify-center text-[10px] font-bold text-primary animate-pulse">
                              CHAMP MAPPÉ: TVA_STD
                            </div>
                          </div>
                          <div className="h-64 bg-slate-100 rounded" />
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="transform -rotate-45 text-slate-100 text-9xl font-black select-none">DRAFT</div>
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="shadow-lg border-t-4 border-t-primary">
                  <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Mapping des Données</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold border-b pb-2">Variables du Moteur Fiscal</p>
                    <div className="space-y-2">
                      {['TVA_STD', 'IBS_RATE', 'TAP_RATE', 'IRG_BAREME'].map((code) => (
                        <div key={code} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-transparent hover:border-primary transition-all group">
                          <span className="text-[10px] font-mono font-bold">{code}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"><Settings2 className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold"><ShieldCheck className="mr-2 h-4 w-4" /> Valider le Mapping</Button>
                  </CardContent>
                </Card>

                <Card className="bg-primary text-white border-none shadow-xl overflow-hidden">
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase opacity-80">Validation Structurelle</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center"><CheckCircle2 className="h-6 w-6" /></div>
                      <div><p className="text-xs font-bold">Format XML OK</p><p className="text-[10px] opacity-70 italic">Compatible Jibayatic 2026</p></div>
                    </div>
                    <div className="p-4 bg-black/10 rounded-xl space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Points de contrôle</p>
                      <div className="flex items-center gap-2 text-[10px]"><CheckCircle2 className="h-3 w-3 text-accent" /> Calcul automatique des reports</div>
                      <div className="flex items-center gap-2 text-[10px]"><CheckCircle2 className="h-3 w-3 text-accent" /> Signature électronique activée</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-4">
                  <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
                  <div className="text-xs text-amber-900 leading-relaxed italic">
                    <strong>Attention :</strong> Toute modification visuelle doit être validée par une impression de test pour vérifier l'alignement avec les guichets de la recette.
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview">
          {selectedForm && (
            <Card className="max-w-4xl mx-auto shadow-2xl border-none">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10">
                <div>
                  <CardTitle className="text-lg">Simulation Impression Réelle</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-black text-primary">Dossier: SARL BENSALEM COMMERCE</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> PDF</Button>
                  <Button className="bg-primary" size="sm"><Printer className="h-4 w-4 mr-2" /> Imprimer</Button>
                </div>
              </CardHeader>
              <CardContent className="p-12 bg-slate-200 min-h-[800px] flex justify-center">
                <div className="bg-white w-[595pt] h-[842pt] shadow-2xl p-16 relative">
                   <div className="text-center space-y-2 mb-12">
                      <p className="text-xs font-black uppercase">République Algérienne Démocratique et Populaire</p>
                      <p className="text-xs font-black">MINISTERE DES FINANCES</p>
                      <div className={`h-1 w-32 mx-auto ${DGI_THEMES[selectedForm.type as keyof typeof DGI_THEMES].primary}`} />
                   </div>
                   <div className="flex justify-between border-2 p-4 mb-8 font-black text-sm">
                      <span>BORDEREAU AVIS DE VERSEMENT</span>
                      <span className={DGI_THEMES[selectedForm.type as keyof typeof DGI_THEMES].text}>{selectedForm.name}</span>
                   </div>
                   <div className="space-y-6 opacity-60">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                      <div className="h-4 bg-slate-100 rounded w-1/2" />
                      <div className="grid grid-cols-2 gap-8 mt-12">
                        <div className="h-32 border-2 border-dotted" />
                        <div className="h-32 border-2 border-dotted" />
                      </div>
                   </div>
                   <div className="absolute bottom-16 right-16 text-center italic opacity-30 text-[10px]">
                      Cachet et signature
                   </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
