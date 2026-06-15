import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  online?: boolean;
}

const sizes = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
};

/** Circular avatar — image when available, gradient initials otherwise. */
export function Avatar({ name, src, size = "md", className, online }: AvatarProps) {
  return (
    <span className={cn("relative inline-block shrink-0", className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn("rounded-full object-cover", sizes[size])}
          loading="lazy"
        />
      ) : (
        <span
          className={cn(
            "grid place-items-center rounded-full bg-brand-gradient font-bold text-white",
            sizes[size],
          )}
          aria-hidden
        >
          {initials(name)}
        </span>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-green" />
      )}
    </span>
  );
}
