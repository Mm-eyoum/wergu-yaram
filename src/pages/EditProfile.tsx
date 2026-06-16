import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, MapPin, User } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { InterestSelector } from "@/components/auth/InterestSelector";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { SENEGAL_REGIONS } from "@/lib/constants";
import { updateOwnProfile, uploadAvatar } from "@/services/profile";
import { SEOHead } from "@/seo/SEOHead";

export default function EditProfile() {
  const { user, refreshProfile } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [region, setRegion] = useState(user?.region || SENEGAL_REGIONS[1]);
  const [interests, setInterests] = useState<string[]>(user?.interests ?? []);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user?.photoURL ?? null);
  const [error, setError] = useState("");

  function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Le fichier doit être une image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 5 Mo.");
      return;
    }
    setError("");
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("anon");
      let photoURL = user.photoURL ?? null;
      if (avatarFile) photoURL = await uploadAvatar(user.uid, avatarFile);
      await updateOwnProfile(user.uid, {
        displayName: displayName.trim(),
        region,
        interests,
        photoURL,
      });
      await refreshProfile();
    },
    onSuccess: () => {
      notify("Profil mis à jour ✓", "success");
      navigate("/dashboard");
    },
    onError: () => notify("Impossible d'enregistrer le profil.", "error"),
  });

  if (!user) return null;

  return (
    <div className="container-page max-w-xl py-8">
      <SEOHead title="Mon profil" noIndex />

      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand-green">
        <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
      </Link>

      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <User className="h-6 w-6 text-brand-green" /> Mon profil
        </h1>
        <p className="mt-1 text-sm text-text-secondary">Mettez à jour vos informations personnelles.</p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!displayName.trim()) {
            setError("Le nom est obligatoire.");
            return;
          }
          setError("");
          save.mutate();
        }}
        className="card-surface space-y-5 p-6"
      >
        {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar name={displayName || "Utilisateur"} src={preview} size="lg" />
          <div>
            <input ref={fileInput} type="file" accept="image/*" onChange={pickAvatar} className="hidden" />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              <Camera className="h-4 w-4" /> Changer la photo
            </Button>
            <p className="mt-1 text-xs text-text-secondary">JPG ou PNG, 5 Mo max.</p>
          </div>
        </div>

        <FormInput label="Nom complet" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} leftIcon={<User className="h-4 w-4" />} />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Email</label>
          <FormInput value={user.email ?? ""} disabled hint="L'adresse email ne peut pas être modifiée ici." />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Région</label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <select
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
          <p className="mb-2 text-sm font-medium text-text-primary">Centres d'intérêt santé</p>
          <InterestSelector value={interests} onChange={setInterests} />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Annuler</Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
