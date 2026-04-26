"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, where, limit, doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Search, Mail, Phone, Building2, MapPin, Loader2, Filter, UserCheck, ShieldCheck, Landmark, Edit3, Fingerprint } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import { WILAYAS } from "@/lib/wilaya-data"
import { cn } from "@/lib/utils"

export default function ContactsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const tenantIdFromUrl = searchParams.get('tenantId')
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeType, setActiveType] = React.useState("ALL")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [editingContactId, setEditingContactId] = React.useState<string | null>(null)
  
  const initialContactState = {
    name: "",
    type: "Client",
    nif: "",
    email: "",
    phone: "",
    address: "",
    wilaya: "16"
  }

  const [contactForm, setContactForm] = React.useState(initialContactState)

  React.useEffect(() => { setMounted(true) }, [])

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null));
  }, [db, user?.uid]);
  const { data: tenants } = useCollection(tenantsQuery);
  
  const currentTenant = React.useMemo(() => {
    if (!tenants) return null;
    if (tenantIdFromUrl) return tenants.find(t => t.id === tenantIdFromUrl) || tenants[0];
    return tenants[0];
  }, [tenants, tenantIdFromUrl]);

  const contactsQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "clients");
  }, [db, currentTenant?.id]);
  const { data: contacts, isLoading } = useCollection(contactsQuery);

  const handleSaveContact = async () => {
    if (!db || !currentTenant || !contactForm.name) return;
    setIsSaving(true);

    try {
      if (editingContactId) {
        const contactRef = doc(db, "tenants", currentTenant.id, "clients", editingContactId);
        await updateDocumentNonBlocking(contactRef, {
          ...contactForm,
          updatedAt: new Date().toISOString()
        });
        toast({ title: "Tiers mis à jour", description: `Les informations de ${contactForm.name} ont été modifiées.` });
      } else {
        await addDocumentNonBlocking(collection(db, "tenants", currentTenant.id, "clients"), {
          ...contactForm,
          tenantId: currentTenant.id,
          createdAt: new Date().toISOString()
        });
        toast({ title: "Tiers enregistré", description: `${contactForm.name} a été ajouté à l'annuaire.` });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer les modifications." });
    } finally {
      setIsSaving(false);
    }
  }

  const handleEditClick = (contact: any) => {
    setEditingContactId(contact.id);
    setContactForm({
      name: contact.name || "",
      type: contact.type || "Client",
      nif: contact.nif || "",
      email: contact.email || "",
      phone: contact.phone || "",
      address: contact.address || "",
      wilaya: contact.wilaya || "16"
    });
    setIsDialogOpen(true);
  }

  const resetForm = () => {
    setEditingContactId(null);
    setContactForm(initialContactState);
  }

  const filteredContacts = React.useMemo(() => {
    if (!contacts) return [];
    return contacts.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.nif?.includes(searchTerm);
      const matchType = activeType === "ALL" || c.type?.toUpperCase() === activeType;
      return matchSearch && matchType;
    });
  }, [contacts, searchTerm, activeType]);

  const stats = React.useMemo(() => {
    if (!contacts) return { total: 0, clients: 0, suppliers: 0 };
    return {
      total: contacts.length,
      clients: contacts.filter(c => c.type === "Client").length,
      suppliers: contacts.filter(c => c.type === "Fournisseur").length
    };
  }, [contacts]);

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3 tracking-tighter uppercase">
            <Users className="text-accent h-8 w-8" /> Registre des Tiers
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest mt-1">Interopérabilité Jibayatic 2026 • Support NIF 20 Digits</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary shadow-xl rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest" disabled={!currentTenant} onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter un Partenaire
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                {editingContactId ? "Modifier le Partenaire" : "Nouveau Tiers"}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase text-slate-400">Identification légale conforme aux normes 2026</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Type de relation</Label>
                  <Select value={contactForm.type} onValueChange={(v) => setContactForm({...contactForm, type: v})}>
                    <SelectTrigger className="h-11 rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Client">Client (Compte 411)</SelectItem>
                      <SelectItem value="Fournisseur">Fournisseur (Compte 401)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Raison Sociale / Nom*</Label>
                  <Input 
                    value={contactForm.name} 
                    onChange={e => setContactForm({...contactForm, name: e.target.value})} 
                    className="h-11 rounded-xl"
                    placeholder="Ex: SARL Grans Travaux"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1 flex items-center justify-between">
                    NIF (20 chiffres recommandé)
                    {contactForm.nif.length > 0 && contactForm.nif.length < 15 && <span className="text-red-500 font-bold">MIN 15</span>}
                    {contactForm.nif.length >= 15 && <span className="text-emerald-500 font-bold">FORMAT OK</span>}
                  </Label>
                  <Input 
                    placeholder="00011601012345678901" 
                    value={contactForm.nif} 
                    onChange={e => setContactForm({...contactForm, nif: e.target.value})} 
                    className={cn("h-11 rounded-xl font-mono", contactForm.nif.length === 20 && "border-emerald-500 ring-emerald-500")}
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Wilaya du siège</Label>
                   <Select value={contactForm.wilaya} onValueChange={v => setContactForm({...contactForm, wilaya: v})}>
                      <SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {WILAYAS.map(w => <SelectItem key={w.code} value={w.code}>{w.code} - {w.name}</SelectItem>)}
                      </SelectContent>
                   </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Email professionnel</Label>
                  <Input type="email" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Téléphone</Label>
                  <Input value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} className="h-11 rounded-xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Adresse complète</Label>
                <Input value={contactForm.address} onChange={e => setContactForm({...contactForm, address: e.target.value})} className="h-11 rounded-xl" />
              </div>
            </div>
            <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 border-t">
              <Button onClick={handleSaveContact} disabled={isSaving} className="w-full h-12 text-lg shadow-xl bg-primary">
                {isSaving ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : null}
                {editingContactId ? "Mettre à jour la fiche légale" : "Créer le Partenaire"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Total Partenaires</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-black text-primary tracking-tighter">{stats.total} tiers</div></CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Clients Actifs</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-black text-emerald-600 tracking-tighter">{stats.clients}</div></CardContent>
        </Card>
        <Card className="border-none shadow-xl ring-1 ring-border bg-white border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Fournisseurs</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-black text-blue-600 tracking-tighter">{stats.suppliers}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ALL" onValueChange={setActiveType} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <TabsList className="bg-muted/50 p-1 rounded-2xl h-auto border shadow-inner">
            <TabsTrigger value="ALL" className="py-2.5 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Tous les tiers</TabsTrigger>
            <TabsTrigger value="CLIENT" className="py-2.5 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Clients</TabsTrigger>
            <TabsTrigger value="FOURNISSEUR" className="py-2.5 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Fournisseurs</TabsTrigger>
          </TabsList>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Recherche Nom ou NIF..." 
              className="pl-10 h-10 w-72 bg-white rounded-2xl border-slate-200 shadow-sm" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value={activeType} className="mt-0">
          <Card className="shadow-2xl border-none ring-1 ring-border overflow-hidden bg-white rounded-3xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="text-[10px] uppercase font-black border-b h-12">
                    <TableHead className="pl-8">Partenaire / NIF</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary opacity-20" /></TableCell></TableRow>
                  ) : filteredContacts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-32 text-muted-foreground italic text-xs uppercase font-black opacity-20">Aucun tiers trouvé.</TableCell></TableRow>
                  ) : (
                    filteredContacts.map((c) => (
                      <TableRow key={c.id} className="hover:bg-muted/5 group transition-colors h-20">
                        <TableCell className="pl-8">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-xs uppercase text-slate-900">{c.name}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={cn("text-[9px] font-mono font-bold", c.nif?.length === 20 ? "text-emerald-600" : "text-muted-foreground")}>
                                  NIF: {c.nif || 'NON RENSEIGNÉ'}
                                </span>
                                {c.nif?.length === 20 && <Badge className="bg-emerald-500 text-white text-[7px] h-3 px-1">2026 OK</Badge>}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.type === "Client" ? "default" : "secondary"} className="text-[8px] font-black uppercase h-5 tracking-widest">
                            {c.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {WILAYAS.find(w => w.code === c.wilaya)?.name || 'Alger'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-[10px] font-medium text-slate-500">
                            <span className="flex items-center gap-1.5"><Mail className="h-2.5 w-2.5 text-primary" /> {c.email || "N/A"}</span>
                            <span className="flex items-center gap-1.5"><Phone className="h-2.5 w-2.5 text-primary" /> {c.phone || "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[10px] font-black uppercase text-primary rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => handleEditClick(c)}
                          >
                            <Edit3 className="h-3 w-3 mr-1" /> Modifier
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="p-8 bg-slate-900 text-white rounded-3xl flex items-start gap-6 shadow-xl">
        <ShieldCheck className="h-10 w-10 text-accent shrink-0 mt-1" />
        <div className="text-xs leading-relaxed space-y-3">
          <p className="font-black text-accent uppercase tracking-[0.2em]">Norme NIF 2026 :</p>
          <p className="opacity-80">
            Conformément à la numérisation des échanges DGI/Douanes/Banques, le NIF passe à **20 chiffres**.
            Cette structure inclut désormais la nature de l'entité, le centre d'imposition (CDI/CPI) et une clé de contrôle.
            L'ERP ComptaFisc-DZ valide automatiquement la structure pour garantir vos télé-déclarations Jibayatic.
          </p>
        </div>
      </div>
    </div>
  )
}
