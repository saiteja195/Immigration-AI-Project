import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Compass, ListChecks, ShieldCheck, UserRound } from "lucide-react";
import { Ring } from "@/components/Ring";
import { CountUp } from "@/components/CountUp";
import { Badge, EmptyState, Skeleton } from "@/components/ui";
import { TaskItem } from "@/components/TaskItem";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth";
import { useGoals, useKeyDates, useProfile, useTasks } from "@/lib/queries";
import { daysLabel, fmtDate, greeting, tone, type Tone } from "@/lib/format";

const TONE_VAR: Record<Tone, string> = { danger: "var(--danger)", warn: "var(--warn)", ok: "var(--ok)" };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } } };

export default function Dashboard() {
  const { user } = useAuth();
  const profile = useProfile();
  const dates = useKeyDates();
  const goals = useGoals();
  const tasks = useTasks();

  const first = user?.full_name.split(" ")[0];
  const loading = profile.isLoading || dates.isLoading || tasks.isLoading;
  const allTasks = tasks.data ?? [];
  const open = allTasks.filter((t) => !t.done).sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const doneCount = allTasks.length - open.length;
  const next = dates.data?.find((d) => d.days_left >= 0) ?? dates.data?.[0];
  const mine = dates.data?.filter((d) => d.owner === "me") ?? [];
  const urgent = (dates.data ?? []).filter((d) => d.days_left <= 30);
  const primary = mine.find((d) => d.label === "I-94 expiry") ?? mine[0] ?? next;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <p className="text-sm text-muted">{greeting()}</p>
        <h1 className="text-[clamp(1.75rem,1.2rem+2vw,2.5rem)] font-semibold leading-tight tracking-tight">{first}, here's where you stand</h1>
      </motion.div>

      {urgent.length > 0 && (
        <motion.div variants={item} role="status" className="flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/8 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
          <p><span className="font-medium">Needs attention: </span>{urgent.slice(0, 3).map((d) => `${d.label}${d.owner !== "me" ? ` (${d.owner})` : ""} ${d.days_left < 0 ? "expired" : `in ${daysLabel(d.days_left)}`}`).join(" · ")}. <Link to="/plans" className="font-medium text-accent hover:underline">See plans</Link></p>
        </motion.div>
      )}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-52 lg:col-span-2" /><Skeleton className="h-52" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Status hero */}
          <motion.section variants={item} className="card relative overflow-hidden p-6 lg:col-span-2">
            <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-accent/15 blur-3xl" />
            {profile.data ? (
              <div className="relative flex flex-wrap items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted"><ShieldCheck className="size-4" /> Current status</div>
                  <p className="text-5xl font-semibold tracking-tight">{profile.data.visa_type}</p>
                  <p className="text-sm text-muted">{[profile.data.employer_or_school, profile.data.country_of_citizenship].filter(Boolean).join(" · ")}</p>
                  {primary && <Badge tone={tone(primary.days_left)}>{primary.label}: {fmtDate(primary.due)}</Badge>}
                </div>
                {primary && (
                  <Ring value={primary.days_left / 365} size={132} stroke={10} color={TONE_VAR[tone(primary.days_left)]}>
                    <div>
                      <p className="text-3xl font-semibold leading-none"><CountUp to={Math.max(primary.days_left, 0)} /></p>
                      <p className="mt-1 text-xs text-muted">days left</p>
                    </div>
                  </Ring>
                )}
              </div>
            ) : (
              <EmptyState icon={<UserRound className="size-5" />} title="Set up your visa profile" text="Add your visa type and key dates so we can track deadlines and suggest next steps." action={<Link to="/profile"><Button>Set up profile <ArrowRight className="size-4" /></Button></Link>} />
            )}
          </motion.section>

          {/* Task progress */}
          <motion.section variants={item} className="card flex flex-col items-center justify-center gap-4 p-6 text-center">
            <Ring value={allTasks.length ? doneCount / allTasks.length : 0} size={112} stroke={9} color="var(--ok)">
              <div><p className="text-2xl font-semibold leading-none">{doneCount}<span className="text-base text-muted">/{allTasks.length}</span></p></div>
            </Ring>
            <div>
              <p className="font-medium">Tasks done</p>
              <p className="text-sm text-muted">{goals.data?.length ?? 0} active {goals.data?.length === 1 ? "plan" : "plans"}</p>
            </div>
          </motion.section>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Deadlines */}
        <motion.section variants={item} className="card p-6 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-medium"><CalendarClock className="size-4 text-muted" /> Upcoming deadlines</h2>
            <Link to="/profile" className="text-sm text-accent hover:underline">Edit dates</Link>
          </div>
          {dates.data?.length ? (
            <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[0.4375rem] before:top-3 before:w-px before:bg-line">
              {dates.data.slice(0, 6).map((d, i) => (
                <motion.li key={`${d.label}-${d.owner}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.06 }} className="relative flex items-center gap-4 rounded-xl py-2 pl-0.5">
                  <span className="relative z-10 size-3.5 rounded-full ring-4 ring-surface" style={{ background: TONE_VAR[tone(d.days_left)] }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.label}{d.owner !== "me" && <span className="font-normal text-muted"> · {d.owner}</span>}</p>
                    <p className="text-xs text-muted">{fmtDate(d.due)}</p>
                  </div>
                  <Badge tone={tone(d.days_left)}>{daysLabel(d.days_left)}</Badge>
                </motion.li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={<CalendarClock className="size-5" />} title="No dates yet" text="Add your I-94, passport and EAD dates to see them here." action={<Link to="/profile" className="text-sm font-medium text-accent">Add dates</Link>} />
          )}
        </motion.section>

        {/* Next tasks */}
        <motion.section variants={item} className="card p-6 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-medium"><ListChecks className="size-4 text-muted" /> Up next</h2>
            <Link to="/tasks" className="text-sm text-accent hover:underline">All tasks</Link>
          </div>
          {open.length ? (
            <ul className="-mx-2">{open.slice(0, 5).map((t) => <TaskItem key={t.id} task={t} compact />)}</ul>
          ) : allTasks.length ? (
            <EmptyState icon={<CheckCircle2 className="size-5" />} title="All caught up" text="Nothing left to do right now." />
          ) : (
            <EmptyState icon={<Compass className="size-5" />} title="No tasks yet" text="Pick a plan, like OPT or a driver's license, and we'll create the steps." action={<Link to="/plans" className="text-sm font-medium text-accent">Browse plans</Link>} />
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}
