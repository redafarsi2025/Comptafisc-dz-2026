
"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { jsPDF } from "jspdf"
import { 
  Building2, CalendarCheck, Download, AlertCircle, CheckCircle2, 
  Clock, Info, FileSignature, Landmark 
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { format, addDays, isAfter, differenceInDays } from "date-fns"
import { fr } from "date-fns/locale"
import { useSearchParams } from "next/navigation"

export default function G8Declaration() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const startDate = currentTenant?.debutActivite ? new Date(currentTenant.debutActivite) : null;
  const deadline = startDate ? addDays(startDate, 30) : null;
  const isLate = deadline ? isAfter(new Date(), deadline) : false;
  const daysRemaining = deadline ? differenceInDays(deadline, new Date()) : null;

  const generatePDF = () => {
    if (!currentTenant) return;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("MINISTERE DES FINANCES - DGI", 10, 10);
    doc.text("DÉCLARATION D'EXISTENCE - SÉRIE G N° 8", 10, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Raison Sociale: ${currentTenant.raisonSociale}`, 10, 35);
    doc.text(`Forme Juridique: ${currentTenant.formeJuridique}`, 10, 42);
    doc.text(`NIF: ${currentTenant.nif || 'EN ATTENTE'}`, 10, 49);
    doc.text(`Date de début d'activité: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'NON RENSEIGNÉE'}`, 10, 56);
    
    doc.line(10, 62, 200, 62);
    doc.setFont("helvetica", "bold");
    doc.text("ENGAGEMENT DU CONTRIBUABLE", 10, 70);
    doc.setFont("helvetica", "normal");
    doc.text("Je soussigné certifie l'exactitude des informations portées sur la présente déclaration", 10, 80);
    doc.text("établie conformément à l'article 183 du CIDTA.", 10, 85);
    
    doc.text(`Fait à ........................, le ${format(new Date(), 'dd/MM/yyyy')}`, 10, 100);
    doc.text("Cachet et Signature", 150, 100);
    
    doc.save(`G8_Existence_${currentTenant.raisonSociale}.pdf`);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Landmark className="h-8 w-8 text-accent" /> Déclaration d'Existence (G8)
          </h1>
          <p className="text-muted-foreground text-sm">Obligation légale sous 30 jours (Art. 183 CIDTA / Art. 14 LF 2025).</p>
        </div>
        <Button 
          onClick={generatePDF} 
          disabled={!currentTenant?.debutActivite}
          className="bg-primary shadow-lg"
        >
          <Download className="mr-2 h-4 w-4" /> Générer Formulaire G N° 8
        </Button>
      </div>

      {!currentTenant?.debutActivite && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action requise</AlertTitle>
          <AlertDescription>
            Veuillez renseigner la <strong>Date de début d'activité</strong> dans les <Link href={`/dashboard/settings?tenantId=${currentTenant?.id || ''}`} className="underline font-bold">Paramètres du Dossier</Link> pour activer cette déclaration.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={`border-t-4 ${isLate ? 'border-t-destructive' : 'border-t-emerald-500'} shadow-md`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Statut du Délai</CardTitle>
          </CardHeader>
          <CardContent>
            {isLate ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="text-xl font-bold">DÉLAI DÉPASSÉ</span>
              </div>
            ) : daysRemaining !== null ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <Clock className="h-5 w-5" />
                <span className="text-xl font-bold">J-{daysRemaining} jours</span>
              </div>
            ) : (
              <span className="text-muted-foreground italic">Non défini</span>
            )}
            <p className="text-[10px] mt-2 text-muted-foreground italic">Échéance : {deadline ? format(deadline, 'dd MMMM yyyy', { locale: fr }) : "..."}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Amende Potentielle</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className={`text-2xl font-bold ${isLate ? 'text-destructive' : 'text-primary'}`}>30 000 DA</h2>
            <p className="text-[10px] text-muted-foreground mt-1">Sanction forfaitaire pour dépôt tardif (Art. 194 CIDTA).</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Type de dossier</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="font-bold text-sm">{currentTenant?.formeJuridique || '...'}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{currentTenant?.regimeFiscal || '...'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader className="bg-muted/20 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" /> Guide de dépôt (G8)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-bold text-primary">1. Où déposer ?</p>
              <p>Auprès de l'inspection des impôts ou du Centre de Proximité des Impôts (CPI) dont dépend le siège social.</p>
              
              <p className="font-bold text-primary mt-4">2. Justificatifs requis :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Copie du Registre de Commerce (pour les commerçants).</li>
                <li>Agrément ou autorisation (pour les professions libérales).</li>
                <li>Copie de la pièce d'identité du gérant.</li>
                <li>Titre de propriété ou contrat de location (timbré).</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Landmark className="h-5 w-5" /> Rappel Loi de Finances 2025
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed opacity-90">
            Le début d'activité est juridiquement défini par :
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-1" />
                <span><strong>Commerçants :</strong> Date mentionnée sur le registre de commerce.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-1" />
                <span><strong>Autres :</strong> Date figurant sur le document d'autorisation d'exercer.</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="bg-black/10 p-4">
            <div className="flex items-center gap-2 text-xs font-bold italic">
              <Info className="h-4 w-4" /> Toute modification ultérieure doit être signalée via une déclaration rectificative.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
