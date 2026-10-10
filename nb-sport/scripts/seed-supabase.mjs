// Peuple le projet Supabase de NB SPORT avec les données de démonstration.
// Usage: node scripts/seed-supabase.mjs   (exécuté depuis le dossier nb-sport, avec .env.local rempli)

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // pas de .env.local, on utilise les variables déjà présentes dans l'environnement
  }
}

loadEnvLocal();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const now = Date.now();
const daysAgo = (n) => new Date(now - n * 86400000).toISOString();

const categories = [
  { id: "cat-chaussures", nom: "Chaussures", slug: "chaussures", icone: "Footprints" },
  { id: "cat-vetements", nom: "Vêtements", slug: "vetements", icone: "Shirt" },
  { id: "cat-musculation", nom: "Musculation", slug: "musculation", icone: "Dumbbell" },
  { id: "cat-football", nom: "Football", slug: "football", icone: "Volleyball" },
  { id: "cat-accessoires", nom: "Accessoires", slug: "accessoires", icone: "Watch" },
  { id: "cat-sacs", nom: "Sacs", slug: "sacs", icone: "Backpack" },
  { id: "cat-running", nom: "Running", slug: "running", icone: "Zap" },
  { id: "cat-fitness", nom: "Fitness", slug: "fitness", icone: "HeartPulse" },
];

