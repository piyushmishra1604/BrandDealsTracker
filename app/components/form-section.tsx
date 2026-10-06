import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

// Shared numbered section header used across multi-step forms (Invoice Maker, etc.)
// so new forms can reuse the same visual language instead of duplicating styles.
export function FormSection({ step, icon: Icon, title, description, action, children }: {
  step?: number;
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <legend className="flex items-center gap-3 px-0 text-base font-bold">
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-sm">
            {step !== undefined ? <span className="text-sm font-bold">{step}</span> : <Icon className="h-4 w-4" strokeWidth={2.2} />}
          </span>
          <span>
            {title}
            {description && <span className="mt-0.5 block text-xs font-normal text-[#53668e]">{description}</span>}
          </span>
        </legend>
        {action}
      </div>
      {children}
    </fieldset>
  );
}
