
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
  AlertTriangle, ShieldCheck, Landmark
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
    sections: [
      { id: "S1", title: "I. TAXES SUR LE CHIFFRE D'AFFAIRES (TVA)", fields: ["101- Ventes", "102- Prestations", "103- Achats"] },
      { id: "S2", title: "II. DROITS DE TIMBRE", fields: ["201- Timbre sur factures", "202- Timbre sur quittances"] },
      { id: "S3", title: "III. IMPÔTS SUR LE REVENU (IRG/SALAIRES)", fields: ["301- Retenue à la source", "302- IRG/Autres"] },
      { id: "S4", title: "IV. IMPÔT SUR LE BÉNÉFICE DES SOCIÉTÉS (IBS)", fields: ["401- Acomptes Provisionnels", "402- Solde de liquidation"] }
    ]
  },
  { 
    id: 'g12_v2026', 
    type: 'G12', 
    version: '2.0', 
    name: "Déclaration IFU (G12)", 
    status: "Active", 
    lastUpdate: "2026-01-10", 
    sections: [
      { id: "S1", title: "DÉTERMINATION DE LA BASE IMPOSABLE", fields: ["CA Activités de Production", "CA Activités de Services"] },
      { id: "S2", title: "LIQUIDATION DE L'IMPÔT", fields: ["Calcul de l'IFU (5% ou 12%)", "Minimum d'imposition"] }
    ]
  },
  { 
    id: 'g4_v2026', 
    type: 'G4', 
    version: '3.1', 
    name: "Liasse Fiscale (G4)", 
    status: "Beta", 
    lastUpdate: "2026-02-01", 
    sections: [
      { id: "S1", title: "TABLEAU 1 : BILAN ACTIF", fields: ["Immos Incorporelles", "Immos Corporelles", "Stocks", "Créances"] },
      { id: "S2", title: "TABLEAU 2 : BILAN PASSIF", fields: ["Capitaux Propres", "Dettes Financières", "Dettes Fiscales"] },
      { id: "S3", title: "TABLEAU 3 : COMPTE DE RÉSULTAT (TCR)", fields: ["Produits d'exploitation", "Charges d'exploitation"] }
    ]
  },
  { 
    id: 'annexe1_v2026', 
    type: 'ANNEXE', 
    version: '1.8', 
    name: "Taxe Apprentissage (Annexe I)", 
    status: "Active", 
    lastUpdate: "2025-12-20", 
    sections: [
      { id: "S1", title: "TAXE D'APPRENTISSAGE (1%)", fields: ["Masse salariale annuelle", "Montant brut TA"] },
      { id: "S2", title: "TAXE DE FORMATION CONTINUE (1%)", fields: ["Masse salariale annuelle", "Montant brut TFC"] }
    ]
  },
]

