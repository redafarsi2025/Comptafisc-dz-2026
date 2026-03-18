import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2, ShieldCheck, Zap, FileSearch } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#ECF1F6] flex flex-col">
      <nav className="flex items-center justify-between px-8 py-6 bg-white border-b sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-[#0C55CC] p-1.5 rounded-lg">
            <Building2 className="text-white h-6 w-6" />
          </div>
          <span className="text-2xl font-bold text-[#0C55CC]">ComptaFisc-DZ</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Connexion</Link>
          </Button>
          <Button className="bg-[#0C55CC] hover:bg-[#0A47A6]" asChild>
            <Link href="/register">S'inscrire</Link>
          </Button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-extrabold text-[#0C55CC] tracking-tight mb-6">
          La fiscalité Algérienne, <br />
          <span className="text-[#26D9D9]">simplifiée par l'IA.</span>
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed">
          Gérez votre comptabilité, vos paies et vos déclarations G50 en toute sérénité. 
          Conforme SCF & Loi de Finances 2026.
        </p>

        <div className="flex gap-4 mb-20">
          <Button size="lg" className="bg-[#0C55CC] hover:bg-[#0A47A6] px-8 h-12 text-lg shadow-lg hover:scale-105 transition-transform" asChild>
            <Link href="/register">Essayer Gratuitement</Link>
          </Button>
          <Button size="lg" variant="outline" className="border-[#0C55CC] text-[#0C55CC] px-8 h-12 text-lg">
            Demander une démo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          <div className="bg-white p-8 rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
            <ShieldCheck className="h-10 w-10 text-[#26D9D9] mb-4" />
            <h3 className="text-lg font-bold text-[#0C55CC] mb-2">Conformité Totale</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Moteur fiscal mis à jour en temps réel selon le CIDTA et les lois de finances.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
            <Zap className="h-10 w-10 text-[#26D9D9] mb-4" />
            <h3 className="text-lg font-bold text-[#0C55CC] mb-2">Extraction OCR IA</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Scannez vos factures, Gemini s'occupe de la saisie comptable automatique.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
            <FileSearch className="h-10 w-10 text-[#26D9D9] mb-4" />
            <h3 className="text-lg font-bold text-[#0C55CC] mb-2">Assistant Légal</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Posez vos questions fiscales et obtenez des réponses sourcées par notre RAG.</p>
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Building2 className="text-white h-5 w-5" />
            <span className="text-white font-bold">ComptaFisc-DZ</span>
          </div>
          <div className="text-sm">
            © 2024-2026 ComptaFisc-DZ - Solution certifiée DGI & CNAS.
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="#" className="hover:text-white">Conditions</Link>
            <Link href="#" className="hover:text-white">Confidentialité</Link>
            <Link href="#" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
