
"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  Layers, Plus, Save, Trash2, Edit3, Check, X, 
  Info, Users as UsersIcon, Database, Zap, RefreshCcw, Sparkles, 
  FileText, Loader2, CheckCircle2, AlertCircle, HardHat, TrendingUp
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

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'GRATUIT': return 'border-t-slate-400';
      case 'ESSENTIEL': return 'border-t-blue-500';
      case 'PRO': return 'border-t-emerald-500';
      case 'CABINET': return 'border-t-purple-600';
      default: return 'border-t-primary';
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Layers className="text-accent h-8 w-8" /> Catalogue Commercial
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.2em]">Pilotage des offres et briques fonctionnelles</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleInitializePlans} 
            disabled={isInitializing}
            className="border-primary text-primary hover:bg-primary/5 h-11 px-6 rounded-2xl"
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
              <Button className="bg-primary shadow-lg h-11 px-6 rounded-2xl font-bold"><Plus className="mr-2 h-4 w-4" /> Créer un Plan</Button>
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

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Chargement du catalogue...</p>
        </div>
      ) : !plans?.length ? (
        <Card className="border-dashed border-2 py-32 text-center bg-white rounded-3xl">
          <CardContent className="flex flex-col items-center gap-4">
            <Layers className="h-16 w-16 text-muted-foreground opacity-10" />
            <div className="space-y-1">
              <h3 className="text-xl font-bold">Catalogue vide</h3>
              <p className="text-sm text-muted-foreground">Utilisez le bouton "Synchroniser" pour charger les offres par défaut.</p>
            </div>
            <Button variant="outline" onClick={handleInitializePlans} className="mt-4 rounded-2xl">Lancer la synchronisation</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((p) => (
            <Card key={p.id} className={`flex flex-col bg-white border-none shadow-xl ring-1 ring-border rounded-3xl overflow-hidden hover:shadow-2xl transition-all border-t-8 ${getPlanColor(p.id)} group`}>
              <CardHeader className="pb-6">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-primary/20 text-primary">{p.id}</Badge>
                  {!p.isActive && <Badge variant="destructive" className="text-[8px] h-4">INACTIF</Badge>}
                </div>
                <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{p.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-black text-primary">{p.price === 0 ? "GRATUIT" : p.price.toLocaleString()}</span>
                  {p.price > 0 && <span className="text-[10px] font-bold text-muted-foreground uppercase">{p.period}</span>}
                </div>
                <CardDescription className="text-xs mt-4 line-clamp-2 min-h-[32px]">{p.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-6 pt-4 border-t border-slate-50">
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capacités & Limites</p>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-[10px] font-bold">
                        <UsersIcon className="h-3 w-3 text-blue-500" /> Utilisateurs
                      </div>
                      <span className="text-[10px] font-black">{p.limits?.users || '1'}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-[10px] font-bold">
                        <FileText className="h-3 w-3 text-emerald-500" /> Factures / mois
                      </div>
                      <span className="text-[10px] font-black">{p.limits?.invoices || '15'}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-[10px] font-bold">
                        <Database className="h-3 w-3 text-amber-500" /> Stockage
                      </div>
                      <span className="text-[10px] font-black">{p.limits?.storage || '500 MB'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Modules de l'offre</p>
                  <div className="grid gap-1.5 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {Object.entries(p.modules).map(([key, status]) => {
                      const mod = MODULES.find(m => m.key === key);
                      if (status === 'excluded') return null;
                      return (
                        <div key={key} className="flex items-center gap-2 text-[10px]">
                          {status === 'included' ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                          <span className="font-medium truncate">{mod?.label || key}</span>
                        </div>
                      );
                    })}
                    {Object.values(p.modules).every(s => s === 'excluded') && (
                      <p className="text-[10px] text-muted-foreground italic">Aucun module spécifique.</p>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="bg-slate-50 border-t p-4 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 rounded-xl font-bold h-9 bg-white"
                  onClick={() => { setEditingPlan(p); setCurrentPlan(p); setIsDialogOpen(true); }}
                >
                  <Edit3 className="h-3 w-3 mr-2" /> Éditer
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-xl h-9 w-9 text-slate-400 hover:text-destructive hover:bg-destructive/5"
                  onClick={() => deleteDocumentNonBlocking(doc(db, "plans", p.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-4">
        <div className="h-10 w-10 rounded-2xl bg-white border border-blue-200 flex items-center justify-center shrink-0 shadow-sm">
          <Info className="h-5 w-5 text-blue-600" />
        </div>
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold uppercase tracking-tight mb-1">Architecture Commerciale & Multi-tenancy :</p>
          <p className="opacity-80">
            Les plans configurés ici définissent les barrières logicielles pour chaque dossier client. 
            Le passage d'un module du statut <strong>"Inclus"</strong> à <strong>"Exclu"</strong> désactive instantanément la fonctionnalité correspondante dans le dashboard de l'abonné. 
            Toute modification est tracée dans l'historique d'audit du Command Center.
          </p>
        </div>
      </div>
    </div>
  )
}
