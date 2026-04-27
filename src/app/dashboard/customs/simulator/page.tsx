
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
  ArrowRight, Search, ListChecks, Database, ExternalLink, Loader2
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { SH_CODES, calculateCustomsLiquidation } from "@/lib/customs-engine"
import { formatDZD } from "@/utils/fiscalAlgerie"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { searchOfficialTariff } from "@/services/customs/douane-scraper"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function CustomsSimulator() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)
  const [isVerifying, setIsVerifying] = React.useState(false)
  const [officialStatus, setOfficialStatus] = React.useState<any>(null)

  const [formData, setFormData] = React.useState({
    valueHT: 1000000,
    transport: 150000,
    insurance: 25000,
    shCode: "8471",
    origin: "UE", 
    extraFees: 15000
  })

  React.useEffect(() => { setMounted(true) }, [])

  const selectedSH = React.useMemo(() => SH_CODES.find(s => s.code === formData.shCode), [formData.shCode]);

  const liquidation = React.useMemo(() => {
    if (!selectedSH) return null;
    
    let dutyRate = selectedSH.duty;
    if (formData.origin === "UE") dutyRate = dutyRate * 0.5; 
    if (formData.origin === "ARABE") dutyRate = 0; 

    return calculateCustomsLiquidation({
      invoiceValue: formData.valueHT,
      transportCost: formData.transport,
      insuranceCost: formData.insurance,
      dutyRate: dutyRate,
      dapsRate: selectedSH.daps,
      tvaRate: 19,
      extraFees: formData.extraFees
    });
  }, [formData, selectedSH]);

  const handleVerifyOfficial = async () => {
    setIsVerifying(true);
    try {
      const result = await searchOfficialTariff(formData.shCode);
      if (result) {
        setOfficialStatus(result);
        toast({ title: "Données officielles trouvées", description: "Le code SH est valide sur le portail douane.gov.dz" });
      } else {
        toast({ variant: "destructive", title: "Non listé", description: "Ce code n'a pas retourné de résultat direct. Vérifiez la nomenclature." });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-start">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/customs?tenantId=${tenantId}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black text-primary uppercase tracking-tighter">Simulateur Import</h1>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Aide au sourcing et optimisation des droits de douane</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 h-9 px-4 font-black uppercase text-[10px]">
          <ShieldCheck className="mr-2 h-4 w-4" /> Tarifs Douaniers 2026
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xl border-none ring-1 ring-border rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b p-6 text-start">
              <div className="flex justify-between items-center w-full">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" /> Paramètres de l'Opération
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[9px] font-black text-blue-600 uppercase border border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                  onClick={handleVerifyOfficial}
                  disabled={isVerifying}
                >
                  {isVerifying ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                  Vérifier sur douane.gov.dz
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 text-start">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Code Tarifaire (SH Code)*</Label>
                  <div className="flex gap-2">
                    <Select value={formData.shCode} onValueChange={v => { setFormData({...formData, shCode: v}); setOfficialStatus(null); }}>
                      <SelectTrigger className="h-11 rounded-xl bg-white shadow-sm">
                        <SelectValue placeholder="Choisir une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {SH_CODES.map(s => (
                          <SelectItem key={s.code} value={s.code}>{s.code} - {s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {officialStatus && (
                    <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="h-3 w-3" /> Certifié conforme par le portail douanier officiel
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Origine / Accord de libre-échange</Label>
                  <Select value={formData.origin} onValueChange={v => setFormData({...formData, origin: v})}>
                    <SelectTrigger className="h-11 rounded-xl bg-white shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UE">Union Européenne (Accord d'association)</SelectItem>
                      <SelectItem value="CHINE">Chine / Asie (Tarif Général)</SelectItem>
                      <SelectItem value="ARABE">Grande Zone Arabe (GZALE - 0% DD)</SelectItem>
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
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Transport / Fret (DA)</Label>
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
              <CardHeader className="bg-slate-900 text-white p-6 text-start">
                 <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl font-black uppercase tracking-tighter">Résultat de la Liquidation</CardTitle>
                      <CardDescription className="text-accent font-bold uppercase text-[9px] tracking-[0.2em]">Données estimatives basées sur le tarif douanier</CardDescription>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black opacity-50 uppercase">Valeur CIF Algérie</p>
                       <p className="text-2xl font-black text-accent">{formatDZD(liquidation.cif)}</p>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-8 space-y-6 border-r border-slate-100 text-start">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Détail des Taxes</h4>
                       <div className="space-y-4">
                          <div className="flex justify-between items-center text-xs font-bold">
                             <span className="text-slate-600">Droits de Douane ({selectedSH?.duty}%)</span>
                             <span className="font-mono">{formatDZD(liquidation.customsDuty)}</span>
                          </div>
                          {liquidation.daps > 0 && (
                            <div className="flex justify-between items-center text-xs font-bold text-amber-600">
                               <span>DAPS (Taxe additionnelle {selectedSH?.daps}%)</span>
                               <span className="font-mono">+{formatDZD(liquidation.daps)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-xs font-bold text-emerald-600">
                             <span>TVA Import (19%)</span>
                             <span className="font-mono">+{formatDZD(liquidation.tvaImport)}</span>
                          </div>
                          <div className="pt-4 border-t border-dashed flex justify-between items-baseline">
                             <span className="text-[10px] font-black uppercase text-primary">Total à payer (Receveur)</span>
                             <span className="text-xl font-black text-primary">{formatDZD(liquidation.totalTaxes)}</span>
                          </div>
                       </div>
                    </div>
                    <div className="p-8 bg-slate-50/50 space-y-8 text-start">
                        <div className="space-y-2">
                           <p className="text-[10px] font-black uppercase text-slate-400">Poids fiscal de l'import</p>
                           <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                             {((liquidation.totalTaxes / liquidation.cif) * 100).toFixed(1)} %
                           </h3>
                           <Progress value={(liquidation.totalTaxes / liquidation.cif) * 100} className="h-1 bg-slate-200" />
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                           <p className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                             <TrendingUp className="h-3 w-3" /> Coût de Revient (Landed)
                           </p>
                           <p className="text-xl font-black text-primary">{formatDZD(liquidation.landedCost)}</p>
                           <p className="text-[9px] text-muted-foreground italic">C'est le montant unitaire qui sera injecté dans votre stock (Classe 3) hors TVA récupérable.</p>
                        </div>
                    </div>
                 </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6 text-start">
          <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-3xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32" />
            <CardHeader className="bg-primary/20 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                <Zap className="h-4 w-4" /> Optimisation Sourcing
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
               {formData.origin === "CHINE" ? (
                 <div className="space-y-4">
                    <p className="text-sm font-medium leading-relaxed opacity-80">
                      Vous importez actuellement de Chine (Tarif Standard).
                    </p>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase">
                          <span className="text-slate-400">Gain via Accord UE</span>
                          <span className="text-emerald-400">-{formatDZD(liquidation?.customsDuty || 0)}</span>
                       </div>
                       <p className="text-[10px] opacity-60 leading-relaxed italic">
                         En sourcant ce produit via l'UE avec un certificat EUR.1, vous annulez la quasi-totalité des droits de douane.
                       </p>
                    </div>
                 </div>
               ) : (
                 <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <p className="text-xs font-bold text-emerald-400">Sourcing Optimisé</p>
                    <p className="text-[11px] text-emerald-100/60 mt-1">Vous utilisez un accord préférentiel. Veillez à la validité de l'origine certifiée.</p>
                 </div>
               )}
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border border-blue-200 rounded-3xl p-6 relative overflow-hidden shadow-inner">
             <Info className="h-6 w-6 text-blue-600 shrink-0 mb-4" />
             <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2">Note sur la DAPS</h4>
             <p className="text-[11px] text-blue-700 leading-relaxed font-medium italic">
              "Le DAPS peut atteindre 200% sur certains produits. Il est calculé sur la valeur CIF et s'ajoute à la base de calcul de la TVA."
             </p>
          </Card>

          <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4">
             <div className="flex items-center gap-2">
               <ShieldCheck className="h-4 w-4 text-accent" />
               <span className="text-[10px] font-black uppercase text-accent tracking-widest">Base Légale</span>
             </div>
             <p className="text-[11px] leading-relaxed opacity-70 italic">
               "Les calculs respectent l'Article 15 du Code des Douanes Algérien concernant la valeur en douane des marchandises importées."
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
