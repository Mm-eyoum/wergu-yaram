import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Check,
  Eye,
  EyeOff,
  Languages,
  Leaf,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { InterestSelector } from "@/components/auth/InterestSelector";
import { cn } from "@/lib/cn";
import { SENEGAL_REGIONS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { SEOHead } from "@/seo/SEOHead";

const LANGUAGES = [
  { value: "fr", label: "Français" },
  { value: "wo", label: "Wolof" },
  { value: "en", label: "English" },
];

/** Lightweight password strength estimate → 0 (empty) … 4 (strong). */
function passwordScore(pwd: string): number {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 4);
}

/** Bar colour per strength level (0 = empty). Labels are translated at render. */
const STRENGTH_COLORS = ["", "bg-danger", "bg-warning", "bg-brand-teal", "bg-brand-green"] as const;
const STRENGTH_KEYS = ["", "weak", "medium", "good", "strong"] as const;

export default function Register() {
  const { t } = useTranslation("auth");
  const { user, register, loginWithGoogle, configured } = useAuth();
  const navigate = useNavigate();
  const STEPS = [t("register.steps.account"), t("register.steps.health"), t("register.steps.confirm")];

  // Redirect only once the auth context has populated `user`. `register()` sets
  // it before resolving, but `loginWithGoogle()` does not — navigating from the
  // handler would race ProtectedRoute (user still null) and bounce to /connexion.
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("fr");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [region, setRegion] = useState(SENEGAL_REGIONS[1]);
  const [interests, setInterests] = useState<string[]>([]);
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function next() {
    setError("");
    if (step === 0) {
      if (!firstName || !lastName || !email || !password) {
        setError(t("register.errRequired"));
        return;
      }
      if (password.length < 8) {
        setError(t("register.errPasswordShort"));
        return;
      }
      if (password !== confirm) {
        setError(t("register.errPasswordMismatch"));
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleSubmit() {
    setError("");
    if (!accept) {
      setError(t("register.errAcceptTerms"));
      return;
    }
    setLoading(true);
    try {
      await register({
        email,
        password,
        displayName: `${firstName} ${lastName}`.trim(),
        region,
        phone,
        language,
        interests,
      });
      // Redirection handled by the effect once `user` is populated; keep the
      // button in its loading state until then (no setLoading(false) here).
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("configuré")
          ? t("register.errFirebase")
          : t("register.errCreate"),
      );
      setLoading(false);
    }
  }

  return (
    <>
      <SEOHead title={t("register.seoTitle")} description={t("register.seoDesc")} noIndex />
      <AuthLayout
      aside={
        <div className="flex h-full flex-col">
          <h2 className="text-2xl font-extrabold leading-tight">
            {t("register.asideTitleLead")}
            <br />
            <span className="text-brand-green">{t("register.asideTitleHighlight")}</span> {t("register.asideTitleTail")}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">{t("register.asideText")}</p>
          <div className="mt-8 grid place-items-center">
            <span className="grid h-40 w-40 place-items-center rounded-full bg-white/60 text-brand-green shadow-soft">
              <Leaf className="h-20 w-20" />
            </span>
          </div>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-lg card-surface p-7">
        {/* Stepper */}
        <ol className="mb-6 flex items-center">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full text-sm font-bold",
                    i <= step ? "bg-brand-green text-white" : "bg-border-soft text-text-secondary",
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={cn("text-sm font-medium", i <= step ? "text-text-primary" : "text-text-secondary")}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span className={cn("mx-2 h-px flex-1", i < step ? "bg-brand-green" : "bg-border-soft")} />
              )}
            </li>
          ))}
        </ol>

        {error && <p className="mb-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {!configured && step === 0 && (
          <p className="mb-4 rounded-xl bg-warning/10 px-3 py-2 text-xs text-[#8a5a10]">
            {t("register.firebaseNotConfigured")}
          </p>
        )}

        {/* Step 1 — Account */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput label={t("fields.firstName")} required value={firstName} onChange={(e) => setFirstName(e.target.value)} leftIcon={<User className="h-4 w-4" />} />
              <FormInput label={t("fields.lastName")} required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <FormInput label={t("fields.email")} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail className="h-4 w-4" />} autoComplete="email" />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label={t("fields.phone")}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="h-4 w-4" />}
                autoComplete="tel"
                placeholder={t("fields.phonePlaceholder")}
              />
              <div>
                <label htmlFor="register-language" className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("fields.language")}
                </label>
                <div className="relative">
                  <Languages className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                  <select
                    id="register-language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border-soft bg-white pl-10 pr-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label={t("fields.password")}
                type={showPwd ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                autoComplete="new-password"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? t("register.hidePassword") : t("register.showPassword")}
                    className="grid h-7 w-7 place-items-center rounded-lg text-text-secondary hover:text-brand-green"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
              <FormInput label={t("fields.confirm")} type={showPwd ? "text" : "password"} required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            {password && (
              <div aria-live="polite">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        i <= passwordScore(password)
                          ? STRENGTH_COLORS[passwordScore(password)]
                          : "bg-border-soft",
                      )}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {t("register.strengthLabel", {
                    level: STRENGTH_KEYS[passwordScore(password)]
                      ? t(`register.strength.${STRENGTH_KEYS[passwordScore(password)]}`)
                      : "—",
                  })}
                </p>
              </div>
            )}
            <Button fullWidth size="lg" onClick={next}>
              {t("register.continue")}
            </Button>
            <GoogleButton onClick={() => loginWithGoogle().catch(() => setError(t("register.errGoogle")))} />
          </div>
        )}

        {/* Step 2 — Health profile */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="register-region" className="mb-1.5 block text-sm font-medium text-text-primary">{t("fields.region")}</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <select
                  id="register-region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border-soft bg-white pl-10 pr-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                >
                  {SENEGAL_REGIONS.slice(1).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-text-primary">{t("register.interests")}</p>
              <InterestSelector value={interests} onChange={setInterests} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                {t("register.back")}
              </Button>
              <Button fullWidth onClick={next}>
                {t("register.continue")}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirmation */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-brand-mint p-4 text-sm">
              <p className="font-bold text-text-primary">{t("register.summary")}</p>
              <dl className="mt-2 space-y-1 text-text-secondary">
                <div className="flex justify-between"><dt>{t("register.sumName")}</dt><dd className="font-medium text-text-primary">{firstName} {lastName}</dd></div>
                <div className="flex justify-between"><dt>{t("register.sumEmail")}</dt><dd className="font-medium text-text-primary">{email}</dd></div>
                {phone && <div className="flex justify-between"><dt>{t("register.sumPhone")}</dt><dd className="font-medium text-text-primary">{phone}</dd></div>}
                <div className="flex justify-between"><dt>{t("register.sumRegion")}</dt><dd className="font-medium text-text-primary">{region}</dd></div>
                <div className="flex justify-between"><dt>{t("register.sumInterests")}</dt><dd className="font-medium text-text-primary">{interests.length || "—"}</dd></div>
              </dl>
            </div>
            <label className="flex items-start gap-2.5 text-sm text-text-secondary">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-green" />
              <span>
                {t("register.acceptPre")}{" "}
                <Link
                  to="/conditions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-green hover:underline"
                >
                  {t("register.acceptTerms")}
                </Link>{" "}
                {t("register.acceptPost")}
              </span>
            </label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                {t("register.back")}
              </Button>
              <Button fullWidth size="lg" onClick={handleSubmit} disabled={loading}>
                {loading ? t("register.submitting") : t("register.submit")}
              </Button>
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-sm text-text-secondary">
          {t("register.haveAccount")}{" "}
          <Link to="/connexion" className="font-semibold text-brand-green hover:underline">
            {t("register.signIn")}
          </Link>
        </p>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-secondary">
          <ShieldCheck className="h-4 w-4 text-brand-green" />
          {t("register.dataProtected")}
        </p>
      </div>
      </AuthLayout>
    </>
  );
}
