
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
  Package, Info, Calculator, FileText, BarChart3, ShieldCheck, 
  Users as UsersIcon, Database, Zap
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Liste des modules immuables (fonctionnalités du SaaS)
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
    limits: {
      invoices: "15",
      users: "1",
      companies: "1",
      storage: "500 MB",
      support: "Email"
    }
  }

  const [currentPlan, setCurrentPlan] = React.useState(initialPlanState)

  const handleSavePlan = async () => {
    if (!db || !currentPlan.id || !currentPlan.name) {
      toast({ variant: "destructive", title: "Erreur", description: "ID et Nom sont obligatoires." });
      return;
    }

    try {
      const planRef = doc(db, "plans", currentPlan.id);
      setDocumentNonBlocking(planRef, {
        ...currentPlan,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      toast({ title: "Plan enregistré", description: `Le plan ${currentPlan.name} a été mis à jour.` });
      setIsDialogOpen(false);
      setCurrentPlan(initialPlanState);
      setEditingPlan(null);
    } catch (e) {
      console.error(e);
    }
  }

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setCurrentPlan(plan);
    setIsDialogOpen(true);
  }

  const handleDelete = async (planId: string) => {
    if (!db) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce plan ?")) return;

    try {
      deleteDocumentNonBlocking(doc(db, "plans", planId));
      toast({ title: "Plan supprimé", description: "Le plan a été retiré du catalogue." });
    } catch (e) {
      console.error(e);
    }
  }

  const toggleModule = (moduleKey: string) => {
    const currentStatus = currentPlan.modules[moduleKey] || 'excluded';
    const nextStatus = currentStatus === 'excluded' ? 'included' : currentStatus === 'included' ? 'limited' : 'excluded';
    
    setCurrentPlan({
      ...currentPlan,
      modules: { ...currentPlan.modules, [moduleKey]: nextStatus }
    });
  }

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Layers className="text-primary h-8 w-8" /> Gestion des Plans & Offres
          </h1>
          <p className="text-slate-400">Configurez les briques fonctionnelles et les limites tarifaires de votre SaaS.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setCurrentPlan(initialPlanState);
            setEditingPlan(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Créer un Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 text-white border-slate-800">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Modifier le Plan" : "Nouveau Plan Commercial"}</DialogTitle>
              <DialogDescription className="text-slate-400">Définissez le prix, les limites et les modules inclus.</DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID Unique (Slug)</Label>
                  <Input 
                    disabled={!!editingPlan}
                    placeholder="ex: PRO_ANNUEL" 
                    value={currentPlan.id} 
                    onChange={e => setCurrentPlan({...currentPlan, id: e.target.value})}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom de l'offre</Label>
                  <Input 
                    placeholder="ex: Pack Excellence" 
                    value={currentPlan.name} 
                    onChange={e => setCurrentPlan({...currentPlan, name: e.target.value})}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Prix (DA)</Label>
                  <Input 
                    type="number" 
                    value={currentPlan.price} 
                    onChange={e => setCurrentPlan({...currentPlan, price: parseFloat(e.target.value)})}
                    className="bg-slate-900 border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Périodicité</Label>
                  <Select value={currentPlan.period} onValueChange={v => setCurrentPlan({...currentPlan, period: v})}>
                    <SelectTrigger className="bg-slate-900 border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 text-white border-slate-800">
                      <SelectItem value="DA/mois">Mensuel</SelectItem>
                      <SelectItem value="DA/an">Annuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={currentPlan.isActive} 
                      onCheckedChange={v => setCurrentPlan({...currentPlan, isActive: v})}
                    />
                    <Label>Plan Actif</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h4 className="text-sm font-bold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Matrice des Modules</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {MODULES.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => toggleModule(m.key)}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                        currentPlan.modules[m.key] === 'included' ? 'bg-emerald-500/10 border-emerald-500/50' :
                        currentPlan.modules[m.key] === 'limited' ? 'bg-amber-500/10 border-amber-500/50' :
                        'bg-slate-900 border-slate-800 opacity-50'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{m.label}</span>
                        <span className="text-[10px] opacity-60">{m.category}</span>
                      </div>
                      {currentPlan.modules[m.key] === 'included' ? <Check className="h-3 w-3 text-emerald-500" /> :
                       currentPlan.modules[m.key] === 'limited' ? <div className="h-2 w-2 rounded-full bg-amber-500" /> :
                       <X className="h-3 w-3 text-slate-600" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h4 className="text-sm font-bold flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Limites Techniques</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(currentPlan.limits).map(([key, val]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-[10px] uppercase text-slate-500">{key}</Label>
                      <Input 
                        value={val} 
                        onChange={e => setCurrentPlan({...currentPlan, limits: {...currentPlan.limits, [key]: e.target.value}})}
                        className="bg-slate-900 border-slate-800 h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 border-t border-slate-800">
              <Button onClick={handleSavePlan} className="w-full bg-primary hover:bg-primary/90">
                <Save className="mr-2 h-4 w-4" /> {editingPlan ? "Mettre à jour le plan" : "Publier le nouveau plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle>Catalogue des Offres</CardTitle>
            <CardDescription>Liste des plans disponibles pour les nouveaux utilisateurs et les renouvellements.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-900/50">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Plan</TableHead>
                  <TableHead className="text-slate-400">Tarif</TableHead>
                  <TableHead className="text-slate-400">Modules Inclus</TableHead>
                  <TableHead className="text-slate-400">Limites (Users/Fact.)</TableHead>
                  <TableHead className="text-slate-400">Statut</TableHead>
                  <TableHead className="text-right text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12">Chargement du catalogue...</TableCell></TableRow>
                ) : plans?.map((p) => (
                  <TableRow key={p.id} className="border-slate-800 hover:bg-slate-900/50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200">{p.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">{p.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-white">{p.price.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-500">{p.period}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(p.modules)
                          .filter(([_, status]) => status === 'included' || status === 'limited')
                          .slice(0, 3)
                          .map(([key, status]) => (
                            <Badge key={key} variant="outline" className={`text-[8px] uppercase border-slate-800 ${status === 'limited' ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {MODULES.find(m => m.key === key)?.label}
                            </Badge>
                          ))}
                        {Object.values(p.modules).filter(s => s === 'included' || s === 'limited').length > 3 && (
                          <span className="text-[8px] text-slate-500 font-bold">+{Object.values(p.modules).filter(s => s === 'included' || s === 'limited').length - 3}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <UsersIcon className="h-3 w-3" /> {p.limits.users}
                        <span className="mx-1">•</span>
                        <FileText className="h-3 w-3" /> {p.limits.invoices}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={p.isActive ? "bg-emerald-500/20 text-emerald-500" : "bg-slate-800 text-slate-500"}>
                        {p.isActive ? "Actif" : "Archivé"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => handleEdit(p)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
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
      </div>

      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex items-start gap-4">
        <Info className="h-6 w-6 text-primary shrink-0" />
        <div className="text-xs text-slate-400 space-y-2">
          <p className="font-bold text-slate-200">Note sur la flexibilité des modules :</p>
          <p>
            Vous ne pouvez pas créer de nouveaux modules (fonctionnalités) car ils correspondent à la logique métier codée dans l'application. 
            Cependant, vous pouvez les assembler librement pour créer des offres promotionnelles ou segmentées. 
            Le statut <span className="text-emerald-500 font-bold">"Inclus"</span> débloque la fonctionnalité, tandis que <span className="text-amber-500 font-bold">"Limité"</span> applique les quotas techniques définis dans les limites.
          </p>
        </div>
      </div>
    </div>
  )
}