const products = [
  { id: "p1", nom: "Chaussures Running Pro Zoom", slug: "chaussures-running-pro-zoom", categorie_id: "cat-chaussures", description: "Chaussures de running conçues pour l'amorti et la vitesse. Semelle réactive, tige respirante et maintien optimal pour vos entraînements intensifs.", prix: 12900, prix_promo: 9900, stock: 24, tailles: ["40", "41", "42", "43", "44"], couleurs: ["Noir/Vert", "Noir/Blanc"], images: ["shoe-1"], statut: "publie", nouveau: true, note: 4.8, avis: 132, cree_le: daysAgo(3) },
  { id: "p2", nom: "Survêtement Performance Tracksuit", slug: "survetement-performance-tracksuit", categorie_id: "cat-vetements", description: "Ensemble survêtement technique, tissu stretch et respirant, idéal pour l'entraînement comme pour la ville.", prix: 9500, prix_promo: 7500, stock: 40, tailles: ["S", "M", "L", "XL"], couleurs: ["Noir", "Gris"], images: ["jacket-1"], statut: "publie", nouveau: true, note: 4.6, avis: 87, cree_le: daysAgo(5) },
  { id: "p3", nom: "Haltères Fitness Duo 2x5kg", slug: "halteres-fitness-duo", categorie_id: "cat-musculation", description: "Paire d'haltères en fonte revêtue, prise antidérapante, parfaits pour la musculation à domicile.", prix: 4800, prix_promo: 3800, stock: 60, tailles: [], couleurs: ["Noir/Vert"], images: ["dumbbell-1"], statut: "publie", nouveau: false, note: 4.9, avis: 54, cree_le: daysAgo(20) },
  { id: "p4", nom: "Ballon de Football Match", slug: "ballon-football-match", categorie_id: "cat-football", description: "Ballon officiel taille 5, revêtement thermocollé pour un vol stable et précis.", prix: 5200, prix_promo: 4200, stock: 80, tailles: [], couleurs: ["Blanc/Noir"], images: ["ball-1"], statut: "publie", nouveau: false, note: 4.7, avis: 201, cree_le: daysAgo(40) },
  { id: "p5", nom: "Sac à Dos Sport Backpack", slug: "sac-a-dos-sport-backpack", categorie_id: "cat-sacs", description: "Sac à dos spacieux avec compartiment chaussures dédié, tissu résistant à l'eau.", prix: 6900, prix_promo: 5900, stock: 35, tailles: [], couleurs: ["Noir"], images: ["backpack-1"], statut: "publie", nouveau: true, note: 4.5, avis: 41, cree_le: daysAgo(2) },
  { id: "p6", nom: "Casquette NB Sport", slug: "casquette-nb-sport", categorie_id: "cat-accessoires", description: "Casquette ajustable, broderie NB Sport, protection solaire légère.", prix: 2500, prix_promo: null, stock: 90, tailles: ["Unique"], couleurs: ["Noir", "Vert"], images: ["cap-1"], statut: "publie", nouveau: false, note: 4.3, avis: 29, cree_le: daysAgo(60) },
  { id: "p7", nom: "Veste Coupe-Vent Training", slug: "veste-coupe-vent-training", categorie_id: "cat-vetements", description: "Veste légère coupe-vent, idéale pour les séances en extérieur par temps frais.", prix: 8900, prix_promo: null, stock: 22, tailles: ["S", "M", "L", "XL", "XXL"], couleurs: ["Noir", "Marine"], images: ["jacket-2"], statut: "publie", nouveau: true, note: 4.4, avis: 18, cree_le: daysAgo(1) },
  { id: "p8", nom: "Chaussures Training Flex", slug: "chaussures-training-flex", categorie_id: "cat-chaussures", description: "Chaussures polyvalentes pour la salle, stabilité renforcée et grip optimal.", prix: 11200, prix_promo: 8900, stock: 15, tailles: ["39", "40", "41", "42", "43", "44", "45"], couleurs: ["Noir/Vert"], images: ["shoe-2"], statut: "publie", nouveau: false, note: 4.7, avis: 76, cree_le: daysAgo(15) },
  { id: "p9", nom: "Tapis de Fitness Premium", slug: "tapis-fitness-premium", categorie_id: "cat-fitness", description: "Tapis antidérapant épais 10mm, confortable pour le yoga, le stretching et la musculation au sol.", prix: 4200, prix_promo: 3200, stock: 50, tailles: [], couleurs: ["Noir"], images: ["mat-1"], statut: "publie", nouveau: false, note: 4.6, avis: 63, cree_le: daysAgo(30) },
  { id: "p10", nom: "Montre Connectée Sport", slug: "montre-connectee-sport", categorie_id: "cat-accessoires", description: "Suivi cardio, GPS intégré et autonomie 10 jours pour accompagner tous vos entraînements.", prix: 15900, prix_promo: 12900, stock: 12, tailles: [], couleurs: ["Noir", "Vert"], images: ["watch-1"], statut: "publie", nouveau: true, note: 4.9, avis: 95, cree_le: daysAgo(4) },
  { id: "p11", nom: "Short de Running Léger", slug: "short-running-leger", categorie_id: "cat-running", description: "Short ultra-léger avec poche zippée, séchage rapide pour vos sorties running.", prix: 3500, prix_promo: null, stock: 45, tailles: ["S", "M", "L", "XL"], couleurs: ["Noir", "Gris"], images: ["shorts-1"], statut: "publie", nouveau: false, note: 4.2, avis: 22, cree_le: daysAgo(25) },
  { id: "p12", nom: "Corde à Sauter Vitesse", slug: "corde-a-sauter-vitesse", categorie_id: "cat-fitness", description: "Câble en acier ajustable, roulement à billes pour un entraînement cardio intensif.", prix: 2200, prix_promo: 1800, stock: 70, tailles: [], couleurs: ["Noir/Vert"], images: ["rope-1"], statut: "publie", nouveau: false, note: 4.5, avis: 38, cree_le: daysAgo(10) },
];

