import { motion } from "framer-motion";

interface Props { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }

/** Circular progress; value is 0..1. */
export function Ring({ value, size = 96, stroke = 8, color = "var(--accent)", children }: Props) {
  const r = (size - stroke) / 2;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: Math.max(0, Math.min(1, value)) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
