
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
  AlertTriangle, ShieldCheck, Landmark, ChevronLeft, ChevronRight, Copy
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"

// Couleurs officielles DGI Algérie
const DGI_THEMES = {
  G50: { primary: "bg-[#008751]", text: "text-[#008751]", border: "border-[#008751]", label: "G N° 50 (Mensuel)", color: "#008751" },
  G12: { primary: "bg-[#0055A4]", text: "text-[#0055A4]", border: "border-[#0055A4]", label: "G N° 12 (IFU)", color: "#0055A4" },
  G4: { primary: "bg-[#8B5CF6]", text: "text-[#8B5CF6]", border: "border-[#8B5CF6]", label: "G N° 4 (IBS)", color: "#8B5CF6" },
  ANNEXE: { primary: "bg-[#F59E0B]", text: "text-[#F59E0B]", border: "border-[#F59E0B]", label: "Annexe I (Apprentissage)", color: "#F59E0B" }
}

const FORM_TEMPLATES = [
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
        sections: [
          { id: "S1", title: "I. TAXES SUR LE CHIFFRE D'AFFAIRES (TVA)", fields: ["101- Ventes", "102- Prestations", "103- Achats"] },
          { id: "S2", title: "II. DROITS DE TIMBRE", fields: ["201- Timbre sur factures", "202- Timbre sur quittances"] },
          { id: "S3", title: "III. IMPÔTS SUR LE REVENU (IRG/SALAIRES)", fields: ["301- Retenue à la source", "302- IRG/Autres"] }
        ]
      },
      {
        pageNumber: 2,
        title: "Détails & Acomptes IBS",
        sections: [
          { id: "S4", title: "IV. IMPÔT SUR LE BÉNÉFICE DES SOCIÉTÉS (IBS)", fields: ["401- Acomptes Provisionnels", "402- Solde de liquidation"] },
          { id: "S5", title: "V. AUTRES TAXES", fields: ["501- Taxe de formation", "502- Taxe d'apprentissage"] }
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
        sections: [
          { id: "S1", title: "DÉTERMINATION DE LA BASE IMPOSABLE", fields: ["CA Activités de Production", "CA Activités de Services"] },
          { id: "S2", title: "LIQUIDATION DE L'IMPÔT", fields: ["Calcul de l'IFU (5% ou 12%)", "Minimum d'imposition"] }
        ]
      }
    ]
  },
  { 
    id: 'g4_v2026', 
    type: 'G4', 
    version: '3.1', 
    name: "Liasse Fiscale (G4)", 
    status: "Beta", 
    lastUpdate: "2026-02-01", 
    pages: [
      {
        pageNumber: 1,
        title: "Tableau 1 : Bilan Actif",
        sections: [
          { id: "S1", title: "ACTIF NON COURANT", fields: ["Immos Incorporelles", "Immos Corporelles", "Immos Financières"] },
          { id: "S2", title: "ACTIF COURANT", fields: ["Stocks", "Créances", "Disponibilités"] }
        ]
      },
      {
        pageNumber: 2,
        title: "Tableau 2 : Bilan Passif",
        sections: [
          { id: "S3", title: "CAPITAUX PROPRES", fields: ["Capital Social", "Réserves", "Résultat Net"] },
          { id: "S4", title: "PASSIF NON COURANT / COURANT", fields: ["Dettes Financières", "Dettes Fiscales", "Fournisseurs"] }
        ]
      },
      {
        pageNumber: 3,
        title: "Tableau 3 : Compte de Résultat (TCR)",
        sections: [
          { id: "S5", title: "PRODUITS D'EXPLOITATION", fields: ["Ventes de marchandises", "Production vendue", "Subventions"] },
          { id: "S6", title: "CHARGES D'EXPLOITATION", fields: ["Achats consommés", "Services extérieurs", "Charges de personnel"] }
        ]
      }
    ]
  }
]

