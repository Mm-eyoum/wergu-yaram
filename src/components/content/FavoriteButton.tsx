import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useFavorites, dashboardKeys } from "@/hooks/useDashboardData";
import { addFavorite, removeFavorite } from "@/services/userData";
import type { ContentType } from "@/types/domain";

interface FavoriteButtonProps {
  type: ContentType;
  refId: string;
  title: string;
  href: string;
  className?: string;
}

/**
 * Toggle an item in the signed-in user's favorites (populates the Dashboard).
 * Anonymous users are redirected to login. Optimistic via query invalidation.
 */
export function FavoriteButton({ type, refId, title, href, className }: FavoriteButtonProps) {
  const { user } = useAuth();
  const uid = user?.uid;
  const navigate = useNavigate();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const favorites = useFavorites(uid);
  const favId = `${type}_${refId}`;
  const isFav = favorites.data?.some((f) => f.id === favId) ?? false;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("anon");
      if (isFav) await removeFavorite(uid, favId);
      else await addFavorite(uid, { type, refId, title, href });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.favorites(uid!) });
      notify(isFav ? "Retiré de vos favoris." : "Ajouté à vos favoris ✓", "success");
    },
    onError: () => notify("Action impossible pour le moment.", "error"),
  });

  function handleClick() {
    if (!uid) {
      notify("Connectez-vous pour enregistrer vos favoris.", "info");
      navigate("/connexion");
      return;
    }
    mutation.mutate();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={mutation.isPending}
      aria-pressed={isFav}
      aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-60",
        isFav
          ? "border-brand-green bg-brand-green/10 text-brand-green"
          : "border-border-soft text-text-secondary hover:border-brand-teal hover:text-brand-green",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4", isFav && "fill-brand-green")} />
      {isFav ? "Favori" : "Ajouter aux favoris"}
    </button>
  );
}
