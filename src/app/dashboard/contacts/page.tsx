"use client"

import * as React from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query, where, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Search, Mail, Phone, Building2, MapPin, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

export default function ContactsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [newContact, setNewContact] = React.useState({
    name: "",
    type: "Client",
    nif: "",
    email: "",
    phone: "",
    address: ""
  })

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "tenants"), where(`members.${user.uid}`, "!=", null), limit(1));
  }, [db, user]);
  const { data: tenants } = useCollection(tenantsQuery);
  const currentTenant = tenants?.[0];

  const contactsQuery = useMemoFirebase(() => {
    if (!db || !currentTenant) return null;
    return collection(db, "tenants", currentTenant.id, "clients");
  }, [db, currentTenant]);
  const { data: contacts, isLoading } = useCollection(contactsQuery);

  const handleAddContact = async () => {
    if (!db || !currentTenant || !newContact.name) return;

    const contactData = {
      ...newContact,
      tenantId: currentTenant.id,
      createdAt: new Date().toISOString()
    };

    try {
      addDocumentNonBlocking(collection(db, "tenants", currentTenant.id, "clients"), contactData);
      toast({ title: "Tiers enregistré", description: `${newContact.name} a été ajouté à l'annuaire.` });
      setIsDialogOpen(false);
      setNewContact({ name: "", type: "Client", nif: "", email: "", phone: "", address: "" });
    } catch (e) {
      console.error(e);
    }
  }

  const filteredContacts = React.useMemo(() => {
    if (!contacts) return [];
    return contacts.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.nif?.includes(searchTerm)
    );
  }, [contacts, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Users className="h-8 w-8 text-accent" /> Gestion des Tiers
          </h1>
          <p className="text-muted-foreground text-sm">Annuaire centralisé des clients et fournisseurs de l'entité.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary shadow-lg"><Plus className="mr-2 h-4 w-4" /> Nouveau Tiers</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un client ou fournisseur</DialogTitle>
              <DialogDescription>Ces informations seront utilisées pour la facturation et les écritures comptables.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Type</Label>
                <Select value={newContact.type} onValueChange={(v) => setNewContact({...newContact, type: v})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Client">Client</SelectItem>
                    <SelectItem value="Fournisseur">Fournisseur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Raison Sociale</Label>
                <Input className="col-span-3" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">NIF</Label>
                <Input className="col-span-3" placeholder="15 chiffres" value={newContact.nif} onChange={e => setNewContact({...newContact, nif: e.target.value})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Email</Label>
                <Input className="col-span-3" type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddContact}>Enregistrer le tiers</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-t-4 border-t-primary">
        <CardHeader className="bg-muted/20 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Annuaire des Partenaires</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Chercher un nom ou NIF..." 
                className="pl-9 h-9 w-64 bg-white" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Raison Sociale / Partenaire</TableHead>
                <TableHead>NIF</TableHead>
                <TableHead>Coordonnées</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin inline mr-2" />Chargement...</TableCell></TableRow>
              ) : !filteredContacts.length ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Aucun tiers enregistré.</TableCell></TableRow>
              ) : (
                filteredContacts.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/10">
                    <TableCell>
                      <Badge variant={c.type === "Client" ? "default" : "secondary"}>
                        {c.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.nif || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-[10px]">
                        <span className="flex items-center gap-1"><Mail className="h-2 w-2" /> {c.email || "N/A"}</span>
                        <span className="flex items-center gap-1"><Phone className="h-2 w-2" /> {c.phone || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Éditer</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}