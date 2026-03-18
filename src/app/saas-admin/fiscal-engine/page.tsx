"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Gavel, Settings2, CalendarClock, Plus, 
  Trash2, Info, DatabaseZap, Loader2, Sparkles, RefreshCcw 
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

export default function FiscalEngineAdmin() {
  const db = useFirestore()
  const [isLawDialogOpen, setIsLawDialogOpen] = React.useState(false)
  const [isTypeDialogOpen, setIsTypeDialogOpen] = React.useState(false)
  const [isValueDialogOpen, setIsValueDialogOpen] = React.useState(false)
  const [isInitializing, setIsInitializing] = React.useState(false)

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

  const handleCreateType = () => {
    if (!db || !newType.code) return;
    const id = newType.code; // Use code as ID for better stability
    setDocumentNonBlocking(doc(db, "fiscal_variable_types", id), { ...newType, id }, { merge: true });
    setIsTypeDialogOpen(false);
    toast({ title: "Variable créée", description: "Le moteur de calcul supporte désormais cette clé." });
  }

  const handleCreateValue = () => {
    if (!db || !newValue.value) return;
    const id = crypto.randomUUID();
    setDocumentNonBlocking(doc(db, "fiscal_variable_values", id), { ...newValue, id }, { merge: true });
    setIsValueDialogOpen(false);
    toast({ title: "Taux appliqué", description: "La variable a été mise à jour pour la période définie." });
  }

  const handleDelete = (col: string, id: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, col, id));
    toast({ title: "Supprimé", description: "L'entrée a été retirée du moteur fiscal." });
  }

  const handleInitialize2026 = async () => {
    if (!db) return;
    setIsInitializing(true);

    try {
      // 1. Loi de Finances 2026
      const lawId = "LF_2026";
      await setDocumentNonBlocking(doc(db, "fiscal_laws", lawId), {
        id: lawId,
        name: "Loi de Finances 2026",
        description: "Cadre fiscal de référence pour l'exercice 2026 incluant les prorogations G12 et suppression TAP.",
        effectiveStartDate: "2026-01-01",
        publicationDate: "2025-12-30"
      }, { merge: true });

      // 2. Types de Variables
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

      // 3. Valeurs pour 2026
      const values = [
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

      for (const v of values) {
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

      toast({ title: "Moteur Fiscal 2026 Initialisé", description: "Tous les taux et seuils ont été synchronisés." });
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
            <DatabaseZap className="text-accent h-8 w-8" /> Moteur Fiscal (Variables)
          </h1>
          <p className="text-muted-foreground">Configuration centralisée des taux et seuils légaux sans modification de code.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleInitialize2026} disabled={isInitializing}>
            {isInitializing ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Initialiser Moteur 2026
          </Button>
        </div>
      </div>

      <Tabs defaultValue="values" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 h-auto p-1 bg-muted/50">
          <TabsTrigger value="values" className="py-2"><CalendarClock className="h-4 w-4 mr-2" /> Valeurs & Taux</TabsTrigger>
          <TabsTrigger value="types" className="py-2"><Settings2 className="h-4 w-4 mr-2" /> Types de Variables</TabsTrigger>
          <TabsTrigger value="laws" className="py-2"><Gavel className="h-4 w-4 mr-2" /> Cadres Légaux (LF)</TabsTrigger>
        </TabsList>

        <TabsContent value="values" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">Historique des Applications de Taux</h3>
            <Dialog open={isValueDialogOpen} onOpenChange={setIsValueDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Appliquer un Nouveau Taux</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Définir une valeur fiscale</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4 text-foreground">
                  <div className="space-y-2">
                    <Label>Variable concernée</Label>
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
                    <div className="space-y-2">
                      <Label>Valeur</Label>
                      <Input value={newValue.value} onChange={e => setNewValue({...newValue, value: e.target.value})} placeholder="Ex: 0.19" />
                    </div>
                    <div className="space-y-2">
                      <Label>Date d'effet</Label>
                      <Input type="date" value={newValue.effectiveStartDate} onChange={e => setNewValue({...newValue, effectiveStartDate: e.target.value})} />
                    </div>
                  </div>
                </div>
                <DialogFooter><Button onClick={handleCreateValue}>Publier la valeur</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="shadow-md border-none">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Variable</TableHead>
                    <TableHead>Valeur</TableHead>
                    <TableHead>Date d'effet</TableHead>
                    <TableHead>Source Légale</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingValues ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin inline mr-2" />Chargement...</TableCell></TableRow>
                  ) : values?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Aucune valeur configurée.</TableCell></TableRow>
                  ) : values?.map((v) => {
                    const type = types?.find(t => t.id === v.fiscalVariableTypeId);
                    const law = laws?.find(l => l.id === v.fiscalLawId);
                    return (
                      <TableRow key={v.id} className="hover:bg-muted/20">
                        <TableCell className="font-bold">{type?.name || 'Inconnu'}</TableCell>
                        <TableCell><Badge variant="outline" className="font-mono text-primary bg-primary/5">{v.value} {type?.unit}</Badge></TableCell>
                        <TableCell className="text-xs">{v.effectiveStartDate}</TableCell>
                        <TableCell className="text-xs">{law?.name}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete("fiscal_variable_values", v.id)}><Trash2 className="h-4 w-4" /></Button>
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
          <div className="flex justify-between items-center">
            <h3 className="font-bold">Dictionnaire des Variables Système</h3>
            <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Créer une Variable</Button>
              </DialogTrigger>
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
                <DialogFooter><Button onClick={handleCreateType}>Enregistrer Variable</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="shadow-md border-none">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow><TableHead>Nom</TableHead><TableHead>Code (Clé)</TableHead><TableHead>Unité</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTypes ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin inline mr-2" />Chargement...</TableCell></TableRow>
                  ) : types?.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/20">
                      <TableCell className="font-bold">{t.name}</TableCell>
                      <TableCell><code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{t.code}</code></TableCell>
                      <TableCell>{t.unit}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete("fiscal_variable_types", t.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="laws" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">Journal des Lois de Finances</h3>
            <Dialog open={isLawDialogOpen} onOpenChange={setIsLawDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Nouveau Cadre Légal</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Enregistrer une Loi de Finances</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4 text-foreground">
                  <div className="space-y-2"><Label>Désignation Officielle</Label><Input value={newLaw.name} onChange={e => setNewLaw({...newLaw, name: e.target.value})} placeholder="Loi de Finances 2026" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Date de Publication (J.O)</Label><Input type="date" value={newLaw.publicationDate} onChange={e => setNewLaw({...newLaw, publicationDate: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Date d'entrée en vigueur</Label><Input type="date" value={newLaw.effectiveStartDate} onChange={e => setNewLaw({...newLaw, effectiveStartDate: e.target.value})} /></div>
                  </div>
                </div>
                <DialogFooter><Button onClick={handleCreateLaw}>Valider Cadre Légal</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="shadow-md border-none">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow><TableHead>Nom de la Loi</TableHead><TableHead>Publication</TableHead><TableHead>En vigueur le</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingLaws ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin inline mr-2" />Chargement...</TableCell></TableRow>
                  ) : laws?.map((l) => (
                    <TableRow key={l.id} className="hover:bg-muted/20">
                      <TableCell className="font-black text-primary">{l.name}</TableCell>
                      <TableCell className="text-xs">{l.publicationDate}</TableCell>
                      <TableCell className="text-xs font-bold text-emerald-600">{l.effectiveStartDate}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete("fiscal_laws", l.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-4">
        <Info className="h-6 w-6 text-blue-600 shrink-0" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold mb-1 underline">Guide de l'expert système :</p>
          <p>
            Toutes les fonctions de calcul du SaaS (TVA, IBS, IRG) appellent désormais ce moteur. 
            <strong>Évitez de supprimer des types de variables déjà utilisés en production</strong> car cela briserait les calculs historiques. 
            Préférez ajouter une nouvelle valeur avec une date d'effet future.
          </p>
        </div>
      </div>
    </div>
  )
}
