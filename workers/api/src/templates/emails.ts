/** Gabarits d'emails transactionnels — portés depuis functions/src/index.ts. */

const SHELL = (body: string) => `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f7f9;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1a1a1a">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;padding:28px">
${body}
<hr style="border:none;border-top:1px solid #e6e8eb;margin:24px 0">
<p style="font-size:12px;color:#6b7280;margin:0">Wergu Yaram — portail de santé du Sénégal.</p>
</div></body></html>`;

export const xof = (n: number): string => `${n.toLocaleString("fr-FR")} FCFA`;

export const newsletterWelcomeHtml = (): string =>
  SHELL(`<h1 style="font-size:20px;margin:0 0 12px">Bienvenue 👋</h1>
<p style="margin:0 0 12px">Merci de vous être inscrit à la lettre d'information de Wergu Yaram.</p>
<p style="margin:0">Vous recevrez nos actualités santé, nos formations et les besoins d'équipement des structures.</p>`);

export const supportIntentHtml = (monthlyAmount: number): string =>
  SHELL(`<h1 style="font-size:20px;margin:0 0 12px">Merci pour votre soutien</h1>
<p style="margin:0 0 12px">Nous avons bien noté votre intention de soutenir Wergu Yaram à hauteur de
<strong>${xof(monthlyAmount)} par mois</strong>.</p>
<p style="margin:0">Notre équipe vous recontacte pour finaliser la mise en place.</p>`);

export const subscriptionReminderHtml = (periodEnd: string): string =>
  SHELL(`<h1 style="font-size:20px;margin:0 0 12px">Votre abonnement arrive à échéance</h1>
<p style="margin:0 0 12px">Votre abonnement Wergu Yaram se termine le
<strong>${new Date(periodEnd).toLocaleDateString("fr-FR")}</strong>.</p>
<p style="margin:0">Renouvelez-le depuis votre tableau de bord pour conserver la mise en avant de votre page.</p>`);

export const donationReceiptHtml = (amount: number, tip: number): string =>
  SHELL(`<h1 style="font-size:20px;margin:0 0 12px">Merci pour votre don</h1>
<p style="margin:0 0 12px">Nous avons bien reçu votre don de <strong>${xof(amount)}</strong>${
    tip > 0 ? ` et votre soutien de <strong>${xof(tip)}</strong> à la plateforme` : ""
  }.</p>
<p style="margin:0">Ce message vaut reçu. Merci de contribuer à l'équipement des structures de santé.</p>`);
