import { useCallback, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { ToastContext, type Toast, type ToastContextValue, type ToastTone } from "./toast";

const TONE_STYLES: Record<ToastTone, string> = {
  info: "border-brand-teal/30 bg-white text-text-primary",
  success: "border-brand-green/30 bg-white text-text-primary",
  error: "border-danger/30 bg-white text-text-primary",
};

const TONE_ICON: Record<ToastTone, ReactNode> = {
  info: <Info className="h-5 w-5 text-brand-green" />,
  success: <CheckCircle2 className="h-5 w-5 text-brand-green" />,
  error: <XCircle className="h-5 w-5 text-danger" />,
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = nextId++;
      setToasts((list) => [...list, { id, message, tone }]);
      // Auto-dismiss after 4s.
      window.setTimeout(() => dismiss(id), 4000);
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Viewport — bottom-center on mobile, bottom-right on desktop */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
        aria-live="polite"
        role="status"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-card animate-fade-in",
              TONE_STYLES[toast.tone],
            )}
          >
            <span className="mt-0.5 shrink-0">{TONE_ICON[toast.tone]}</span>
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Fermer la notification"
              className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-text-secondary hover:bg-brand-mint hover:text-brand-green"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
