"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Calculator, ChevronLeft, Globe, 
  TrendingUp, ShieldCheck, Zap, 
  Info, AlertTriangle, Scale, PieChart,
  ArrowRight, Search, ListChecks, Database, ExternalLink, Loader2,
  FileText, CheckCircle2
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { calculateCustomsLiquidation } from "@/lib/customs-engine"
import { formatDZD } from "@/utils/fiscalAlgerie"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { searchOfficialTariff } from "@/services/customs/douane-scraper"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"

export default function CustomsSimulator() {
  const db = useFirestore()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isVerifying, setIsVerifying] = React.useState(false)
  const [officialStatus, setOfficialStatus] = React.useState<any>(null)

  // 1. Charger les tarifs depuis Firestore (Découplé)
  const tariffsQuery = useMemoFirebase(() => db ? query(collection(db, "customs_tariffs"), where("isActive", "==", true)) : null, [db]);
  const { data: tariffs, isLoading: isTariffsLoading } = useCollection(tariffsQuery);

  // 2. Charger les paramètres globaux (TCS, PRCT)
  const paramsRef = useMemoFirebase(() => db ? doc(db, "system_config", "customs_params") : null, [db]);
  const { data: liveParams } = useDoc(paramsRef);

  const [formData, setFormData] = React.useState({
    valueHT: 1000000,
    transport: 150000,
    insurance: 25000,
    shCode: "8471300000",
    origin: "UE", 
    extraFees: 15000
  })

  React.useEffect(() => { setMounted(true) }, [])

  const selectedSH = React.useMemo(() => tariffs?.find(t => t.code === formData.shCode), [tariffs, formData.shCode]);

  const liquidation = React.useMemo(() => {
    if (!selectedSH || !liveParams) return null;
    
    let dutyRate = selectedSH.duty;
    if (formData.origin === "UE") dutyRate = dutyRate * 0.5; 
    if (formData.origin === "ARABE") dutyRate = 0; 

    return calculateCustomsLiquidation({
      invoiceValue: formData.valueHT,
      transportCost: formData.transport,
      insuranceCost: formData.insurance,
      dutyRate: dutyRate,
      dapsRate: selectedSH.daps,
      tvaRate: selectedSH.tva,
      tcsRate: liveParams.tcs_rate || 0.03,
      prctRate: liveParams.prct_rate || 0.02,
      extraFees: formData.extraFees
    });
  }, [formData, selectedSH, liveParams]);

  const handleVerifyOfficial = async () => {
    setIsVerifying(true);
    try {
      const result = await searchOfficialTariff(formData.shCode);
      if (result) {
        setOfficialStatus(result);
        toast({ title: "Données officielles trouvées", description: "Le code SH10 est valide sur le portail douane.gov.dz" });
      } else {
        toast({ variant: "destructive", title: "Non listé", description: "Ce code n'a pas retourné de résultat direct. Vérifiez la nomenclature." });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 text-start">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/customs?tenantId=${tenantId}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black text-primary uppercase tracking-tighter">Simulateur Import Pro</h1>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Calcul basé sur les tarifs Cloud mis à jour le 01/01/2026</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 h-9 px-4 font-black uppercase text-[10px]">
          <ShieldCheck className="mr-2 h-4 w-4" /> Noyau Live v4.0
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-border rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b p-6">
              <div className="flex justify-between items-center w-full">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" /> Configuration SH10 & Origine
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[9px] font-black text-blue-600 uppercase border border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                  onClick={handleVerifyOfficial}
                  disabled={isVerifying}
                >
                  {isVerifying ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                  Vérifier douane.gov.dz
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Produit / Code SH10*</Label>
                  <Select value={formData.shCode} onValueChange={v => { setFormData({...formData, shCode: v}); setOfficialStatus(null); }}>
                    <SelectTrigger className="h-11 rounded-xl bg-white shadow-sm">
                      <SelectValue placeholder={isTariffsLoading ? "Chargement nomenclature..." : "Choisir une catégorie"} />
                    </SelectTrigger>
                    <SelectContent>
                      {tariffs?.map(s => (
                        <SelectItem key={s.code} value={s.code}>{s.code} - {s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {officialStatus && (
                    <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="h-3 w-3" /> Certifié conforme SH10
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Origine / Accord</Label>
                  <Select value={formData.origin} onValueChange={v => setFormData({...formData, origin: v})}>
                    <SelectTrigger className="h-11 rounded-xl bg-white shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UE">Union Européenne (EUR.1)</SelectItem>
                      <SelectItem value="CHINE">Chine / Asie (Général)</SelectItem>
                      <SelectItem value="ARABE">GZALE (Zone Arabe 0% DD)</SelectItem>
                      <SelectItem value="AUTRE">Autres Pays (Standard)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t pt-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Valeur Facture HT (DA)</Label>
                  <Input 
                    type="number" 
                    value={formData.valueHT} 
                    onChange={e => setFormData({...formData, valueHT: parseFloat(e.target.value) || 0})}
                    className="h-11 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Fret / Transport (DA)</Label>
                  <Input 
                    type="number" 
                    value={formData.transport} 
                    onChange={e => setFormData({...formData, transport: parseFloat(e.target.value) || 0})}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Assurance (DA)</Label>
                  <Input 
                    type="number" 
                    value={formData.insurance} 
                    onChange={e => setFormData({...formData, insurance: parseFloat(e.target.value) || 0})}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {liquidation && (
            <Card className="shadow-2xl border-none ring-1 ring-border rounded-3xl overflow-hidden bg-white animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardHeader className="bg-slate-900 text-white p-6">
                 <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl font-black uppercase tracking-tighter">Liquidation Certifiée</CardTitle>
                      <CardDescription className="text-accent font-bold uppercase text-[9px] tracking-[0.2em]">Données Cloud incluant TCS & PRCT</CardDescription>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black opacity-50 uppercase">Valeur en Douane (CIF)</p>
                       <p className="text-2xl font-black text-accent">{formatDZD(liquidation.cif)}</p>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-0 text-start">
                 <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-8 space-y-6 border-r border-slate-100">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Détail des Droits & Taxes</h4>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center text-xs font-bold">
                             <span className="text-slate-600">DD ({selectedSH?.duty}%)</span>
                             <span className="font-mono">{formatDZD(liquidation.customsDuty)}</span>
                          </div>
                          {liquidation.daps > 0 && (
                            <div className="flex justify-between items-center text-xs font-bold text-amber-600">
                               <span>DAPS ({selectedSH?.daps}%)</span>
                               <span className="font-mono">+{formatDZD(liquidation.daps)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-xs font-bold text-emerald-600">
                             <span>TVA Import ({selectedSH?.tva}%)</span>
                             <span className="font-mono">+{formatDZD(liquidation.tvaImport)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-bold text-blue-600 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                             <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> TCS ({(liveParams.tcs_rate * 100).toFixed(1)}%)</span>
                             <span className="font-mono">+{formatDZD(liquidation.tcs)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-bold text-slate-900 bg-slate-50 p-2 rounded-lg border border-slate-100">
                             <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> PRCT ({(liveParams.prct_rate * 100).toFixed(1)}%)</span>
                             <span className="font-mono">+{formatDZD(liquidation.prct)}</span>
                          </div>
                          <div className="pt-4 border-t border-dashed flex justify-between items-baseline">
                             <span className="text-[10px] font-black uppercase text-primary">À Verser aux Douanes</span>
                             <span className="text-xl font-black text-primary">{formatDZD(liquidation.totalTaxes)}</span>
                          </div>
                       </div>
                    </div>
                    <div className="p-8 bg-slate-50/50 space-y-8">
                        <div className="space-y-2">
                           <p className="text-[10px] font-black uppercase text-slate-400">Pression Fiscale Totale</p>
                           <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                             {((liquidation.totalTaxes / liquidation.cif) * 100).toFixed(1)} %
                           </h3>
                           <Progress value={(liquidation.totalTaxes / liquidation.cif) * 100} className="h-1 bg-slate-200" />
                        </div>
                        <div className="p-6 bg-white rounded-3xl border-2 border-primary/10 shadow-sm space-y-3">
                           <p className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                             <TrendingUp className="h-4 w-4" /> Coût d'Entrée Stock (PAMP)
                           </p>
                           <p className="text-2xl font-black text-primary">{formatDZD(liquidation.landedCost)}</p>
                           <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                             "Ce montant unitaire constitue votre base de valorisation pour la Classe 3 (Stocks) hors TVA récupérable."
                           </p>
                        </div>
                    </div>
                 </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32" />
            <CardHeader className="bg-primary/20 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                <Zap className="h-4 w-4" /> Paramètres Cloud
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
               <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase">
                     <span className="text-slate-400">Taux TCS</span>
                     <span className="text-accent">{(liveParams?.tcs_rate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase">
                     <span className="text-slate-400">Taux PRCT</span>
                     <span className="text-accent">{(liveParams?.prct_rate * 100).toFixed(1)}%</span>
                  </div>
               </div>
               <p className="text-[10px] leading-relaxed opacity-60 italic border-t border-white/10 pt-4">
                 "Les taux de liquidation sont synchronisés en temps réel avec le Noyau Fiscal SaaS. Toute mise à jour de la Loi de Finances est répercutée ici."
               </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border border-blue-200 rounded-3xl p-6 relative overflow-hidden shadow-inner">
             <Info className="h-6 w-6 text-blue-600 shrink-0 mb-4" />
             <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 text-start">Note sur la PRCT</h4>
             <p className="text-[11px] text-blue-700 leading-relaxed font-medium italic text-start">
              "Le Prélèvement à la Réception (PRCT) est une taxe parafiscale de 2% non déductible, à intégrer directement dans le coût de revient de vos marchandises."
             </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
