"use client"

import * as React from "react"
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, ShieldCheck, Zap, FileSearch, Check, 
  ArrowRight, Landmark, Truck, Factory, Pickaxe, 
  FlaskConical, CircleDollarSign, BarChart3, Calculator, 
  Globe, Users, Star, Crown, ChevronRight, PlayCircle,
  Menu, X, MousePointer2, DatabaseZap, ScrollText, BookOpen
} from 'lucide-react';
import { PLANS } from '@/lib/plans';
import { cn } from "@/lib/utils";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const heroImage = PlaceHolderImages.find(img => img.id === 'algerian-fiscal-hero') || PlaceHolderImages[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-body selection:bg-primary selection:text-white">
      {/* NAVIGATION PROFESSIONNELLE */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl border-b z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
              <Building2 className="text-white h-6 w-6" />
            </div>
            <span className="text-2xl font-black text-primary tracking-tighter uppercase italic">ComptaFisc-DZ</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">Fonctionnalités</a>
            <a href="#segments" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">Métiers</a>
            <a href="#pricing" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">Tarifs</a>
            <div className="h-6 w-px bg-slate-200" />
            <Button variant="ghost" className="font-bold text-slate-700" asChild>
              <Link href="/login">Connexion</Link>
            </Button>
            <Button className="bg-primary hover:bg-blue-700 shadow-xl shadow-primary/20 rounded-xl px-6 font-bold" asChild>
              <Link href="/register">Lancer l'essai gratuit</Link>
            </Button>
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden text-slate-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b p-6 space-y-4 animate-in slide-in-from-top-4">
            <a href="#features" className="block text-lg font-bold text-slate-900">Fonctionnalités</a>
            <a href="#segments" className="block text-lg font-bold text-slate-900">Métiers</a>
            <a href="#pricing" className="block text-lg font-bold text-slate-900">Tarifs</a>
            <div className="pt-4 flex flex-col gap-3">
              <Button variant="outline" className="w-full border-slate-200" asChild><Link href="/login">Connexion</Link></Button>
              <Button className="w-full bg-primary" asChild><Link href="/register">Inscription</Link></Button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION - IMPACT MAXIMAL */}
      <section className="relative pt-40 pb-20 overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full -mr-96 -mt-96" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/5 blur-[100px] rounded-full -ml-48 -mb-48" />
        
        <div className="max-w-7xl mx-auto px-6 relative text-center md:text-left grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Conforme Loi de Finances 2026</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[1.1] uppercase italic text-start">
              L'excellence <br /> 
              <span className="text-primary">Fiscale & RH</span> <br /> 
              Algérienne.
            </h1>
            <p className="text-xl text-slate-500 max-w-xl leading-relaxed font-medium text-start">
              Plus qu'un ERP, ComptaFisc-DZ est votre **Master Node** de gestion. 
              Automatisez vos déclarations G50, pilotez vos chantiers et sécurisez votre paie avec une intelligence déterministe de pointe basée sur le CIDTA.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-primary hover:bg-blue-700 h-14 px-10 rounded-2xl text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/30 group" asChild>
                <Link href="/register">
                  Démarrer Maintenant <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-10 rounded-2xl text-lg font-bold border-2 border-slate-200 bg-white" asChild>
                <Link href="/register?demo=true">
                  <PlayCircle className="mr-2 h-5 w-5" /> Démonstration
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-8 pt-4">
              <div className="flex -space-x-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                    <img src={`https://picsum.photos/seed/${i+10}/40`} alt="user" />
                  </div>
                ))}
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-start">+2 500 entreprises auditées ce mois</p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-[60px] group-hover:bg-primary/30 transition-all rounded-3xl" />
            <div className="relative bg-white p-4 rounded-[40px] shadow-2xl border border-slate-100 ring-1 ring-slate-100 overflow-hidden transform group-hover:scale-[1.02] transition-transform duration-700">
               <img 
                src={heroImage.imageUrl} 
                data-ai-hint={heroImage.imageHint}
                alt="Corpus Juridique et Fiscal Algérien" 
                className="rounded-[28px] shadow-inner object-cover w-full h-[500px]"
               />
               <div className="absolute bottom-10 left-10 right-10 bg-white/95 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 shadow-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4 text-start">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <ScrollText className="text-primary h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Veille Réglementaire</p>
                      <p className="text-sm font-black text-slate-900 uppercase italic">Base CIDTA & CTCA Live</p>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center animate-pulse">
                    <Zap className="text-white h-6 w-6" />
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION SEGMENTS - CIBLAGE MÉTIER PRÉCIS */}
      <section id="segments" className="py-32 bg-slate-50 text-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic text-slate-900">Une Intelligence par Métier</h2>
            <p className="text-slate-500 max-w-2xl mx-auto font-medium">L'ERP s'adapte dynamiquement à votre secteur pour activer les contrôles et rapports spécifiques dont vous avez réellement besoin.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <SegmentCard 
              icon={Pickaxe} 
              title="BTPH & Chantiers" 
              desc="Suivi analytique par projet, gestion des situations de travaux et calcul automatique de l'ICD (Indice de Consommation Délai)."
              badge="Analytique Pro"
            />
            <SegmentCard 
              icon={Truck} 
              title="Transport & Logistique" 
              desc="Suivi de flotte par véhicule, carnet d'entretien préventif et calcul d'efficience carburant L/100km."
              badge="Flotte Connectée"
              highlight
            />
            <SegmentCard 
              icon={Factory} 
              title="Industrie & Production" 
              desc="Nomenclatures multi-niveaux (BOM), ordres de fabrication (OF) et valorisation des stocks au CMUP réel."
              badge="SCF Classe 3"
            />
            <SegmentCard 
              icon={FlaskConical} 
              title="Santé & Pharma" 
              desc="Traçabilité rigoureuse par lots, gestion des dates de péremption et registre sécurisé des psychotropes."
              badge="Audit Sanitaire"
            />
            <SegmentCard 
              icon={Landmark} 
              title="Cabinets Comptables" 
              desc="Hub multi-dossiers, rapprochement bancaire universel et tableau de bord de conformité globale."
              badge="Master Expert"
            />
            <SegmentCard 
              icon={CircleDollarSign} 
              title="Commerce & Négoce" 
              desc="Facturation rapide avec droit de timbre auto, gestion d'inventaire permanent et registre des tiers NIF 2026."
              badge="Ventes 2.0"
            />
          </div>
        </div>
      </section>

      {/* SECTION FEATURES - L'AVANTAGE TECH */}
      <section id="features" className="py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none text-start">
                  L'ERP qui Audite <br /> 
                  <span className="text-primary">votre Dossier.</span>
                </h2>
                <p className="text-lg text-slate-500 font-medium text-start">Contrairement aux logiciels classiques, notre noyau DSL (Domain Specific Language) scanne chaque écriture pour garantir votre sécurité fiscale.</p>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <FeatureRow 
                  icon={ShieldCheck} 
                  title="Audit Déterministe Master 4.0" 
                  desc="Scanne vos données contre 350+ règles métier issues du CIDTA pour détecter les risques avant un contrôle." 
                />
                <FeatureRow 
                  icon={Zap} 
                  title="Capture Vision IA (OCR)" 
                  desc="Utilisez Gemini Vision pour extraire vos factures fournisseurs directement dans votre journal d'achats." 
                />
                <FeatureRow 
                  icon={Globe} 
                  title="Jibayatic & Damancom Ready" 
                  desc="Générez vos fichiers XML G50, G12, DAS et DAC certifiés et prêts pour le télé-versement." 
                />
              </div>
            </div>

            <div className="relative">
              <Card className="bg-slate-50 border-2 border-primary/20 shadow-2xl rounded-[40px] p-10 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform text-primary"><DatabaseZap className="h-40 w-40" /></div>
                <div className="relative space-y-8 text-start">
                  <Badge className="bg-primary text-white font-black uppercase px-4 h-7 text-[10px] tracking-widest">Noyau Fiscal Live</Badge>
                  <h3 className="text-3xl font-black uppercase tracking-tighter italic text-slate-900">L'Intelligence <br />sans Hallucination.</h3>
                  <p className="text-slate-500 font-medium italic">"Notre moteur n'invente rien. Il applique rigoureusement la loi fiscale algérienne. Chaque diagnostic est accompagné de l'article légal correspondant (CIDTA)."</p>
                  
                  <div className="space-y-4 pt-6">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                       <span className="text-xs font-bold text-slate-400">Précision de calcul</span>
                       <span className="text-xl font-black text-emerald-600">100.00%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                       <span className="text-xs font-bold text-slate-400">Conformité Loi de Finances</span>
                       <span className="text-xl font-black text-primary">2026 OK</span>
                    </div>
                  </div>

                  <Button className="w-full h-14 bg-primary text-white hover:bg-blue-700 font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/20">
                    Découvrir le Moteur DSL
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="space-y-4 mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Choisissez votre puissance</h2>
            <p className="text-slate-500 max-w-xl mx-auto font-medium">Des forfaits adaptés à la taille de votre structure, de l'indépendant au grand cabinet.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {PLANS.map((plan) => (
              <Card key={plan.id} className={cn(
                "relative flex flex-col bg-white rounded-[32px] p-8 border-none shadow-xl hover:shadow-2xl transition-all group",
                plan.id === 'PRO' ? 'ring-2 ring-primary scale-105 z-10' : 'ring-1 ring-slate-200'
              )}>
                {plan.id === 'PRO' && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] flex items-center gap-1 shadow-lg">
                    <Star className="h-3 w-3 fill-current" /> Recommandé
                  </div>
                )}
                <div className="mb-10 text-left">
                  <h3 className="text-xl font-black text-slate-900 mb-2 uppercase italic">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-black text-primary tracking-tighter">{plan.price}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{plan.period}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium min-h-[48px]">{plan.description}</p>
                </div>

                <div className="space-y-6 mb-10 flex-1 text-left border-t pt-8">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inclus dans l'offre</p>
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-xs font-bold text-slate-600">
                      <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-emerald-600" />
                      </div>
                      <span>{plan.limits.invoices} factures</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-slate-600">
                      <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-emerald-600" />
                      </div>
                      <span>{plan.limits.users} utilisateur(s)</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-slate-600">
                      <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-emerald-600" />
                      </div>
                      <span>{plan.limits.storage} Cloud</span>
                    </li>
                  </ul>
                </div>

                <Button className={cn(
                  "w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg",
                  plan.id === 'PRO' ? 'bg-primary shadow-primary/30' : 'bg-slate-900 hover:bg-slate-800'
                )} asChild>
                  <Link href="/register">Choisir ce plan</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 bg-primary relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-primary" />
         <div className="absolute top-0 right-0 p-20 opacity-10"><Crown className="h-96 w-96 text-white" /></div>
         <div className="max-w-4xl mx-auto px-6 text-center relative space-y-8">
            <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic">Prêt pour la sérénité fiscale ?</h2>
            <p className="text-xl text-blue-100 font-medium">Rejoignez la nouvelle génération d'entreprises algériennes pilotées par la donnée et la loi.</p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-4">
              <Button size="lg" className="bg-white text-primary hover:bg-slate-100 h-16 px-12 rounded-2xl text-xl font-black uppercase tracking-widest shadow-2xl" asChild>
                 <Link href="/register">Créer mon dossier gratuit</Link>
              </Button>
            </div>
            <p className="text-sm text-blue-200 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Solution certifiée conforme DGI & CNAS 2026
            </p>
         </div>
      </section>

      {/* FOOTER PROFESSIONNEL CLAIR */}
      <footer className="bg-white text-slate-500 py-20 px-8 border-t">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2 space-y-6 text-start">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
                <Building2 className="text-white h-6 w-6" />
              </div>
              <span className="text-2xl font-black text-primary italic uppercase">ComptaFisc-DZ</span>
            </div>
            <p className="text-sm leading-relaxed max-w-sm font-medium">
              Première plateforme SaaS de pilotage financier et fiscal en Algérie. 
              Intégration native du SCF, de la Loi de Finances et des standards RH.
            </p>
            <div className="flex gap-4">
               {['Linkedin', 'Twitter', 'Facebook'].map(s => (
                 <a key={s} href="#" className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-primary transition-colors hover:text-white border border-slate-200">
                   <Globe className="h-4 w-4" />
                 </a>
               ))}
            </div>
          </div>
          
          <div className="space-y-4 text-start">
            <h4 className="text-slate-900 font-black uppercase text-xs tracking-widest">Navigation</h4>
            <ul className="space-y-2 text-sm font-medium">
              <li><Link href="#" className="hover:text-primary transition-colors">Plateforme</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Tarifs</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Secteurs</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Guide Fiscal</Link></li>
            </ul>
          </div>

          <div className="space-y-4 text-start">
            <h4 className="text-slate-900 font-black uppercase text-xs tracking-widest">Légal & Support</h4>
            <ul className="space-y-2 text-sm font-medium">
              <li><Link href="#" className="hover:text-primary transition-colors">CGU / Mentions</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Confidentialité</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Assistance 24/7</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Portail Admin</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-100 mt-20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">© 2024-2026 ComptaFisc-DZ — Engine v2.6.0. Certifié Jibayatic.</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-200 text-slate-400">Made in Algeria</Badge>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SegmentCard({ icon: Icon, title, desc, badge, highlight = false }: any) {
  return (
    <Card className={cn(
      "p-8 rounded-[32px] border-none transition-all duration-500 group relative overflow-hidden flex flex-col text-start",
      highlight ? "bg-primary shadow-2xl scale-105 z-10" : "bg-white hover:bg-slate-50 border border-slate-100 shadow-xl"
    )}>
      <div className={cn(
        "h-14 w-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-transform group-hover:scale-110",
        highlight ? "bg-white text-primary" : "bg-primary/10 text-primary"
      )}>
        <Icon className="h-7 w-7" />
      </div>
      <Badge variant="outline" className={cn(
        "mb-4 text-[8px] font-black uppercase tracking-widest h-6 px-3 w-fit",
        highlight ? "border-white/30 text-white" : "border-primary/30 text-primary"
      )}>
        {badge}
      </Badge>
      <h3 className={cn(
        "text-xl font-black uppercase tracking-tighter mb-4 italic leading-none",
        highlight ? "text-white" : "text-slate-900"
      )}>{title}</h3>
      <p className={cn(
        "text-sm leading-relaxed font-medium",
        highlight ? "text-blue-100" : "text-slate-500"
      )}>{desc}</p>
    </Card>
  )
}

function FeatureRow({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex gap-6 group text-start">
      <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-xl group-hover:shadow-primary/20 border border-slate-100">
        <Icon className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
      </div>
      <div className="space-y-1">
        <h4 className="text-lg font-black uppercase tracking-tighter italic text-slate-900">{title}</h4>
        <p className="text-sm text-slate-500 leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  )
}
