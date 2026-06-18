import type {
  Article,
  Community,
  EquipmentNeed,
  Facility,
  HealthEvent,
  Medication,
  Partner,
  Pathology,
  SearchHit,
} from "@/types/domain";
import { categoryLabel, sectorLabel } from "@/lib/facilityTaxonomy";
import { getMockMedications } from "./medicationsLazy";
import { pathologies } from "./mockPathologies";
import { articles } from "./mockArticles";
import { facilities } from "./mockFacilities";
import { communities } from "./mockCommunities";
import { equipmentNeeds } from "./mockEquipmentNeeds";
import { events } from "./mockEvents";
import { partners } from "./mockPartners";

/** The resolved catalog content a federated index is built from. */
export interface SearchContent {
  medications: Medication[];
  pathologies: Pathology[];
  articles: Article[];
  facilities: Facility[];
  communities: Community[];
  events: HealthEvent[];
  equipmentNeeds: EquipmentNeed[];
  partners: Partner[];
}

/**
 * Pure builder: flatten a catalog content bundle into a federated search index.
 * Shared by the app's client-side fallback search and the Typesense indexer, so
 * both index identical hits whatever the source (mock or live Firestore).
 */
export function buildSearchHits(content: SearchContent): SearchHit[] {
  const hits: SearchHit[] = [];

  for (const m of content.medications) {
    hits.push({
      id: `medicament-${m.slug}`,
      type: "medicament",
      title: m.dosage ? `${m.name} ${m.dosage}` : m.name,
      description: m.summary,
      href: `/medicaments/${m.slug}`,
      meta: m.family,
      verified: m.trust.verified,
      badge: m.withoutPrescription
        ? "Sans ordonnance"
        : m.awareCategory
          ? `AWaRe ${m.awareCategory}`
          : undefined,
      keywords: `${m.dci ?? m.name} ${m.name} ${m.dosage} ${m.family} ${m.pharmacoTherapeuticGroup ?? ""} ${(m.forms ?? []).join(" ")} ${m.summary}`.toLowerCase(),
      facets: {
        family: m.family,
        awareCategory: m.awareCategory,
        withoutPrescription: m.withoutPrescription,
        essentialMedicine: m.essentialMedicine,
      },
    });
  }

  for (const p of content.pathologies) {
    hits.push({
      id: `pathologie-${p.slug}`,
      type: "pathologie",
      title: p.name,
      description: p.summary,
      href: `/pathologies/${p.slug}`,
      meta: p.category,
      verified: p.trust.verified,
      keywords: `${p.name} ${p.category} ${p.summary} ${p.symptoms.join(" ")}`.toLowerCase(),
      facets: { category: p.category },
    });
    // Symptoms surface as their own "symptome" hits pointing to the pathology.
    for (const s of p.symptoms.slice(0, 3)) {
      hits.push({
        id: `symptome-${p.slug}-${s.slice(0, 10)}`,
        type: "symptome",
        title: s,
        description: `Symptôme associé à : ${p.name}`,
        href: `/pathologies/${p.slug}`,
        meta: p.name,
        keywords: `${s} ${p.name}`.toLowerCase(),
      });
    }
  }

  for (const a of content.articles) {
    hits.push({
      id: `${a.type}-${a.slug}`,
      type: a.type,
      title: a.title,
      description: a.excerpt,
      href: `/articles/${a.slug}`,
      meta: a.category,
      verified: a.trust.verified,
      thumbnail: a.cover,
      badge: a.type === "video" ? a.videoDurationLabel : undefined,
      keywords: `${a.title} ${a.category} ${a.excerpt}`.toLowerCase(),
      facets: {
        category: a.category,
        articleType: a.type,
        readingMinutes: a.readingMinutes,
        publishedAt: a.publishedAt,
      },
    });
  }

  for (const f of content.facilities) {
    hits.push({
      id: `etablissement-${f.slug}`,
      type: "etablissement",
      title: f.name,
      description: f.description,
      href: `/etablissements/${f.slug}`,
      meta: `${categoryLabel(f.category) || f.type || "Établissement"} · ${f.city}`,
      verified: f.verified,
      thumbnail: f.cover,
      keywords: `${f.name} ${categoryLabel(f.category) || f.type || ""} ${f.city} ${f.region} ${f.specialties.join(" ")}`.toLowerCase(),
      facets: {
        facilityType: categoryLabel(f.category) || f.type,
        sector: sectorLabel(f.sector),
        region: f.region,
        city: f.city,
        specialties: f.specialties,
        rating: f.rating,
      },
    });
  }

  for (const c of content.communities) {
    hits.push({
      id: `communaute-${c.slug}`,
      type: "communaute",
      title: c.name,
      description: c.description,
      href: `/communautes/${c.slug}`,
      meta: `${c.membersCount} membres`,
      keywords: `${c.name} ${c.topic} ${c.description}`.toLowerCase(),
      facets: {
        topic: c.topic,
        isPublic: c.isPublic,
        membersCount: c.membersCount,
      },
    });
  }

  for (const e of content.events) {
    hits.push({
      id: `evenement-${e.id}`,
      type: "evenement",
      title: e.title,
      description: e.summary,
      href: `/evenements/${e.id}`,
      meta: `${e.city} · ${e.mode}`,
      thumbnail: e.cover,
      keywords: `${e.title} ${e.summary} ${e.city}`.toLowerCase(),
      facets: {
        mode: e.mode,
        city: e.city,
        startAt: e.startAt,
      },
    });
  }

  for (const n of content.equipmentNeeds) {
    hits.push({
      id: `besoin-${n.id}`,
      type: "besoin",
      title: n.title,
      description: n.shortDescription,
      href: `/besoins/${n.id}`,
      meta: `${n.facilityName} · ${n.region}`,
      thumbnail: n.cover,
      badge: n.urgency === "urgent" ? "Urgent" : undefined,
      keywords: `${n.title} ${n.shortDescription} ${n.facilityName} ${n.region}`.toLowerCase(),
      facets: {
        category: n.category,
        region: n.region,
        urgency: n.urgency,
        needStatus: n.status,
        daysLeft: n.daysLeft,
      },
    });
  }

  for (const p of content.partners) {
    hits.push({
      id: `partenaire-${p.slug}`,
      type: "partenaire",
      title: p.name,
      description: p.description,
      href: `/partenaires`,
      meta: p.categoryLabel,
      keywords: `${p.name} ${p.categoryLabel} ${p.description}`.toLowerCase(),
      facets: {
        partnerCategory: p.category,
        zone: p.zone,
      },
    });
  }

  return hits;
}

/** Resolve the bundled mock catalog (lazily loads the medication dataset). */
export async function mockSearchContent(): Promise<SearchContent> {
  return {
    medications: await getMockMedications(),
    pathologies,
    articles,
    facilities,
    communities,
    events,
    equipmentNeeds,
    partners,
  };
}

/** Build the federated index from the bundled mock content. */
export async function buildSearchIndex(): Promise<SearchHit[]> {
  return buildSearchHits(await mockSearchContent());
}

/**
 * Cached, lazily-built federated index. The first call triggers the dynamic
 * import of the medication dataset; subsequent calls reuse the same promise.
 */
let indexPromise: Promise<SearchHit[]> | null = null;
export function getSearchIndex(): Promise<SearchHit[]> {
  if (!indexPromise) indexPromise = buildSearchIndex();
  return indexPromise;
}
