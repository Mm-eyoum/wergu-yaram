import type { SearchHit } from "@/types/domain";
import { medications } from "./mockMedications";
import { pathologies } from "./mockPathologies";
import { articles } from "./mockArticles";
import { facilities } from "./mockFacilities";
import { communities } from "./mockCommunities";
import { equipmentNeeds } from "./mockEquipmentNeeds";
import { events } from "./mockEvents";
import { partners } from "./mockPartners";

/** Build a flat, federated index of every searchable content object. */
export function buildSearchIndex(): SearchHit[] {
  const hits: SearchHit[] = [];

  for (const m of medications) {
    hits.push({
      id: `medicament-${m.slug}`,
      type: "medicament",
      title: `${m.name} ${m.dosage}`,
      description: m.summary,
      href: `/medicaments/${m.slug}`,
      meta: m.family,
      verified: m.trust.verified,
      badge: m.withoutPrescription ? "Sans ordonnance" : undefined,
      keywords: `${m.name} ${m.dosage} ${m.family} ${m.summary}`.toLowerCase(),
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
    });
  }

  return hits;
}

export const SEARCH_INDEX: SearchHit[] = buildSearchIndex();
