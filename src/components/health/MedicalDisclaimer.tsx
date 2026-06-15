import { Info } from "lucide-react";

/** Mandatory medical disclaimer shown on medication/pathology pages. */
export function MedicalDisclaimer({ className }: { className?: string }) {
  return (
    <div
      className={
        "flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-[#8a5a10] " +
        (className ?? "")
      }
      role="note"
    >
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <p>
        Ces informations sont fournies à titre éducatif et ne remplacent pas l'avis d'un
        professionnel de santé. En cas de doute, de symptômes persistants ou d'urgence,
        consultez un médecin ou rendez-vous dans la structure de santé la plus proche.
      </p>
    </div>
  );
}
