import { Link } from "react-router-dom";
import { HeartHandshake, Mail, MapPin, Settings } from "lucide-react";
import type { AppUser } from "@/types/domain";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ROLE_LABELS } from "@/lib/constants";

export function ProfileSummaryCard({ user, isDonor = false }: { user: AppUser; isDonor?: boolean }) {
  return (
    <div className="card-surface p-5 text-center">
      <Avatar name={user.displayName ?? "Utilisateur"} src={user.photoURL} size="lg" className="mx-auto" />
      <h2 className="mt-3 text-lg font-bold text-text-primary">{user.displayName ?? "Utilisateur"}</h2>
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
        <Badge tone="mint">{ROLE_LABELS[user.role]}</Badge>
        {isDonor && (
          <Badge tone="green" icon={<HeartHandshake className="h-3.5 w-3.5" />}>
            Donateur
          </Badge>
        )}
      </div>

      <dl className="mt-4 space-y-2 text-left text-sm">
        {user.email && (
          <div className="flex items-center gap-2 text-text-secondary">
            <Mail className="h-4 w-4" />
            <span className="truncate">{user.email}</span>
          </div>
        )}
        {user.region && (
          <div className="flex items-center gap-2 text-text-secondary">
            <MapPin className="h-4 w-4" />
            <span>{user.region}</span>
          </div>
        )}
      </dl>

      <Link
        to="/dashboard/profile"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border-soft py-2.5 text-sm font-semibold text-text-primary hover:border-brand-teal hover:text-brand-green"
      >
        <Settings className="h-4 w-4" />
        Gérer mon compte
      </Link>
    </div>
  );
}
