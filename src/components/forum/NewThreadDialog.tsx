import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { createForumThread } from "@/services/forum";
import { auth } from "@/services/firebase";
import type { ForumKind } from "@/types/domain";

const KINDS: { value: ForumKind; label: string }[] = [
  { value: "question", label: "Question" },
  { value: "discussion", label: "Discussion" },
  { value: "conseil", label: "Conseil" },
];

export function NewThreadDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ForumKind>("question");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const publish = useMutation({
    mutationFn: async () => {
      const fbUser = auth?.currentUser;
      if (!fbUser || !user) throw new Error("anon");
      await createForumThread(fbUser, user, {
        title: title.trim(),
        excerpt: excerpt.trim(),
        kind,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forumThreads"] });
      notify("Question publiée ✓", "success");
      onClose();
    },
    onError: (err) => {
      if (err instanceof Error && err.message === "anon") {
        notify("Connectez-vous pour publier.", "info");
        navigate("/connexion");
      } else {
        notify("Publication impossible. Votre compte est peut-être en attente de validation.", "error");
      }
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Poser une question"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-card animate-fade-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Poser une question</h2>
          <button onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-xl text-text-secondary hover:bg-brand-mint hover:text-brand-green">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !excerpt.trim()) {
              notify("Le titre et le contenu sont obligatoires.", "error");
              return;
            }
            publish.mutate();
          }}
        >
          <FormInput label="Titre" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Comment gérer l'hypertension au quotidien ?" />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Type</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ForumKind)}
              className="h-11 w-full rounded-xl border border-border-soft bg-white px-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Votre message</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border-soft bg-white px-3.5 py-2.5 text-sm focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            />
          </div>

          <FormInput label="Mots-clés (séparés par des virgules)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="diabète, nutrition" />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={publish.isPending}>
              {publish.isPending ? "Publication…" : "Publier"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
