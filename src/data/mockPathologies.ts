import type { Pathology } from "@/types/domain";

export const pathologies: Pathology[] = [
  {
    slug: "hypertension-arterielle",
    name: "Hypertension artérielle",
    category: "Maladie cardiovasculaire",
    summary:
      "L'hypertension artérielle est une élévation durable de la pression du sang dans les artères. Souvent silencieuse, elle augmente le risque cardiovasculaire.",
    understanding:
      "L'hypertension artérielle (HTA) correspond à une pression du sang trop élevée de façon permanente dans les artères. On parle d'hypertension lorsque la tension dépasse régulièrement 140/90 mmHg. Elle est fréquente au Sénégal et constitue un facteur de risque majeur d'accident vasculaire cérébral et de maladie cardiaque.",
    symptoms: [
      "Maux de tête, surtout le matin",
      "Vertiges et bourdonnements d'oreilles",
      "Fatigue inhabituelle",
      "Troubles de la vision",
      "Souvent aucun symptôme (« tueur silencieux »)",
    ],
    causes: [
      "Antécédents familiaux",
      "Excès de sel dans l'alimentation",
      "Surpoids et sédentarité",
      "Stress chronique",
      "Âge avancé",
    ],
    prevention: [
      "Réduire la consommation de sel",
      "Pratiquer une activité physique régulière",
      "Maintenir un poids santé",
      "Limiter l'alcool et arrêter le tabac",
      "Mesurer régulièrement sa tension",
    ],
    treatments: [
      "Mesures hygiéno-diététiques",
      "Médicaments antihypertenseurs",
      "Suivi médical régulier",
    ],
    whenToConsult: [
      "Tension mesurée régulièrement élevée",
      "Maux de tête intenses et persistants",
      "Douleur thoracique ou essoufflement",
      "Troubles de la parole ou de la vision (urgence)",
    ],
    faq: [
      {
        question: "L'hypertension se guérit-elle ?",
        answer:
          "L'hypertension se contrôle plutôt qu'elle ne se guérit. Avec un traitement adapté et de bonnes habitudes de vie, la tension peut être maintenue à des niveaux sûrs.",
      },
      {
        question: "Peut-on arrêter le traitement si la tension est normale ?",
        answer:
          "Non. La tension est normale grâce au traitement. L'arrêter sans avis médical expose à une remontée et à des complications.",
      },
    ],
    commonMedications: ["amlodipine-5mg", "paracetamol-500mg"],
    relatedArticles: ["diabete-type-2"],
    nearbyFacilities: ["chn-fann", "hopital-principal-dakar"],
    communitySlug: "diabete",
    trust: { verified: true, source: "Comité éditorial Wergu Yaram", updatedAt: "2026-05-02" },
  },
  {
    slug: "diabete-type-2",
    name: "Diabète de type 2",
    category: "Maladie métabolique",
    summary:
      "Le diabète de type 2 se caractérise par un excès de sucre dans le sang lié à une résistance à l'insuline. Il se prévient et se contrôle.",
    understanding:
      "Le diabète de type 2 est une maladie chronique marquée par une glycémie trop élevée. Le corps devient résistant à l'insuline ou n'en produit plus assez. Bien suivi, il permet de vivre normalement et d'éviter les complications.",
    symptoms: [
      "Soif intense et bouche sèche",
      "Envie fréquente d'uriner",
      "Fatigue persistante",
      "Vision floue",
      "Cicatrisation lente des plaies",
    ],
    causes: ["Surpoids et obésité", "Sédentarité", "Alimentation déséquilibrée", "Hérédité", "Âge"],
    prevention: [
      "Alimentation équilibrée et pauvre en sucres rapides",
      "Activité physique régulière",
      "Maintien d'un poids santé",
      "Dépistage régulier de la glycémie",
    ],
    treatments: ["Mesures hygiéno-diététiques", "Antidiabétiques oraux", "Insuline si nécessaire", "Éducation thérapeutique"],
    whenToConsult: [
      "Soif et fatigue inhabituelles",
      "Glycémie élevée au dépistage",
      "Plaies qui cicatrisent mal",
      "Antécédents familiaux de diabète",
    ],
    faq: [
      {
        question: "Le diabète de type 2 est-il réversible ?",
        answer:
          "Dans certains cas, une perte de poids et une hygiène de vie stricte permettent une rémission. Un suivi médical reste indispensable.",
      },
    ],
    commonMedications: ["metformine-850mg"],
    relatedArticles: ["diabete-type-2"],
    nearbyFacilities: ["chn-fann"],
    communitySlug: "diabete",
    trust: { verified: true, source: "Comité éditorial Wergu Yaram", updatedAt: "2026-04-15" },
  },
  {
    slug: "asthme",
    name: "Asthme",
    category: "Maladie respiratoire",
    summary:
      "L'asthme est une maladie inflammatoire chronique des bronches qui provoque des crises d'essoufflement et de toux.",
    understanding:
      "L'asthme se traduit par une inflammation des bronches qui se contractent et se rétrécissent, gênant la respiration. Bien contrôlé, il permet une vie normale, y compris sportive.",
    symptoms: ["Essoufflement", "Sifflements respiratoires", "Toux, surtout la nuit", "Oppression thoracique"],
    causes: ["Allergènes (poussière, pollen)", "Pollution", "Infections respiratoires", "Effort", "Tabac"],
    prevention: [
      "Éviter les facteurs déclenchants",
      "Aérer et limiter les acariens",
      "Ne pas fumer",
      "Suivre son traitement de fond",
    ],
    treatments: ["Bronchodilatateurs de crise", "Corticoïdes inhalés (traitement de fond)", "Plan d'action personnalisé"],
    whenToConsult: [
      "Crises de plus en plus fréquentes",
      "Recours fréquent au bronchodilatateur",
      "Difficulté à parler pendant une crise (urgence)",
    ],
    faq: [
      {
        question: "Peut-on faire du sport avec de l'asthme ?",
        answer:
          "Oui. Un asthme bien contrôlé permet l'activité physique. Échauffez-vous et gardez votre bronchodilatateur à portée de main.",
      },
    ],
    commonMedications: ["salbutamol-100"],
    relatedArticles: [],
    nearbyFacilities: ["hopital-principal-dakar"],
    trust: { verified: true, source: "Comité éditorial Wergu Yaram", updatedAt: "2026-03-10" },
  },
];

export const pathologyBySlug = (slug: string) => pathologies.find((p) => p.slug === slug);
