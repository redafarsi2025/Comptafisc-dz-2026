"use client"

import * as React from "react"
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  ShieldAlert, Plus, Trash2, Play, 
  AlertCircle, Search, CheckCircle2, ShieldCheck, 
  Activity, Zap, Loader2, ListChecks, Filter, Sparkles
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

export default function BusinessRulesConfig() {
  const db = useFirestore()
  const [mounted, setMounted] = React.useState(false)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isAuditing, setIsAuditing] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Simulation de règles métier pour le SaaS
  const [rules, setRules] = React.useState([
    { id: "R1", name: "Retenue Dividendes Manquante", condition: "Account(442) == 0 WHERE Account(12) DISTRIBUTED", severity: "critical", category: "FISCAL", active: true, description: "Alerte si des dividendes sont distribués sans la retenue de 15%." },
    { id: "R2", name: "IRG Salarié Hors Barème 2026", condition: "IRG_CALC != BARÈME_2026", severity: "high", category: "SOCIAL", active: true, description: "Vérifie si l'IRG prélevé correspond au nouveau barème et au lissage légal." },
    { id: "R3", name: "Stocks Négatifs Détectés", condition: "Balance(30) < 0", severity: "medium", category: "COMPTA", active: true, description: "Détecte les anomalies d'inventaire ou erreurs de saisie." },
    { id: "R4", name: "Dépassement Seuil IFU (8M)", condition: "CA_ANNUEL > 8000000", severity: "high", category: "FISCAL", active: true, description: "Alerte pour basculement obligatoire au régime du Réel." },
    { id: "R5", name: "Minimum IBS 10k Non Respecté", condition: "IBS_DÛ < 10000", severity: "high", category: "FISCAL", active: true, description: "Vérifie l'application du minimum fiscal de 10 000 DA (LF 2026)." }
  ])

  const handleRunGlobalAudit = async () => {
    setIsAuditing(true)
    await new Promise(r => setTimeout(r, 2500))
    setIsAuditing(false)
    toast({
      title: "Audit terminé",
      description: "1,420 anomalies potentielles identifiées sur 450 dossiers actifs.",
    })
  }

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
    toast({ title: "Statut mis à jour", description: "La règle a été modifiée avec succès." })
  }

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <ShieldAlert className="text-accent h-8 w-8" /> Moteur de Règles Métier
          </h1>
          <p className="text-muted-foreground font-medium">Contrôle automatique de conformité et alertes proactives pour les abonnés.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-primary text-primary bg-white shadow-sm"
            onClick={handleRunGlobalAudit}
            disabled={isAuditing}
          >
            {isAuditing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
            Lancer Audit Global
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary shadow-xl">
                <Plus className="mr-2 h-4 w-4" /> Nouvelle Règle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Ajouter un contrôle de conformité</DialogTitle>
                <DialogDescription>Définissez une nouvelle règle logique pour le scanner automatique.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nom de l'alerte</Label>
                  <Input placeholder="Ex: TVA sur Frais de Mission" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select defaultValue="FISCAL">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FISCAL">Fiscalité</SelectItem>
                        <SelectItem value="SOCIAL">Social / Paie</SelectItem>
                        <SelectItem value="COMPTA">Comptabilité</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sévérité</Label>
                    <Select defaultValue="medium">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critique</SelectItem>
                        <SelectItem value="high">Élevée</SelectItem>
                        <SelectItem value="medium">Moyenne</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Expression Logique (Condition)</Label>
                  <Input placeholder="Compte(6xx) WHERE TVA == 0" className="font-mono text-xs" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsDialogOpen(false)} className="w-full">Enregistrer la règle</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-primary text-white border-none shadow-lg overflow-hidden relative group">
          <div className="absolute -right-4 -top-4 bg-white/10 p-8 rounded-full group-hover:scale-110 transition-transform">
            <Activity className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-[10px] uppercase font-black opacity-80">Anomalies Détectées</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-4xl font-black">1,420</div>
            <p className="text-[10px] mt-2 font-bold uppercase tracking-tighter text-accent flex items-center gap-1">
              <Zap className="h-3 w-3" /> Scan terminé il y a 5 min
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-muted-foreground">Risques Critiques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-destructive">124</div>
            <p className="text-[10px] text-muted-foreground mt-1">Nécessitent une action immédiate</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-muted-foreground">Règles Actives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600">{rules.filter(r => r.active).length} / {rules.length}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Surveillance 24/7 activée</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-emerald-800">Conformité Loi 2026</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-emerald-600 font-black text-xl">
              <ShieldCheck className="h-6 w-6" /> 100% OK
            </div>
            <p className="text-[10px] text-emerald-700 mt-1 italic">Barèmes et taux à jour.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-lg font-bold">Registre des Contrôles Automatiques</CardTitle>
                <CardDescription>Règles appliquées lors de la validation des écritures et déclarations.</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Chercher une règle..." className="pl-9 h-9 w-64 bg-white text-xs" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-black">État</TableHead>
                    <TableHead className="text-[10px] uppercase font-black">Nom & Description</TableHead>
                    <TableHead className="text-[10px] uppercase font-black">Condition Logique</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id} className="hover:bg-muted/10 transition-colors group">
                      <TableCell>
                        <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id)} />
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs">{rule.name}</span>
                            <Badge variant="secondary" className="text-[8px] h-4">{rule.category}</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 italic mt-0.5">{rule.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[9px] bg-slate-50 text-primary border-primary/20 py-1 px-2">
                          {rule.condition}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary"><Play className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="bg-muted/20 border-t p-4 flex justify-center">
              <Button variant="link" className="text-xs font-bold text-primary uppercase tracking-widest">
                Optimiser l'ordre d'exécution
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-t-4 border-t-primary shadow-lg bg-white">
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" /> Conformité Systématique
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="p-4 rounded-xl border bg-emerald-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Barème IRG 2026</span>
                  <Badge className="bg-emerald-500 text-white text-[8px]">OPÉRATIONNEL</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Calcul SNMG 24k</span>
                  <Badge className="bg-emerald-500 text-white text-[8px]">OPÉRATIONNEL</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Exonération Startup</span>
                  <Badge className="bg-emerald-500 text-white text-[8px]">OPÉRATIONNEL</Badge>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                Ces briques fondamentales sont verrouillées au niveau du noyau du moteur fiscal et ne peuvent être modifiées via cet éditeur.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-white border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> Suggestion IA Gemini
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-white/10 rounded-lg border border-white/10">
                <p className="text-[10px] leading-relaxed opacity-90 italic">
                  "J'ai analysé les derniers communiqués DGI. Je vous suggère de créer une règle pour surveiller les entreprises dépassant 5M DA de CA pour les Auto-entrepreneurs, suite à la mise à jour des seuils LF 2026."
                </p>
              </div>
              <Button size="sm" className="w-full bg-accent text-primary font-bold hover:bg-accent/90">
                Créer la règle suggérée
              </Button>
            </CardContent>
          </Card>

          <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
            <div className="text-xs text-amber-900 leading-relaxed font-medium">
              <strong>Audit de Performance :</strong> Le moteur de règles traite actuellement 45,000 écritures par seconde. Aucun ralentissement détecté pour les utilisateurs finaux.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
