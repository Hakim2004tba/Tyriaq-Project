export interface Material {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string[];
  swatchClassName: string;
}

export const MATERIALS: Material[] = [
  {
    slug: "bois-massif",
    name: "Bois massif",
    tagline: "Chêne, noyer et hêtre, sciés et huilés en atelier",
    description:
      "Le bois massif reste notre matériau signature : chaleureux, réparable et unique d'une pièce à l'autre. Chaque façade est sélectionnée pour son veinage avant d'être taillée sur mesure.",
    bestFor: ["Façades", "Îlots centraux", "Étagères ouvertes"],
    swatchClassName:
      "bg-[linear-gradient(115deg,#8a6a45_0%,#a9835a_38%,#7c5c3a_62%,#96754c_100%)]",
  },
  {
    slug: "pierre-naturelle",
    name: "Pierre naturelle",
    tagline: "Granit et calcaire, taillés dans notre atelier de pierre",
    description:
      "Résistante à la chaleur et aux rayures, la pierre naturelle est idéale pour les plans de travail très sollicités. Chaque bloc est unique, ce qui rend chaque cuisine irremplaçable.",
    bestFor: ["Plans de travail", "Crédences", "Dosserets"],
    swatchClassName:
      "bg-[linear-gradient(125deg,var(--stone-200)_0%,var(--stone-400)_45%,var(--stone-300)_75%,var(--stone-500)_100%)]",
  },
  {
    slug: "marbre",
    name: "Marbre",
    tagline: "Carrare, Emperador et marbres locaux sélectionnés",
    description:
      "Matériau noble par excellence, le marbre apporte à une cuisine une élégance intemporelle. Nous le traitons pour en limiter la porosité sans dénaturer son veinage naturel.",
    bestFor: ["Îlots", "Plans de travail", "Crédences décoratives"],
    swatchClassName:
      "bg-[linear-gradient(135deg,#efece6_0%,#dcd6cb_30%,#efece6_45%,#c9c1b2_55%,#efece6_70%,#d8d1c4_100%)]",
  },
  {
    slug: "metal",
    name: "Métal",
    tagline: "Acier brossé, laiton vieilli et tôle laquée",
    description:
      "Utilisé en touches ou en structure complète, le métal apporte une dimension architecturale et industrielle à la cuisine, tout en étant particulièrement durable.",
    bestFor: ["Poignées", "Crédences", "Structures apparentes"],
    swatchClassName:
      "bg-[linear-gradient(160deg,#3a3a3c_0%,#5a5a5e_35%,#2c2c2e_60%,#4a4a4d_100%)]",
  },
  {
    slug: "melamine",
    name: "Mélamine",
    tagline: "Un large nuancier de teintes et de textures",
    description:
      "Économique et résistante, la mélamine haute densité permet d'explorer des teintes et des textures variées pour les caissons et certaines façades, sans compromis sur la durabilité.",
    bestFor: ["Caissons intérieurs", "Façades secondaires", "Rangements"],
    swatchClassName:
      "bg-[linear-gradient(140deg,#d8d2c4_0%,#c7bfab_45%,#b9b096_100%)]",
  },
];

export interface Finish {
  slug: string;
  name: string;
  description: string;
}

export const FINISHES: Finish[] = [
  {
    slug: "laque-mat",
    name: "Laqué mat",
    description: "Un rendu doux au toucher, sans reflet, qui ne marque pas les traces de doigts.",
  },
  {
    slug: "brillant",
    name: "Laqué brillant",
    description: "Une finition miroir qui réfléchit la lumière et agrandit visuellement l'espace.",
  },
  {
    slug: "brosse",
    name: "Brossé",
    description: "Un léger grain directionnel qui atténue les micro-rayures sur bois et métal.",
  },
  {
    slug: "huile",
    name: "Huilé",
    description: "Une protection naturelle qui laisse respirer le veinage du bois massif.",
  },
  {
    slug: "patine",
    name: "Patiné",
    description: "Un vieillissement maîtrisé qui donne du caractère aux finitions métalliques.",
  },
  {
    slug: "brut",
    name: "Brut",
    description: "La matière dans sa texture la plus authentique, à peine traitée.",
  },
];
