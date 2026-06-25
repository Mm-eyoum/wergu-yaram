import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

export default function Login() {
  const { t } = useTranslation("auth");
  const { user, login, loginWithGoogle, resetPassword, configured } = useAuth();
  const perks = [
    { icon: <Bookmark className="h-5 w-5" />, title: t("login.perks.savedTitle"), text: t("login.perks.savedText") },
    { icon: <Heart className="h-5 w-5" />, title: t("login.perks.personalizedTitle"), text: t("login.perks.personalizedText") },
    { icon: <Users className="h-5 w-5" />, title: t("login.perks.communityTitle"), text: t("login.perks.communityText") },
  ];
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
      setError(t("login.errInvalid"));
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    try {
      await loginWithGoogle();
      // Redirection handled by the effect once `user` is populated.
    } catch {
      setError(t("login.errGoogle"));
    }
  }

  async function handleReset() {
    if (!email) {
      setError(t("login.errResetNoEmail"));
      return;
    }
    try {
      await resetPassword(email);
      setInfo(t("login.infoResetSent"));
    } catch {
      setError(t("login.errResetFailed"));
    }
  }

  return (
    <>
      <SEOHead title={t("login.seoTitle")} description={t("login.seoDesc")} noIndex />
      <AuthLayout
      aside={
        <div>
          <h2 className="text-2xl font-extrabold leading-tight">
            {t("login.asideTitleLead")} <br />
            <span className="text-brand-green">{t("login.asideTitleHighlight")}</span>
          </h2>
          <p className="mt-2 text-sm text-text-secondary">{t("login.asideText")}</p>
          <ul className="mt-8 space-y-4">
            {perks.map((perk) => (
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
        <h1 className="text-xl font-extrabold">{t("login.title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("login.subtitle")}</p>

        {!configured && (
          <p className="mt-4 rounded-xl bg-warning/10 px-3 py-2 text-xs text-[#8a5a10]">
            {t("login.firebaseNotConfigured")}
          </p>
        )}
        {error && <p className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {info && <p className="mt-4 rounded-xl bg-brand-green/10 px-3 py-2 text-sm text-brand-green">{info}</p>}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <FormInput
            label={t("fields.email")}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("fields.emailPlaceholder")}
            leftIcon={<Mail className="h-4 w-4" />}
            autoComplete="email"
          />
          <div>
            <FormInput
              label={t("fields.password")}
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
                {t("login.remember")}
              </label>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-brand-green hover:underline"
              >
                {t("login.forgot")}
              </button>
            </div>
          </div>

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? t("login.submitting") : t("login.submit")}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-text-secondary">
          <span className="h-px flex-1 bg-border-soft" /> {t("login.or")} <span className="h-px flex-1 bg-border-soft" />
        </div>

        <GoogleButton onClick={handleGoogle} />

        <p className="mt-5 text-center text-sm text-text-secondary">
          {t("login.noAccount")}{" "}
          <Link to="/inscription" className="font-semibold text-brand-green hover:underline">
            {t("login.createAccount")}
          </Link>
        </p>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-text-secondary">
          <ShieldCheck className="h-4 w-4 text-brand-green" />
          {t("login.secure")}
        </p>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-secondary">
          <LifeBuoy className="h-4 w-4 text-brand-green" />
          {t("login.needHelp")}{" "}
          <a href="mailto:support@werguyaram.sn" className="font-semibold text-brand-green hover:underline">
            {t("login.contactSupport")}
          </a>
        </p>
      </div>
      </AuthLayout>
    </>
  );
}
