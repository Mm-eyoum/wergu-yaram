import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

/** Wergu Yaram logo (image asset). */
export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <Link to="/" className={cn("inline-flex items-center", className)} aria-label="Wergu Yaram — accueil">
      <img
        src="/logo.png"
        alt="Wergu Yaram"
        className={cn("h-9 w-auto object-contain", withText ? "h-9" : "h-8")}
      />
    </Link>
  );
}
