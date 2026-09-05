/**
 * Brevo — email transactionnel. Portage direct du helper des Cloud Functions.
 *
 * Dégradation conservée à l'identique : sans clé, on journalise et on renvoie
 * `false` — jamais d'exception. Un email non parti ne doit pas faire échouer une
 * inscription à la newsletter.
 */
export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(
  payload: EmailPayload,
  apiKey: string | undefined,
  sender: string,
): Promise<boolean> {
  if (!apiKey) {
    console.info("BREVO_API_KEY absente — email non envoyé", { to: payload.to });
    return false;
  }
  const match = /^(.*)<(.+)>$/.exec(sender.trim());
  const from = match
    ? { name: match[1].trim(), email: match[2].trim() }
    : { email: sender.trim() };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: from,
      to: [{ email: payload.to }],
      subject: payload.subject,
      htmlContent: payload.html,
    }),
  });
  if (!res.ok) {
    console.error("Brevo a refusé l'envoi", { status: res.status, body: await res.text() });
    return false;
  }
  return true;
}
