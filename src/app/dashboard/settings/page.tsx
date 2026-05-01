
'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useFirestore, useUser, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase'
import { collection, query, where, doc } from 'firebase/firestore'
import { WILAYAS } from '@/lib/wilaya-data'
import { 
  Building2, Save, ShieldCheck, Loader2, Info, Landmark, Zap, Briefcase, GraduationCap, Gavel, Truck, FlaskConical,
  Star, CheckCircle, ArrowRight, PlusCircle, XCircle, AlertTriangle, Crown, FolderSearch
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useSearchParams } from 'next/navigation'
import { useLocale } from '@/context/LocaleContext'
import { cn } from '@/lib/utils'
import { PlanDefinition, PLANS, PREMIUM_ADDONS, PremiumAddon } from '@/lib/plans';

const FeatureIcon = ({ included }: { included: 'yes' | 'no' | 'limited' }) => {
  if (included === 'yes') return <CheckCircle className="h-5 w-5 text-green-500" />
  if (included === 'no') return <XCircle className="h-5 w-5 text-red-400" />
  return <AlertTriangle className="h-5 w-5 text-yellow-500" />
}

export default function TenantSettingsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { t, isRtl } = useLocale()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)
  const [submittingId, setSubmittingId] = React.useState<string | null>(null);

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'tenants'), where(`members.${user.uid}`, '!=', null));
  }, [db, user]);
  
  const { data: tenants, isLoading: isTenantsLoading } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants || tenants.length === 0) return null;
    if (tenantIdFromUrl) {
        const tenant = tenants.find(t => t.id === tenantIdFromUrl);
        return tenant;
    }
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const [formData, setFormData] = React.useState<any>({})

  React.useEffect(() => {
    if (currentTenant) {
      setFormData(currentTenant)
      setIsDirty(false)
    }
  }, [currentTenant])

  const memberInfo = currentTenant?.members?.[user?.uid];
  const userRole = (typeof memberInfo === 'object' && memberInfo !== null) ? memberInfo.role : memberInfo;
  const canManageSettings = userRole === 'owner' || userRole === 'admin';

  const handleUpdate = (path: string, value: any) => {
    if (!canManageSettings) return;
    const keys = path.split('.')
    setFormData((prev: any) => {
      const newData = { ...prev }
      let current = newData
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newData
    })
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!db || !currentTenant || !canManageSettings) return;
    setIsSaving(true)
    try {
      await updateDocumentNonBlocking(doc(db, 'tenants', currentTenant.id), {
        ...formData,
        updatedAt: new Date().toISOString()
      })
      setIsDirty(false)
      toast({ title: 'Configuration mise à jour', description: 'Les modifications ont été enregistrées.' });
    } finally { setIsSaving(false); }
  }

  const handlePlanChangeRequest = async (planId: PlanDefinition['id']) => {
    if (!db || !user || !currentTenant) return;
    setSubmittingId(planId);
    try {
      await addDocumentNonBlocking(collection(db, 'subscription_requests'), {
        tenantId: currentTenant.id,
        requestedPlanId: planId,
        currentPlanId: currentTenant.planId || 'GRATUIT',
        userId: user.uid,
        userEmail: user.email,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        type: 'PLAN_UPGRADE'
      });
      toast({ title: "Demande Envoyée", description: "Votre demande de changement de plan a été envoyée." });
    } catch (error) {
      toast({ title: "Erreur", variant: 'destructive' });
    } finally { setSubmittingId(null); }
  };

  const handleAddonRequest = async (addon: PremiumAddon) => {
    if (!db || !user || !currentTenant) return;
    setSubmittingId(addon.id);
    try {
      await addDocumentNonBlocking(collection(db, 'subscription_requests'), {
        tenantId: currentTenant.id,
        requestedAddonId: addon.id,
        requestedAddonName: addon.name,
        currentPlanId: currentTenant.planId || 'GRATUIT',
        userId: user.uid,
        userEmail: user.email,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        type: 'ADDON_PURCHASE'
      });
      toast({ title: `Demande de Module Envoyée`, description: `Votre demande pour le module "${addon.name}" a été envoyée.` });
    } catch (error) {
      toast({ title: "Erreur", variant: 'destructive' });
    } finally { setSubmittingId(null); }
  };

  if (isTenantsLoading) return <div className='flex items-center justify-center h-full'><Loader2 className='animate-spin h-8 w-8 text-primary' /></div>

  if (!currentTenant && tenantIdFromUrl) {
    return (
      <div className="text-center py-20">
        <FolderSearch className="mx-auto h-16 w-16 text-slate-300" />
        <h2 className="mt-4 text-xl font-bold">Dossier non trouvé ou inaccessible</h2>
        <p className="mt-2 text-sm text-muted-foreground">Vérifiez que vous êtes bien membre de ce dossier.</p>
      </div>
    );
  }
  
  const currentPlanId = currentTenant?.planId || 'GRATUIT';

  return (
    <div className='max-w-7xl mx-auto space-y-6 pb-20' dir={isRtl ? 'rtl' : 'ltr'}>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex flex-col gap-1 text-start'>
          <h1 className='text-3xl font-black text-primary flex items-center gap-2 uppercase tracking-tighter'>
            {t.Settings.master_config}
          </h1>
          <p className='text-muted-foreground font-medium uppercase text-[10px] tracking-widest'>{currentTenant?.raisonSociale || t.Settings.governance}</p>
        </div>
        {canManageSettings && (
          <Button onClick={handleSave} disabled={isSaving || !isDirty} className='shadow-xl bg-primary h-11 px-8 rounded-xl font-bold'>
            {isSaving ? <Loader2 className={cn(isRtl ? 'ms-2' : 'me-2', 'h-4 w-4 animate-spin')} /> : <Save className={cn(isRtl ? 'ms-2' : 'me-2', 'h-4 w-4')} />}
            {t.Common.save}
          </Button>
        )}
      </div>

      <Tabs defaultValue={canManageSettings ? 'identification' : 'subscription'} className='w-full'>
        <TabsList className={cn('grid w-full h-auto p-1 bg-muted/50 rounded-2xl', canManageSettings ? 'grid-cols-5' : 'grid-cols-1')}>
          {canManageSettings && <TabsTrigger value='identification' className='py-3 text-xs font-bold rounded-xl'>{t.Settings.legal_id}</TabsTrigger>}
          {canManageSettings && <TabsTrigger value='fiscal' className='py-3 text-xs font-bold rounded-xl'>{t.Settings.fiscal_profile}</TabsTrigger>}
          {canManageSettings && <TabsTrigger value='expert' className='py-3 text-xs font-bold rounded-xl'>Modules Secteurs</TabsTrigger>}
          {canManageSettings && <TabsTrigger value='social' className='py-3 text-xs font-bold rounded-xl'>Social & RH</TabsTrigger>}
          <TabsTrigger value='subscription' className='py-3 text-xs font-bold rounded-xl'>Abonnement</TabsTrigger>
        </TabsList>

        {canManageSettings && <TabsContent value='identification' className='mt-6 space-y-6'>
          <Card>
            <CardHeader><CardTitle>Informations Générales</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Raison Sociale</Label>
                <Input value={formData.raisonSociale || ''} onChange={e => handleUpdate('raisonSociale', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Forme Juridique</Label>
                <Select value={formData.formeJuridique || ''} onValueChange={v => handleUpdate('formeJuridique', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="SARL">SARL</SelectItem><SelectItem value="EURL">EURL</SelectItem><SelectItem value="SPA">SPA</SelectItem><SelectItem value="SNC">SNC</SelectItem><SelectItem value="Profession Libérale">Profession Libérale</SelectItem><SelectItem value="Etablissement Public">Etablissement Public</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label>NIF</Label>
                <Input value={formData.nif || ''} onChange={e => handleUpdate('nif', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>NIS</Label>
                <Input value={formData.nis || ''} onChange={e => handleUpdate('nis', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>N° Registre Commerce</Label>
                <Input value={formData.rc || ''} onChange={e => handleUpdate('rc', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>N° Article d'Imposition</Label>
                <Input value={formData.ai || ''} onChange={e => handleUpdate('ai', e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Adresse</Label>
                <Input value={formData.adresse || ''} onChange={e => handleUpdate('adresse', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Wilaya</Label>
                <Select value={formData.wilaya || ''} onValueChange={v => handleUpdate('wilaya', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="16">Alger</SelectItem>{/*...*/}</SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label>Date de création</Label>
                <Input type="date" value={formData.dateCreation || ''} onChange={e => handleUpdate('dateCreation', e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>}

        {canManageSettings && <TabsContent value='fiscal' className='mt-6 space-y-6'>
          <Card>
            <CardHeader><CardTitle>Paramètres Fiscaux</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Régime Fiscal</Label>
                    <Select value={formData.regimeFiscal || ''} onValueChange={v => handleUpdate('regimeFiscal', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="REGIME_REEL">Régime du Réel</SelectItem><SelectItem value="IFU">Impôt Forfaitaire Unique (IFU)</SelectItem></SelectContent></Select>
                </div>
                <div className="flex items-center space-x-2 pt-8">
                    <Switch id="tva-switch" checked={formData.assujettissementTva || false} onCheckedChange={c => handleUpdate('assujettissementTva', c)} />
                    <Label htmlFor="tva-switch">Assujetti à la TVA</Label>
                </div>
                 <div className="space-y-2">
                    <Label>Direction des Impôts de Wilaya</Label>
                    <Input value={formData.diw || ''} onChange={e => handleUpdate('diw', e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label>Inspection / Recette des Impôts</Label>
                    <Input value={formData.inspection || ''} onChange={e => handleUpdate('inspection', e.target.value)} />
                </div>
            </CardContent>
          </Card>
        </TabsContent>}

        {canManageSettings && <TabsContent value='expert' className='mt-6 space-y-6'>
            <Card>
                <CardHeader><CardTitle>Modules et Secteurs d'Activité</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Secteur Principal</Label>
                        <Select value={formData.secteurActivite || ''} onValueChange={v => handleUpdate('secteurActivite', v)}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="COMMERCE">Commerce</SelectItem>
                                <SelectItem value="INDUSTRIE">Industrie</SelectItem>
                                <SelectItem value="BTP">BTP</SelectItem>
                                <SelectItem value="SERVICES">Services</SelectItem>
                                <SelectItem value="PRO_LIBERALE">Profession Libérale</SelectItem>
                                <SelectItem value="TRANSPORT">Transport</SelectItem>
                                <SelectItem value="SANTE">Santé</SelectItem>
                                <SelectItem value="ASSURANCE">Assurance</SelectItem>
                                <SelectItem value="PUBLIC">Entreprise Publique</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>}

        {canManageSettings && <TabsContent value='social' className='mt-6 space-y-6'>
            <Card>
                <CardHeader><CardTitle>Paramètres Sociaux (RH)</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>N° CNAS</Label>
                        <Input value={formData.cnas || ''} onChange={e => handleUpdate('cnas', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>N° CASNOS</Label>
                        <Input value={formData.casnos || ''} onChange={e => handleUpdate('casnos', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Agence CNAS</Label>
                        <Input value={formData.agenceCnas || ''} onChange={e => handleUpdate('agenceCnas', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Effectif</Label>
                        <Input type="number" value={formData.effectif || 0} onChange={e => handleUpdate('effectif', parseInt(e.target.value))}/>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>}

        <TabsContent value='subscription' className='mt-6'>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Gérez votre abonnement</h2>
            <p className="text-muted-foreground mt-2">Passez au plan supérieur pour débloquer de nouvelles fonctionnalités.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {PLANS.map((plan) => (
              <Card key={plan.id} className={cn('flex flex-col rounded-2xl shadow-lg', { 'ring-2 ring-primary': currentPlanId === plan.id })}>
                {currentPlanId === plan.id && <div className="py-1 px-4 bg-primary text-primary-foreground text-xs font-semibold rounded-t-2xl text-center">Plan Actuel</div>}
                <CardHeader className="text-center">
                  <CardTitle className={`text-2xl font-black ${plan.id === 'PRO' || plan.id === 'CABINET' ? 'text-primary' : ''}`}>{plan.name}</CardTitle>
                  <p className="font-bold text-3xl">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mois</span></p>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {plan.categories.flatMap(c => c.features).map(feature => (
                      <li key={feature.name} className="flex items-start">
                        <FeatureIcon included={feature.included} />
                        <span className="ml-3 text-sm text-start">{feature.name} {feature.detail && `(${feature.detail})`}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full font-bold rounded-lg" disabled={submittingId !== null || currentPlanId === plan.id} onClick={() => handlePlanChangeRequest(plan.id)}>
                    {submittingId === plan.id ? <><Loader2 className='mr-2 h-4 w-4 animate-spin' /> Envoi...</> : currentPlanId === plan.id ? 'Plan Actuel' : 'Choisir ce Plan'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          <div className="mt-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold tracking-tight flex items-center justify-center gap-2"><Crown className="h-6 w-6 text-yellow-500"/> Modules Complémentaires</h3>
              <p className="text-muted-foreground mt-2">Améliorez votre productivité avec nos modules spécialisés.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PREMIUM_ADDONS.map(addon => (
                <Card key={addon.id} className='flex items-center justify-between p-4 rounded-xl shadow-md'>
                  <div>
                    <p className='font-semibold flex items-center gap-2'><Zap className="h-4 w-4 text-primary"/>{addon.name}</p>
                    <p className='text-sm text-muted-foreground mt-1'>${addon.description}</p>
                  </div>
                  <div className="text-right">
                     <p className='text-lg font-bold text-primary'>${addon.price} DA</p>
                     <p className='text-xs text-muted-foreground'>/mois</p>
                     <Button variant='outline' className="mt-2" disabled={submittingId !== null} onClick={() => handleAddonRequest(addon)}>
                       {submittingId === addon.id ? <><Loader2 className='mr-2 h-4 w-4 animate-spin' /> Envoi...</> : <><PlusCircle className='mr-2 h-4 w-4' /> Demander</>}
                     </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
