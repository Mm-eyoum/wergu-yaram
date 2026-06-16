import { useNavigate } from "react-router-dom";
import { Check, UserPlus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useMemberships, dashboardKeys } from "@/hooks/useDashboardData";
import { joinCommunity, leaveCommunity } from "@/services/userData";

/** Join/leave a community — writes a membership that shows on the Dashboard. */
export function JoinCommunityButton({ slug, name }: { slug: string; name: string }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const navigate = useNavigate();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const memberships = useMemberships(uid);
  const joined = memberships.data?.some((m) => m.communitySlug === slug) ?? false;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!uid) throw new Error("anon");
      if (joined) await leaveCommunity(uid, slug);
      else await joinCommunity(uid, { slug, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.memberships(uid!) });
      notify(joined ? "Vous avez quitté cette communauté." : "Bienvenue dans la communauté ✓", "success");
    },
    onError: () => notify("Action impossible pour le moment.", "error"),
  });

  function handleClick() {
    if (!uid) {
      notify("Connectez-vous pour rejoindre une communauté.", "info");
      navigate("/connexion");
      return;
    }
    mutation.mutate();
  }

  return (
    <Button
      variant={joined ? "outline" : "primary"}
      onClick={handleClick}
      disabled={mutation.isPending}
    >
      {joined ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {joined ? "Membre" : "Rejoindre"}
    </Button>
  );
}
