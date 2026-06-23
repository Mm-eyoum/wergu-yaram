import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bookmark, Heart, LifeBuoy, Lock, Mail, ShieldCheck, Users } from "lucide-react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from "firebase/auth";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/services/firebase";
import { SEOHead } from "@/seo/SEOHead";

const PERKS = [
  { icon: <Bookmark className="h-5 w-5" />, title: "Vos recherches sauvegardées", text: "Retrouvez vos contenus et favoris en un clic." },
  { icon: <Heart className="h-5 w-5" />, title: "Une expérience personnalisée", text: "Des recommandations adaptées à vos intérêts santé." },
  { icon: <Users className="h-5 w-5" />, title: "Une communauté", text: "Échangez et trouvez du soutien au quotidien." },
];

export default function Login() {
  const { user, login, loginWithGoogle, resetPassword, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  // Redirect only once the auth context has actually populated `user`.
  // `login()`/`loginWithGoogle()` resolve before onAuthStateChanged → fetchUserProfile
  // runs, so navigating from the handlers would race ProtectedRoute (user still null)
  // and bounce back to /connexion — the "must log in twice" bug.
  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      // "Se souvenir de moi" → keep the session across browser restarts.
      if (auth) {
        await setPersistence(
          auth,
          remember ? browserLocalPersistence : browserSessionPersistence,
        );
      }
      await login(email, password);
      // Redirection handled by the effect once `user` is populated; keep the
      // button in its loading state until then (no setLoading(false) here).
    } catch {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    try {
      await loginWithGoogle();
      // Redirection handled by the effect once `user` is populated.
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
            <div className="mt-2 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 accent-brand-green"
                />
                Se souvenir de moi
              </label>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-brand-green hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
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
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-secondary">
          <LifeBuoy className="h-4 w-4 text-brand-green" />
          Besoin d'aide ?{" "}
          <a href="mailto:support@werguyaram.sn" className="font-semibold text-brand-green hover:underline">
            Contactez le support
          </a>
        </p>
      </div>
      </AuthLayout>
    </>
  );
}
