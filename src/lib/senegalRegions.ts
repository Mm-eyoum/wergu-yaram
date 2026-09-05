import type { Coords } from "@/types/domain";

/** Approximate centroids of the main Senegalese regions (for the territorial map). */
export const REGION_CENTROIDS: Record<string, Coords> = {
  Dakar: { lat: 14.7167, lng: -17.4677 },
  "Thiès": { lat: 14.7833, lng: -16.9333 },
  "Saint-Louis": { lat: 16.0179, lng: -16.4896 },
  Ziguinchor: { lat: 12.5833, lng: -16.2719 },
  Kaolack: { lat: 14.1652, lng: -16.0726 },
  Diourbel: { lat: 14.6552, lng: -16.2314 },
  Louga: { lat: 15.6144, lng: -16.2244 },
  Tambacounda: { lat: 13.7708, lng: -13.6673 },
};
