"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase"
import { collection, doc, query, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Factory, Play, Loader2, CheckCircle2, ShieldCheck, 
  Users, Receipt, BookOpen, Building2, Trash2, DatabaseBackup 
} from "lucide-react"
import { DEMO_DATASET } from "@/lib/demo-dataset"
import { toast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

export default function DemoFactoryPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [isSeeding, setIsSeeding] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [status, setStatus] = React.useState("")

  // Fetch existing demo tenants
  const demoTenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where("isDemo", "==", true));
  }, [db, user]);
  const { data: demoTenants, isLoading: isLoadingDemos } = useCollection(demoTenantsQuery);

  const handleSeedDemo = async (entTemplate: any) => {
    if (!db || !user) return;
    setIsSeeding(true);
    setProgress(10);
    setStatus(`Initialisation du dossier ${entTemplate.raisonSociale}...`);

    try {
      // 1. Créer le Tenant
      const tenantId = `DEMO_${Date.now()}`;
      const tenantRef = doc(db, "tenants", tenantId);
      const tenantData = {
        ...entTemplate,
        id: tenantId,
        isDemo: true,
        createdAt: new Date().toISOString(),
        members: { [user.uid]: 'owner' }
      };
      
      await setDocumentNonBlocking(tenantRef, tenantData, { merge: true });
      setProgress(30);
      setStatus("Génération des salariés de démo...");

      // 2. Créer les Salariés (si BTP ou SPA)
      if (entTemplate.secteurActivite === "BTP" || entTemplate.formeJuridique === "SPA") {
        for (const emp of DEMO_DATASET.employees) {
          await addDocumentNonBlocking(collection(db, "tenants", tenantId, "employees"), {
            ...emp,
            tenantId,
            tenantMembers: { [user.uid]: 'owner' },
            createdAt: new Date().toISOString()
          });
        }
      }
      setProgress(60);
      setStatus("Saisie des factures et écritures...");

      // 3. Créer les Factures
      for (const inv of DEMO_DATASET.invoices) {
        await addDocumentNonBlocking(collection(db, "tenants", tenantId, "invoices"), {
          ...inv,
          tenantId,
          status: 'Issued',
          totalAmountIncludingTax: inv.amountHT * (1 + inv.tvaRate/100),
          totalTaxAmount: inv.amountHT * (inv.tvaRate/100),
          totalAmountExcludingTax: inv.amountHT,
          tenantMembers: { [user.uid]: 'owner' },
          createdAt: new Date().toISOString(),
          createdByUserId: user.uid
        });
      }

      // 4. Créer les Écritures Journal
      for (const entry of DEMO_DATASET.journalEntries) {
        await addDocumentNonBlocking(collection(db, "tenants", tenantId, "journal_entries"), {
          entryDate: entry.date,
          description: entry.description,
          journalType: entry.type,
          documentReference: entry.ref,
          status: 'Validated',
          lines: entry.lines,
          tenantId,
          tenantMembers: { [user.uid]: 'owner' },
          createdAt: new Date().toISOString(),
          createdByUserId: user.uid
        });
      }

      setProgress(100);
      setStatus("Démo injectée avec succès !");
      toast({ title: "Dossier de Démo prêt", description: `Le dossier ${entTemplate.raisonSociale} est maintenant accessible.` });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur Seeding" });
    } finally {
      setTimeout(() => {
        setIsSeeding(false);
        setProgress(0);
        setStatus("");
      }, 2000);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-primary flex items-center gap-3">
            <Factory className="text-accent h-10 w-10" /> Usine à Démos
          </h1>
          <p className="text-muted-foreground mt-1">Générez des dossiers complets pour vos démonstrations commerciales.</p>
        </div>
      </div>

      {isSeeding && (
        <Card className="bg-primary/5 border-primary/20 animate-in fade-in zoom-in duration-300">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> {status}
              </span>
              <span className="text-xs font-mono">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <DatabaseBackup className="h-5 w-5 text-primary" /> Templates disponibles
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {DEMO_DATASET.enterprises.map((ent) => (
              <Card key={ent.id} className="hover:shadow-md transition-shadow group border-l-4 border-l-accent">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{ent.raisonSociale}</CardTitle>
                      <CardDescription className="text-[10px] uppercase font-bold text-accent">Secteur : {ent.secteurActivite}</CardDescription>
                    </div>
                    <Badge variant="secondary">{ent.regimeFiscal}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  <p>Inclus : 12 factures, 8 salariés, Journal complet balancé.</p>
                </CardContent>
                <CardFooter className="bg-muted/20 border-t p-3 flex justify-end">
                  <Button 
                    size="sm" 
                    onClick={() => handleSeedDemo(ent)} 
                    disabled={isSeeding}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Play className="mr-2 h-3 w-3" /> Injecter Démo
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600" /> Dossiers Démo Actifs
          </h3>
          <Card className="border-none shadow-xl ring-1 ring-border">
            <CardContent className="p-0">
              {isLoadingDemos ? (
                <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-muted-foreground" /></div>
              ) : !demoTenants?.length ? (
                <div className="p-12 text-center text-muted-foreground italic text-sm">
                  Aucun dossier de démonstration en cours.
                </div>
              ) : (
                <div className="divide-y">
                  {demoTenants.map((t) => (
                    <div key={t.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{t.raisonSociale}</p>
                          <p className="text-[9px] text-muted-foreground uppercase">{t.nif} • {t.regimeFiscal}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-4">
            <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <p className="font-bold mb-1 underline">Usage Commercial :</p>
              L'injection de démo crée un véritable dossier client lié à votre compte. 
              Cela vous permet de montrer le <strong>Grand Livre</strong>, la <strong>G50</strong> ou les <strong>États Financiers</strong> sans avoir à saisir manuellement des données lors d'un rendez-vous.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
