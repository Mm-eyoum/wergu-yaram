import type { SearchHit } from "@/types/domain";
import { getMockMedications } from "./medicationsLazy";
import { pathologies } from "./mockPathologies";
import { articles } from "./mockArticles";
import { facilities } from "./mockFacilities";
import { communities } from "./mockCommunities";
import { equipmentNeeds } from "./mockEquipmentNeeds";
import { events } from "./mockEvents";
import { partners } from "./mockPartners";

/** Build a flat, federated index of every searchable content object. */
export async function buildSearchIndex(): Promise<SearchHit[]> {
  const hits: SearchHit[] = [];

  const medications = await getMockMedications();
  for (const m of medications) {
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

  for (const p of pathologies) {
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

  for (const a of articles) {
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

  for (const f of facilities) {
    hits.push({
      id: `etablissement-${f.slug}`,
      type: "etablissement",
      title: f.name,
      description: f.description,
      href: `/etablissements/${f.slug}`,
      meta: `${f.type} · ${f.city}`,
      verified: f.verified,
      thumbnail: f.cover,
      keywords: `${f.name} ${f.type} ${f.city} ${f.region} ${f.specialties.join(" ")}`.toLowerCase(),
      facets: {
        facilityType: f.type,
        region: f.region,
        city: f.city,
        specialties: f.specialties,
        rating: f.rating,
      },
    });
  }

  for (const c of communities) {
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

  for (const e of events) {
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

  for (const n of equipmentNeeds) {
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

  for (const p of partners) {
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

/**
 * Cached, lazily-built federated index. The first call triggers the dynamic
 * import of the medication dataset; subsequent calls reuse the same promise.
 */
let indexPromise: Promise<SearchHit[]> | null = null;
export function getSearchIndex(): Promise<SearchHit[]> {
  if (!indexPromise) indexPromise = buildSearchIndex();
  return indexPromise;
}
