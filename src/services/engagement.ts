/**
 * Capture d'engagement public (newsletter + intention de don mensuel).
 *
 * Écritures publiques (visiteur non connecté autorisé par les règles, shape
 * validée). Lecture réservée aux admins. L'envoi d'emails (Brevo…) et la mise
 * en place du prélèvement mensuel réel sont des étapes ultérieures : ici on
 * capture l'intention (levier LTV) sans rien débiter.
 */
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Inscription newsletter. `source` situe le point de capture (footer, besoin…). */
export async function subscribeNewsletter(email: string, source = "site"): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  const clean = email.trim().toLowerCase();
  if (!isValidEmail(clean)) throw new Error("Adresse email invalide.");
  await addDoc(collection(db, "newsletterSignups"), {
    email: clean,
    source,
    createdAt: serverTimestamp(),
  });
}

/** Intention de soutien récurrent (montant mensuel souhaité, en XOF). */
export async function recordSupportIntent(input: {
  email: string;
  monthlyAmount: number;
}): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  const clean = input.email.trim().toLowerCase();
  if (!isValidEmail(clean)) throw new Error("Adresse email invalide.");
  await addDoc(collection(db, "supportIntents"), {
    email: clean,
    monthlyAmount: input.monthlyAmount,
    createdAt: serverTimestamp(),
  });
}
