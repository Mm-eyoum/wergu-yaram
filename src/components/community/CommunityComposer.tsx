import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { createCommunityPost } from "@/services/communityPosts";
import { auth } from "@/services/firebase";

/** Post composer for community feeds — publishes to Firestore. */
export function CommunityComposer({ communitySlug }: { communitySlug: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");

  const publish = useMutation({
    mutationFn: async () => {
      const fbUser = auth?.currentUser;
      if (!fbUser || !user) throw new Error("anon");
      await createCommunityPost(fbUser, user, communitySlug, { content: value.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityPosts", communitySlug] });
      setValue("");
      notify("Publication partagée ✓", "success");
    },
    onError: (err) => {
      if (err instanceof Error && err.message === "anon") {
        notify("Connectez-vous pour publier.", "info");
        navigate("/connexion");
      } else {
        notify("La publication a échoué. Votre compte est peut-être en attente de validation.", "error");
      }
    },
  });

  return (
    <div className="card-surface p-4">
      <div className="flex gap-3">
        <Avatar name={user?.displayName ?? "Vous"} src={user?.photoURL} size="md" />
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Partagez une expérience, posez une question, donnez un conseil…"
          rows={2}
          className="min-h-[44px] flex-1 resize-none rounded-2xl border border-border-soft bg-brand-soft px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/70 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
        />
      </div>
      <div className="mt-3 flex items-center justify-end">
        <Button
          size="sm"
          disabled={!value.trim() || publish.isPending}
          onClick={() => publish.mutate()}
        >
          <Send className="h-4 w-4" /> {publish.isPending ? "Publication…" : "Publier"}
        </Button>
      </div>
    </div>
  );
}
