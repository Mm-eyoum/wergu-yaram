/**
 * Territorial KPIs aggregated by region (for institutional partners). Built from
 * public catalog data (equipment needs + facilities) — anonymized counts only,
 * never individual records.
 */
import { getEquipmentNeeds, getFacilities } from "./catalog";

export interface RegionStats {
  region: string;
  needs: number;
  raised: number; // XOF cumulés
  target: number;
  facilities: number;
  donors: number;
}

export async function getTerritorialStats(): Promise<RegionStats[]> {
  const [needs, facilities] = await Promise.all([getEquipmentNeeds(), getFacilities()]);
  const map = new Map<string, RegionStats>();
  const row = (region: string): RegionStats => {
    let r = map.get(region);
    if (!r) {
      r = { region, needs: 0, raised: 0, target: 0, facilities: 0, donors: 0 };
      map.set(region, r);
    }
    return r;
  };

  for (const n of needs) {
    if (!n.region) continue;
    const r = row(n.region);
    r.needs += 1;
    r.raised += n.raisedAmount || 0;
    r.target += n.targetAmount || 0;
    r.donors += n.donorsCount || 0;
  }
  for (const f of facilities) {
    if (!f.region) continue;
    row(f.region).facilities += 1;
  }

  return [...map.values()].sort((a, b) => b.needs - a.needs || b.facilities - a.facilities);
}
