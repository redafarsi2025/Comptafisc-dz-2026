
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { 
  Building2, Loader2, Mail, Lock, User, 
  KeyRound, Sparkles, ChevronRight, ChevronLeft, 
  CheckCircle2, Calculator, Landmark, CalendarDays, MapPin 
} from "lucide-react"
import { useAuth, useUser, useFirestore, initiateEmailSignUp, setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase"
import { doc, collection } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { WILAYAS } from "@/lib/wilaya-data"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type WizardStep = 0 | 1 | 2;

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const auth = useAuth()
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
  const [step, setStep] = React.useState<WizardStep>(0)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isFinishing, setIsFinishing] = React.useState(false)
  
  const [formData, setFormData] = React.useState({
    // Step 0: Account
    name: "",
    email: "",
    password: "",
    // Step 1: Enterprise
    raisonSociale: "",
    formeJuridique: "SARL",
    wilaya: "16",
    // Step 2: Fiscality
    regimeFiscal: "REGIME_REEL",
    nif: "",
    exercice: "2026",
    debutActivite: new Date().toISOString().split('T')[0],
  })

  const isDemoMode = searchParams.get('demo') === 'true';

  // Finalize Onboarding once user is created
  React.useEffect(() => {
    const finalizeOnboarding = async () => {
      if (user && !isUserLoading && !user.isAnonymous && !isFinishing) {
        setIsFinishing(true);
        try {
          // 1. Create User Profile
          const profileRef = doc(db, "userProfiles", user.uid);
          await setDocumentNonBlocking(profileRef, {
            id: user.uid,
            email: user.email,
            firstName: formData.name.split(' ')[0],
            lastName: formData.name.split(' ').slice(1).join(' ') || 'DZ',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, { merge: true });

          // 2. Create Initial Tenant (Dossier)
          const tenantRef = collection(db, "tenants");
          const tenantData = {
            raisonSociale: formData.raisonSociale || `${formData.name} Enterprise`,
            formeJuridique: formData.formeJuridique,
            wilaya: formData.wilaya,
            regimeFiscal: formData.regimeFiscal,
            nif: formData.nif,
            debutActivite: formData.debutActivite,
            exerciceOuvert: formData.exercice,
            createdAt: new Date().toISOString(),
            createdByUserId: user.uid,
            members: { [user.uid]: 'owner' },
            onboardingComplete: true,
            plan: 'GRATUIT',
            secteurActivite: 'SERVICES',
            assujettissementTva: formData.regimeFiscal === 'REGIME_REEL',
          };

          const newTenant = await addDocumentNonBlocking(tenantRef, tenantData);
          
          toast({
            title: "Bienvenue !",
            description: `Le dossier ${formData.raisonSociale} a été initialisé avec succès.`,
          });

          // Redirect to dashboard with the new tenant ID
          if (newTenant) {
            router.push(`/dashboard?tenantId=${newTenant.id}`);
          } else {
             router.push("/dashboard");
          }
        } catch (e) {
          console.error("Onboarding error:", e);
          setIsFinishing(false);
        }
      }
    };

    if (step === 2 && user) {
        finalizeOnboarding();
    }
  }, [user, isUserLoading, db, step, formData, router, isFinishing]);

  const handleNext = () => {
    if (step === 0) {
      if (!formData.email || !formData.password || !formData.name) {
        toast({ variant: "destructive", title: "Champs manquants", description: "Veuillez remplir vos informations de compte." });
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (!formData.raisonSociale) {
        toast({ variant: "destructive", title: "Raison Sociale requise", description: "Veuillez nommer votre entreprise." });
        return;
      }
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((step - 1) as WizardStep);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      initiateEmailSignUp(auth, formData.email, formData.password);
      // The useEffect will pick it up once the user object is available
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20 mb-4">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase">ComptaFisc-DZ</h1>
          <p className="text-muted-foreground text-sm font-medium">Assistant de configuration du premier dossier fiscal</p>
        </div>

        <div className="space-y-4">
           <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
             <span className={step >= 0 ? "text-primary" : ""}>1. Compte</span>
             <span className={step >= 1 ? "text-primary" : ""}>2. Entreprise</span>
             <span className={step >= 2 ? "text-primary" : ""}>3. Fiscalité</span>
           </div>
           <Progress value={(step + 1) * 33.3} className="h-1.5" />
        </div>

        <Card className="shadow-2xl border-none ring-1 ring-slate-200 overflow-hidden">
          <CardHeader className="bg-white border-b">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              {step === 0 && <><User className="h-5 w-5 text-primary" /> Création du profil expert</>}
              {step === 1 && <><Landmark className="h-5 w-5 text-primary" /> Identification de l'entité</>}
              {step === 2 && <><Calculator className="h-5 w-5 text-primary" /> Paramètres du premier exercice</>}
            </CardTitle>
            <CardDescription>
              {step === 0 && "Configurez vos identifiants de connexion sécurisés."}
              {step === 1 && "Ces informations apparaîtront sur vos factures et documents officiels."}
              {step === 2 && "Configurez le moteur fiscal pour l'année en cours."}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8">
            {step === 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <Label>Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      placeholder="Jean Dupont"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email professionnel</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      type="email"
                      placeholder="nom@entreprise.dz"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <Label>Raison Sociale</Label>
                  <Input 
                    placeholder="Ex: SARL Bensalem Commerce" 
                    value={formData.raisonSociale}
                    onChange={(e) => setFormData({...formData, raisonSociale: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Forme Juridique</Label>
                    <Select value={formData.formeJuridique} onValueChange={(v) => setFormData({...formData, formeJuridique: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["SARL", "SPA", "EURL", "SNC", "EI", "Auto-entrepreneur"].map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Wilaya</Label>
                    <Select value={formData.wilaya} onValueChange={(v) => setFormData({...formData, wilaya: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {WILAYAS.map(w => (
                          <SelectItem key={w.code} value={w.code}>{w.code} - {w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Date de début d'activité</Label>
                  <Input type="date" value={formData.debutActivite} onChange={(e) => setFormData({...formData, debutActivite: e.target.value})} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-4">
                   <div className="space-y-2">
                     <Label className="text-primary font-bold">Régime Fiscal</Label>
                     <Select value={formData.regimeFiscal} onValueChange={(v) => setFormData({...formData, regimeFiscal: v})}>
                       <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="IFU">IFU (Impôt Forfaitaire Unique)</SelectItem>
                         <SelectItem value="REGIME_REEL">Régime du Réel</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label>NIF (15 chiffres)</Label>
                     <Input 
                      placeholder="Numéro d'Identification Fiscale" 
                      maxLength={15}
                      value={formData.nif}
                      onChange={(e) => setFormData({...formData, nif: e.target.value})}
                      className="bg-white"
                     />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Exercice Initial</Label>
                     <Select value={formData.exercice} onValueChange={(v) => setFormData({...formData, exercice: v})}>
                       <SelectTrigger><SelectValue /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="2025">Exercice 2025</SelectItem>
                         <SelectItem value="2026">Exercice 2026 (Actuel)</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="bg-accent/10 p-4 rounded-xl flex items-center gap-3">
                     <Sparkles className="h-6 w-6 text-accent" />
                     <p className="text-[10px] font-bold text-accent-foreground leading-tight">
                       Moteur LF 2026 activé automatiquement pour ce dossier.
                     </p>
                   </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="bg-slate-50 border-t p-6 flex justify-between gap-4">
            {step > 0 ? (
              <Button variant="ghost" onClick={handleBack} disabled={isLoading || isFinishing}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
            ) : (
              <div />
            )}
            
            {step < 2 ? (
              <Button onClick={handleNext} className="bg-primary px-8">
                Suivant <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading || isFinishing} 
                className="bg-emerald-600 hover:bg-emerald-700 px-12 h-12 text-lg shadow-xl shadow-emerald-500/20"
              >
                {isLoading || isFinishing ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Finalisation...</>
                ) : (
                  <><CheckCircle2 className="mr-2 h-5 w-5" /> Lancer mon espace ComptaFisc</>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          Vous avez déjà un compte ?{" "}
          <Link href="/login" className="text-primary font-black hover:underline underline-offset-4">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  )
}
