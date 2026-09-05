/**
 * Chatwoot — création d'un contact, d'une conversation et d'un message.
 *
 * ⚠️ Le support tourne sur Chatwoot CLOUD (app.chatwoot.com), pas en
 * auto-hébergé : `chat.werguyaram.org` n'a jamais rien servi
 * (cf. docs/chatwoot-repair.md).
 *
 * Trois appels séquentiels, comme la Function d'origine. Même dégradation :
 * sans jeton, on journalise et on renvoie `false`.
 */
export interface ChatwootPush {
  name: string;
  email: string;
  message: string;
  identifier?: string;
}

export async function pushToChatwoot(
  push: ChatwootPush,
  cfg: { baseUrl: string; accountId: string; inboxId: string; apiToken: string | undefined },
): Promise<boolean> {
  const { baseUrl, accountId, inboxId, apiToken } = cfg;
  if (!apiToken || !baseUrl || !accountId || !inboxId) {
    console.info("Chatwoot non configuré — push ignoré", { email: push.email });
    return false;
  }
  const headers = { api_access_token: apiToken, "Content-Type": "application/json" };
  const root = `${baseUrl.replace(/\/$/, "")}/api/v1/accounts/${accountId}`;

  try {
    const contactRes = await fetch(`${root}/contacts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inbox_id: inboxId,
        name: push.name,
        email: push.email,
        identifier: push.identifier,
      }),
    });
    const contact = (await contactRes.json()) as {
      payload?: { contact?: { id?: number }; contact_inbox?: { source_id?: string } };
    };
    const sourceId = contact.payload?.contact_inbox?.source_id;
    const contactId = contact.payload?.contact?.id;
    if (!sourceId || !contactId) {
      console.error("Chatwoot : contact non créé", { email: push.email });
      return false;
    }

    const convRes = await fetch(`${root}/conversations`, {
      method: "POST",
      headers,
      body: JSON.stringify({ source_id: sourceId, inbox_id: inboxId, contact_id: contactId }),
    });
    const conv = (await convRes.json()) as { id?: number };
    if (!conv.id) {
      console.error("Chatwoot : conversation non créée", { email: push.email });
      return false;
    }

    await fetch(`${root}/conversations/${conv.id}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: push.message, message_type: "incoming" }),
    });
    return true;
  } catch (err) {
    console.error("Chatwoot injoignable", err);
    return false;
  }
}
