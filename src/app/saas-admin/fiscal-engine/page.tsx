"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Gavel, Settings2, CalendarClock, Plus, 
  Trash2, DatabaseZap, Loader2, Sparkles, RefreshCcw, BrainCircuit, Check,
  AlertTriangle, Code2
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { parseFiscalUpdate } from "@/ai/flows/fiscal-update-parsing"

export default function FiscalEngineAdmin() {
  const db = useFirestore()
  const [isLawDialogOpen, setIsLawDialogOpen] = React.useState(false)
  const [isTypeDialogOpen, setIsTypeDialogOpen] = React.useState(false)
  const [isInitializing, setIsInitializing] = React.useState(false)

  const [aiInput, setAiInput] = React.useState("")
  const [isAiProcessing, setIsAiProcessing] = React.useState(false)
  const [aiProposals, setAiProposals] = React.useState<any[] | null>(null)

  const lawsQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_laws"), orderBy("publicationDate", "desc")) : null, [db]);
  const { data: laws, isLoading: isLoadingLaws } = useCollection(lawsQuery);

  const typesQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_variable_types"), orderBy("name", "asc")) : null, [db]);
  const { data: types, isLoading: isLoadingTypes } = useCollection(typesQuery);

  const valuesQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_variable_values"), orderBy("effectiveStartDate", "desc")) : null, [db]);
  const { data: values, isLoading: isLoadingValues } = useCollection(valuesQuery);

  const [newLaw, setNewLaw] = React.useState({ name: "", effectiveStartDate: "", publicationDate: "", description: "" })
  const [newType, setNewType] = React.useState({ name: "", code: "", unit: "%", dataType: "number", description: "" })
  const [newValue, setNewValue] = React.useState({ fiscalLawId: "", fiscalVariableTypeId: "", value: "", effectiveStartDate: "", notes: "" })

  const KNOWN_CODES = [
    "IFU_STD_THRESHOLD", "IFU_AUTO_THRESHOLD", "IFU_MIN_STD", "IFU_MIN_AUTO", 
    "IFU_RATE_PROD", "IFU_RATE_SERV", "SNMG", "TVA_STD", "TVA_RED", "IBS_RATE",
    "CASNOS_RATE", "CASNOS_MIN", "CASNOS_MAX", "CASNOS_PENALTY_FIXED",
    "IRG_LIMIT_EXEMPT", "IRG_SMOOTH_STD", "IRG_SMOOTH_SPEC"
  ];

  const handleCreateLaw = () => {
    if (!db || !newLaw.name) return;
    const id = crypto.randomUUID();
    setDocumentNonBlocking(doc(db, "fiscal_laws", id), { ...newLaw, id }, { merge: true });
    setIsLawDialogOpen(false);
    toast({ title: "Loi enregistrée" });
  }

  const handleCreateType = (data?: any) => {
    if (!db) return;
    const typeData = data || newType;
    if (!typeData.code) return;
    setDocumentNonBlocking(doc(db, "fiscal_variable_types", typeData.code), { ...typeData, id: typeData.code }, { merge: true });
    setIsTypeDialogOpen(false);
    toast({ title: "Variable enregistrée" });
  }

  const handleDelete = (col: string, id: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, col, id));
    toast({ title: "Supprimé" });
  }

  const handleAiAnalysis = async () => {
    if (!aiInput.trim()) return
    setIsAiProcessing(true)
    try {
      const result = await parseFiscalUpdate({ text: aiInput })
      setAiProposals(result.proposals)
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur IA" })
    } finally {
      setIsAiProcessing(false)
    }
  }

  const handleInitialize2026 = async () => {
    if (!db) return;
    setIsInitializing(true);
    try {
      const lawId = "LF_2026";
      await setDocumentNonBlocking(doc(db, "fiscal_laws", lawId), {
        id: lawId,
        name: "Loi de Finances 2026",
        description: "Mise à jour complète IRG (Barème & Lissage), CASNOS, Exonérations Startup, TVA et SNMG 24k.",
        effectiveStartDate: "2026-01-01",
        publicationDate: "2025-12-30"
      }, { merge: true });

      const varTypes = [
        { code: "IFU_STD_THRESHOLD", name: "Seuil IFU Standard", unit: "DA", dataType: "number" },
        { code: "IFU_AUTO_THRESHOLD", name: "Seuil IFU Auto-entrepreneur", unit: "DA", dataType: "number" },
        { code: "IFU_MIN_STD", name: "Minimum IFU Standard", unit: "DA", dataType: "number" },
        { code: "IFU_MIN_AUTO", name: "Minimum IFU Auto", unit: "DA", dataType: "number" },
        { code: "IFU_RATE_PROD", name: "Taux IFU Production/Vente", unit: "%", dataType: "number" },
        { code: "IFU_RATE_SERV", name: "Taux IFU Services", unit: "%", dataType: "number" },
        { code: "CASNOS_RATE", name: "Taux Cotisation CASNOS", unit: "%", dataType: "number" },
        { code: "CASNOS_MIN", name: "Cotisation CASNOS Minimum", unit: "DA", dataType: "number" },
        { code: "CASNOS_MAX", name: "Cotisation CASNOS Maximum", unit: "DA", dataType: "number" },
        { code: "CASNOS_PENALTY_FIXED", name: "Amende Non-déclaration CASNOS", unit: "DA", dataType: "number" },
        { code: "SNMG", name: "SNMG (Salaire National Minimum Garanti)", unit: "DA", dataType: "number" },
        { code: "TVA_STD", name: "Taux TVA Standard", unit: "%", dataType: "number" },
        { code: "TVA_RED", name: "Taux TVA Réduit", unit: "%", dataType: "number" },
        { code: "IBS_RATE", name: "Taux IBS Standard (Commerce/Services)", unit: "%", dataType: "number" },
        { code: "IRG_LIMIT_EXEMPT", name: "Seuil Exonération IRG Salarié", unit: "DA", dataType: "number" },
        { code: "IRG_SMOOTH_STD", name: "Seuil Lissage IRG (Standard)", unit: "DA", dataType: "number" },
        { code: "IRG_SMOOTH_SPEC", name: "Seuil Lissage IRG (Handicapé/Retraité)", unit: "DA", dataType: "number" },
      ];

      for (const t of varTypes) {
        await setDocumentNonBlocking(doc(db, "fiscal_variable_types", t.code), { ...t, id: t.code }, { merge: true });
      }

      const valUpdates = [
        { type: "IFU_STD_THRESHOLD", val: "8000000" },
        { type: "IFU_AUTO_THRESHOLD", val: "5000000" },
        { type: "IFU_MIN_STD", val: "30000" },
        { type: "IFU_MIN_AUTO", val: "10000" },
        { type: "IFU_RATE_PROD", val: "0.05" },
        { type: "IFU_RATE_SERV", val: "0.12" },
        { type: "CASNOS_RATE", val: "0.15" },
        { type: "CASNOS_MIN", val: "32400" },
        { type: "CASNOS_MAX", val: "648000" },
        { type: "CASNOS_PENALTY_FIXED", val: "5000" },
        { type: "SNMG", val: "24000" },
        { type: "TVA_STD", val: "0.19" },
        { type: "TVA_RED", val: "0.09" },
        { type: "IBS_RATE", val: "0.26" },
        { type: "IRG_LIMIT_EXEMPT", val: "30000" },
        { type: "IRG_SMOOTH_STD", val: "35000" },
        { type: "IRG_SMOOTH_SPEC", val: "42500" },
      ];

      for (const v of valUpdates) {
        const vid = `VAL_2026_${v.type}`;
        await setDocumentNonBlocking(doc(db, "fiscal_variable_values", vid), {
          id: vid, fiscalLawId: lawId, fiscalVariableTypeId: v.type,
          value: v.val, effectiveStartDate: "2026-01-01", notes: "Initialisation complète LF 2026 conforme CIDTA"
        }, { merge: true });
      }
      toast({ title: "Moteur Fiscal 2026 initialisé" });
    } finally {
      setIsInitializing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <DatabaseZap className="text-accent h-8 w-8" /> Moteur Fiscal Master
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Configuration centralisée conforme Loi de Finances 2026.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleInitialize2026} disabled={isInitializing} className="border-primary text-primary hover:bg-primary/5">
          {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          Ré-initialiser Moteur 2026
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-t-4 border-t-accent shadow-lg bg-accent/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <BrainCircuit className="h-5 w-5 text-accent" /> Ingestion IA
            </CardTitle>
            <CardDescription>Extraire les taux depuis un texte officiel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="Copiez un texte de loi ici..." 
              className="min-h-[150px] bg-white border-accent/20"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
            />
            <Button className="w-full bg-accent text-primary font-bold" onClick={handleAiAnalysis} disabled={isAiProcessing || !aiInput.trim()}>
              {isAiProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analyser le texte
            </Button>
          </CardContent>
          {aiProposals && (
            <div className="px-6 pb-6 space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Propositions :</p>
              {aiProposals.map((p, i) => (
                <div key={i} className="bg-white p-3 rounded-lg border text-xs shadow-sm flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-primary">{p.variableName}</p>
                      {!KNOWN_CODES.includes(p.variableCode) && (
                        <Badge variant="outline" className="h-4 text-[8px] border-amber-500 text-amber-600 bg-amber-50">NOUVEAU</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">{p.variableCode}</p>
                  </div>
                  <Badge className="font-mono">{p.value}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="values" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-auto p-1 bg-muted/50 border">
              <TabsTrigger value="values" className="py-2"><CalendarClock className="h-4 w-4 mr-2" /> Valeurs</TabsTrigger>
              <TabsTrigger value="types" className="py-2"><Settings2 className="h-4 w-4 mr-2" /> Variables</TabsTrigger>
              <TabsTrigger value="laws" className="py-2"><Gavel className="h-4 w-4 mr-2" /> Lois</TabsTrigger>
            </TabsList>

            <TabsContent value="values" className="space-y-4">
              <Card className="shadow-sm border">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Variable</TableHead>
                        <TableHead>Valeur</TableHead>
                        <TableHead>Effet</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {values?.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-bold text-xs">
                            <div className="flex flex-col">
                              <span>{v.fiscalVariableTypeId}</span>
                              {!KNOWN_CODES.includes(v.fiscalVariableTypeId) && (
                                <span className="text-[8px] text-amber-600 font-bold uppercase flex items-center gap-1">
                                  <AlertTriangle className="h-2 w-2" /> Non mappée
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="font-mono text-primary bg-primary/5">{v.value}</Badge></TableCell>
                          <TableCell className="text-[10px]">{v.effectiveStartDate}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => handleDelete("fiscal_variable_values", v.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="types">
              <Card className="shadow-sm border">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Variable</TableHead>
                        <TableHead>État</TableHead>
                        <TableHead>Unité</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {types?.map((t) => {
                        const isMapped = KNOWN_CODES.includes(t.code);
                        return (
                          <TableRow key={t.id} className={!isMapped ? "bg-amber-50/20" : ""}>
                            <TableCell className="text-xs">
                              <div className="flex flex-col">
                                <span className="font-bold">{t.name}</span>
                                <span className="font-mono text-[9px] text-muted-foreground">{t.code}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {isMapped ? (
                                <Badge className="bg-emerald-500 text-white text-[8px]"><Check className="h-2 w-2 mr-1" /> ACTIF</Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-500 text-amber-600 text-[8px] bg-white"><AlertTriangle className="h-2 w-2 mr-1" /> ORPHELINE</Badge>
                              )}
                            </TableCell>
                            <TableCell><Badge variant="secondary" className="text-[10px]">{t.unit}</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => handleDelete("fiscal_variable_types", t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="laws">
              <Card className="shadow-sm border">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Publication</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {laws?.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-bold text-xs">{l.name}</TableCell>
                          <TableCell className="text-[10px]">{l.publicationDate}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => handleDelete("fiscal_laws", l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
      </div>
    </div>
  )
}
