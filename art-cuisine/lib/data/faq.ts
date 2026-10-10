export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqGroup {
  title: string;
  items: FaqItem[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "Devis & tarifs",
    items: [
      {
        question: "Le devis est-il gratuit et sans engagement ?",
        answer:
          "Oui. La première étude, qu'elle ait lieu en atelier ou à votre domicile, est entièrement gratuite et ne vous engage à rien. Vous recevez un devis détaillé que vous êtes libre d'accepter ou non.",
      },
      {
        question: "Quel budget prévoir pour une cuisine sur mesure ?",
        answer:
          "Le budget dépend de la surface, des matériaux et du niveau de finition choisis. À titre indicatif, nos réalisations se situent généralement entre 800 000 et 2 800 000 DA. Nous établissons toujours un chiffrage précis après l'étude de votre projet.",
      },
      {
        question: "Proposez-vous des facilités de paiement ?",
        answer:
          "Un acompte est demandé à la signature du devis, le solde étant réparti entre le lancement de fabrication et la réception du chantier. Nous détaillons cet échéancier avec vous avant toute signature.",
      },
    ],
  },
  {
    title: "Fabrication & délais",
    items: [
      {
        question: "Combien de temps faut-il entre le devis et la pose ?",
        answer:
          "Comptez en moyenne 6 à 10 semaines entre la validation du devis et l'installation, selon la complexité du projet et les matériaux sélectionnés. Ce délai vous est confirmé précisément à la signature.",
      },
      {
        question: "Où sont fabriquées les cuisines ART Cuisine ?",
        answer:
          "L'intégralité de la fabrication — menuiserie, taille de pierre et finitions — est réalisée dans notre atelier, par notre propre équipe d'artisans.",
      },
      {
        question: "Puis-je modifier mon projet après validation du devis ?",
        answer:
          "Des ajustements mineurs restent possibles avant le lancement en fabrication. Une fois la production démarrée, toute modification substantielle peut entraîner un délai ou un coût supplémentaire.",
      },
    ],
  },
  {
    title: "Livraison & pose",
    items: [
      {
        question: "Qui réalise l'installation de la cuisine ?",
        answer:
          "Notre propre équipe de monteurs assure la pose, du dépose de l'ancienne cuisine si nécessaire jusqu'au réglage final des façades et des mécanismes.",
      },
      {
        question: "Faut-il être présent le jour de la pose ?",
        answer:
          "Nous recommandons votre présence au démarrage et à la réception du chantier, afin de valider ensemble le bon déroulement de l'installation.",
      },
    ],
  },
  {
    title: "SAV & garantie",
    items: [
      {
        question: "Quelle garantie couvre ma cuisine ?",
        answer:
          "Toutes nos réalisations sont couvertes par une garantie constructeur de 5 ans, couvrant la structure, les mécanismes et les finitions dans des conditions d'usage normales.",
      },
      {
        question: "Comment signaler un problème après la pose ?",
        answer:
          "Une demande peut être déposée depuis votre espace client (rubrique SAV) ou par téléphone. Un technicien vous recontacte sous 48h pour planifier une intervention si nécessaire.",
      },
    ],
  },
];
