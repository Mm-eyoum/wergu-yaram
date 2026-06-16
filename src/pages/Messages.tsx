import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus, Search, Send, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { auth } from "@/services/firebase";
import {
  getOrCreateSupportConversation,
  sendMessage,
  subscribeConversations,
  subscribeMessages,
  type LiveConversation,
  type LiveMessage,
} from "@/services/messaging";

export default function Messages() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { notify } = useToast();

  const [conversations, setConversations] = useState<LiveConversation[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [starting, setStarting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to the user's conversations (cleaned up on unmount).
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeConversations(
      uid,
      (rows) => {
        setConversations(rows);
        setActiveId((cur) => cur ?? rows[0]?.id ?? null);
      },
      () => setConversations([]),
    );
    return unsub;
  }, [uid]);

  // Subscribe to the active conversation's messages.
  useEffect(() => {
    if (!uid || !activeId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeMessages(activeId, uid, setMessages, () => setMessages([]));
    return unsub;
  }, [uid, activeId]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const active = conversations?.find((c) => c.id === activeId) ?? null;
  const filtered = (conversations ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const fbUser = auth?.currentUser;
    if (!fbUser || !activeId || !draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    try {
      await sendMessage(activeId, fbUser, text);
    } catch {
      setDraft(text);
      notify("Le message n'a pas pu être envoyé.", "error");
    }
  }

  async function startSupport() {
    const fbUser = auth?.currentUser;
    if (!fbUser || !user) return;
    setStarting(true);
    try {
      const id = await getOrCreateSupportConversation(fbUser, user);
      setActiveId(id);
    } catch {
      notify("Impossible de démarrer la conversation.", "error");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="container-page py-6">
      <h1 className="mb-1 text-2xl font-extrabold">Messages privés</h1>
      <p className="mb-4 text-sm text-text-secondary">
        Échangez en toute confidentialité avec l'équipe, les soignants et les communautés.
      </p>

      <div className="grid h-[640px] grid-cols-1 overflow-hidden rounded-3xl border border-border-soft bg-white shadow-soft md:grid-cols-[300px_1fr]">
        {/* Conversations list */}
        <div className="flex min-h-0 flex-col border-r border-border-soft">
          <div className="border-b border-border-soft p-3">
            <div className="flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2">
              <Search className="h-4 w-4 text-text-secondary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une conversation"
                className="w-full bg-transparent text-sm focus:outline-none"
                aria-label="Rechercher une conversation"
              />
            </div>
          </div>

          {conversations === null ? (
            <div className="p-4"><LoadingState label="Chargement…" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
              <p className="text-sm text-text-secondary">Aucune conversation pour l'instant.</p>
              <Button size="sm" onClick={startSupport} disabled={starting}>
                <MessageSquarePlus className="h-4 w-4" />
                {starting ? "Ouverture…" : "Contacter le support"}
              </Button>
            </div>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto scroll-thin">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-border-soft px-3 py-3 text-left",
                      c.id === activeId ? "bg-brand-mint" : "hover:bg-brand-soft",
                    )}
                  >
                    <Avatar name={c.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-text-primary">{c.name}</p>
                      <p className="truncate text-xs text-text-secondary">
                        {c.lastMessage || "Nouvelle conversation"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Thread */}
        <div className="flex min-h-0 flex-col">
          {active ? (
            <>
              <header className="flex items-center gap-3 border-b border-border-soft px-4 py-3">
                <Avatar name={active.name} size="md" />
                <p className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
                  {active.name}
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-green" />
                </p>
              </header>

              <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-brand-soft p-4 scroll-thin">
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-secondary">
                    Démarrez la conversation en envoyant un message.
                  </p>
                ) : (
                  messages.map((m) => (
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
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className="flex items-center gap-2 border-t border-border-soft p-3" onSubmit={handleSend}>
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
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-6">
              <EmptyState
                title="Aucune conversation sélectionnée"
                message="Contactez le support pour démarrer un premier échange."
                icon={<MessageSquarePlus className="h-6 w-6" />}
                action={
                  <Button size="sm" onClick={startSupport} disabled={starting}>
                    {starting ? "Ouverture…" : "Contacter le support"}
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
