import type { Medication } from "@/types/domain";

/**
 * Clinical enrichments for the medication reference, kept **separate from the
 * bundled LME JSON** so both the synchronous build-time loader
 * (`mockMedications.ts`) and the lazy browser loader (`medicationsLazy.ts`) can
 * apply them without statically pulling the 848 KB dataset into a module.
 *
 * Surcouche : `ENRICHMENTS` ajoute des monographies cliniques (usage, posologie,
 * contre-indications, etc.) pour les DCI les plus courants, **sourcées** (OMS —
 * WHO Model Formulary, RCP) et **étiquetées** via `clinicalReviewStatus`.
 * Conformité UEMOA (Règlement N°04/2020) : information non promotionnelle,
 * nommage en DCI, traçabilité des sources.
 */
type Enrichment = Partial<
  Pick<
    Medication,
    | "summary"
    | "usage"
    | "posology"
    | "contraindications"
    | "sideEffects"
    | "precautions"
    | "interactions"
    | "professionalAdvice"
    | "relatedPathologies"
    | "withoutPrescription"
    | "clinicalSources"
    | "clinicalReviewStatus"
  >
>;

const OMS = ["OMS — WHO Model Formulary", "Résumé des caractéristiques du produit (RCP)"];

export const ENRICHMENTS: Record<string, Enrichment> = {
  paracetamol: {
    summary:
      "Le paracétamol est l'antalgique et antipyrétique de première intention contre la douleur légère à modérée et la fièvre. Disponible sans ordonnance.",
    usage:
      "Soulage les douleurs légères à modérées (maux de tête, douleurs dentaires, courbatures, règles douloureuses) et fait baisser la fièvre, chez l'adulte et l'enfant.",
    posology:
      "Adulte et enfant de plus de 50 kg : 500 mg à 1 g par prise, à renouveler si besoin après 4 à 6 heures, sans dépasser 3 g par jour. Chez l'enfant : 15 mg/kg par prise, toutes les 6 heures. Respecter un intervalle minimum de 4 heures.",
    contraindications: ["Allergie au paracétamol", "Insuffisance hépatique sévère", "Maladie grave du foie"],
    sideEffects: [
      "Effets indésirables rares aux doses recommandées",
      "Réactions allergiques cutanées possibles",
      "Atteinte grave du foie en cas de surdosage",
    ],
    precautions: [
      "Ne jamais dépasser la dose maximale journalière",
      "Prudence en cas de consommation d'alcool ou de poids faible",
      "Vérifier l'absence de paracétamol dans les autres médicaments pris en parallèle",
    ],
    interactions: ["Anticoagulants oraux (surveillance renforcée)", "Autres médicaments contenant du paracétamol"],
    professionalAdvice:
      "Si la douleur ou la fièvre persiste au-delà de 3 jours, consultez un professionnel de santé. Ne combinez jamais plusieurs médicaments contenant du paracétamol.",
    relatedPathologies: [],
    withoutPrescription: true,
    clinicalSources: ["Comité éditorial Wergu Yaram", ...OMS],
    clinicalReviewStatus: "reviewed",
  },
  ibuprofene: {
    summary:
      "L'ibuprofène est un anti-inflammatoire non stéroïdien (AINS) contre la douleur, l'inflammation et la fièvre.",
    usage:
      "Traite les douleurs légères à modérées avec composante inflammatoire (douleurs dentaires, règles douloureuses, maux de tête, douleurs articulaires) et fait baisser la fièvre.",
    posology:
      "Adulte : 200 à 400 mg par prise, jusqu'à 3 fois par jour, de préférence au cours des repas, sans dépasser 1 200 mg/jour en automédication. À prendre à la dose minimale efficace et sur la durée la plus courte.",
    contraindications: [
      "Ulcère gastro-duodénal évolutif",
      "Insuffisance rénale, hépatique ou cardiaque sévère",
      "Grossesse à partir du 6e mois",
      "Antécédent d'allergie aux AINS ou à l'aspirine",
    ],
    sideEffects: ["Troubles digestifs (douleurs, brûlures, ulcère)", "Réactions allergiques", "Atteinte rénale"],
    precautions: [
      "Prudence chez la personne âgée et en cas de déshydratation",
      "Éviter l'association à un autre AINS ou à l'aspirine",
      "En cas d'infection, l'AINS peut masquer les signes",
    ],
    interactions: ["Anticoagulants", "Autres AINS / aspirine", "Diurétiques et antihypertenseurs", "Lithium, méthotrexate"],
    professionalAdvice:
      "Privilégiez le paracétamol en première intention pour la fièvre. Ne prolongez pas un AINS sans avis médical.",
    relatedPathologies: [],
    withoutPrescription: true,
    clinicalSources: OMS,
    clinicalReviewStatus: "draft",
  },
  metformine: {
    summary:
      "La metformine est le traitement de première intention du diabète de type 2 pour contrôler la glycémie.",
    usage:
      "Réduit la production de glucose par le foie et améliore la sensibilité à l'insuline, en complément des mesures hygiéno-diététiques dans le diabète de type 2.",
    posology:
      "Posologie progressive définie par le médecin, à prendre au cours ou à la fin des repas pour limiter les troubles digestifs.",
    contraindications: ["Insuffisance rénale sévère", "Acidose métabolique", "Déshydratation sévère"],
    sideEffects: ["Troubles digestifs (nausées, diarrhée)", "Goût métallique", "Carence en vitamine B12 au long cours"],
    precautions: ["Surveillance de la fonction rénale", "Arrêt temporaire avant un examen avec produit de contraste iodé"],
    interactions: ["Produits de contraste iodés", "Diurétiques", "Alcool"],
    professionalAdvice:
      "La metformine se prend uniquement sur prescription médicale, avec un suivi régulier de la glycémie et de la fonction rénale.",
    relatedPathologies: ["diabete-type-2"],
    withoutPrescription: false,
    clinicalSources: ["Comité éditorial Wergu Yaram", ...OMS],
    clinicalReviewStatus: "reviewed",
  },
  amlodipine: {
    summary:
      "L'amlodipine est un antihypertenseur (inhibiteur calcique) qui détend les vaisseaux sanguins pour faire baisser la tension artérielle.",
    usage:
      "Traite l'hypertension artérielle et certaines formes d'angine de poitrine en relâchant la paroi des vaisseaux sanguins.",
    posology: "Habituellement 5 mg une fois par jour, pouvant être augmenté à 10 mg selon l'avis du médecin.",
    contraindications: ["Hypotension sévère", "Allergie aux dihydropyridines", "Choc cardiogénique"],
    sideEffects: ["Œdèmes des chevilles", "Bouffées de chaleur", "Maux de tête", "Fatigue"],
    precautions: ["Surveillance de la tension", "Prudence en cas d'insuffisance hépatique"],
    interactions: ["Jus de pamplemousse", "Autres antihypertenseurs"],
    professionalAdvice:
      "Ne jamais arrêter un traitement antihypertenseur sans avis médical, même si la tension semble normalisée.",
    relatedPathologies: ["hypertension-arterielle"],
    withoutPrescription: false,
    clinicalSources: ["Comité éditorial Wergu Yaram", ...OMS],
    clinicalReviewStatus: "reviewed",
  },
  salbutamol: {
    summary: "Le salbutamol est un bronchodilatateur d'action rapide utilisé pour soulager la crise d'asthme.",
    usage:
      "Détend les muscles des bronches et soulage rapidement la gêne respiratoire lors d'une crise d'asthme ou d'un essoufflement.",
    posology:
      "1 à 2 bouffées en cas de gêne respiratoire. Si les crises se répètent, consultez rapidement un médecin.",
    contraindications: ["Allergie au salbutamol"],
    sideEffects: ["Tremblements", "Palpitations", "Maux de tête"],
    precautions: ["Utiliser une chambre d'inhalation chez l'enfant", "Consulter si le besoin devient fréquent"],
    interactions: ["Bêtabloquants", "Certains diurétiques"],
    professionalAdvice:
      "Un recours fréquent au salbutamol traduit un asthme mal contrôlé : parlez-en à votre médecin.",
    relatedPathologies: ["asthme"],
    withoutPrescription: false,
    clinicalSources: ["Comité éditorial Wergu Yaram", ...OMS],
    clinicalReviewStatus: "reviewed",
  },
  amoxicilline: {
    summary:
      "L'amoxicilline est un antibiotique de la famille des pénicillines (groupe AWaRe Access), actif sur de nombreuses infections bactériennes courantes.",
    usage:
      "Traite les infections ORL, respiratoires, urinaires et cutanées dues à des bactéries sensibles. Antibiotique à privilégier (groupe Access) lorsque indiqué.",
    posology:
      "Posologie et durée définies par le médecin selon l'infection et le poids. Respecter scrupuleusement la durée prescrite, même après amélioration.",
    contraindications: ["Allergie aux pénicillines ou aux bêta-lactamines"],
    sideEffects: ["Troubles digestifs (diarrhée, nausées)", "Réactions allergiques (urticaire, plus rarement choc)", "Candidoses"],
    precautions: ["Signaler toute allergie médicamenteuse", "Prudence en cas d'insuffisance rénale"],
    interactions: ["Méthotrexate", "Allopurinol (risque accru d'éruption)", "Anticoagulants oraux"],
    professionalAdvice:
      "Un antibiotique ne traite pas les infections virales. Ne l'utilisez jamais sans prescription et terminez toujours la cure pour limiter l'antibiorésistance.",
    relatedPathologies: [],
    withoutPrescription: false,
    clinicalSources: ["OMS — Classification AWaRe des antibiotiques", ...OMS],
    clinicalReviewStatus: "draft",
  },
  metronidazole: {
    summary:
      "Le métronidazole est un anti-infectieux actif sur les bactéries anaérobies et certains parasites (amibiase, giardiase, trichomonase).",
    usage:
      "Traite les infections à germes anaérobies, les infections gynécologiques et digestives, et des parasitoses comme l'amibiase.",
    posology: "Posologie et durée selon l'indication, définies par le médecin. À prendre au cours des repas.",
    contraindications: ["Allergie aux imidazolés", "Premier trimestre de grossesse (sauf avis médical)"],
    sideEffects: ["Goût métallique", "Nausées", "Coloration foncée des urines", "Neuropathie lors de traitements prolongés"],
    precautions: ["Éviter formellement l'alcool pendant et 3 jours après le traitement (effet antabuse)"],
    interactions: ["Alcool (effet antabuse)", "Anticoagulants oraux", "Lithium"],
    professionalAdvice:
      "Ne consommez aucune boisson alcoolisée pendant le traitement. Respectez la durée prescrite.",
    relatedPathologies: [],
    withoutPrescription: false,
    clinicalSources: OMS,
    clinicalReviewStatus: "draft",
  },
  omeprazole: {
    summary:
      "L'oméprazole est un inhibiteur de la pompe à protons (IPP) qui réduit l'acidité de l'estomac.",
    usage:
      "Traite le reflux gastro-œsophagien, les ulcères gastro-duodénaux et protège l'estomac lors de traitements par AINS.",
    posology: "Habituellement 20 mg par jour, le matin avant le repas. Posologie et durée selon l'avis du médecin.",
    contraindications: ["Allergie à l'oméprazole ou aux IPP"],
    sideEffects: ["Maux de tête", "Troubles digestifs", "Carences (B12, magnésium) au long cours"],
    precautions: ["Réévaluer l'intérêt d'un traitement prolongé", "Prudence en cas d'ostéoporose"],
    interactions: ["Clopidogrel", "Méthotrexate", "Certains antirétroviraux et antifongiques"],
    professionalAdvice:
      "Un traitement au long cours doit être réévalué régulièrement. Consultez en cas de douleurs persistantes ou de perte de poids.",
    relatedPathologies: [],
    withoutPrescription: false,
    clinicalSources: OMS,
    clinicalReviewStatus: "draft",
  },
  ciprofloxacine: {
    summary:
      "La ciprofloxacine est un antibiotique de la famille des fluoroquinolones (groupe AWaRe Watch), à usage encadré.",
    usage:
      "Traite certaines infections urinaires, digestives, osseuses ou respiratoires dues à des bactéries sensibles, lorsque les antibiotiques de première intention ne conviennent pas.",
    posology: "Posologie et durée strictement définies par le médecin. Bien s'hydrater pendant le traitement.",
    contraindications: ["Allergie aux quinolones", "Enfant et adolescent en croissance (sauf indication spécifique)", "Grossesse et allaitement (sauf avis médical)"],
    sideEffects: ["Troubles digestifs", "Tendinites (risque de rupture du tendon d'Achille)", "Photosensibilité", "Troubles neurologiques"],
    precautions: ["Arrêter et consulter en cas de douleur tendineuse", "Éviter l'exposition solaire", "Antibiotique du groupe Watch : usage à préserver"],
    interactions: ["Sels de calcium, fer, magnésium, antiacides (espacer les prises)", "Théophylline", "Anticoagulants oraux"],
    professionalAdvice:
      "Antibiotique de réserve relative (groupe Watch) : à n'utiliser que sur prescription, pour préserver son efficacité.",
    relatedPathologies: [],
    withoutPrescription: false,
    clinicalSources: ["OMS — Classification AWaRe des antibiotiques", ...OMS],
    clinicalReviewStatus: "draft",
  },
  azithromycine: {
    summary: "L'azithromycine est un antibiotique macrolide (groupe AWaRe Watch) à prise courte.",
    usage: "Traite certaines infections respiratoires, ORL, cutanées et sexuellement transmissibles dues à des bactéries sensibles.",
    posology: "Souvent une cure courte (par ex. 3 à 5 jours), selon la prescription. Respecter la dose et la durée.",
    contraindications: ["Allergie aux macrolides", "Atteinte hépatique grave"],
    sideEffects: ["Troubles digestifs", "Allongement de l'intervalle QT (troubles du rythme)", "Réactions allergiques"],
    precautions: ["Prudence en cas de troubles du rythme cardiaque", "Antibiotique du groupe Watch : usage à préserver"],
    interactions: ["Médicaments allongeant le QT", "Anticoagulants oraux", "Antiacides (espacer les prises)"],
    professionalAdvice:
      "À utiliser uniquement sur prescription. Terminez la cure pour limiter l'antibiorésistance.",
    relatedPathologies: [],
    withoutPrescription: false,
    clinicalSources: ["OMS — Classification AWaRe des antibiotiques", ...OMS],
    clinicalReviewStatus: "draft",
  },
  "artemether-lumefantrine": {
    summary:
      "L'association artéméther + luméfantrine (ACT) est un traitement de référence du paludisme simple à Plasmodium falciparum.",
    usage:
      "Traite le paludisme non compliqué. Les combinaisons thérapeutiques à base d'artémisinine (ACT) sont recommandées par l'OMS pour préserver leur efficacité.",
    posology:
      "Schéma sur 3 jours adapté au poids, à prendre avec un aliment gras pour favoriser l'absorption. Posologie définie par le professionnel de santé.",
    contraindications: ["Paludisme grave (relève d'un traitement injectable en urgence)", "Premier trimestre de grossesse (sauf avis spécialisé)"],
    sideEffects: ["Maux de tête, vertiges", "Troubles digestifs", "Allongement du QT"],
    precautions: ["Confirmer le diagnostic (TDR/goutte épaisse) avant traitement", "Surveiller la persistance de la fièvre"],
    interactions: ["Médicaments allongeant le QT", "Inducteurs/inhibiteurs enzymatiques"],
    professionalAdvice:
      "Devant une fièvre en zone d'endémie, faites un test de diagnostic rapide. Un paludisme grave est une urgence vitale : consultez immédiatement.",
    relatedPathologies: [],
    withoutPrescription: false,
    clinicalSources: ["OMS — Lignes directrices pour le traitement du paludisme", ...OMS],
    clinicalReviewStatus: "draft",
  },
  diazepam: {
    summary:
      "Le diazépam est une benzodiazépine utilisée comme anticonvulsivant, anxiolytique et myorelaxant. Médicament à usage strictement encadré.",
    usage:
      "Traite les crises convulsives (notamment fébriles de l'enfant), l'état de mal épileptique et certaines situations d'anxiété ou de sevrage, sous contrôle médical.",
    posology:
      "Posologie et voie (orale, injectable, rectale) strictement définies par le médecin selon l'urgence et le poids.",
    contraindications: ["Insuffisance respiratoire sévère", "Apnées du sommeil", "Myasthénie", "Insuffisance hépatique sévère"],
    sideEffects: ["Somnolence", "Dépression respiratoire", "Dépendance en cas d'usage prolongé"],
    precautions: ["Risque de dépendance : durée la plus courte possible", "Ne pas conduire", "Ne pas associer à l'alcool"],
    interactions: ["Alcool", "Autres dépresseurs du système nerveux central", "Opioïdes (risque de dépression respiratoire)"],
    professionalAdvice:
      "Médicament à ne jamais utiliser en automédication. L'arrêt doit être progressif et médicalement encadré.",
    relatedPathologies: [],
    withoutPrescription: false,
    clinicalSources: OMS,
    clinicalReviewStatus: "draft",
  },
};

/** Merge clinical enrichments onto the raw LME list, by slug. */
export function applyEnrichments(list: Medication[]): Medication[] {
  return list.map((m) => {
    const e = ENRICHMENTS[m.slug];
    return e ? { ...m, ...e } : m;
  });
}
