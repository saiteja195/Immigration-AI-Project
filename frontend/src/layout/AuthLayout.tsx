import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { CalendarClock, CheckCircle2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-[oklch(0.2_0.06_277)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="blob -left-20 -top-20 size-[28rem] bg-[oklch(0.6_0.22_277)]" />
        <div className="blob -bottom-32 right-0 size-[30rem] bg-[oklch(0.65_0.18_200)]" style={{ animationDelay: "-6s" }} />
        <div className="relative flex items-center gap-3">
          <Logo size={36} />
          <span className="text-lg font-semibold tracking-tight">Immigration AI</span>
        </div>

        <div className="relative space-y-8">
          <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">Know where you stand. Know what's next.</h2>
          <div className="relative h-80 max-w-md">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="float absolute left-0 top-0 w-72 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs text-white/70"><ShieldCheck className="size-4" /> Current status</div>
              <p className="mt-2 text-2xl font-semibold">H-1B</p>
              <p className="text-xs text-white/60">I-94 valid for 412 days</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="float absolute right-0 top-28 w-64 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md" style={{ animationDelay: "-2s" }}>
              <div className="flex items-center gap-2 text-xs text-white/70"><CalendarClock className="size-4" /> Next deadline</div>
              <p className="mt-2 text-sm font-medium">Passport renewal</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full w-2/3 rounded-full bg-white/80" /></div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="float absolute bottom-0 left-4 flex w-80 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md" style={{ animationDelay: "-4s" }}>
              <CheckCircle2 className="size-5 text-emerald-300" />
              <span className="text-sm">Driver's license: 4 of 7 steps done</span>
            </motion.div>
          </div>
        </div>
        <p className="relative text-xs text-white/50">Informational only. Not legal advice.</p>
      </section>

      {/* Form */}
      <section className="flex min-h-dvh items-center justify-center px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo />
            <span className="font-semibold tracking-tight">Immigration AI</span>
          </div>
          <h1 className="text-[clamp(1.6rem,1.2rem+1.2vw,2rem)] font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </motion.div>
      </section>
    </div>
  );
}
