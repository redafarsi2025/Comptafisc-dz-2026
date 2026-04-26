
"use client"

import * as React from "react"
import { useFirestore, useUser, addDocumentNonBlocking } from "@/firebase"
import { collection } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  FilePlus2, Plus, Trash2, Save, Loader2, 
  ChevronLeft, ClipboardCheck, AlertTriangle, ShieldCheck 
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function NewPurchaseRequest() {
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const [formData, setFormData] = React.useState({
    title: "",
    department: "Administratif",
    requesterName: "",
    urgency: "MEDIUM",
    justification: "",
    items: [{ description: "", quantity: 1, estimatedPrice: 0 }]
  })

  React.useEffect(() => {
    setMounted(true)
    if (user) {
      setFormData(prev => ({ ...prev, requesterName: user.displayName || user.email?.split('@')[0] || "Collaborateur" }));
    }
  }, [user])

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, estimatedPrice: 0 }]
    })
  }

  const removeItem = (index: number) => {
    if (formData.items.length === 1) return;
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    (newItems[index] as any)[field] = value;
    setFormData({ ...formData, items: newItems });
  }

  const totalEstimated = React.useMemo(() => {
    return formData.items.reduce((acc, item) => acc + (item.quantity * item.estimatedPrice), 0);
  }, [formData.items]);

  const handleSave = async () => {
    if (!db || !tenantId || !user || !formData.title) {
      toast({ variant: "destructive", title: "Champs requis", description: "Veuillez donner un titre à votre demande." });
      return;
    }
    
    setIsSaving(true);
    const requestData = {
      ...formData,
      totalEstimated,
      status: "PENDING",
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: user.uid,
      tenantMembers: { [user.uid]: 'owner' } // Simplification pour le prototype
    };

    try {
      await addDocumentNonBlocking(collection(db, "tenants", tenantId, "purchase_requests"), requestData);
      toast({ title: "Demande envoyée", description: "Votre expression de besoin a été enregistrée en attente de validation." });
      router.push(`/dashboard/purchases/requests?tenantId=${tenantId}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur de sauvegarde" });
    } finally {
      setIsSaving(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/purchases/requests?tenantId=${tenantId}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black text-primary uppercase">Nouvelle Demande d'Achat</h1>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Initialisation du cycle de dépense</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary shadow-lg h-11 px-8">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Soumettre la DA
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-xl border-none ring-1 ring-border">
          <CardHeader className="bg-muted/20 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" /> Détails du besoin
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label>Objet de la demande (Titre)*</Label>
                <Input 
                  placeholder="Ex: Renouvellement parc informatique" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-2">
                <Label>Service Demandeur</Label>
                <Select value={formData.department} onValueChange={v => setFormData({...formData, department: v})}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administratif">Administratif</SelectItem>
                    <SelectItem value="Technique / Chantier">Technique / Chantier</SelectItem>
                    <SelectItem value="RH">Ressources Humaines</SelectItem>
                    <SelectItem value="Production">Production / Usine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Urgence</Label>
                <Select value={formData.urgency} onValueChange={v => setFormData({...formData, urgency: v})}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Basse</SelectItem>
                    <SelectItem value="MEDIUM">Standard</SelectItem>
                    <SelectItem value="HIGH">Haute / Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label>Justification / Notes complémentaires</Label>
              <Textarea 
                placeholder="Expliquez pourquoi cet achat est nécessaire..." 
                className="min-h-[100px]"
                value={formData.justification}
                onChange={e => setFormData({...formData, justification: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-accent">Budget Estimatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="text-center py-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total HT Estimé</p>
                <h2 className="text-4xl font-black text-accent">{totalEstimated.toLocaleString()} DA</h2>
              </div>
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-[10px] leading-relaxed text-amber-200 opacity-90 italic">
                  Note : Ce budget est purement indicatif. Il sera affiné lors de la consultation fournisseurs.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-primary shadow-lg">
            <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Contrôle Interne</CardTitle></CardHeader>
            <CardContent className="text-[11px] text-muted-foreground leading-relaxed space-y-2">
              <p>Toute demande d'achat doit être visée par le responsable de service avant d'être transmise à la direction financière.</p>
              <p className="font-bold text-primary">Un devis comparatif (3 offres) sera requis pour tout montant > 100 000 DA HT.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-3 shadow-xl border-none ring-1 ring-border overflow-hidden">
          <CardHeader className="bg-muted/20 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Spécifications des articles / services</CardTitle>
            <Button variant="outline" size="sm" onClick={addItem} className="border-primary text-primary">
              <Plus className="mr-2 h-4 w-4" /> Ajouter ligne
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="text-[10px] uppercase font-black">
                  <TableHead className="w-1/2">Désignation / Référence souhaitée</TableHead>
                  <TableHead className="text-center">Quantité</TableHead>
                  <TableHead className="text-right">Prix Est. HT</TableHead>
                  <TableHead className="text-right">Total Est. HT</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} className="h-9 text-xs" placeholder="Ex: Ecran Dell 24 pouces" /></TableCell>
                    <TableCell><Input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="h-9 text-center w-24 mx-auto text-xs" /></TableCell>
                    <TableCell><Input type="number" value={item.estimatedPrice} onChange={e => updateItem(idx, 'estimatedPrice', parseFloat(e.target.value) || 0)} className="h-9 text-right w-32 ml-auto text-xs" /></TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">{(item.quantity * item.estimatedPrice).toLocaleString()} DA</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
