import { useState } from "react";
import {
  FileText,
  Info,
  Paperclip,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Video,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { conversations } from "@/services/content";

export default function Messages() {
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [draft, setDraft] = useState("");
  const active = conversations.find((c) => c.id === activeId)!;

  return (
    <div className="container-page py-6">
      <h1 className="mb-4 text-2xl font-extrabold">Messages privés</h1>
      <p className="mb-4 text-sm text-text-secondary">
        Échangez en toute confidentialité avec l'équipe, les soignants et les communautés.
      </p>

      <div className="grid h-[640px] grid-cols-1 overflow-hidden rounded-3xl border border-border-soft bg-white shadow-soft md:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_280px]">
        {/* Conversations list */}
        <div className="flex min-h-0 flex-col border-r border-border-soft">
          <div className="border-b border-border-soft p-3">
            <div className="flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2">
              <Search className="h-4 w-4 text-text-secondary" />
              <input
                placeholder="Rechercher une conversation"
                className="w-full bg-transparent text-sm focus:outline-none"
                aria-label="Rechercher une conversation"
              />
            </div>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto scroll-thin">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-border-soft px-3 py-3 text-left",
                    c.id === activeId ? "bg-brand-mint" : "hover:bg-brand-soft",
                  )}
                >
                  <Avatar name={c.name} size="md" online={c.online} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-text-primary">{c.name}</p>
                      <span className="shrink-0 text-[11px] text-text-secondary">{c.timeAgo}</span>
                    </div>
                    <p className="truncate text-xs text-text-secondary">{c.lastMessage}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-green text-[11px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Thread */}
        <div className="flex min-h-0 flex-col">
          <header className="flex items-center justify-between border-b border-border-soft px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar name={active.name} size="md" online={active.online} />
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
                  {active.name}
                  {active.verified && <ShieldCheck className="h-3.5 w-3.5 text-brand-green" />}
                </p>
                <p className="text-xs text-text-secondary">
                  {active.online ? "En ligne" : active.role}
                </p>
              </div>
            </div>
            <div className="flex gap-1 text-text-secondary">
              <IconBtn label="Appel"><Phone className="h-4 w-4" /></IconBtn>
              <IconBtn label="Vidéo"><Video className="h-4 w-4" /></IconBtn>
              <IconBtn label="Infos"><Info className="h-4 w-4" /></IconBtn>
            </div>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-brand-soft p-4 scroll-thin">
            {active.messages.map((m) => (
              <div key={m.id} className={cn("flex", m.fromMe ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                    m.fromMe
                      ? "rounded-br-md bg-brand-green text-white"
                      : "rounded-bl-md border border-border-soft bg-white text-text-primary",
                  )}
                >
                  <p>{m.text}</p>
                  <p className={cn("mt-1 text-[10px]", m.fromMe ? "text-white/70" : "text-text-secondary")}>
                    {m.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <form
            className="flex items-center gap-2 border-t border-border-soft p-3"
            onSubmit={(e) => {
              e.preventDefault();
              setDraft("");
            }}
          >
            <IconBtn label="Pièce jointe"><Paperclip className="h-5 w-5" /></IconBtn>
            <IconBtn label="Emoji"><Smile className="h-5 w-5" /></IconBtn>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Écrire un message sécurisé…"
              className="h-10 flex-1 rounded-full border border-border-soft bg-brand-soft px-4 text-sm focus:border-brand-teal focus:outline-none"
              aria-label="Message"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="grid h-10 w-10 place-items-center rounded-full bg-brand-green text-white disabled:opacity-50"
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Details */}
        <aside className="hidden min-h-0 flex-col border-l border-border-soft xl:flex">
          <div className="flex flex-col items-center border-b border-border-soft p-5 text-center">
            <Avatar name={active.name} size="lg" online={active.online} />
            <p className="mt-2 text-sm font-bold text-text-primary">{active.name}</p>
            <p className="text-xs text-text-secondary">{active.role}</p>
            {active.verified && (
              <Badge tone="green" className="mt-2">
                Compte vérifié
              </Badge>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 scroll-thin">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">
              Fichiers partagés
            </h3>
            {active.sharedFiles.length ? (
              <ul className="space-y-2">
                {active.sharedFiles.map((f) => (
                  <li key={f.name} className="flex items-center gap-3 rounded-xl border border-border-soft p-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-mint text-brand-green">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{f.name}</p>
                      <p className="text-xs text-text-secondary">{f.type} · {f.size}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-secondary">Aucun fichier partagé.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function IconBtn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-xl text-text-secondary hover:bg-brand-mint hover:text-brand-green"
    >
      {children}
    </button>
  );
}
