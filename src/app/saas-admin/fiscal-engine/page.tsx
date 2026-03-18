"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc, getDocs, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Gavel, Settings2, CalendarClock, Plus, 
  Trash2, Info, DatabaseZap, Loader2, Sparkles, RefreshCcw, BrainCircuit, Check, X
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { parseFiscalUpdate, FiscalUpdateOutput } from "@/ai/flows/fiscal-update-parsing"

export default function FiscalEngineAdmin() {
  const db = useFirestore()
  const [isLawDialogOpen, setIsLawDialogOpen] = React.useState(false)
  const [isTypeDialogOpen, setIsTypeDialogOpen] = React.useState(false)
  const [isValueDialogOpen, setIsValueDialogOpen] = React.useState(false)
  const [isInitializing, setIsInitializing] = React.useState(false)

  // AI State
  const [aiInput, setAiInput] = React.useState("")
  const [isAiProcessing, setIsAiProcessing] = React.useState(false)
  const [aiProposals, setAiProposals] = React.useState<FiscalUpdateOutput['proposals'] | null>(null)

  // Subscriptions
  const lawsQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_laws"), orderBy("publicationDate", "desc")) : null, [db]);
  const { data: laws, isLoading: isLoadingLaws } = useCollection(lawsQuery);

  const typesQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_variable_types"), orderBy("name", "asc")) : null, [db]);
  const { data: types, isLoading: isLoadingTypes } = useCollection(typesQuery);

  const valuesQuery = useMemoFirebase(() => db ? query(collection(db, "fiscal_variable_values"), orderBy("effectiveStartDate", "desc")) : null, [db]);
  const { data: values, isLoading: isLoadingValues } = useCollection(valuesQuery);

  // States for new entries
  const [newLaw, setNewLaw] = React.useState({ name: "", effectiveStartDate: "", publicationDate: "", description: "" })
  const [newType, setNewType] = React.useState({ name: "", code: "", unit: "%", dataType: "number", description: "" })
  const [newValue, setNewValue] = React.useState({ fiscalLawId: "", fiscalVariableTypeId: "", value: "", effectiveStartDate: "", notes: "" })

  const handleCreateLaw = () => {
    if (!db || !newLaw.name) return;
    const id = crypto.randomUUID();
    setDocumentNonBlocking(doc(db, "fiscal_laws", id), { ...newLaw, id }, { merge: true });
    setIsLawDialogOpen(false);
    toast({ title: "Loi enregistrée", description: "Le nouveau cadre législatif est prêt." });
  }

  const handleCreateType = (data?: any) => {
    if (!db) return;
    const typeData = data || newType;
    if (!typeData.code) return;
    const id = typeData.code; 
    setDocumentNonBlocking(doc(db, "fiscal_variable_types", id), { ...typeData, id }, { merge: true });
    setIsTypeDialogOpen(false);
    toast({ title: "Variable enregistrée", description: `Le type ${typeData.code} est actif.` });
  }

  const handleCreateValue = (data?: any) => {
    if (!db) return;
    const valData = data || newValue;
    if (!valData.value) return;
    const id = crypto.randomUUID();
    setDocumentNonBlocking(doc(db, "fiscal_variable_values", id), { ...valData, id }, { merge: true });
    setIsValueDialogOpen(false);
    toast({ title: "Valeur enregistrée", description: "Le nouveau taux est appliqué." });
  }

  const handleDelete = (col: string, id: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, col, id));
    toast({ title: "Supprimé", description: "L'entrée a été retirée du moteur fiscal." });
  }

  const handleAiAnalysis = async () => {
    if (!aiInput.trim()) return
    setIsAiProcessing(true)
    setAiProposals(null)
    try {
      const result = await parseFiscalUpdate({ text: aiInput })
      setAiProposals(result.proposals)
      toast({ title: "Analyse terminée", description: `${result.proposals.length} mises à jour détectées.` })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Erreur IA", description: "Impossible d'analyser le texte." })
    } finally {
      setIsAiProcessing(false)
    }
  }

  const handleApplyProposal = async (proposal: any) => {
    if (!db || !laws?.[0]) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez d'abord initialiser une Loi de Finances." })
      return
    }

    // 1. S'assurer que le type de variable existe
    const typeRef = doc(db, "fiscal_variable_types", proposal.variableCode)
    await setDocumentNonBlocking(typeRef, {
      id: proposal.variableCode,
      code: proposal.variableCode,
      name: proposal.variableName,
      unit: proposal.variableCode.includes('RATE') || proposal.variableCode.includes('TVA') || proposal.variableCode.includes('IBS') || proposal.variableCode.includes('IFU') ? '%' : 'DA',
      dataType: 'number',
      description: proposal.notes
    }, { merge: true })

    // 2. Créer la valeur
    handleCreateValue({
      fiscalLawId: laws[0].id, // On prend la loi la plus récente par défaut
      fiscalVariableTypeId: proposal.variableCode,
      value: proposal.value,
      effectiveStartDate: proposal.effectiveStartDate,
      notes: proposal.notes
    })

    // Retirer de la liste des propositions
    setAiProposals(prev => prev ? prev.filter(p => p !== proposal) : null)
  }

  const handleInitialize2026 = async () => {
    if (!db) return;
    setIsInitializing(true);

    try {
      const lawId = "LF_2026";
      await setDocumentNonBlocking(doc(db, "fiscal_laws", lawId), {
        id: lawId,
        name: "Loi de Finances 2026",
        description: "Cadre fiscal de référence pour l'exercice 2026 incluant les prorogations G12 et suppression TAP.",
        effectiveStartDate: "2026-01-01",
        publicationDate: "2025-12-30"
      }, { merge: true });

      const varTypes = [
        { code: "TVA_STD", name: "TVA Taux Normal", unit: "%", dataType: "number" },
        { code: "TVA_RED", name: "TVA Taux Réduit", unit: "%", dataType: "number" },
        { code: "TAP_RATE", name: "Taux TAP", unit: "%", dataType: "number" },
        { code: "SNMG", name: "SNMG", unit: "DA", dataType: "number" },
        { code: "IFU_PROD", name: "IFU - Production/Vente", unit: "%", dataType: "number" },
        { code: "IFU_SERV", name: "IFU - Services/Libéral", unit: "%", dataType: "number" },
        { code: "IFU_AUTO", name: "IFU - Auto-entrepreneur", unit: "%", dataType: "number" },
        { code: "IBS_PROD", name: "IBS - Production", unit: "%", dataType: "number" },
        { code: "IBS_BTP", name: "IBS - BTPH / Tourisme", unit: "%", dataType: "number" },
        { code: "IBS_SERV", name: "IBS - Services / Commerce", unit: "%", dataType: "number" },
        { code: "IRG_LIMIT", name: "Seuil Exonération IRG", unit: "DA", dataType: "number" },
      ];

      for (const t of varTypes) {
        await setDocumentNonBlocking(doc(db, "fiscal_variable_types", t.code), { ...t, id: t.code }, { merge: true });
      }

      const valUpdates = [
        { type: "TVA_STD", val: "0.19" },
        { type: "TVA_RED", val: "0.09" },
        { type: "TAP_RATE", val: "0.00" },
        { type: "SNMG", val: "24000" },
        { type: "IFU_PROD", val: "0.05" },
        { type: "IFU_SERV", val: "0.12" },
        { type: "IFU_AUTO", val: "0.005" },
        { type: "IBS_PROD", val: "0.19" },
        { type: "IBS_BTP", val: "0.23" },
        { type: "IBS_SERV", val: "0.26" },
        { type: "IRG_LIMIT", val: "30000" },
      ];

      for (const v of valUpdates) {
        const vid = `VAL_2026_${v.type}`;
        await setDocumentNonBlocking(doc(db, "fiscal_variable_values", vid), {
          id: vid,
          fiscalLawId: lawId,
          fiscalVariableTypeId: v.type,
          value: v.val,
          effectiveStartDate: "2026-01-01",
          notes: "Initialisation automatique LF 2026"
        }, { merge: true });
      }

      toast({ title: "Moteur Fiscal 2026 Initialisé" });
    } catch (e) {
      console.error(e);
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
          <p className="text-muted-foreground text-sm font-medium">Configuration centralisée des taux et seuils légaux Algériens.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleInitialize2026} disabled={isInitializing}>
            {isInitializing ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Initialiser Moteur 2026
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IA INGESTION CARD */}
        <Card className="lg:col-span-1 border-t-4 border-t-accent shadow-lg bg-accent/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <BrainCircuit className="h-5 w-5 text-accent" /> Assistant IA d'Ingestion
            </CardTitle>
            <CardDescription>Collez un texte officiel pour extraire les nouveaux taux.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="Ex: Le SNMG est augmenté à 24 000 DA à partir du 1er janvier 2026..." 
              className="min-h-[150px] bg-white border-accent/20"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
            />
            <Button 
              className="w-full bg-accent text-primary font-bold hover:bg-accent/90" 
              onClick={handleAiAnalysis}
              disabled={isAiProcessing || !aiInput.trim()}
            >
              {isAiProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analyser le texte
            </Button>
          </CardContent>
          {aiProposals && aiProposals.length > 0 && (
            <CardFooter className="flex flex-col gap-3 pt-0">
              <p className="text-[10px] font-bold uppercase text-muted-foreground self-start">Propositions IA :</p>
              <div className="w-full space-y-2">
                {aiProposals.map((p, i) => (
                  <div key={i} className="bg-white p-3 rounded-lg border text-xs shadow-sm group">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-primary">{p.variableName}</span>
                      <Badge className="font-mono text-[9px]">{p.value}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-2 italic">Effet: {p.effectiveStartDate}</p>
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setAiProposals(prev => prev?.filter(item => item !== p) || null)}><X className="h-3 w-3" /></Button>
                      <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApplyProposal(p)}><Check className="h-3 w-3 mr-1" /> Valider</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardFooter>
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
              <div className="flex justify-between items-center px-1">
                <h3 className="font-bold text-primary">Tableau des Taux Applicables</h3>
                <Dialog open={isValueDialogOpen} onOpenChange={setIsValueDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/5"><Plus className="h-4 w-4 mr-2" /> Valeur Manuelle</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Saisie d'une valeur fiscale</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4 text-foreground">
                      <div className="space-y-2">
                        <Label>Variable</Label>
                        <Select onValueChange={(v) => setNewValue({...newValue, fiscalVariableTypeId: v})}>
                          <SelectTrigger><SelectValue placeholder="Choisir la variable" /></SelectTrigger>
                          <SelectContent>
                            {types?.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Loi de référence</Label>
                        <Select onValueChange={(v) => setNewValue({...newValue, fiscalLawId: v})}>
                          <SelectTrigger><SelectValue placeholder="Choisir la loi" /></SelectTrigger>
                          <SelectContent>
                            {laws?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Valeur</Label><Input value={newValue.value} onChange={e => setNewValue({...newValue, value: e.target.value})} placeholder="Ex: 0.19" /></div>
                        <div className="space-y-2"><Label>Date d'effet</Label><Input type="date" value={newValue.effectiveStartDate} onChange={e => setNewValue({...newValue, effectiveStartDate: e.target.value})} /></div>
                      </div>
                    </div>
                    <DialogFooter><Button onClick={() => handleCreateValue()} className="w-full">Publier</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="shadow-sm border">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Variable</TableHead>
                        <TableHead>Valeur</TableHead>
                        <TableHead>Date d'effet</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingValues ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin inline mr-2" />Chargement...</TableCell></TableRow>
                      ) : values?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">Aucune valeur configurée.</TableCell></TableRow>
                      ) : values?.map((v) => {
                        const type = types?.find(t => t.id === v.fiscalVariableTypeId);
                        return (
                          <TableRow key={v.id} className="hover:bg-muted/10">
                            <TableCell className="font-bold text-xs">{type?.name || v.fiscalVariableTypeId}</TableCell>
                            <TableCell><Badge variant="outline" className="font-mono text-[10px] text-primary bg-primary/5">{v.value} {type?.unit}</Badge></TableCell>
                            <TableCell className="text-[10px] font-medium">{v.effectiveStartDate}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => handleDelete("fiscal_variable_values", v.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="types" className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-bold text-primary">Référentiel des Variables</h3>
                <Button size="sm" variant="outline" onClick={() => setIsTypeDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouveau Type</Button>
              </div>
              <Card className="shadow-sm border">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow><TableHead>Nom</TableHead><TableHead>Code</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingTypes ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="animate-spin inline mr-2" />Chargement...</TableCell></TableRow>
                      ) : types?.map((t) => (
                        <TableRow key={t.id} className="hover:bg-muted/10">
                          <TableCell className="font-bold text-xs">{t.name}</TableCell>
                          <TableCell><code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">{t.code}</code></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => handleDelete("fiscal_variable_types", t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="laws" className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-bold text-primary">Cadres Légaux (LF)</h3>
                <Button size="sm" variant="outline" onClick={() => setIsLawDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouvelle Loi</Button>
              </div>
              <Card className="shadow-sm border">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow><TableHead>Nom</TableHead><TableHead>En vigueur le</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingLaws ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="animate-spin inline mr-2" />Chargement...</TableCell></TableRow>
                      ) : laws?.map((l) => (
                        <TableRow key={l.id} className="hover:bg-muted/10">
                          <TableCell className="font-black text-primary text-xs">{l.name}</TableCell>
                          <TableCell className="text-[10px] font-bold text-emerald-600">{l.effectiveStartDate}</TableCell>
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

      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau type de variable</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4 text-foreground">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nom</Label><Input value={newType.name} onChange={e => setNewType({...newType, name: e.target.value})} /></div>
              <div className="space-y-2"><Label>Code Machine</Label><Input value={newType.code} onChange={e => setNewType({...newType, code: e.target.value})} placeholder="TVA_STD" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Unité</Label><Input value={newType.unit} onChange={e => setNewType({...newType, unit: e.target.value})} /></div>
              <div className="space-y-2">
                <Label>Type de donnée</Label>
                <Select onValueChange={(v) => setNewType({...newType, dataType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="number">Nombre</SelectItem><SelectItem value="string">Texte</SelectItem><SelectItem value="json">Structure (JSON)</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={() => handleCreateType()} className="w-full">Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLawDialogOpen} onOpenChange={setIsLawDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enregistrer une Loi de Finances</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4 text-foreground">
            <div className="space-y-2"><Label>Désignation Officielle</Label><Input value={newLaw.name} onChange={e => setNewLaw({...newLaw, name: e.target.value})} placeholder="Loi de Finances 2026" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Publication (J.O)</Label><Input type="date" value={newLaw.publicationDate} onChange={e => setNewLaw({...newLaw, publicationDate: e.target.value})} /></div>
              <div className="space-y-2"><Label>Entrée en vigueur</Label><Input type="date" value={newLaw.effectiveStartDate} onChange={e => setNewLaw({...newLaw, effectiveStartDate: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleCreateLaw} className="w-full">Valider</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-4">
        <Info className="h-6 w-6 text-blue-600 shrink-0" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold mb-1 underline">Guide Expert :</p>
          <p>
            L'assistant IA peut créer de nouvelles variables si le code machine n'est pas reconnu. 
            Vérifiez toujours la cohérence entre le **Code** (ex: SNMG) et la **Valeur** (ex: 24000) avant de cliquer sur valider. 
            Les données sont liées à la Loi de Finances la plus récente.
          </p>
        </div>
      </div>
    </div>
  )
}
