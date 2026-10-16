import { motion } from "framer-motion";
import clsx from "clsx";
import type { Stage } from "@/lib/types";

export const STAGE_LABEL: Record<Stage, string> = {
  received: "Received", biometrics: "Biometrics", in_review: "In review", rfe: "RFE sent",
  approved: "Approved", denied: "Denied", other: "Other",
};
const STEPS = ["Received", "Biometrics", "In review", "Decision"];
const INDEX: Record<Stage, number> = { received: 0, biometrics: 1, in_review: 2, rfe: 2, approved: 3, denied: 3, other: 0 };

export function stageTone(stage: Stage): "ok" | "warn" | "danger" | "accent" | "muted" {
  return stage === "approved" ? "ok" : stage === "denied" ? "danger" : stage === "rfe" ? "warn" : stage === "other" ? "muted" : "accent";
}

/** Four-step progress track with an animated fill. */
export function CaseStage({ stage }: { stage: Stage }) {
  const idx = INDEX[stage];
  const color = stage === "denied" ? "var(--danger)" : stage === "rfe" ? "var(--warn)" : stage === "approved" ? "var(--ok)" : "var(--accent)";
  return (
    <div>
      <div className="relative h-1.5 rounded-full bg-surface2">
        <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: stage === "other" ? "0%" : `${((idx + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <ol className="mt-2 grid grid-cols-4 text-[11px] text-muted">
        {STEPS.map((s, i) => (
          <li key={s} className={clsx(i === idx && stage !== "other" && "font-medium text-fg", i === STEPS.length - 1 && "text-right", i > 0 && i < STEPS.length - 1 && "text-center")}>
            {i === STEPS.length - 1 && (stage === "approved" || stage === "denied") ? STAGE_LABEL[stage] : s}
          </li>
        ))}
      </ol>
    </div>
  );
}
