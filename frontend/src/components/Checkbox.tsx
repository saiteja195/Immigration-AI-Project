import { motion } from "framer-motion";
import clsx from "clsx";

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        "grid size-6 shrink-0 cursor-pointer place-items-center rounded-full border-2 transition-colors",
        checked ? "border-accent bg-accent" : "border-muted/50 hover:border-accent",
      )}
    >
      <motion.svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="var(--accent-fg)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={false} animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={{ duration: 0.25 }} />
      </motion.svg>
    </button>
  );
}