const orders = [
  { id: "o1", numero: "NB-1024", client_nom: "Mohamed Ali", client_telephone: "0551 23 45 67", adresse: "Cité El Badr, Bloc 4", wilaya: "Alger", articles: [{ productId: "p1", nom: "Chaussures Running Pro Zoom", prix: 9900, quantite: 1, taille: "42" }], montant: 9900, methode_paiement: "paiement_livraison", statut: "preparation", cree_le: daysAgo(1) },
  { id: "o2", numero: "NB-1023", client_nom: "Sara Bouaziz", client_telephone: "0661 98 76 54", adresse: "Rue des Frères Bouadou", wilaya: "Oran", articles: [{ productId: "p2", nom: "Survêtement Performance Tracksuit", prix: 7500, quantite: 1, taille: "M" }], montant: 7500, methode_paiement: "paiement_livraison", statut: "expediee", cree_le: daysAgo(2), livraison: { transporteur: "Yalidine", numeroSuivi: "YAL-88421", dateEstimee: daysAgo(-1) } },
  { id: "o3", numero: "NB-1022", client_nom: "Yacine Khelif", client_telephone: "0770 11 22 33", adresse: "Cité 500 Logts", wilaya: "Constantine", articles: [{ productId: "p4", nom: "Ballon de Football Match", prix: 4200, quantite: 2 }], montant: 8400, methode_paiement: "paiement_livraison", statut: "livree", cree_le: daysAgo(6), livraison: { transporteur: "ZR Express", numeroSuivi: "ZR-55210" } },
  { id: "o4", numero: "NB-1021", client_nom: "Imane Cherif", client_telephone: "0540 55 66 77", adresse: "Haouch Tria", wilaya: "Blida", articles: [{ productId: "p5", nom: "Sac à Dos Sport Backpack", prix: 5900, quantite: 1 }], montant: 5900, methode_paiement: "paiement_livraison", statut: "nouvelle", cree_le: daysAgo(0) },
  { id: "o5", numero: "NB-1020", client_nom: "Amine Djaballah", client_telephone: "0555 44 33 22", adresse: "Bab Ezzouar", wilaya: "Alger", articles: [{ productId: "p10", nom: "Montre Connectée Sport", prix: 12900, quantite: 1 }], montant: 12900, methode_paiement: "carte", statut: "annulee", cree_le: daysAgo(8) },
  { id: "o6", numero: "NB-1019", client_nom: "Lina Meziane", client_telephone: "0661 23 11 09", adresse: "Hydra", wilaya: "Alger", articles: [{ productId: "p8", nom: "Chaussures Training Flex", prix: 8900, quantite: 1, taille: "41" }, { productId: "p9", nom: "Tapis de Fitness Premium", prix: 3200, quantite: 1 }], montant: 12100, methode_paiement: "paiement_livraison", statut: "livree", cree_le: daysAgo(12) },
];

const customers = [
  { id: "c1", nom: "Mohamed Ali", telephone: "0551 23 45 67", wilaya: "Alger", commandes: 3, total_depense: 32400, cree_le: daysAgo(90) },
  { id: "c2", nom: "Sara Bouaziz", telephone: "0661 98 76 54", wilaya: "Oran", commandes: 1, total_depense: 7500, cree_le: daysAgo(40) },
  { id: "c3", nom: "Yacine Khelif", telephone: "0770 11 22 33", wilaya: "Constantine", commandes: 2, total_depense: 13200, cree_le: daysAgo(70) },
  { id: "c4", nom: "Imane Cherif", telephone: "0540 55 66 77", wilaya: "Blida", commandes: 1, total_depense: 5900, cree_le: daysAgo(5) },
  { id: "c5", nom: "Lina Meziane", telephone: "0661 23 11 09", wilaya: "Alger", commandes: 4, total_depense: 48200, cree_le: daysAgo(120) },
];

const promotions = [
  { id: "pr1", titre: "Offres de rentrée sportive", description: "Jusqu'à -50% sur une sélection de chaussures et vêtements techniques.", pourcentage: 50, actif: true, date_debut: daysAgo(5), date_fin: daysAgo(-10) },
  { id: "pr2", titre: "Semaine Musculation", description: "-30% sur tous les équipements de musculation et fitness.", pourcentage: 30, actif: true, date_debut: daysAgo(2), date_fin: daysAgo(-5) },
];

async function upsert(table, rows) {
  const { error } = await supabase.from(table).upsert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`✔ ${table}: ${rows.length} lignes`);
}

async function main() {
  await upsert("categories", categories);
  await upsert("products", products);
  await upsert("orders", orders);
  await upsert("customers", customers);
  await upsert("promotions", promotions);
  console.log("\nSeed terminé avec succès.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
