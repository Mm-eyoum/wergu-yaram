/**
 * Schema.org JSON-LD generators — one per content type.
 *
 * All URLs are made absolute via siteUrl helpers so the structured data is
 * valid both at runtime and in the prerendered HTML.
 */
import type {
  Article,
  Medication,
  Pathology,
  Facility,
  Community,
  HealthEvent,
  EquipmentNeed,
} from "@/types/domain";
import { absoluteUrl, ogCrop } from "./siteUrl";
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  LOGO_PATH,
  SOCIAL_PROFILES,
  CONTACT_EMAIL,
  EDITORIAL_SOURCE,
} from "./config";

/** Publisher block reused by content schemas. */
function publisher() {
  return {
    "@type": "Organization",
    name: SITE_NAME,
    logo: { "@type": "ImageObject", url: absoluteUrl(LOGO_PATH) },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl(LOGO_PATH),
    description: SITE_DESCRIPTION,
    sameAs: SOCIAL_PROFILES,
    contactPoint: {
      "@type": "ContactPoint",
      email: CONTACT_EMAIL,
      contactType: "customer service",
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "fr",
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/recherche")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function articleJsonLd(article: Article) {
  return {
    "@context": "https://schema.org",
    "@type": article.type === "video" ? "VideoObject" : "Article",
    headline: article.title,
    description: article.excerpt,
    image: [absoluteUrl(ogCrop(article.cover))],
    datePublished: article.publishedAt,
    dateModified: article.trust.updatedAt || article.publishedAt,
    author: { "@type": "Person", name: article.author.name },
    publisher: publisher(),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/articles/${article.slug}`) },
    articleSection: article.category,
    inLanguage: "fr",
  };
}

export function drugJsonLd(med: Medication) {
  return {
    "@context": "https://schema.org",
    "@type": "Drug",
    name: med.name,
    activeIngredient: med.family,
    description: med.summary,
    dosageForm: med.forms.join(", "),
    url: absoluteUrl(`/medicaments/${med.slug}`),
    isProprietary: false,
    availableStrength: { "@type": "DrugStrength", description: med.dosage },
    nonProprietaryName: med.dci ?? med.name,
    warning: (med.precautions ?? []).join(" "),
  };
}

export function pathologyJsonLd(p: Pathology) {
  const condition = {
    "@context": "https://schema.org",
    "@type": "MedicalCondition",
    name: p.name,
    description: p.summary,
    url: absoluteUrl(`/pathologies/${p.slug}`),
    signOrSymptom: p.symptoms.map((s) => ({ "@type": "MedicalSymptom", name: s })),
    possibleTreatment: p.treatments.map((t) => ({ "@type": "MedicalTherapy", name: t })),
  };
  return condition;
}

export function faqJsonLd(faq: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function facilityJsonLd(f: Facility) {
  return {
    "@context": "https://schema.org",
    "@type": "Hospital",
    name: f.name,
    description: f.description,
    image: [absoluteUrl(ogCrop(f.cover))],
    url: absoluteUrl(`/etablissements/${f.slug}`),
    telephone: f.phone,
    email: f.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: f.address,
      addressLocality: f.city,
      addressRegion: f.region,
      addressCountry: "SN",
    },
    geo: { "@type": "GeoCoordinates", latitude: f.coords.lat, longitude: f.coords.lng },
    medicalSpecialty: f.specialties,
    aggregateRating:
      f.reviewsCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: f.rating,
            reviewCount: f.reviewsCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };
}

export function communityJsonLd(c: Community) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: c.name,
    description: c.description,
    url: absoluteUrl(`/communautes/${c.slug}`),
    parentOrganization: { "@type": "Organization", name: SITE_NAME },
  };
}

export function eventJsonLd(e: HealthEvent) {
  const online = e.mode === "En ligne";
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    description: e.summary,
    image: [absoluteUrl(ogCrop(e.cover))],
    startDate: e.startAt,
    endDate: e.endAt,
    eventAttendanceMode: online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : e.mode === "Hybride"
        ? "https://schema.org/MixedEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: online
      ? { "@type": "VirtualLocation", url: absoluteUrl(`/evenements/${e.id}`) }
      : {
          "@type": "Place",
          name: e.location,
          address: { "@type": "PostalAddress", addressLocality: e.city, addressCountry: "SN" },
          geo: { "@type": "GeoCoordinates", latitude: e.coords.lat, longitude: e.coords.lng },
        },
    organizer: { "@type": "Organization", name: e.organizer },
    offers: {
      "@type": "Offer",
      price: /gratuit/i.test(e.price) ? "0" : e.price,
      priceCurrency: "XOF",
      availability: e.seatsLeft > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url: absoluteUrl(`/evenements/${e.id}`),
    },
  };
}

export function equipmentNeedJsonLd(n: EquipmentNeed) {
  return {
    "@context": "https://schema.org",
    "@type": "DonateAction",
    name: n.title,
    description: n.shortDescription,
    url: absoluteUrl(`/besoins/${n.id}`),
    recipient: { "@type": "Organization", name: n.facilityName },
    price: n.targetAmount,
    priceCurrency: "XOF",
  };
}

export { EDITORIAL_SOURCE };
