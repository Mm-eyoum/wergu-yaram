import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, hint, error, leftIcon, rightSlot, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-11 w-full rounded-xl border border-border-soft bg-white px-3.5 text-sm text-text-primary placeholder:text-text-secondary/70 transition-colors focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/30",
              leftIcon && "pl-10",
              rightSlot && "pr-10",
              error && "border-danger focus:border-danger focus:ring-danger/20",
              className,
            )}
            aria-invalid={error ? true : undefined}
            {...props}
          />
          {rightSlot && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</span>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-text-secondary">{hint}</p>
        ) : null}
      </div>
    );
  },
);
FormInput.displayName = "FormInput";
