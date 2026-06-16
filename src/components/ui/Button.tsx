import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-brand-green text-white shadow-soft hover:bg-brand-greenDark active:scale-[0.99]",
  secondary: "bg-brand-navy text-white hover:bg-brand-navy/90 active:scale-[0.99]",
  outline: "border border-border-soft bg-white text-text-primary hover:border-brand-teal hover:text-brand-green",
  ghost: "text-text-secondary hover:bg-brand-mint hover:text-brand-green",
  danger: "bg-danger text-white hover:bg-danger/90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

type ButtonProps = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

interface AnchorProps extends CommonProps {
  to: string;
  className?: string;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", fullWidth, className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

/** Link styled as a button — for navigation CTAs. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  to,
  className,
  children,
}: AnchorProps) {
  return (
    <Link
      to={to}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
    >
      {children}
    </Link>
  );
}
