import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { fetchAllUsers } from "@/services/users";
import type { AppUser } from "@/types/domain";

const INPUT =
  "h-10 w-full rounded-xl border border-border-soft bg-white pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary/70 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30 dark:border-white/15 dark:bg-white/5 dark:text-white";

function label(u: AppUser): string {
  return u.email || u.displayName || u.uid;
}

/**
 * Assigne des comptes utilisateurs (par email/nom) à un champ tenant.
 * `single` → stocke une string (uid, ex. ownerUid) ; sinon un `string[]`
 * (ex. managerUids). Réutilise la liste admin `fetchAllUsers`.
 */
export function UserRefsField({
  value,
  onChange,
  single,
}: {
  /** A uid (single) or list of uids (multi). */
  value: string | string[] | undefined;
  onChange: (next: string | string[]) => void;
  single?: boolean;
}) {
  const [search, setSearch] = useState("");
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: fetchAllUsers,
  });

  const selected = useMemo(
    () => (single ? (value ? [String(value)] : []) : ((value as string[]) ?? [])),
    [value, single],
  );
  const byUid = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter((u) => !selected.includes(u.uid))
      .filter((u) => label(u).toLowerCase().includes(q) || (u.displayName ?? "").toLowerCase().includes(q))
      .slice(0, 6);
  }, [users, search, selected]);

  const add = (uid: string) => {
    setSearch("");
    if (single) onChange(uid);
    else if (!selected.includes(uid)) onChange([...selected, uid]);
  };
  const remove = (uid: string) => {
    if (single) onChange("");
    else onChange(selected.filter((u) => u !== uid));
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((uid) => {
            const u = byUid.get(uid);
            return (
              <span
                key={uid}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-mint px-3 py-1 text-xs font-medium text-brand-green dark:bg-white/10 dark:text-white"
              >
                {u ? label(u) : uid}
                <button
                  type="button"
                  aria-label="Retirer"
                  onClick={() => remove(uid)}
                  className="grid h-4 w-4 place-items-center rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {(!single || selected.length === 0) && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            className={INPUT}
            value={search}
            placeholder={isLoading ? "Chargement des comptes…" : "Rechercher un compte par email ou nom…"}
            onChange={(e) => setSearch(e.target.value)}
          />
          {matches.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border-soft bg-white shadow-card dark:border-white/15 dark:bg-[#0b1430]">
              {matches.map((u) => (
                <li key={u.uid}>
                  <button
                    type="button"
                    onClick={() => add(u.uid)}
                    className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-brand-soft dark:hover:bg-white/5"
                  >
                    <span className="font-medium text-text-primary dark:text-white">{u.email || u.uid}</span>
                    {u.displayName && <span className="text-xs text-text-secondary">{u.displayName}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
