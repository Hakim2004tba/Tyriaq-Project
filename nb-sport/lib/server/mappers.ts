import type { Category, Customer, Order, Product, Promotion } from "@/lib/types";

export function rowToCategory(row: any): Category {
  return { id: row.id, nom: row.nom, slug: row.slug, icone: row.icone, image: row.image ?? undefined };
}

export function rowToProduct(row: any): Product {
  return {
    id: row.id,
    nom: row.nom,
    slug: row.slug,
    categorieId: row.categorie_id,
    description: row.description,
    prix: Number(row.prix),
    prixPromo: row.prix_promo === null ? null : Number(row.prix_promo),
    stock: row.stock,
    tailles: row.tailles ?? [],
    couleurs: row.couleurs ?? [],
    images: row.images ?? [],
    statut: row.statut,
    nouveau: row.nouveau,
    note: Number(row.note),
    avis: row.avis,
    creeLe: row.cree_le,
  };
}

export function productToRow(p: Partial<Product>) {
  const row: Record<string, unknown> = {};
  if (p.id !== undefined) row.id = p.id;
  if (p.nom !== undefined) row.nom = p.nom;
  if (p.slug !== undefined) row.slug = p.slug;
  if (p.categorieId !== undefined) row.categorie_id = p.categorieId;
  if (p.description !== undefined) row.description = p.description;
  if (p.prix !== undefined) row.prix = p.prix;
  if (p.prixPromo !== undefined) row.prix_promo = p.prixPromo;
  if (p.stock !== undefined) row.stock = p.stock;
  if (p.tailles !== undefined) row.tailles = p.tailles;
  if (p.couleurs !== undefined) row.couleurs = p.couleurs;
  if (p.images !== undefined) row.images = p.images;
  if (p.statut !== undefined) row.statut = p.statut;
  if (p.nouveau !== undefined) row.nouveau = p.nouveau;
  if (p.creeLe !== undefined) row.cree_le = p.creeLe;
  return row;
}

export function rowToOrder(row: any): Order {
  return {
    id: row.id,
    numero: row.numero,
    clientNom: row.client_nom,
    clientTelephone: row.client_telephone,
    clientEmail: row.client_email ?? undefined,
    adresse: row.adresse,
    wilaya: row.wilaya,
    typeLivraison: row.type_livraison ?? "domicile",
    fraisLivraison: Number(row.frais_livraison ?? 0),
    articles: row.articles ?? [],
    montant: Number(row.montant),
    methodePaiement: row.methode_paiement,
    statut: row.statut,
    creeLe: row.cree_le,
    livraison: row.livraison ?? undefined,
  };
}

export function rowToCustomer(row: any): Customer {
  return {
    id: row.id,
    nom: row.nom,
    email: row.email ?? undefined,
    telephone: row.telephone,
    wilaya: row.wilaya,
    commandes: row.commandes,
    totalDepense: Number(row.total_depense),
    creeLe: row.cree_le,
  };
}

export function rowToPromotion(row: any): Promotion {
  return {
    id: row.id,
    titre: row.titre,
    description: row.description,
    pourcentage: row.pourcentage,
    actif: row.actif,
    dateDebut: row.date_debut,
    dateFin: row.date_fin,
  };
}
