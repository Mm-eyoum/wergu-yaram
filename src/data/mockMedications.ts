import type { Medication } from "@/types/domain";

export const medications: Medication[] = [
  {
    slug: "paracetamol-500mg",
    name: "Paracétamol",
    dosage: "500 mg",
    family: "Antalgique / Antipyrétique",
    forms: ["Comprimé", "Sirop", "Suppositoire", "Effervescent"],
    summary:
      "Le paracétamol est un médicament de référence contre la douleur légère à modérée et la fièvre, disponible sans ordonnance.",
    usage:
      "Le paracétamol est utilisé pour soulager les douleurs légères à modérées (maux de tête, douleurs dentaires, courbatures, règles douloureuses) et pour faire baisser la fièvre. C'est l'antalgique de première intention chez l'adulte et l'enfant.",
    posology:
      "Adulte et enfant de plus de 50 kg : 500 mg à 1 g par prise, à renouveler si besoin au bout de 4 à 6 heures, sans dépasser 3 g par jour. Toujours respecter un intervalle minimum de 4 heures entre deux prises.",
    contraindications: [
      "Allergie connue au paracétamol",
      "Insuffisance hépatique sévère",
      "Maladie grave du foie",
    ],
    sideEffects: [
      "Effets indésirables rares aux doses recommandées",
      "Réactions allergiques cutanées possibles",
      "Atteinte du foie en cas de surdosage",
    ],
    precautions: [
      "Ne jamais dépasser la dose maximale journalière",
      "Prudence en cas de consommation d'alcool",
      "Vérifier l'absence de paracétamol dans d'autres médicaments pris en parallèle",
    ],
    interactions: [
      "Anticoagulants oraux (surveillance renforcée)",
      "Autres médicaments contenant du paracétamol",
    ],
    professionalAdvice:
      "Si la douleur ou la fièvre persiste au-delà de 3 jours, consultez un professionnel de santé. Ne combinez jamais plusieurs médicaments contenant du paracétamol.",
    relatedPathologies: ["hypertension-arterielle", "diabete-type-2"],
    withoutPrescription: true,
    trust: { verified: true, source: "Comité éditorial Wergu Yaram", updatedAt: "2026-05-12" },
  },
  {
    slug: "metformine-850mg",
    name: "Metformine",
    dosage: "850 mg",
    family: "Antidiabétique oral",
    forms: ["Comprimé"],
    summary:
      "La metformine est le traitement de première intention du diabète de type 2 pour contrôler la glycémie.",
    usage:
      "La metformine réduit la production de glucose par le foie et améliore la sensibilité à l'insuline. Elle est prescrite dans le diabète de type 2, en complément des mesures hygiéno-diététiques.",
    posology:
      "La posologie est définie par le médecin, généralement progressive, à prendre au cours ou à la fin des repas pour limiter les troubles digestifs.",
    contraindications: ["Insuffisance rénale sévère", "Acidose métabolique", "Déshydratation sévère"],
    sideEffects: ["Troubles digestifs (nausées, diarrhée)", "Goût métallique", "Carence en vitamine B12 au long cours"],
    precautions: ["Surveillance de la fonction rénale", "Arrêt temporaire avant certains examens d'imagerie"],
    interactions: ["Produits de contraste iodés", "Diurétiques", "Alcool"],
    professionalAdvice:
      "La metformine se prend uniquement sur prescription médicale, avec un suivi régulier de la glycémie et de la fonction rénale.",
    relatedPathologies: ["diabete-type-2"],
    withoutPrescription: false,
    trust: { verified: true, source: "Comité éditorial Wergu Yaram", updatedAt: "2026-04-20" },
  },
  {
    slug: "amlodipine-5mg",
    name: "Amlodipine",
    dosage: "5 mg",
    family: "Antihypertenseur (inhibiteur calcique)",
    forms: ["Comprimé", "Gélule"],
    summary:
      "L'amlodipine est un antihypertenseur qui détend les vaisseaux sanguins pour faire baisser la tension artérielle.",
    usage:
      "L'amlodipine traite l'hypertension artérielle et certaines formes d'angine de poitrine en relâchant la paroi des vaisseaux sanguins.",
    posology:
      "Habituellement 5 mg une fois par jour, pouvant être augmenté à 10 mg selon l'avis du médecin.",
    contraindications: ["Hypotension sévère", "Allergie aux dihydropyridines", "Choc cardiogénique"],
    sideEffects: ["Œdèmes des chevilles", "Bouffées de chaleur", "Maux de tête", "Fatigue"],
    precautions: ["Surveillance de la tension", "Prudence en cas d'insuffisance hépatique"],
    interactions: ["Jus de pamplemousse", "Autres antihypertenseurs"],
    professionalAdvice:
      "Ne jamais arrêter un traitement antihypertenseur sans avis médical, même si la tension semble normalisée.",
    relatedPathologies: ["hypertension-arterielle"],
    withoutPrescription: false,
    trust: { verified: true, source: "Comité éditorial Wergu Yaram", updatedAt: "2026-03-30" },
  },
  {
    slug: "salbutamol-100",
    name: "Salbutamol",
    dosage: "100 µg / dose",
    family: "Bronchodilatateur",
    forms: ["Aérosol-doseur", "Solution pour inhalation"],
    summary:
      "Le salbutamol est un bronchodilatateur d'action rapide utilisé pour soulager la crise d'asthme.",
    usage:
      "Le salbutamol détend les muscles des bronches et soulage rapidement la gêne respiratoire lors d'une crise d'asthme ou d'un essoufflement.",
    posology:
      "1 à 2 bouffées en cas de gêne respiratoire. Si les crises se répètent, consultez rapidement un médecin.",
    contraindications: ["Allergie au salbutamol"],
    sideEffects: ["Tremblements", "Palpitations", "Maux de tête"],
    precautions: ["Utiliser la chambre d'inhalation chez l'enfant", "Consulter si besoin fréquent"],
    interactions: ["Bêtabloquants", "Certains diurétiques"],
    professionalAdvice:
      "Un recours fréquent au salbutamol traduit un asthme mal contrôlé : parlez-en à votre médecin.",
    relatedPathologies: ["asthme"],
    withoutPrescription: false,
    trust: { verified: true, source: "Comité éditorial Wergu Yaram", updatedAt: "2026-02-18" },
  },
];

export const medicationBySlug = (slug: string) => medications.find((m) => m.slug === slug);
