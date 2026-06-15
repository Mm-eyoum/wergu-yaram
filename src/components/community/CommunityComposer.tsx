import { useState } from "react";
import { Image, Send, Smile } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

/** Post composer for community feeds (UI-only in this build). */
export function CommunityComposer() {
  const { user } = useAuth();
  const [value, setValue] = useState("");

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
      <div className="mt-3 flex items-center justify-between pl-12">
        <div className="flex gap-1 text-text-secondary">
          <button className="grid h-9 w-9 place-items-center rounded-xl hover:bg-brand-mint hover:text-brand-green" aria-label="Ajouter une image">
            <Image className="h-5 w-5" />
          </button>
          <button className="grid h-9 w-9 place-items-center rounded-xl hover:bg-brand-mint hover:text-brand-green" aria-label="Ajouter un emoji">
            <Smile className="h-5 w-5" />
          </button>
        </div>
        <Button size="sm" disabled={!value.trim()}>
          <Send className="h-4 w-4" /> Publier
        </Button>
      </div>
    </div>
  );
}
