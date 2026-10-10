"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Search,
  Mail,
  Bell,
  Plus,
  Ruler,
  Hammer,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import { Kicker, SectionHeading } from "@/components/ui/section-heading";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function Swatch({ name, varName }: { name: string; varName: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-16 w-full rounded-md border border-border-subtle"
        style={{ background: `var(${varName})` }}
      />
      <div className="text-xs">
        <p className="font-medium text-text-primary">{name}</p>
        <p className="text-text-muted">{varName}</p>
      </div>
    </div>
  );
}

function DesignSystemNav() {
  const sections = [
    "Couleurs",
    "Typographie",
    "Espacement",
    "Boutons",
    "Champs",
    "Badges",
    "Cartes",
    "Tableaux",
    "Modales",
    "Navigation",
    "Notifications",
  ];
  return (
    <nav className="sticky top-6 hidden w-48 shrink-0 flex-col gap-1 lg:flex">
      {sections.map((s) => (
        <a
          key={s}
          href={`#${s.toLowerCase()}`}
          className="rounded-md px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-stone-100 hover:text-text-primary"
        >
          {s}
        </a>
      ))}
    </nav>
  );
}

export default function DesignSystemPage() {
  const [page, setPage] = React.useState(3);
  const [rows, setRows] = React.useState({ a: false, b: true, c: false });

  return (
    <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
      <Kicker>Design system</Kicker>
      <h1 className="mt-4 font-display text-4xl font-medium text-text-primary">
        ART Cuisine — Fondations
      </h1>
      <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-text-secondary">
        Le langage visuel commun à toute la plateforme : couleurs, typographie,
        espacement et composants réutilisables. Tout ce qui sera construit par
        la suite s&rsquo;appuie sur ces fondations.
      </p>

      <div className="mt-12 flex gap-12">
        <DesignSystemNav />

        <div className="flex min-w-0 flex-1 flex-col gap-20">
          {/* Colors */}
          <section id="couleurs">
            <SectionHeading kicker="Palette" title="Couleurs" className="mb-8" />
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
              <Swatch name="Stone 50" varName="--stone-50" />
              <Swatch name="Stone 150" varName="--stone-150" />
              <Swatch name="Stone 300" varName="--stone-300" />
              <Swatch name="Stone 500" varName="--stone-500" />
              <Swatch name="Stone 700" varName="--stone-700" />
              <Swatch name="Stone 900" varName="--stone-900" />
              <Swatch name="Ink 950" varName="--ink-950" />
              <Swatch name="Ink 900" varName="--ink-900" />
              <Swatch name="Ink 800" varName="--ink-800" />
              <Swatch name="Gold 300" varName="--gold-300" />
              <Swatch name="Gold 500" varName="--gold-500" />
              <Swatch name="Gold 600" varName="--gold-600" />
            </div>
            <p className="mt-5 text-sm text-text-muted">
              Stone-grey domine les surfaces et le texte, le noir structure les
              sections d&rsquo;accent (footer, bandeaux CTA, sidebar), l&rsquo;or reste
              un accent — jamais un aplat.
            </p>
          </section>

          <Separator />

          {/* Typography */}
          <section id="typographie">
            <SectionHeading kicker="Système typographique" title="Typographie" className="mb-8" />
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Display / Playfair Display</p>
                <p className="mt-2 font-display text-5xl text-text-primary">L&rsquo;art du détail</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">H2</p>
                <p className="mt-2 font-display text-3xl font-medium text-text-primary">Une expertise de A à Z</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">H3</p>
                <p className="mt-2 font-display text-xl font-medium text-text-primary">Nos réalisations</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Corps de texte / Inter</p>
                <p className="mt-2 max-w-lg text-[0.9375rem] leading-relaxed text-text-secondary">
                  Des cuisines pensées pour votre espace, votre style et votre
                  quotidien. Un design unique, une fabrication d&rsquo;exception.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Kicker</p>
                <Kicker className="mt-2">Cuisines sur mesure</Kicker>
              </div>
            </div>
          </section>

          <Separator />

          {/* Spacing */}
          <section id="espacement">
            <SectionHeading kicker="Rythme" title="Espacement" className="mb-8" />
            <div className="flex flex-col gap-3">
              {[2, 3, 4, 5, 6, 8, 10, 14].map((s) => (
                <div key={s} className="flex items-center gap-4">
                  <span className="w-14 text-xs text-text-muted">{s * 4}px</span>
                  <div className="h-3 rounded-sm bg-accent-soft" style={{ width: `${s * 16}px` }} />
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Buttons */}
          <section id="boutons">
            <SectionHeading kicker="Actions" title="Boutons" className="mb-8" />
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary">Primaire</Button>
              <Button variant="gold">Accent or</Button>
              <Button variant="outline">Contour</Button>
              <Button variant="ghost">Fantôme</Button>
              <Button variant="destructive">Supprimer</Button>
              <Button variant="link">Lien</Button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Button size="sm">Petit</Button>
              <Button size="md">Moyen</Button>
              <Button size="lg">Grand</Button>
              <Button size="icon" variant="outline"><Plus /></Button>
              <Button disabled>Désactivé</Button>
            </div>
          </section>

          <Separator />

          {/* Inputs */}
          <section id="champs">
            <SectionHeading kicker="Formulaires" title="Champs" className="mb-8" />
            <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input id="email" icon={<Mail />} placeholder="vous@exemple.com" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="search">Recherche</Label>
                <Input id="search" icon={<Search />} placeholder="Rechercher…" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Statut</Label>
                <Select defaultValue="cours">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cours">En cours</SelectItem>
                    <SelectItem value="devis">Devis envoyé</SelectItem>
                    <SelectItem value="gagne">Gagné</SelectItem>
                    <SelectItem value="perdu">Perdu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="tel">Téléphone</Label>
                <Input id="tel" placeholder="+213 5 55 12 34 56" />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Décrivez votre projet…" />
              </div>
              <div className="flex items-center gap-2.5 sm:col-span-2">
                <Checkbox id="terms" defaultChecked />
                <Label htmlFor="terms" className="normal-case tracking-normal text-text-secondary">
                  J&rsquo;accepte les conditions générales
                </Label>
              </div>
            </div>
          </section>

          <Separator />

          {/* Badges */}
          <section id="badges">
            <SectionHeading kicker="Statuts" title="Badges" className="mb-8" />
            <div className="flex flex-wrap gap-3">
              <Badge variant="neutral">Nouveau</Badge>
              <Badge variant="info">Rendez-vous</Badge>
              <Badge variant="warning">Devis</Badge>
              <Badge variant="gold" dot>Négociation</Badge>
              <Badge variant="success">Gagné</Badge>
              <Badge variant="danger">Perdu</Badge>
              <Badge variant="outline">Terminé</Badge>
            </div>
          </section>

          <Separator />

          {/* Cards + stat cards */}
          <section id="cartes">
            <SectionHeading kicker="Conteneurs" title="Cartes" className="mb-8" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Clients" value="124" trend={{ value: "+12%", direction: "up" }} helperText="vs mois dernier" />
              <StatCard label="Devis refusés" value="12" trend={{ value: "-5%", direction: "down" }} helperText="vs mois dernier" />
              <Card className="sm:col-span-2 lg:col-span-2">
                <CardHeader>
                  <CardTitle>Cuisine sur mesure</CardTitle>
                  <CardDescription>Résumé de la fiche projet et de ses actions.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm text-text-secondary">
                  <div className="flex justify-between"><span>Client</span><span className="font-medium text-text-primary">Fatima Zahra</span></div>
                  <div className="flex justify-between"><span>Statut</span><Badge variant="info">Envoyé</Badge></div>
                  <div className="flex justify-between"><span>Montant TTC</span><span className="font-medium text-text-primary">980 000 DA</span></div>
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="outline">Voir le devis</Button>
                  <Button size="sm" variant="ghost">Dupliquer</Button>
                </CardFooter>
              </Card>
            </div>
          </section>

          <Separator />

          {/* Tables */}
          <section id="tableaux">
            <SectionHeading kicker="Données" title="Tableaux" className="mb-8" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox /></TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Projets</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { id: "a", name: "Mohamed Amine", ville: "Alger", statut: "En cours" as const },
                  { id: "b", name: "Fatima Zahra", ville: "Oran", statut: "Lead" as const },
                  { id: "c", name: "Ahmed Benali", ville: "Constantine", statut: "Gagné" as const },
                ].map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={rows[r.id as keyof typeof rows]}
                        onCheckedChange={(v) => setRows((s) => ({ ...s, [r.id]: Boolean(v) }))}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7"><AvatarFallback className="text-[0.625rem]">{r.name.split(" ").map((w) => w[0]).join("")}</AvatarFallback></Avatar>
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-text-secondary">{r.ville}</TableCell>
                    <TableCell>
                      <Badge variant={r.statut === "Gagné" ? "success" : r.statut === "Lead" ? "neutral" : "info"}>
                        {r.statut}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">2</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-text-muted">Affichage de 21 à 30 sur 124 résultats</p>
              <Pagination page={page} pageCount={16} onPageChange={setPage} />
            </div>
          </section>

          <Separator />

          {/* Modals, tabs, tooltip, dropdown */}
          <section id="modales">
            <SectionHeading kicker="Overlays" title="Modales, onglets & menus" className="mb-8" />

            <div className="flex flex-wrap items-center gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="primary">Ouvrir une modale</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convertir en projet</DialogTitle>
                    <DialogDescription>
                      Ce devis sera transformé en projet actif et assigné à
                      l&rsquo;équipe de production.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="px-7 py-6 text-sm text-text-secondary">
                    Devis <span className="font-medium text-text-primary">DEV-2025-040</span> —
                    Fatima Zahra · 980 000 DA
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">Annuler</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button variant="gold" onClick={() => toast.success("Devis converti en projet")}>
                        Confirmer
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon"><Bell /></Button>
                </TooltipTrigger>
                <TooltipContent>Notifications</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Actions ▾</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Gérer</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Modifier</DropdownMenuItem>
                  <DropdownMenuItem>Dupliquer</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive>Supprimer</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Tabs defaultValue="apercu" className="mt-9">
              <TabsList>
                <TabsTrigger value="apercu">Aperçu</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="historique">Historique</TabsTrigger>
              </TabsList>
              <TabsContent value="apercu" className="text-sm text-text-secondary">
                Synthèse du dossier client, projets liés et prochain rendez-vous.
              </TabsContent>
              <TabsContent value="documents" className="text-sm text-text-secondary">
                Devis, plans et bons de commande associés au dossier.
              </TabsContent>
              <TabsContent value="historique" className="text-sm text-text-secondary">
                Journal des échanges et des changements de statut.
              </TabsContent>
            </Tabs>
          </section>

          <Separator />

          {/* Navigation preview */}
          <section id="navigation">
            <SectionHeading kicker="Structure" title="Navigation & sidebar" className="mb-8" />
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="overflow-hidden p-0">
                <div className="bg-ink-950 px-5 py-4 text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Barre publique
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="font-display text-sm tracking-widest">ART CUISINE</span>
                  <div className="hidden gap-4 text-xs uppercase tracking-wider text-text-muted sm:flex">
                    <span>Accueil</span><span>Cuisines</span><span>Contact</span>
                  </div>
                  <Button size="sm" variant="outline">Devis</Button>
                </div>
              </Card>
              <Card className="overflow-hidden bg-ink-950 p-0 text-text-inverse">
                <div className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Sidebar tableau de bord
                </div>
                <div className="flex flex-col gap-1 px-3 pb-4">
                  {["Tableau de bord", "Clients", "Leads", "Devis"].map((l, i) => (
                    <div
                      key={l}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm",
                        i === 0 ? "bg-white/10 text-white" : "text-stone-400",
                      )}
                    >
                      {l}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>

          <Separator />

          {/* Notifications */}
          <section id="notifications" className="pb-4">
            <SectionHeading kicker="Retour utilisateur" title="Notifications" className="mb-8" />
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" onClick={() => toast("Nouveau lead reçu depuis Instagram")}>
                Notification neutre
              </Button>
              <Button variant="outline" onClick={() => toast.success("Devis DEV-2025-040 accepté")}>
                Succès
              </Button>
              <Button variant="outline" onClick={() => toast.error("Échec de l'envoi du devis")}>
                Erreur
              </Button>
            </div>
            <p className="mt-4 text-sm text-text-muted">
              Icônes de repère : <Ruler className="inline h-4 w-4 align-[-2px]" />
              {" "}Design ·{" "}
              <Hammer className="inline h-4 w-4 align-[-2px]" /> Fabrication ·{" "}
              <ShieldCheck className="inline h-4 w-4 align-[-2px]" /> Garantie
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
