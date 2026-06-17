import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Info,
  MessageSquarePlus,
  Paperclip,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Video,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";
import { useToast, useComingSoon } from "@/hooks/useToast";
import { auth } from "@/services/firebase";
import {
  getOrCreateSupportConversation,
  markConversationRead,
  MESSAGES_PAGE_SIZE,
  sendMessage,
  subscribeConversationReads,
  subscribeConversations,
  subscribeMessages,
  type LiveConversation,
  type LiveMessage,
} from "@/services/messaging";

export default function Messages() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { notify } = useToast();
  const comingSoon = useComingSoon();

  const [conversations, setConversations] = useState<LiveConversation[] | null>(null);
  const [reads, setReads] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [starting, setStarting] = useState(false);
  const [msgLimit, setMsgLimit] = useState(MESSAGES_PAGE_SIZE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<string | null>(null);

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

  // Subscribe to this user's per-conversation read markers.
  useEffect(() => {
    if (!uid) return;
    return subscribeConversationReads(uid, setReads);
  }, [uid]);

  // Reset the message window when switching conversations.
  useEffect(() => {
    setMsgLimit(MESSAGES_PAGE_SIZE);
    lastMsgIdRef.current = null;
  }, [activeId]);

  // Mark the active conversation as read (on open and whenever it gets newer activity).
  const active = conversations?.find((c) => c.id === activeId) ?? null;
  useEffect(() => {
    if (uid && active?.id) void markConversationRead(uid, active.id);
  }, [uid, active?.id, active?.updatedAt]);

  // Subscribe to the active conversation's most recent `msgLimit` messages.
  // Growing `msgLimit` widens the window to reveal older history.
  useEffect(() => {
    if (!uid || !activeId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeMessages(activeId, uid, setMessages, () => setMessages([]), msgLimit);
    return unsub;
  }, [uid, activeId, msgLimit]);

  // Auto-scroll to the bottom only when a NEW message arrives at the tail
  // (or on first load) — never when prepending older history.
  useEffect(() => {
    const lastId = messages.length ? messages[messages.length - 1].id : null;
    if (lastId !== lastMsgIdRef.current) {
      lastMsgIdRef.current = lastId;
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages]);

  // The window is full → older messages may exist.
  const hasOlder = messages.length >= msgLimit;

  const filtered = (conversations ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  // A conversation is unread when its last message came from someone else and
  // is newer than this user's read marker.
  const isUnread = (c: LiveConversation) => {
    if (!c.lastSenderUid || c.lastSenderUid === uid || !c.updatedAt) return false;
    const readAt = reads[c.id];
    return !readAt || c.updatedAt > readAt;
  };

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
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-extrabold">Messages privés</h1>
          <p className="text-sm text-text-secondary">
            Échangez en toute confidentialité avec l'équipe, les soignants et les communautés.
          </p>
        </div>
        <Button size="sm" onClick={startSupport} disabled={starting}>
          <MessageSquarePlus className="h-4 w-4" />
          {starting ? "Ouverture…" : "Nouvelle conversation"}
        </Button>
      </div>

      <div className="grid h-[640px] grid-cols-1 overflow-hidden rounded-3xl border border-border-soft bg-white shadow-soft md:grid-cols-[300px_1fr] lg:grid-cols-[300px_1fr_280px]">
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
              {filtered.map((c) => {
                const unread = c.id !== activeId && isUnread(c);
                return (
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
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              "truncate text-sm text-text-primary",
                              unread ? "font-extrabold" : "font-bold",
                            )}
                          >
                            {c.name}
                          </p>
                          {c.updatedAt && (
                            <span className="shrink-0 text-[11px] text-text-secondary">
                              {shortTime(c.updatedAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              "truncate text-xs",
                              unread ? "font-semibold text-text-primary" : "text-text-secondary",
                            )}
                          >
                            {c.lastMessage || "Nouvelle conversation"}
                          </p>
                          {unread && (
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-green"
                              aria-label="Non lu"
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Thread */}
        <div className="flex min-h-0 flex-col">
          {active ? (
            <>
              <header className="flex items-center gap-3 border-b border-border-soft px-4 py-3">
                <Avatar name={active.name} size="md" online />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
                    {active.name}
                    <ShieldCheck className="h-3.5 w-3.5 text-brand-green" />
                  </p>
                  <p className="text-xs text-brand-green">En ligne</p>
                </div>
                <div className="flex items-center gap-1 text-text-secondary">
                  <button
                    type="button"
                    onClick={() => comingSoon("Les appels audio arrivent bientôt.")}
                    className="grid h-9 w-9 place-items-center rounded-full hover:bg-brand-soft"
                    aria-label="Appel audio"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => comingSoon("Les appels vidéo arrivent bientôt.")}
                    className="grid h-9 w-9 place-items-center rounded-full hover:bg-brand-soft"
                    aria-label="Appel vidéo"
                  >
                    <Video className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => comingSoon("La recherche dans la conversation arrive bientôt.")}
                    className="grid h-9 w-9 place-items-center rounded-full hover:bg-brand-soft"
                    aria-label="Rechercher dans la conversation"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-brand-soft p-4 scroll-thin">
                {hasOlder && (
                  <div className="flex justify-center pb-1">
                    <button
                      type="button"
                      onClick={() => setMsgLimit((n) => n + MESSAGES_PAGE_SIZE)}
                      className="rounded-full border border-border-soft bg-white px-3 py-1 text-xs font-semibold text-text-secondary hover:border-brand-teal hover:text-brand-green"
                    >
                      Voir les messages plus anciens
                    </button>
                  </div>
                )}
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
                        {m.createdAt && (
                          <p
                            className={cn(
                              "mt-1 text-right text-[10px]",
                              m.fromMe ? "text-white/70" : "text-text-secondary",
                            )}
                          >
                            {shortTime(m.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className="flex items-center gap-2 border-t border-border-soft p-3" onSubmit={handleSend}>
                <button
                  type="button"
                  onClick={() => comingSoon("Le partage de fichiers arrive bientôt.")}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-text-secondary hover:bg-brand-soft"
                  aria-label="Joindre un fichier"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Écrire un message sécurisé…"
                  className="h-10 flex-1 rounded-full border border-border-soft bg-brand-soft px-4 text-sm focus:border-brand-teal focus:outline-none"
                  aria-label="Message"
                />
                <button
                  type="button"
                  onClick={() => comingSoon("Les emojis arrivent bientôt.")}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-text-secondary hover:bg-brand-soft"
                  aria-label="Ajouter un emoji"
                >
                  <Smile className="h-4 w-4" />
                </button>
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

        {/* Conversation details */}
        <aside className="hidden min-h-0 flex-col overflow-y-auto border-l border-border-soft bg-white p-4 scroll-thin lg:flex">
          {active ? (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center">
                <Avatar name={active.name} size="lg" online />
                <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-text-primary">
                  {active.name}
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-green" />
                </p>
                <p className="text-xs text-text-secondary">Conversation sécurisée</p>
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-secondary">
                  <FileText className="h-3.5 w-3.5" /> Fichiers partagés
                </h3>
                <p className="rounded-2xl border border-dashed border-border-soft p-3 text-center text-xs text-text-secondary">
                  Aucun fichier partagé pour le moment.
                </p>
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-secondary">
                  <Info className="h-3.5 w-3.5" /> Actions rapides
                </h3>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => comingSoon("La gestion des notifications arrive bientôt.")}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-text-secondary hover:bg-brand-soft"
                  >
                    Désactiver les notifications
                  </button>
                  <button
                    type="button"
                    onClick={() => comingSoon("Le signalement arrive bientôt.")}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-text-secondary hover:bg-brand-soft"
                  >
                    Signaler la conversation
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="m-auto text-center text-sm text-text-secondary">
              Sélectionnez une conversation pour voir les détails.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Short timestamp for the conversation list and message bubbles. */
function shortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  return sameDay
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}
