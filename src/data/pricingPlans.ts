import type { PricingPlan } from "@/types/domain";

/**
 * Plans tarifaires par défaut (scaffold de monétisation).
 *
 * Pricing ancré XOF / Afrique de l'Ouest (cf. analyse business model). Seedés
 * dans la collection `pricingPlans` via `npm run seed`. Le tier gratuit n'est
 * PAS un document : c'est l'absence d'abonnement (page basique de l'annuaire).
 *
 * Ligne 2 — Pages structures : freemium → Vérifié → Pro (-20 % en annuel).
 * Ligne 1 — Dons : pourboire plateforme optionnel (non un plan).
 * Ligne 7 — Espaces partenaires (Kit Digital) : palier d'abonnement public
 *   (PME/associations) ; les institutions/bailleurs relèvent d'une
 *   « Pacte-Convention » annuelle sur devis (hors catalogue, négociée).
 */
export const pricingPlans: PricingPlan[] = [
  {
    id: "pages_verified_monthly",
    name: "Vérifié",
    slug: "pages-verifie",
    description: "Crédibilité et visibilité pour une structure de santé.",
    lineOfBusiness: "pages",
    model: "subscription",
    price: 9900,
    currency: "XOF",
    billingPeriod: "monthly",
    features: [
      "Badge « Vérifié »",
      "Photos et services détaillés",
      "Bouton contact / messagerie",
      "Statistiques de vues",
    ],
    limits: { photos: 20 },
    isActive: true,
    sortOrder: 1,
    trialDays: 14,
  },
  {
    id: "pages_verified_yearly",
    name: "Vérifié (annuel)",
    slug: "pages-verifie-annuel",
    description: "Le plan Vérifié, facturé à l'année (-20 %).",
    lineOfBusiness: "pages",
    model: "subscription",
    price: 95040, // 9 900 × 12 × 0,8
    currency: "XOF",
    billingPeriod: "yearly",
    features: [
      "Tout le plan Vérifié",
      "2 mois offerts (-20 %)",
    ],
    limits: { photos: 20 },
    isActive: true,
    sortOrder: 2,
    trialDays: 14,
  },
  {
    id: "pages_pro_monthly",
    name: "Pro",
    slug: "pages-pro",
    description: "Mise en avant et outils pour les structures actives.",
    lineOfBusiness: "pages",
    model: "subscription",
    price: 24900,
    currency: "XOF",
    billingPeriod: "monthly",
    features: [
      "Tout le plan Vérifié",
      "Mise en avant sur l'annuaire et la carte",
      "Publication d'événements",
      "Réponse prioritaire aux avis",
    ],
    limits: { photos: 100 },
    isActive: true,
    sortOrder: 3,
    trialDays: 14,
  },
  {
    id: "pages_pro_yearly",
    name: "Pro (annuel)",
    slug: "pages-pro-annuel",
    description: "Le plan Pro, facturé à l'année (-20 %).",
    lineOfBusiness: "pages",
    model: "subscription",
    price: 239040, // 24 900 × 12 × 0,8
    currency: "XOF",
    billingPeriod: "yearly",
    features: [
      "Tout le plan Pro",
      "2 mois offerts (-20 %)",
    ],
    limits: { photos: 100 },
    isActive: true,
    sortOrder: 4,
    trialDays: 14,
  },
  {
    id: "partner_kit_monthly",
    name: "Espace partenaire (Kit Digital)",
    slug: "kit-partenaire",
    description:
      "Espace en marque blanche : sous-domaine, CMS, communautés, campagnes SMS/WhatsApp, tableau de bord d'impact + Comité.",
    lineOfBusiness: "partners",
    model: "subscription",
    price: 49000,
    currency: "XOF",
    billingPeriod: "monthly",
    features: [
      "Sous-domaine en marque blanche (<marque>.werguyaram.org)",
      "CMS dédié + communautés par pathologie",
      "Campagnes de prévention SMS / WhatsApp (consenties)",
      "Tableau de bord d'impact + Comité de pilotage",
      "Publication de formations & d'événements (sans surcoût)",
    ],
    isActive: true,
    sortOrder: 5,
    trialDays: null,
  },
  {
    id: "partner_kit_yearly",
    name: "Espace partenaire (Kit Digital, annuel)",
    slug: "kit-partenaire-annuel",
    description: "Le Kit Digital, facturé à l'année (-20 %).",
    lineOfBusiness: "partners",
    model: "subscription",
    price: 470400, // 49 000 × 12 × 0,8
    currency: "XOF",
    billingPeriod: "yearly",
    features: ["Tout le Kit Digital", "2 mois offerts (-20 %)"],
    isActive: true,
    sortOrder: 6,
    trialDays: null,
  },
];
