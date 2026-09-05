import { useState } from "react";
import { Link } from "react-router-dom";
import { Award, CheckCircle2, RotateCcw } from "lucide-react";
import { doc, serverTimestamp, setDoc } from "@/services/db";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/services/firebase";
import type { Formation } from "@/types/domain";

const PASS_RATIO = 0.7;

function certificateHtml(opts: { name: string; title: string; provider?: string; date: string }): string {
  const safe = (s: string) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Certificat — ${safe(opts.title)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;font-family:Georgia,'Times New Roman',serif}
    body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f7fbfa}
    .cert{width:900px;max-width:95vw;padding:56px;border:10px solid #007A5E;border-radius:18px;background:#fff;text-align:center;color:#0B1F49}
    .kicker{letter-spacing:4px;text-transform:uppercase;font-size:13px;color:#007A5E;font-weight:bold}
    h1{font-size:40px;margin:14px 0 6px}
    .name{font-size:34px;color:#007A5E;margin:22px 0 6px;border-bottom:2px solid #E6EEF2;display:inline-block;padding:0 24px 8px}
    .title{font-size:20px;margin:18px 0}
    .meta{color:#667085;font-size:14px;margin-top:8px}
    .foot{margin-top:34px;display:flex;justify-content:space-between;align-items:flex-end;font-size:13px;color:#667085}
    .brand{font-weight:bold;color:#0B1F49;font-size:18px}
    @media print{body{background:#fff}}
  </style></head><body>
    <div class="cert">
      <div class="kicker">Certificat de réussite</div>
      <h1>Certificat</h1>
      <p>Décerné à</p>
      <div class="name">${safe(opts.name)}</div>
      <p class="title">pour avoir complété avec succès la formation<br><strong>« ${safe(opts.title)} »</strong></p>
      ${opts.provider ? `<p class="meta">Dispensée par ${safe(opts.provider)}</p>` : ""}
      <div class="foot"><span>Délivré le ${safe(opts.date)}</span><span class="brand">Wergu Yaram</span></div>
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(),250)</script>
  </body></html>`;
}

/** LMS-léger : évaluation à choix unique → certificat imprimable en cas de réussite. */
export function FormationQuiz({ formation }: { formation: Formation }) {
  const quiz = formation.quiz ?? [];
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (quiz.length === 0) return null;

  const score = quiz.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  const passed = score / quiz.length >= PASS_RATIO;

  function submit() {
    setSubmitted(true);
    const ok = quiz.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0) / quiz.length >= PASS_RATIO;
    if (ok && user && db) {
      void setDoc(
        doc(db, "users", user.uid, "formationProgress", formation.slug),
        { slug: formation.slug, title: formation.title, completed: true, score, total: quiz.length, completedAt: serverTimestamp() },
        { merge: true },
      ).catch(() => {});
    }
  }

  function downloadCertificate() {
    const w = window.open("", "_blank", "width=960,height=680");
    if (!w) return;
    w.document.write(
      certificateHtml({
        name: user?.displayName || user?.email || "Apprenant",
        title: formation.title,
        provider: formation.provider?.name,
        date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      }),
    );
    w.document.close();
  }

  if (!user) {
    return (
      <div className="card-surface p-5 text-center">
        <Award className="mx-auto h-7 w-7 text-brand-green" />
        <p className="mt-2 font-semibold text-text-primary">Évaluation & certificat</p>
        <p className="mt-1 text-sm text-text-secondary">Connectez-vous pour passer l'évaluation et obtenir votre certificat nominatif.</p>
        <Link to="/connexion" className="mt-3 inline-block text-sm font-semibold text-brand-green hover:underline">Se connecter</Link>
      </div>
    );
  }

  if (submitted && passed) {
    return (
      <div className="card-surface p-6 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-brand-green" />
        <p className="mt-2 text-lg font-bold text-text-primary">Félicitations, formation réussie !</p>
        <p className="mt-1 text-sm text-text-secondary">Score : {score}/{quiz.length}</p>
        <Button className="mt-4" onClick={downloadCertificate}><Award className="h-4 w-4" /> Télécharger le certificat</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {quiz.map((q, i) => (
        <div key={i} className="card-surface p-4">
          <p className="font-semibold text-text-primary">{i + 1}. {q.question}</p>
          <div className="mt-2 space-y-1.5">
            {q.options.map((opt, oi) => {
              const isWrong = submitted && answers[i] === oi && oi !== q.answer;
              const isRight = submitted && oi === q.answer;
              return (
                <label key={oi} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${isRight ? "bg-brand-green/10 text-brand-green" : isWrong ? "bg-danger/10 text-danger" : "text-text-secondary"}`}>
                  <input type="radio" name={`q${i}`} checked={answers[i] === oi} onChange={() => setAnswers((a) => ({ ...a, [i]: oi }))} disabled={submitted} className="h-4 w-4 accent-brand-green" />
                  {opt}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      {submitted ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-danger">Score {score}/{quiz.length} — il faut {Math.ceil(quiz.length * PASS_RATIO)}/{quiz.length} pour réussir.</p>
          <Button variant="outline" onClick={() => { setSubmitted(false); setAnswers({}); }}><RotateCcw className="h-4 w-4" /> Réessayer</Button>
        </div>
      ) : (
        <Button onClick={submit} disabled={Object.keys(answers).length < quiz.length}>Valider l'évaluation</Button>
      )}
    </div>
  );
}
