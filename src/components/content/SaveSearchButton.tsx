import { useNavigate } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { dashboardKeys } from "@/hooks/useDashboardData";
import { saveSearch } from "@/services/userData";

/** Saves the current query/scope to the user's dashboard. */
export function SaveSearchButton({ query, scope }: { query: string; scope?: string }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const navigate = useNavigate();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => saveSearch(uid!, { query, scope }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.savedSearches(uid!) });
      notify("Recherche sauvegardée ✓", "success");
    },
    onError: () => notify("Impossible de sauvegarder la recherche.", "error"),
  });

  function handleClick() {
    if (!uid) {
      notify("Connectez-vous pour sauvegarder vos recherches.", "info");
      navigate("/connexion");
      return;
    }
    mutation.mutate();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={mutation.isPending || !query.trim()}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border-soft px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-brand-teal hover:text-brand-green disabled:opacity-60"
    >
      <Bookmark className="h-3.5 w-3.5" />
      Sauvegarder cette recherche
    </button>
  );
}
