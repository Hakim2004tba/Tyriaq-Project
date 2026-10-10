import { supabaseAdmin } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { getWilayaRate } from "@/lib/data/delivery-rates";
import type { DeliveryType, Order, OrderStatus, Product, ProductStatus, Promotion } from "@/lib/types";
import {
  rowToCategory,
  rowToCustomer,
  rowToOrder,
  rowToProduct,
  rowToPromotion,
  productToRow,
} from "@/lib/server/mappers";

function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function getCategories() {
  const { data, error } = await supabaseAdmin().from("categories").select("*").order("nom");
  if (error) throw error;
  return data.map(rowToCategory);
}

export async function getProducts() {
  const { data, error } = await supabaseAdmin().from("products").select("*").order("cree_le", { ascending: false });
  if (error) throw error;
  return data.map(rowToProduct);
}

export async function getOrders() {
  const { data, error } = await supabaseAdmin().from("orders").select("*").order("cree_le", { ascending: false });
  if (error) throw error;
  return data.map(rowToOrder);
}

export async function getCustomers() {
  const { data, error } = await supabaseAdmin().from("customers").select("*").order("total_depense", { ascending: false });
  if (error) throw error;
  return data.map(rowToCustomer);
}

export async function getPromotions() {
  const { data, error } = await supabaseAdmin().from("promotions").select("*").order("date_debut", { ascending: false });
  if (error) throw error;
  return data.map(rowToPromotion);
}

export async function createProduct(input: Record<string, any>): Promise<Product> {
  const row = {
    id: genId("p"),
    nom: input.nom,
    slug: slugify(input.nom) || genId("produit"),
    categorie_id: input.categorieId,
    description: input.description ?? "",
    prix: Number(input.prix) || 0,
    prix_promo: input.prixPromo ? Number(input.prixPromo) : null,
    stock: Number(input.stock) || 0,
    tailles: input.tailles ?? [],
    couleurs: input.couleurs ?? [],
    images: input.images?.length ? input.images : ["placeholder"],
    statut: input.statut ?? "publie",
    nouveau: Boolean(input.nouveau),
    note: 0,
    avis: 0,
  };
  const { data, error } = await supabaseAdmin().from("products").insert(row).select().single();
  if (error) throw error;
  return rowToProduct(data);
}

export async function updateProduct(id: string, patch: Record<string, any>): Promise<Product | null> {
  const row = productToRow({
    ...patch,
    slug: patch.nom !== undefined ? slugify(patch.nom) : undefined,
    prixPromo: patch.prixPromo !== undefined ? (patch.prixPromo ? Number(patch.prixPromo) : null) : undefined,
    prix: patch.prix !== undefined ? Number(patch.prix) : undefined,
    stock: patch.stock !== undefined ? Number(patch.stock) : undefined,
  });
  const { data, error } = await supabaseAdmin().from("products").update(row).eq("id", id).select().single();
  if (error) throw error;
  return data ? rowToProduct(data) : null;
}

export async function deleteProduct(id: string) {
  const { error } = await supabaseAdmin().from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function createCategory(input: { nom: string; icone?: string; image?: string | null }) {
  const row = {
    id: genId("cat"),
    nom: input.nom,
    slug: slugify(input.nom),
    icone: input.icone ?? "Dumbbell",
    image: input.image ?? null,
  };
  const { data, error } = await supabaseAdmin().from("categories").insert(row).select().single();
  if (error) throw error;
  return rowToCategory(data);
}

export async function deleteCategory(id: string) {
  const { error } = await supabaseAdmin().from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function createOrder(input: Record<string, any>): Promise<Order> {
  const { count } = await supabaseAdmin().from("orders").select("id", { count: "exact", head: true });
  const numero = `NB-${1000 + (count ?? 0) + 1}`;

  const articles = input.articles ?? [];
  const sousTotal = articles.reduce((s: number, a: any) => s + Number(a.prix) * Number(a.quantite), 0);

  const rate = getWilayaRate(input.wilaya);
  const requestedType: DeliveryType = input.typeLivraison === "stopdesk" ? "stopdesk" : "domicile";
  const typeLivraison: DeliveryType = requestedType === "stopdesk" && rate?.stopdesk != null ? "stopdesk" : "domicile";
  const fraisLivraison = rate ? (typeLivraison === "stopdesk" ? rate.stopdesk! : rate.domicile) : 0;

  const row = {
    id: genId("o"),
    numero,
    client_nom: input.clientNom,
    client_telephone: input.clientTelephone,
    client_email: input.clientEmail ?? null,
    adresse: input.adresse,
    wilaya: input.wilaya,
    type_livraison: typeLivraison,
    frais_livraison: fraisLivraison,
    articles,
    montant: sousTotal + fraisLivraison,
    methode_paiement: input.methodePaiement ?? "paiement_livraison",
    statut: "nouvelle",
  };
  const { data, error } = await supabaseAdmin().from("orders").insert(row).select().single();
  if (error) throw error;
  return rowToOrder(data);
}

export async function updateOrder(
  id: string,
  patch: { statut?: OrderStatus; livraison?: Record<string, any> }
): Promise<Order | null> {
  const row: Record<string, unknown> = {};
  if (patch.statut !== undefined) row.statut = patch.statut;
  if (patch.livraison !== undefined) {
    const { data: existing } = await supabaseAdmin().from("orders").select("livraison").eq("id", id).single();
    row.livraison = { ...(existing?.livraison ?? {}), ...patch.livraison };
  }
  const { data, error } = await supabaseAdmin().from("orders").update(row).eq("id", id).select().single();
  if (error) throw error;
  return data ? rowToOrder(data) : null;
}

export async function createPromotion(input: Record<string, any>): Promise<Promotion> {
  const row = {
    id: genId("pr"),
    titre: input.titre,
    description: input.description ?? "",
    pourcentage: Number(input.pourcentage) || 0,
    actif: input.actif ?? true,
    date_debut: input.dateDebut ?? new Date().toISOString(),
    date_fin: input.dateFin ?? new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin().from("promotions").insert(row).select().single();
  if (error) throw error;
  return rowToPromotion(data);
}

export async function updatePromotion(id: string, patch: Record<string, any>) {
  const row: Record<string, unknown> = {};
  if (patch.titre !== undefined) row.titre = patch.titre;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.pourcentage !== undefined) row.pourcentage = patch.pourcentage;
  if (patch.actif !== undefined) row.actif = patch.actif;
  if (patch.dateDebut !== undefined) row.date_debut = patch.dateDebut;
  if (patch.dateFin !== undefined) row.date_fin = patch.dateFin;
  const { error } = await supabaseAdmin().from("promotions").update(row).eq("id", id);
  if (error) throw error;
}

export async function deletePromotion(id: string) {
  const { error } = await supabaseAdmin().from("promotions").delete().eq("id", id);
  if (error) throw error;
}

export type { ProductStatus };