export default function DgiFormsEditor() {
  const [selectedForm, setSelectedForm] = React.useState<any>(FORM_TEMPLATES[0])
  const [activeTab, setActiveTab] = React.useState("library")
  const [currentPageIdx, setCurrentPageIdx] = React.useState(0)

  const handleSelectForm = (form: any) => {
    setSelectedForm(form)
    setCurrentPageIdx(0)
    setActiveTab("editor")
    toast({ title: "Template Chargé", description: `Édition du formulaire ${form.name} en cours.` })
  }

  const theme = DGI_THEMES[selectedForm?.type as keyof typeof DGI_THEMES] || DGI_THEMES.G50;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Layout className="text-accent h-8 w-8" /> Templates DGI 2026
          </h1>
          <p className="text-muted-foreground font-medium">Gestion des formulaires multi-pages conformes au tracé officiel.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white shadow-sm"><History className="mr-2 h-4 w-4" /> Historique</Button>
          <Button className="bg-primary shadow-xl"><Save className="mr-2 h-4 w-4" /> Publier Template</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 border p-1 mb-6">
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Database className="h-4 w-4" /> Catalogue Officiel
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2" disabled={!selectedForm}>
            <FileEdit className="h-4 w-4" /> Structure & Mapping
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2" disabled={!selectedForm}>
            <Eye className="h-4 w-4" /> Aperçu Multi-pages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FORM_TEMPLATES.map((form) => {
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
                      {form.pages.slice(0, 2).map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-[9px] text-muted-foreground truncate">
                          <CheckCircle2 className={`h-3 w-3 ${fTheme.text}`} /> {p.title}
                        </div>
                      ))}
                      {form.pages.length > 2 && <p className="text-[8px] text-muted-foreground italic">+ {form.pages.length - 2} autres tableaux...</p>}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/20 p-3 mt-4">
                    <Button variant="ghost" size="sm" className={`w-full text-[10px] font-black uppercase tracking-widest ${fTheme.text}`}>
                      Éditer Structure <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
            <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 text-center bg-muted/10 hover:bg-muted/20 transition-colors">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Importer Multi-pages</CardTitle>
              <Button variant="outline" size="sm" className="mt-4 text-[10px] font-bold border-dashed">Sélectionner PDF</Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="editor">
          {selectedForm && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-none shadow-xl ring-1 ring-border overflow-hidden bg-white">
                  <CardHeader className={`${theme.primary} text-white p-6`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">{selectedForm.name}</CardTitle>
                        <CardDescription className="text-white/70 text-xs font-bold">Structure Page {currentPageIdx + 1} sur {selectedForm.pages.length}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-8"
                          disabled={currentPageIdx === 0}
                          onClick={() => setCurrentPageIdx(currentPageIdx - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-8"
                          disabled={currentPageIdx === selectedForm.pages.length - 1}
                          onClick={() => setCurrentPageIdx(currentPageIdx + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="mb-6 flex items-center justify-between border-b pb-4">
                      <h2 className="text-lg font-bold text-slate-800">{selectedForm.pages[currentPageIdx].title}</h2>
                      <Button variant="outline" size="sm" className="text-[10px] h-7"><Copy className="mr-1 h-3 w-3" /> Dupliquer Structure</Button>
                    </div>
                    <div className="space-y-8">
                      {selectedForm.pages[currentPageIdx].sections.map((section: any) => (
                        <div key={section.id} className="space-y-4">
                          <h3 className={`text-xs font-black uppercase border-b-2 pb-2 ${theme.text} ${theme.border}`}>
                            {section.title}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {section.fields.map((field: string, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all">
                                <span className="text-[11px] font-bold text-slate-700">{field}</span>
                                <Badge variant="outline" className="text-[9px] font-mono bg-white">Case {idx + 100}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="shadow-lg border-t-4 border-t-primary">
                  <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Mapping Global</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-[10px] text-muted-foreground mb-2 font-bold uppercase">Résumé du document :</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs"><span>Total Pages</span> <span className="font-bold">{selectedForm.pages.length}</span></div>
                      <div className="flex justify-between text-xs"><span>Sections Mappées</span> <span className="font-bold">{selectedForm.pages.reduce((acc: any, p: any) => acc + p.sections.length, 0)}</span></div>
                      <div className="flex justify-between text-xs"><span>Variables Liées</span> <span className="font-bold text-emerald-600">12 Variables</span></div>
                    </div>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold h-10 mt-4"><ShieldCheck className="mr-2 h-4 w-4" /> Certifier le Document</Button>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 text-white border-none shadow-xl">
                  <CardHeader><CardTitle className="text-xs font-bold uppercase opacity-80">Variables Transversales</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-[9px] text-slate-400 italic">Ces données sont reportées sur toutes les pages :</p>
                    <div className="space-y-2">
                      <Badge className="bg-white/10 text-white text-[8px] w-full justify-start py-1">RAISON_SOCIALE (Header)</Badge>
                      <Badge className="bg-white/10 text-white text-[8px] w-full justify-start py-1">NIF_CLIENT (Footer)</Badge>
                      <Badge className="bg-white/10 text-white text-[8px] w-full justify-start py-1">EXERCICE_FISCAL (All)</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview">
          {selectedForm && (
            <div className="space-y-12 pb-20">
              <Card className="max-w-5xl mx-auto shadow-2xl border-none sticky top-24 z-40 mb-12">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-white p-4">
                  <div>
                    <CardTitle className="text-sm font-black uppercase text-primary">Mode Relecture Réelle</CardTitle>
                    <CardDescription className="text-[9px] font-bold">Document de {selectedForm.pages.length} pages prêt pour impression conforme.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8"><Download className="h-3 w-3 mr-2" /> PDF Complet</Button>
                    <Button className="bg-primary h-8 shadow-lg"><Printer className="h-3 w-3 mr-2" /> Imprimer tout</Button>
                  </div>
                </CardHeader>
              </Card>

              <ScrollArea className="h-auto">
                <div className="flex flex-col items-center gap-12 bg-slate-200 p-12">
                  {selectedForm.pages.map((page: any, pIdx: number) => (
                    <div key={pIdx} className="bg-white w-[595pt] h-[842pt] shadow-2xl p-12 relative flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex justify-between items-start mb-8">
                        <div className="text-[8pt] font-black leading-tight">
                          <p>REPUBLIQUE ALGERIENNE DEMOCRATIQUE ET POPULAIRE</p>
                          <p>MINISTERE DES FINANCES</p>
                          <p>DIRECTION GENERALE DES IMPOTS</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className={`p-3 border-4 font-black text-xl ${theme.text} ${theme.border} rotate-2`}>
                            {selectedForm.type}
                          </div>
                          <span className="text-[7pt] font-bold opacity-50">PAGE {pIdx + 1}/{selectedForm.pages.length}</span>
                        </div>
                      </div>

                      <div className="text-center mb-8">
                        <h2 className="text-lg font-black underline uppercase tracking-widest">{selectedForm.name}</h2>
                        <p className="text-[9pt] font-bold mt-1 text-slate-500 italic">{page.title}</p>
                        <div className={`h-1 w-48 mx-auto mt-2 ${theme.primary}`} />
                      </div>

                      <div className="flex-1 space-y-6">
                        {pIdx === 0 && (
                          <div className="grid grid-cols-2 gap-8 border-2 border-black p-4 bg-muted/5">
                            <div className="space-y-2">
                              <p className="text-[8pt] font-black uppercase">Désignation de l'entreprise :</p>
                              <div className="h-6 border-b border-black border-dotted" />
                            </div>
                            <div className="space-y-2">
                              <p className="text-[8pt] font-black uppercase">N° Identification Fiscale (NIF) :</p>
                              <div className="h-6 border-b border-black border-dotted" />
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          {page.sections.map((s: any) => (
                            <div key={s.id} className="border border-black">
                              <div className={`${theme.primary} text-white px-2 py-1 text-[8pt] font-black uppercase`}>
                                {s.title}
                              </div>
                              <div className="divide-y divide-black">
                                {s.fields.map((f: string, i: number) => (
                                  <div key={i} className="flex h-7 items-center">
                                    <div className="flex-1 px-2 text-[7.5pt] border-r border-black font-medium">{f}</div>
                                    <div className="w-28 bg-slate-50 flex items-center justify-end px-2 text-[8pt] font-mono">0,00</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-8 flex justify-between items-end border-t border-black/20 pt-4">
                        <div className="text-[7pt] italic opacity-40">
                          <p>ComptaFisc-DZ Certification Digital Signature</p>
                          <p>Integrity Hash: {crypto.randomUUID().substring(0, 12).toUpperCase()}</p>
                        </div>
                        {pIdx === selectedForm.pages.length - 1 && (
                          <div className="text-center">
                            <p className="text-[8pt] font-black uppercase mb-8">Cachet et signature</p>
                            <div className="h-16 w-40 border-2 border-black border-dotted mx-auto" />
                          </div>
                        )}
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                        <div className="transform -rotate-45 text-slate-100 text-[100pt] font-black select-none opacity-30">ORIGINAL</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
