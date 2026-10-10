export interface WilayaRate {
  code: number;
  nom: string;
  domicile: number;
  stopdesk: number | null;
}

// Tarifs de livraison par wilaya (Domicile / Stopdesk), en DA.
// stopdesk: null = non disponible pour cette wilaya.
// Wilayas non desservies (absentes de la grille tarifaire) : Illizi, Tindouf,
// Bordj Badji Mokhtar, Djanet.
export const WILAYA_RATES: WilayaRate[] = [
  { code: 1, nom: "Adrar", domicile: 1400, stopdesk: 900 },
  { code: 2, nom: "Chlef", domicile: 750, stopdesk: 450 },
  { code: 3, nom: "Laghouat", domicile: 950, stopdesk: 600 },
  { code: 4, nom: "Oum El Bouaghi", domicile: 800, stopdesk: 450 },
  { code: 5, nom: "Batna", domicile: 800, stopdesk: 450 },
  { code: 6, nom: "Bejaia", domicile: 800, stopdesk: 450 },
  { code: 7, nom: "Biskra", domicile: 950, stopdesk: 600 },
  { code: 8, nom: "Bechar", domicile: 1100, stopdesk: 650 },
  { code: 9, nom: "Blida", domicile: 400, stopdesk: 300 },
  { code: 10, nom: "Bouira", domicile: 750, stopdesk: 450 },
  { code: 11, nom: "Tamanrasset", domicile: 1600, stopdesk: 1050 },
  { code: 12, nom: "Tebessa", domicile: 850, stopdesk: 450 },
  { code: 13, nom: "Tlemcen", domicile: 850, stopdesk: 500 },
  { code: 14, nom: "Tiaret", domicile: 800, stopdesk: 450 },
  { code: 15, nom: "Tizi Ouzou", domicile: 750, stopdesk: 450 },
  { code: 16, nom: "Alger", domicile: 500, stopdesk: 350 },
  { code: 17, nom: "Djelfa", domicile: 950, stopdesk: 600 },
  { code: 18, nom: "Jijel", domicile: 800, stopdesk: 450 },
  { code: 19, nom: "Setif", domicile: 750, stopdesk: 450 },
  { code: 20, nom: "Saida", domicile: 800, stopdesk: null },
  { code: 21, nom: "Skikda", domicile: 800, stopdesk: 450 },
  { code: 22, nom: "Sidi Bel Abbes", domicile: 800, stopdesk: null },
  { code: 23, nom: "Annaba", domicile: 800, stopdesk: 450 },
  { code: 24, nom: "Guelma", domicile: 800, stopdesk: 450 },
  { code: 25, nom: "Constantine", domicile: 800, stopdesk: 450 },
  { code: 26, nom: "Medea", domicile: 750, stopdesk: 450 },
  { code: 27, nom: "Mostaganem", domicile: 800, stopdesk: 450 },
  { code: 28, nom: "M'Sila", domicile: 850, stopdesk: 500 },
  { code: 29, nom: "Mascara", domicile: 800, stopdesk: 450 },
  { code: 30, nom: "Ouargla", domicile: 950, stopdesk: 600 },
  { code: 31, nom: "Oran", domicile: 800, stopdesk: 450 },
  { code: 32, nom: "El Bayadh", domicile: 1100, stopdesk: null },
  { code: 34, nom: "Bordj Bou Arreridj", domicile: 750, stopdesk: 450 },
  { code: 35, nom: "Boumerdes", domicile: 750, stopdesk: 450 },
  { code: 36, nom: "El Tarf", domicile: 800, stopdesk: 450 },
  { code: 38, nom: "Tissemsilt", domicile: 800, stopdesk: null },
  { code: 39, nom: "El Oued", domicile: 950, stopdesk: 600 },
  { code: 40, nom: "Khenchela", domicile: 800, stopdesk: null },
  { code: 41, nom: "Souk Ahras", domicile: 800, stopdesk: 450 },
  { code: 42, nom: "Tipaza", domicile: 750, stopdesk: 450 },
  { code: 43, nom: "Mila", domicile: 800, stopdesk: 450 },
  { code: 44, nom: "Ain Defla", domicile: 750, stopdesk: 450 },
  { code: 45, nom: "Naama", domicile: 1100, stopdesk: null },
  { code: 46, nom: "Ain Temouchent", domicile: 800, stopdesk: null },
  { code: 47, nom: "Ghardaia", domicile: 950, stopdesk: 600 },
  { code: 48, nom: "Relizane", domicile: 800, stopdesk: 450 },
  { code: 49, nom: "El M'Ghair", domicile: 950, stopdesk: null },
  { code: 50, nom: "El Meniaa", domicile: 1000, stopdesk: null },
  { code: 51, nom: "Ouled Djellal", domicile: 950, stopdesk: 550 },
  { code: 53, nom: "Beni Abbes", domicile: 1000, stopdesk: null },
  { code: 54, nom: "Timimoun", domicile: 1400, stopdesk: null },
  { code: 55, nom: "Touggourt", domicile: 950, stopdesk: 600 },
  { code: 57, nom: "In Salah", domicile: 1600, stopdesk: null },
  { code: 58, nom: "In Guezzam", domicile: 1600, stopdesk: null },
];

export function getWilayaRate(nom: string): WilayaRate | undefined {
  return WILAYA_RATES.find((w) => w.nom === nom);
}
