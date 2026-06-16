import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bookmark, Heart, Lock, Mail, ShieldCheck, Users } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { useAuth } from "@/hooks/useAuth";
import { SEOHead } from "@/seo/SEOHead";

const PERKS = [
  { icon: <Bookmark className="h-5 w-5" />, title: "Vos recherches sauvegardées", text: "Retrouvez vos contenus et favoris en un clic." },
  { icon: <Heart className="h-5 w-5" />, title: "Une expérience personnalisée", text: "Des recommandations adaptées à vos intérêts santé." },
  { icon: <Users className="h-5 w-5" />, title: "Une communauté", text: "Échangez et trouvez du soutien au quotidien." },
];

export default function Login() {
  const { login, loginWithGoogle, resetPassword, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(from);
    } catch {
      setError("Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    try {
      await loginWithGoogle();
      navigate(from);
    } catch {
      setError("Connexion Google impossible pour le moment.");
    }
  }

  async function handleReset() {
    if (!email) {
      setError("Saisissez votre email pour réinitialiser le mot de passe.");
      return;
    }
    try {
      await resetPassword(email);
      setInfo("Un email de réinitialisation vous a été envoyé.");
    } catch {
      setError("Impossible d'envoyer l'email de réinitialisation.");
    }
  }

  return (
    <>
      <SEOHead title="Connexion" description="Connectez-vous à votre espace santé Wergu Yaram." noIndex />
      <AuthLayout
      aside={
        <div>
          <h2 className="text-2xl font-extrabold leading-tight">
            Connectez-vous à <br />
            <span className="text-brand-green">votre espace santé</span>
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Accédez à vos recherches, vos communautés et votre suivi, partout et en toute simplicité.
          </p>
          <ul className="mt-8 space-y-4">
            {PERKS.map((perk) => (
              <li key={perk.title} className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-green shadow-soft">
                  {perk.icon}
                </span>
                <div>
                  <p className="font-bold text-text-primary">{perk.title}</p>
                  <p className="text-sm text-text-secondary">{perk.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-md card-surface p-7">
        <h1 className="text-xl font-extrabold">Connexion</h1>
        <p className="mt-1 text-sm text-text-secondary">Heureux de vous revoir 👋</p>

        {!configured && (
          <p className="mt-4 rounded-xl bg-warning/10 px-3 py-2 text-xs text-[#8a5a10]">
            Firebase n'est pas configuré : renseignez les variables VITE_FIREBASE_* dans .env.local.
          </p>
        )}
        {error && <p className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {info && <p className="mt-4 rounded-xl bg-brand-green/10 px-3 py-2 text-sm text-brand-green">{info}</p>}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <FormInput
            label="Adresse email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            leftIcon={<Mail className="h-4 w-4" />}
            autoComplete="email"
          />
          <div>
            <FormInput
              label="Mot de passe"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={handleReset}
              className="mt-1.5 text-xs font-semibold text-brand-green hover:underline"
            >
              Mot de passe oublié ?
            </button>
          </div>

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-text-secondary">
          <span className="h-px flex-1 bg-border-soft" /> ou <span className="h-px flex-1 bg-border-soft" />
        </div>

        <GoogleButton onClick={handleGoogle} />

        <p className="mt-5 text-center text-sm text-text-secondary">
          Vous n'avez pas de compte ?{" "}
          <Link to="/inscription" className="font-semibold text-brand-green hover:underline">
            Créer un compte
          </Link>
        </p>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-text-secondary">
          <ShieldCheck className="h-4 w-4 text-brand-green" />
          Connexion sécurisée et confidentielle
        </p>
      </div>
      </AuthLayout>
    </>
  );
}
