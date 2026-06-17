import { useAppearance } from "@/hooks/useSiteConfig";

/** Site-wide announcement bar, configured under admin → Apparence. */
export function AnnouncementBanner() {
  const { data } = useAppearance();
  const banner = data?.banner;
  if (!banner?.enabled || !banner.message.trim()) return null;

  const accent = data?.accentColor || "#007A5E";
  return (
    <div style={{ backgroundColor: accent }} className="text-white">
      <div className="container-page py-2 text-center text-sm font-medium">
        {banner.href ? (
          <a href={banner.href} className="hover:underline">
            {banner.message}
          </a>
        ) : (
          <span>{banner.message}</span>
        )}
      </div>
    </div>
  );
}
