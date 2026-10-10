export type ProductStatus = "publie" | "masque";

export type OrderStatus =
  | "nouvelle"
  | "preparation"
  | "expediee"
  | "livree"
  | "annulee";

export type PaymentMethod = "paiement_livraison" | "carte";

export type DeliveryType = "domicile" | "stopdesk";

export interface Category {
  id: string;
  nom: string;
  slug: string;
  icone: string;
  image?: string;
}

export interface Product {
  id: string;
  nom: string;
  slug: string;
  categorieId: string;
  description: string;
  prix: number;
  prixPromo?: number | null;
  stock: number;
  tailles: string[];
  couleurs: string[];
  images: string[];
  statut: ProductStatus;
  nouveau: boolean;
  note: number;
  avis: number;
  creeLe: string;
}

export interface OrderItem {
  productId: string;
  nom: string;
  prix: number;
  quantite: number;
  taille?: string;
  couleur?: string;
}

export interface Order {
  id: string;
  numero: string;
  clientNom: string;
  clientTelephone: string;
  clientEmail?: string;
  adresse: string;
  wilaya: string;
  typeLivraison: DeliveryType;
  fraisLivraison: number;
  articles: OrderItem[];
  montant: number;
  methodePaiement: PaymentMethod;
  statut: OrderStatus;
  creeLe: string;
  livraison?: {
    transporteur?: string;
    numeroSuivi?: string;
    dateEstimee?: string;
    notes?: string;
  };
}

export interface Customer {
  id: string;
  nom: string;
  email?: string;
  telephone: string;
  wilaya: string;
  commandes: number;
  totalDepense: number;
  creeLe: string;
}

export interface Promotion {
  id: string;
  titre: string;
  description: string;
  pourcentage: number;
  actif: boolean;
  dateDebut: string;
  dateFin: string;
}

export interface Database {
  categories: Category[];
  products: Product[];
  orders: Order[];
  customers: Customer[];
  promotions: Promotion[];
}
