"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { 
  Layers, Plus, Save, Trash2, Edit3, Check, X, 
  Info, Users as UsersIcon, Database, Zap, RefreshCcw, Sparkles, FileText, Loader2
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PLANS } from "@/lib/plans"

const MODULES = [
  { key: 'billing', label: 'Facturation Clients', category: 'COMPTABILITÉ' },
  { key: 'ocr', label: 'Scan OCR (IA)', category: 'COMPTABILITÉ' },
  { key: 'accounting', label: 'Gestion Achats/Ventes', category: 'COMPTABILITÉ' },
  { key: 'bank', label: 'Relevé Bancaire', category: 'COMPTABILITÉ' },
  { key: 'tva', label: 'Calcul TVA Auto', category: 'FISCALITÉ' },
  { key: 'g50', label: 'G50 Pré-remplie', category: 'FISCALITÉ' },
  { key: 'alerts', label: 'Alertes Échéances', category: 'FISCALITÉ' },
  { key: 'ibs', label: 'Calcul IBS Annuel', category: 'FISCALITÉ' },
  { key: 'tap', label: 'Calcul TAP', category: 'FISCALITÉ' },
  { key: 'analytics', label: 'Tableau de Bord', category: 'PILOTAGE' },
  { key: 'cashflow', label: 'Trésorerie Temps Réel', category: 'PILOTAGE' },
  { key: 'reports', label: 'Rapports Mensuels', category: 'PILOTAGE' },
  { key: 'efatura', label: 'e-Fatura (API DGI)', category: 'MODERNE' },
  { key: 'cabinet', label: 'Portail Cabinet Multi-client', category: 'CABINET' },
]