export default function DgiFormsEditor() {
  const [selectedForm, setSelectedForm] = React.useState<any>(FORM_TEMPLATES[0])
  const [activeTab, setActiveTab] = React.useState("library")

  const handleSelectForm = (form: any) => {
    setSelectedForm(form)
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
          <p className="text-muted-foreground font-medium">Éditeur de structure conforme aux formulaires papier du Ministère des Finances.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white shadow-sm"><History className="mr-2 h-4 w-4" /> Historique Versions</Button>
          <Button className="bg-primary shadow-xl"><Save className="mr-2 h-4 w-4" /> Publier Mise à jour</Button>
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
            <Eye className="h-4 w-4" /> Aperçu Conforme
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
                      <Badge variant="secondary" className="text-[8px] uppercase font-black">{form.status}</Badge>
                    </div>
                    <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">{form.name}</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-tighter">Version {form.version}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Sections mappées :</p>
                    <div className="space-y-1">
                      {form.sections.map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-[9px] text-muted-foreground">
                          <CheckCircle2 className={`h-3 w-3 ${fTheme.text}`} /> {s.title}
                        </div>
                      ))}
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
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Importer Template Scan</CardTitle>
              <Button variant="outline" size="sm" className="mt-4 text-[10px] font-bold border-dashed">Sélectionner scan PDF</Button>
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
                        <CardDescription className="text-white/70 text-xs font-bold">Structure logique V{selectedForm.version} • Conforme CIDTA 2026</CardDescription>
                      </div>
                      <Button variant="secondary" size="sm" className="h-8 text-[10px] font-black"><Palette className="mr-1 h-3 w-3" /> Tracé Visuel</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="space-y-8">
                      {selectedForm.sections.map((section: any) => (
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
                  <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Liaison Moteur Fiscal</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl bg-primary/5 space-y-3">
                      <p className="text-[10px] font-bold text-primary uppercase">Variable : TVA_STD</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground italic">Mappée sur :</span>
                        <Badge className="bg-emerald-500 text-white text-[9px]">Case 101 G50</Badge>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5 space-y-3">
                      <p className="text-[10px] font-bold text-primary uppercase">Variable : IRG_TOTAL</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground italic">Mappée sur :</span>
                        <Badge className="bg-emerald-500 text-white text-[9px]">Case 301 G50</Badge>
                      </div>
                    </div>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold h-10"><ShieldCheck className="mr-2 h-4 w-4" /> Certifier le Mapping</Button>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 text-white border-none shadow-xl">
                  <CardHeader><CardTitle className="text-xs font-bold uppercase opacity-80">Règles de Calcul Auto</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-[10px] space-y-2 opacity-90">
                      <p className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-accent" /> Calcul automatique de la TVA nette</p>
                      <p className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-accent" /> Report automatique des crédits TVA</p>
                      <p className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-accent" /> Validation des seuils de Timbre</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-4 shadow-sm">
                  <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
                  <div className="text-xs text-amber-900 leading-relaxed italic">
                    <strong>Note Expert :</strong> Les modifications de structure impacteront l'export XML Jibayatic. Une synchronisation avec l'API DGI est recommandée après publication.
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview">
          {selectedForm && (
            <Card className="max-w-5xl mx-auto shadow-2xl border-none">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10 p-6">
                <div>
                  <CardTitle className="text-lg">Simulation Impression Réelle (Original conforme)</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-black text-primary">Visualisation exacte du document administratif final</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-9"><Download className="h-4 w-4 mr-2" /> PDF Officiel</Button>
                  <Button className="bg-primary h-9 shadow-lg"><Printer className="h-4 w-4 mr-2" /> Imprimer</Button>
                </div>
              </CardHeader>
              <CardContent className="p-12 bg-slate-200 min-h-[900px] flex justify-center overflow-auto">
                {/* Papier A4 simulé */}
                <div className="bg-white w-[595pt] h-[842pt] shadow-2xl p-12 relative flex flex-col">
                   <div className="flex justify-between items-start mb-8">
                      <div className="text-[9pt] font-black leading-tight">
                        <p>REPUBLIQUE ALGERIENNE DEMOCRATIQUE ET POPULAIRE</p>
                        <p>MINISTERE DES FINANCES</p>
                        <p>DIRECTION GENERALE DES IMPOTS</p>
                      </div>
                      <div className={`p-4 border-4 font-black text-2xl ${theme.text} ${theme.border} rotate-3`}>
                        {selectedForm.type}
                      </div>
                   </div>

                   <div className="text-center mb-8">
                      <h2 className="text-lg font-black underline uppercase tracking-widest">{selectedForm.name}</h2>
                      <div className={`h-1 w-48 mx-auto mt-2 ${theme.primary}`} />
                   </div>

                   <div className="flex-1 space-y-6">
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

                      <div className="space-y-4">
                        {selectedForm.sections.slice(0, 3).map((s: any) => (
                          <div key={s.id} className="border border-black">
                            <div className={`${theme.primary} text-white px-2 py-1 text-[9pt] font-black uppercase`}>
                              {s.title}
                            </div>
                            <div className="divide-y divide-black">
                              {s.fields.slice(0, 3).map((f: string, i: number) => (
                                <div key={i} className="flex h-8 items-center">
                                  <div className="flex-1 px-2 text-[8pt] border-r border-black">{f}</div>
                                  <div className="w-32 bg-slate-50 flex items-center justify-end px-2 text-[8pt] font-mono">0,00</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="mt-12 flex justify-between items-end border-t-2 border-black pt-8">
                      <div className="text-[8pt] italic opacity-50">
                        <p>ComptaFisc-DZ Certification System</p>
                        <p>Hash: {crypto.randomUUID().substring(0, 16).toUpperCase()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9pt] font-black uppercase mb-12">Cachet et signature du contribuable</p>
                        <div className="h-20 w-48 border-2 border-black border-dotted mx-auto" />
                      </div>
                   </div>

                   {/* Filigrane conforme */}
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                      <div className="transform -rotate-45 text-slate-100 text-[120pt] font-black select-none opacity-40">DRAFT</div>
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
