import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { subscribeNewsletter, isValidEmail } from "@/services/engagement";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

/**
 * Email capture for the newsletter. Writes to `newsletterSignups` (public
 * create, admin read). `source` records where the signup happened (footer,
 * besoin page…). Sending is wired later (ops).
 */
export function NewsletterSignup({
  source = "site",
  className,
  compact = false,
}: {
  source?: string;
  className?: string;
  compact?: boolean;
}) {
  const { notify } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      notify("Veuillez saisir une adresse email valide.", "error");
      return;
    }
    setLoading(true);
    try {
      await subscribeNewsletter(email, source);
      track("newsletter_signup", { source });
      setDone(true);
      setEmail("");
      notify("Merci ! Vous êtes inscrit·e à la newsletter.", "success");
    } catch {
      notify("Inscription momentanément indisponible. Réessayez plus tard.", "error");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className={cn("text-sm text-text-secondary", className)}>
        Merci pour votre inscription — à très vite dans votre boîte mail.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-2 sm:flex-row", className)}>
      <label className="relative flex-1">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Votre adresse email"
          aria-label="Votre adresse email"
          className="h-11 w-full rounded-xl border border-border-soft bg-white pl-9 pr-3.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
        />
      </label>
      <Button type="submit" disabled={loading} size={compact ? "md" : "md"}>
        <Send className="h-4 w-4" />
        {loading ? "…" : "S'inscrire"}
      </Button>
    </form>
  );
}