export default function PlansManagement() {
  const db = useFirestore()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingPlan, setEditingPlan] = React.useState<any>(null)
  const [isInitializing, setIsInitializing] = React.useState(false)

  const plansQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "plans");
  }, [db]);
  const { data: plans, isLoading } = useCollection(plansQuery);

  const initialPlanState = {
    id: "",
    name: "",
    price: 0,
    period: "DA/mois",
    description: "",
    isActive: true,
    modules: MODULES.reduce((acc, m) => ({ ...acc, [m.key]: 'excluded' }), {}),
    limits: { invoices: "15", users: "1", companies: "1", storage: "500 MB", support: "Email" }
  }

  const [currentPlan, setCurrentPlan] = React.useState(initialPlanState)

  const handleInitializePlans = async () => {
    if (!db) return;
    setIsInitializing(true);
    
    try {
      for (const p of PLANS) {
        const planRef = doc(db, "plans", p.id);
        
        const planData = {
          id: p.id,
          name: p.name,
          price: parseInt(p.price.replace(/\s/g, '')) || 0,
          period: p.period,
          description: p.description,
          isActive: true,
          limits: p.limits,
          modules: MODULES.reduce((acc, m) => {
            const isIncluded = p.categories.some(cat => 
              cat.features.some(f => f.name.toLowerCase().includes(m.label.toLowerCase()) && f.included === 'yes')
            );
            return { ...acc, [m.key]: isIncluded ? 'included' : 'excluded' };
          }, {}),
          updatedAt: new Date().toISOString()
        };

        setDocumentNonBlocking(planRef, planData, { merge: true });
      }
      
      toast({ 
        title: "Catalogue synchronisé", 
        description: `${PLANS.length} offres initialisées selon la logique métier.` 
      });
    } catch (e) { 
      console.error(e); 
      toast({ variant: "destructive", title: "Erreur d'initialisation" });
    } finally { 
      setIsInitializing(false); 
    }
  }

  const handleSavePlan = async () => {
    if (!db || !currentPlan.id || !currentPlan.name) return;
    try {
      const planRef = doc(db, "plans", currentPlan.id);
      setDocumentNonBlocking(planRef, { ...currentPlan, updatedAt: new Date().toISOString() }, { merge: true });
      setIsDialogOpen(false);
      setCurrentPlan(initialPlanState);
      toast({ title: "Plan sauvegardé" });
    } catch (e) { 
      console.error(e); 
    }
  }

  const toggleModule = (moduleKey: string) => {
    const currentStatus = currentPlan.modules[moduleKey] || 'excluded';
    const nextStatus = currentStatus === 'excluded' ? 'included' : currentStatus === 'included' ? 'limited' : 'excluded';
    setCurrentPlan({ ...currentPlan, modules: { ...currentPlan.modules, [moduleKey]: nextStatus } });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Layers className="text-accent h-8 w-8" /> Gestion des Offres
          </h1>
          <p className="text-muted-foreground">Paramétrage des briques fonctionnelles et des limites tarifaires.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleInitializePlans} 
            disabled={isInitializing}
            className="border-primary text-primary hover:bg-primary/5"
          >
            {isInitializing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Synchroniser depuis Source
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary shadow-lg"><Plus className="mr-2 h-4 w-4" /> Créer un Plan</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPlan ? "Modifier le Plan" : "Nouveau Plan"}</DialogTitle>
                <DialogDescription>Définissez les accès et les limitations pour ce palier d'abonnement.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4 text-foreground">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ID (Slug)</Label>
                    <Input disabled={!!editingPlan} value={currentPlan.id} onChange={e => setCurrentPlan({...currentPlan, id: e.target.value})} placeholder="EX: PRO_PLUS" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input value={currentPlan.name} onChange={e => setCurrentPlan({...currentPlan, name: e.target.value})} placeholder="Ex: Offre Professionnelle" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Prix (DA)</Label><Input type="number" value={currentPlan.price} onChange={e => setCurrentPlan({...currentPlan, price: parseFloat(e.target.value)})} /></div>
                  <div className="space-y-2"><Label>Période</Label><Input value={currentPlan.period} onChange={e => setCurrentPlan({...currentPlan, period: e.target.value})} /></div>
                  <div className="flex items-end pb-2 space-x-2"><Switch checked={currentPlan.isActive} onCheckedChange={v => setCurrentPlan({...currentPlan, isActive: v})} /><Label>Actif</Label></div>
                </div>
                <div className="space-y-4 pt-4 border-t">
                  <Label className="font-bold flex items-center gap-2 text-primary"><Zap className="h-4 w-4" /> Modules fonctionnels</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {MODULES.map((m) => (
                      <button 
                        key={m.key} 
                        onClick={() => toggleModule(m.key)} 
                        className={`p-3 rounded-lg border text-left transition-all ${currentPlan.modules[m.key] === 'included' ? 'bg-emerald-50 border-emerald-500' : currentPlan.modules[m.key] === 'limited' ? 'bg-amber-50 border-amber-500' : 'bg-muted border-transparent opacity-60'}`}
                      >
                        <p className="text-xs font-bold">{m.label}</p>
                        <p className="text-[10px] opacity-60">{m.category}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSavePlan} className="w-full">
                  {editingPlan ? "Mettre à jour l'offre" : "Enregistrer la nouvelle offre"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-md border-none overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Tarif</TableHead>
                <TableHead>Modules Actifs</TableHead>
                <TableHead>Limites</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12"><Loader2 className="animate-spin h-6 w-6 mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : !plans?.length ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">Aucun plan configuré. Utilisez le bouton "Synchroniser" pour commencer.</TableCell></TableRow>
              ) : plans?.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold">{p.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">{p.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-lg font-black">{p.price.toLocaleString()}</span> 
                    <span className="text-[10px] text-muted-foreground ml-1">{p.period}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[300px]">
                      {Object.entries(p.modules).filter(([_, s]) => s === 'included').map(([k]) => (
                        <Badge key={k} variant="secondary" className="text-[8px] bg-emerald-100 text-emerald-700 border-emerald-200">
                          {MODULES.find(m => m.key === k)?.label || k}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1"><UsersIcon className="h-3 w-3" /> {p.limits?.users} Utilisateurs</div>
                      <div className="flex items-center gap-1"><FileText className="h-3 w-3" /> {p.limits?.invoices} Factures</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingPlan(p); setCurrentPlan(p); setIsDialogOpen(true); }}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => deleteDocumentNonBlocking(doc(db, "plans", p.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-4">
        <Info className="h-6 w-6 text-blue-600 shrink-0" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold uppercase mb-1">Architecture Commerciale :</p>
          <p>
            La modification des plans ici affecte instantanément ce que voient les clients sur la landing page et dans leurs paramètres d'abonnement. 
            Utilisez la **Synchronisation depuis Source** pour réinitialiser le catalogue selon les spécifications par défaut du projet.
          </p>
        </div>
      </div>
    </div>
  )
}
