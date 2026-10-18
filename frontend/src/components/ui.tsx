import { useEffect, useId, useRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import type { Tone } from "@/lib/format";
import type { VisaCatalog } from "@/lib/types";

export function Badge({ tone, children }: { tone?: Tone | "accent" | "muted"; children: ReactNode }) {
  const styles = {
    danger: "bg-danger/12 text-danger",
    warn: "bg-warn/15 text-warn",
    ok: "bg-ok/14 text-ok",
    accent: "bg-accent-soft text-accent",
    muted: "bg-surface2 text-muted",
  };
  return <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", styles[tone ?? "muted"])}>{children}</span>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[clamp(1.6rem,1.2rem+1.5vw,2.25rem)] font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">{icon}</div>
      <h3 className="mt-4 font-medium">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SelectField({ label, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <select id={id} {...rest} className="h-11 w-full cursor-pointer rounded-xl border border-line bg-surface px-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent-soft">
        {children}
      </select>
    </div>
  );
}

/** Native <dialog>: focus trap, Esc and top-layer for free. Click outside closes. */
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="modal"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">{title}</h2>
        <button onClick={onClose} aria-label="Close" className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface2 hover:text-fg"><X className="size-4" /></button>
      </div>
      <div className="max-h-[60dvh] overflow-y-auto px-6 py-5">{children}</div>
      {footer && <div className="border-t border-line px-6 py-4">{footer}</div>}
    </dialog>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={clsx("skeleton", className)} />;

/** Status picker grouped by category (work, student, family, visitor, green card). */
export function VisaSelect({ label, value, onChange, catalog, onlyCategories }: {
  label: string; value: string; onChange: (code: string) => void; catalog?: VisaCatalog; onlyCategories?: string[];
}) {
  return (
    <SelectField label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {!catalog && <option>{value}</option>}
      {catalog?.categories.filter((c) => !onlyCategories || onlyCategories.includes(c.id)).map((c) => (
        <optgroup key={c.id} label={c.label}>
          {catalog.visas.filter((v) => v.category === c.id).map((v) => <option key={v.code} value={v.code}>{v.code === v.name ? v.code : v.name}</option>)}
        </optgroup>
      ))}
    </SelectField>
  );
}
