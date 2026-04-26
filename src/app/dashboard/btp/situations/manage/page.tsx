
"use client"

import * as React from "react"
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, query, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  FileBadge, Save, ChevronLeft, Loader2, 
  Calculator, ShieldCheck, Landmark, AlertTriangle, 
  CalendarDays, TrendingUp, CheckCircle2
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { calculateRetenueGarantie, calculateTVA } from "@/lib/calculations"

export default function ManageBtpSituationPage() {
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const situationId = searchParams.get('id')
  const [mounted, setMounted] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const [formData, setFormData] = React.useState({
    number: "",
    projectId: "",
    projectName: "",
    date: new Date().toISOString().split('T')[0],
    certifiedAmount: 0,
    progress: 0,
    isSigned: false,
    notes: ""
  })

  React.useEffect(() => { setMounted(true) }, [])

  // 1. Charger les projets BTP pour la sélection
  const projectsQuery = useMemoFirebase(() => 
    (db && tenantId) ? query(collection(db, "tenants", tenantId, "projects")) : null
  , [db, tenantId]);
  const { data: projects } = useCollection(projectsQuery);

  // 2. Charger les données si mode édition
  const situationRef = useMemoFirebase(() => 
    (db && tenantId && situationId) ? doc(db, "tenants", tenantId, "situations", situationId) : null
  , [db, tenantId, situationId]);
  const { data: existingSituation, isLoading: isSituationLoading } = useDoc(situationRef);

  React.useEffect(() => {
    if (existingSituation) {
      setFormData({
        number: existingSituation.number || "",
        projectId: existingSituation.projectId || "",
        projectName: existingSituation.projectName || "",
        date: existingSituation.date || "",
        certifiedAmount: existingSituation.certifiedAmount || 0,
        progress: existingSituation.progress || 0,
        isSigned: existingSituation.isSigned || false,
        notes: existingSituation.notes || ""
      });
    }
  }, [existingSituation]);

  // Calculs dynamiques
  const totals = React.useMemo(() => {
    const ht = formData.certifiedAmount || 0;
    const tva = calculateTVA(ht, 'TVA_19', 'BTP');
    const retenue = calculateRetenueGarantie(ht, 'BTP');
    return {
      ht,
      tva,
      ttc: ht + tva,
      retenue,
      netAPayer: (ht + tva) - retenue
    };
  }, [formData.certifiedAmount]);

  const handleSave = async () => {
    if (!db || !tenantId || !user || !formData.projectId || !formData.number) {
      toast({ variant: "destructive", title: "Champs requis", description: "Veuillez sélectionner un projet et un numéro de situation." });
      return;
    }

    setIsSaving(true);
    const selectedProject = projects?.find(p => p.id === formData.projectId);
    
    const situationData = {
      ...formData,
      projectName: selectedProject?.name || "",
      totalTVA: totals.tva,
      totalRetenue: totals.retenue,
      netAmount: totals.netAPayer,
      updatedAt: new Date().toISOString()
    };

    try {
      if (situationId) {
        updateDocumentNonBlocking(doc(db, "tenants", tenantId, "situations", situationId), situationData);
        toast({ title: "Situation mise à jour", description: `Le décompte N°${formData.number} a été enregistré.` });
      } else {
        await addDocumentNonBlocking(collection(db, "tenants", tenantId, "situations"), {
          ...situationData,
          tenantId,
          createdAt: new Date().toISOString(),
          createdByUserId: user.uid
        });
        toast({ title: "Situation créée", description: `Le nouveau décompte N°${formData.number} est enregistré.` });
      }
      
      // Optionnel : Mettre à jour l'avancement physique du projet
      if (selectedProject) {
        updateDocumentNonBlocking(doc(db, "tenants", tenantId, "projects", selectedProject.id), {
          progress: formData.progress,
          updatedAt: new Date().toISOString()
        });
      }

      router.push(`/dashboard/btp/situations?tenantId=${tenantId}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur de sauvegarde" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted || isSituationLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/btp/situations?tenantId=${tenantId}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase tracking-tighter">
              {situationId ? "Modifier le Décompte" : "Nouvelle Situation"}
            </h1>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">Facturation à l'avancement BTP</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary shadow-xl h-11 px-8 rounded-xl font-bold">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer le Décompte
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" /> Références du Marché
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Chantier / Projet BTP*</Label>
                  <Select 
                    value={formData.projectId} 
                    onValueChange={v => setFormData({...formData, projectId: v})}
                    disabled={!!situationId}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-white">
                      <SelectValue placeholder="Choisir un chantier" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Numéro de Situation*</Label>
                  <Input 
                    placeholder="Ex: 01, 02..." 
                    value={formData.number}
                    onChange={e => setFormData({...formData, number: e.target.value})}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Date de la Situation</Label>
                  <Input 
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Statut Signature</Label>
                   <Select 
                    value={formData.isSigned ? "YES" : "NO"} 
                    onValueChange={v => setFormData({...formData, isSigned: v === "YES"})}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NO">En attente Visa</SelectItem>
                      <SelectItem value="YES">Visé (Maitrise d'œuvre)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none ring-1 ring-border rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Détails de l'Avancement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Montant Certifié HT (DA)*</Label>
                    <Input 
                      type="number"
                      placeholder="0.00"
                      value={formData.certifiedAmount || ""}
                      onChange={e => setFormData({...formData, certifiedAmount: parseFloat(e.target.value) || 0})}
                      className="h-12 text-lg font-black rounded-xl border-primary/20 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Avancement Physique Cumulé (%)</Label>
                    <div className="relative">
                      <Input 
                        type="number"
                        max="100"
                        min="0"
                        value={formData.progress || ""}
                        onChange={e => setFormData({...formData, progress: parseInt(e.target.value) || 0})}
                        className="h-12 text-lg font-black rounded-xl pr-10"
                      />
                      <span className="absolute right-4 top-3.5 font-black text-slate-300">%</span>
                    </div>
                  </div>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Observations / Détails des travaux</Label>
                  <Textarea 
                    placeholder="Précisez les lots de travaux réalisés ce mois-ci..." 
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="min-h-[100px] rounded-2xl bg-slate-50 border-slate-100"
                  />
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden relative">
            <Calculator className="absolute -right-4 -top-4 h-24 w-24 opacity-10" />
            <CardHeader className="bg-primary/20 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent">Décompte Financier SCF</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between text-xs font-bold opacity-60">
                <span>Brut Certifié HT</span>
                <span>{totals.ht.toLocaleString()} DA</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-emerald-400">
                <span>TVA (19%)</span>
                <span>+{totals.tva.toLocaleString()} DA</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-amber-500">
                <span>Retenue Garantie (5%)</span>
                <span>-{totals.retenue.toLocaleString()} DA</span>
              </div>
              
              <div className="pt-6 border-t border-white/10">
                <div className="flex justify-between items-baseline">
                   <p className="text-[10px] font-black uppercase text-accent">Net à Encaisser</p>
                   <span className="text-3xl font-black text-white">{totals.netAPayer.toLocaleString()} <span className="text-xs font-normal opacity-50">DA</span></span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border border-amber-100 rounded-2xl p-6 relative overflow-hidden">
             <AlertTriangle className="absolute -right-4 -bottom-4 h-20 w-20 opacity-10 text-amber-600" />
             <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2">Alerte Rétention</h4>
             <p className="text-[11px] text-amber-700 leading-relaxed italic">
              "La retenue de garantie est une créance immobilisée. Elle ne doit être facturée qu'après la réception définitive (souvent 12 mois après la livraison)."
             </p>
          </Card>

          <Card className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
             <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="text-[10px] text-emerald-800 leading-relaxed font-medium">
                  <p className="font-black uppercase tracking-tight mb-1">Impact Comptable :</p>
                  <p>La validation génère automatiquement une écriture au crédit du compte 701 (Travaux) et au débit du compte 4118 (Retenues de garantie).</p>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
