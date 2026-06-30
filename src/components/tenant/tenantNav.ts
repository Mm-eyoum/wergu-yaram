/** Public navigation for a partner micro-site (sub-domain). */
export interface TenantNavItem {
  key: string;
  label: string;
  to: string;
}

export const TENANT_NAV: TenantNavItem[] = [
  { key: "about", label: "À propos", to: "/a-propos" },
  { key: "communities", label: "Communautés", to: "/communautes" },
  { key: "events", label: "Événements", to: "/evenements" },
  { key: "resources", label: "Ressources", to: "/ressources" },
];
