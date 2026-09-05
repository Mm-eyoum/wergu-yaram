import { useState } from "react";
import { HandHeart, HeartHandshake, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { recordSupportIntent, isValidEmail } from "@/services/engagement";
import { formatFcfa } from "@/lib/format";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { SEOHead } from "@/seo/SEOHead";
import { breadcrumbJsonLd } from "@/seo/jsonld";

/** Suggested monthly support amounts (XOF). */
const MONTHLY_AMOUNTS = [2000, 5000, 10000, 25000];

const REASONS = [
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Un contenu santé vérifié et gratuit",
    text: "Votre soutien finance la relecture éditoriale du référentiel médical, accessible à tous sans paywall.",
  },
  {
    icon: <HandHeart className="h-5 w-5" />,
    title: "Des structures mieux équipées",
    text: "La plateforme connecte donateurs et besoins d'équipement des structures de santé près de chez vous.",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Une communauté qui dure",
    text: "Modération, support et nouvelles fonctionnalités : un don régulier rend le service pérenne.",
  },
];

/**
 * « Soutenir Wergu Yaram » — landing de don récurrent (Ligne 1).
 *
 * Le prélèvement mensuel automatique n'est pas réaliste sur mobile money : on
 * capture l'intention (email + montant mensuel souhaité) pour recontacter le
 * donateur, et on propose un don ponctuel immédiat vers les besoins urgents.
 */
export default function Soutenir() {
  const { notify } = useToast();
  const [amount, setAmount] = useState<number>(MONTHLY_AMOUNTS[1]);
  const [custom, setCustom] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const monthlyAmount = custom ? Number(custom) : amount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      notify("Veuillez saisir une adresse email valide.", "error");
      return;
    }
    if (!monthlyAmount || monthlyAmount < 500) {
      notify("Le montant mensuel minimum est de 500 FCFA.", "error");
      return;
    }
    setLoading(true);
    try {
      await recordSupportIntent({ email, monthlyAmount });
      track("support_intent_submitted", { monthlyAmount });
      setDone(true);
      notify("Merci ! Nous vous recontactons pour activer votre soutien mensuel.", "success");
    } catch {
      notify("Envoi momentanément indisponible. Réessayez plus tard.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SEOHead
        title="Soutenir Wergu Yaram"
        description="Soutenez le portail santé du Sénégal : un don régulier finance un contenu vérifié, gratuit et une communauté solidaire."
        canonicalPath="/soutenir"
        jsonLd={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Soutenir", path: "/soutenir" },
        ])}
      />

      {/* Hero */}
      <section className="bg-mint-fade">
        <div className="container-page py-14 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-green/10 px-3 py-1 text-sm font-semibold text-brand-green">
            <HeartHandshake className="h-4 w-4" /> Votre soutien compte
          </span>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">
            Soutenir <span className="text-brand-green">Wergu Yaram</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-text-secondary">
            Wergu Yaram est gratuit pour tous les Sénégalais. Un don régulier nous permet de garder
            le contenu santé vérifié, d'aider les structures à s'équiper et de faire vivre la communauté.
          </p>
        </div>
      </section>

      <div className="container-page grid gap-8 py-12 lg:grid-cols-[1.1fr_1fr]">
        {/* Why support */}
        <div>
          <h2 className="text-xl font-bold">Pourquoi nous soutenir ?</h2>
          <div className="mt-4 space-y-4">
            {REASONS.map((r) => (
              <div key={r.title} className="card-surface flex gap-4 p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-green/10 text-brand-green">
                  {r.icon}
                </span>
                <div>
                  <h3 className="font-bold text-text-primary">{r.title}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{r.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl bg-brand-soft p-6">
            <h3 className="font-bold text-text-primary">Vous préférez agir tout de suite ?</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Faites un don ponctuel à une campagne d'équipement urgente — chaque franc va directement
              à une structure de santé.
            </p>
            <ButtonLink to="/besoins" variant="outline" className="mt-4">
              Voir les besoins urgents <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
        </div>

        {/* Monthly support intent */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="card-surface p-6">
            <h2 className="text-lg font-bold text-text-primary">Devenir soutien mensuel</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Choisissez un montant ; nous vous recontactons pour activer votre soutien (Wave, Orange Money…).
            </p>

            {done ? (
              <div className="mt-5 rounded-2xl bg-brand-mint p-5 text-center">
                <HeartHandshake className="mx-auto h-8 w-8 text-brand-green" />
                <p className="mt-2 font-semibold text-text-primary">Merci infiniment !</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Votre intention de soutien de {formatFcfa(monthlyAmount)}/mois est enregistrée.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-text-primary">Montant mensuel</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {MONTHLY_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setAmount(amt);
                          setCustom("");
                        }}
                        className={cn(
                          "min-h-[44px] rounded-xl border px-2 text-sm font-semibold transition-colors",
                          !custom && amount === amt
                            ? "border-brand-green bg-brand-green/10 text-brand-green"
                            : "border-border-soft text-text-secondary hover:border-brand-teal",
                        )}
                      >
                        {amt.toLocaleString("fr-FR")} / mois
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={500}
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="Autre montant (FCFA)"
                    className="mt-2 h-11 w-full rounded-xl border border-border-soft bg-white px-3.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                  />
                </fieldset>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-text-primary">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    className="h-11 w-full rounded-xl border border-border-soft bg-white px-3.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                  />
                </label>

                <Button type="submit" fullWidth size="lg" disabled={loading}>
                  <HeartHandshake className="h-5 w-5" />
                  {loading ? "Envoi…" : "Je deviens soutien"}
                </Button>
                <p className="text-center text-xs text-text-secondary">
                  Aucun montant n'est débité maintenant — nous vous recontactons.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
