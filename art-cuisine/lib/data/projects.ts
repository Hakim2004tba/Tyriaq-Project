export type PanelVariant = 1 | 2 | 3 | 4 | 5 | 6;

export interface Project {
  slug: string;
  title: string;
  category: string;
  layout: string;
  location: string;
  year: number;
  surface: string;
  panelVariant: PanelVariant;
  summary: string;
  description: string[];
  materials: string[];
  finishes: string[];
  gallery: PanelVariant[];
}

export const CATEGORIES = [
  "Épurée",
  "Contemporaine",
  "Naturelle",
  "Minérale",
  "Traditionnelle",
  "Industrielle",
] as const;

export const PROJECTS: Project[] = [
  {
    slug: "villa-belkacem",
    title: "Villa Belkacem",
    category: "Épurée",
    layout: "Cuisine en L",
    location: "Alger",
    year: 2025,
    surface: "22 m²",
    panelVariant: 1,
    summary: "Une cuisine en L aux lignes tendues, ouverte sur le salon.",
    description: [
      "Cette cuisine en L a été pensée pour une famille recevant beaucoup : un plan de travail continu, un grand îlot central et une circulation fluide entre le coin repas et le salon.",
      "Les façades laquées mat absorbent la lumière sans jamais accrocher le regard, laissant le plan de travail en marbre veiné devenir la pièce maîtresse de l'espace.",
      "Un bandeau d'éclairage intégré souligne la crédence et accompagne les usages du soir sans écraser la pièce.",
    ],
    materials: ["Bois massif", "Marbre"],
    finishes: ["Laqué mat", "Bois huilé"],
    gallery: [1, 4, 2, 6],
  },
  {
    slug: "residence-amina",
    title: "Résidence Amina",
    category: "Contemporaine",
    layout: "Cuisine en U",
    location: "Oran",
    year: 2025,
    surface: "26 m²",
    panelVariant: 4,
    summary: "Une cuisine en U généreuse, pensée pour cuisiner à plusieurs.",
    description: [
      "L'agencement en U libère un espace de circulation central confortable, avec trois zones de travail distinctes : préparation, cuisson et lavage.",
      "Les caissons métal brossé apportent une touche industrielle discrète, contrebalancée par des façades bois clair qui réchauffent l'ensemble.",
      "Le plan de travail en quartz résiste aux usages intensifs tout en conservant un rendu mat très contemporain.",
    ],
    materials: ["Métal", "Bois massif", "Pierre naturelle"],
    finishes: ["Brossé", "Mat"],
    gallery: [4, 3, 5, 1],
  },
  {
    slug: "maison-moderne",
    title: "Maison Moderne",
    category: "Naturelle",
    layout: "Cuisine parallèle",
    location: "Blida",
    year: 2024,
    surface: "17 m²",
    panelVariant: 5,
    summary: "Deux plans face à face en bois massif et pierre brute.",
    description: [
      "La configuration parallèle optimise un espace tout en longueur, avec un plan cuisson d'un côté et un plan de préparation-évier de l'autre.",
      "Le choix du chêne massif huilé et de la pierre naturelle non polie ancre cette cuisine dans une esthétique brute et chaleureuse.",
      "Des rangements ouverts en partie haute apportent de la légèreté visuelle et mettent en scène la vaisselle du quotidien.",
    ],
    materials: ["Bois massif", "Pierre naturelle"],
    finishes: ["Huilé", "Brut"],
    gallery: [5, 2, 4, 6],
  },
  {
    slug: "appartement-city",
    title: "Appartement City",
    category: "Minérale",
    layout: "Cuisine en I",
    location: "Alger",
    year: 2024,
    surface: "9 m²",
    panelVariant: 6,
    summary: "Une cuisine en I compacte, tout en pierre et en réserve.",
    description: [
      "Sur un linéaire unique, chaque centimètre est optimisé : colonne four et frigo intégrée, tiroirs à l'anglaise, poignées invisibles.",
      "Le parti pris minéral — plan de travail et crédence dans la même pierre reconstituée — donne une impression de continuité et agrandit visuellement la pièce.",
      "Une teinte grise profonde en fait un espace discret qui s'efface au profit du reste de l'appartement.",
    ],
    materials: ["Pierre naturelle", "Métal"],
    finishes: ["Mat", "Brossé"],
    gallery: [6, 1, 3, 2],
  },
  {
    slug: "villa-les-pins",
    title: "Villa Les Pins",
    category: "Traditionnelle",
    layout: "Cuisine avec îlot",
    location: "Alger",
    year: 2024,
    surface: "31 m²",
    panelVariant: 2,
    summary: "Un grand îlot central en bois massif, cœur de la maison.",
    description: [
      "L'îlot central, taillé dans un seul bloc de bois massif, sert à la fois de plan de préparation, de table de partage et de séparation avec le salon.",
      "Les moulures et cadres discrets sur les façades rappellent l'architecture classique de la villa sans tomber dans le pastiche.",
      "La robinetterie et les poignées en laiton vieilli apportent la touche patrimoniale qui signe cette réalisation.",
    ],
    materials: ["Bois massif", "Marbre"],
    finishes: ["Huilé", "Patiné"],
    gallery: [2, 5, 1, 4],
  },
  {
    slug: "residence-horizon",
    title: "Résidence Horizon",
    category: "Industrielle",
    layout: "Cuisine en L",
    location: "Oran",
    year: 2023,
    surface: "20 m²",
    panelVariant: 3,
    summary: "Métal noir, béton ciré et bois brut pour un esprit loft.",
    description: [
      "Cette cuisine en L joue la carte de l'esprit atelier : structures métalliques apparentes, crédence en tôle brossée, suspension industrielle.",
      "Le plan de travail en béton ciré, coulé sur mesure, encaisse les traces d'usage sans jamais paraître fragile — au contraire, il se patine avec le temps.",
      "Des étagères en acier noir mat viennent remplacer une partie des caissons hauts pour alléger la composition.",
    ],
    materials: ["Métal", "Bois massif"],
    finishes: ["Brossé", "Brut"],
    gallery: [3, 6, 2, 5],
  },
  {
    slug: "appartement-oran",
    title: "Appartement Oran",
    category: "Contemporaine",
    layout: "Cuisine en U",
    location: "Oran",
    year: 2025,
    surface: "15 m²",
    panelVariant: 4,
    summary: "Façades laquées bicolores et îlot d'appoint amovible.",
    description: [
      "Un jeu de deux teintes de laque — anthracite en partie basse, sable en partie haute — structure visuellement cette cuisine en U de taille moyenne.",
      "Un petit îlot sur roulettes fait office de desserte et peut être déplacé selon les besoins de réception.",
      "L'ensemble reste résolument sobre, avec une seule ligne de poignées filantes en laiton brossé.",
    ],
    materials: ["Mélamine", "Métal"],
    finishes: ["Laqué mat", "Brossé"],
    gallery: [4, 1, 6, 3],
  },
  {
    slug: "maison-el-amel",
    title: "Maison El Amel",
    category: "Naturelle",
    layout: "Cuisine en I",
    location: "Blida",
    year: 2023,
    surface: "11 m²",
    panelVariant: 5,
    summary: "Chêne clair, lin et pierre calcaire pour une ambiance douce.",
    description: [
      "Conçue pour une petite famille, cette cuisine en I mise sur des matériaux chauds et mats pour créer une atmosphère apaisante au quotidien.",
      "Les façades en chêne clair sont associées à une crédence en pierre calcaire brossée, dans les mêmes tonalités sable.",
      "Des rangements coulissants sur toute la hauteur remplacent les meubles hauts classiques pour préserver la luminosité de la pièce.",
    ],
    materials: ["Bois massif", "Pierre naturelle"],
    finishes: ["Huilé", "Mat"],
    gallery: [5, 4, 2, 1],
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

export function getRelatedProjects(project: Project, count = 3): Project[] {
  const sameCategory = PROJECTS.filter(
    (p) => p.slug !== project.slug && p.category === project.category,
  );
  const others = PROJECTS.filter(
    (p) => p.slug !== project.slug && p.category !== project.category,
  );
  return [...sameCategory, ...others].slice(0, count);
}
