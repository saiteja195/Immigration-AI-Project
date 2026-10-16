import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Briefcase, Car, ExternalLink, FileText, GraduationCap, IdCard, Plane, Sparkles, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge, Modal, PageHeader, Skeleton } from "@/components/ui";
import { Button } from "@/components/Button";
import { useCreateGoal, useGoals, useWorkflow, useWorkflows } from "@/lib/queries";
import { fmtDate } from "@/lib/format";
import { format } from "date-fns";

const ICONS: Record<string, LucideIcon> = {
  drivers_license: Car, ssn: IdCard, f1_opt: GraduationCap, stem_opt: GraduationCap,
  f1_to_h1b: Briefcase, h1b_extension: Briefcase, h4_ead: FileText, h1b_visa_stamping: Plane,
};

export default function Plans() {
  const navigate = useNavigate();
  const workflows = useWorkflows();
  const goals = useGoals();
  const create = useCreateGoal();
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const detail = useWorkflow(selected);

  const started = new Set(goals.data?.map((g) => g.workflow_id));
  const list = [...(workflows.data ?? [])].sort((a, b) => Number(b.recommended) - Number(a.recommended));

  function pick(id: string) { setSelected(id); setOpen(true); }

  function begin() {
    if (!selected) return;
    create.mutate({ workflow_id: selected, start_date: start }, {
      onSuccess: (g) => { toast.success(`Plan started: ${g.total} tasks created`); setOpen(false); navigate("/tasks"); },
    });
  }

  return (
    <div>
      <PageHeader title="Plans" subtitle="Choose a goal and we'll turn it into a dated checklist." />
      {workflows.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : (
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((w) => {
            const Icon = ICONS[w.id] ?? FileText;
            return (
              <motion.button
                key={w.id} onClick={() => pick(w.id)}
                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
                className="card group flex cursor-pointer flex-col gap-3 p-5 text-left transition-shadow hover:shadow-[var(--shadow-lg)]"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Icon className="size-5" /></span>
                  {started.has(w.id) ? <Badge tone="ok"><BadgeCheck className="size-3" /> In progress</Badge> : w.recommended ? <Badge tone="accent"><Sparkles className="size-3" /> For you</Badge> : null}
                </div>
                <h3 className="font-medium leading-snug">{w.title}</h3>
                <p className="line-clamp-3 text-sm text-muted">{w.description}</p>
                <span className="mt-auto flex items-center gap-1 text-sm font-medium text-accent">View steps <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={detail.data?.title ?? "Plan"} footer={detail.data && (
        <>
          {started.has(detail.data.id) ? (
              <p className="text-center text-sm text-ok">You already started this plan.</p>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="start" className="block text-sm font-medium">Start date</label>
                  <input id="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-11 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" />
                </div>
                <Button onClick={begin} loading={create.isPending} className="flex-1">Start this plan</Button>
              </div>
            )}
        </>
      )}>
        {!detail.data ? <Skeleton className="h-40" /> : (
          <div className="space-y-5">
            <p className="text-sm text-muted">{detail.data.description}</p>
            <ol className="space-y-3">
              {detail.data.steps.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{i + 1}</span>
                  <div className="text-sm">
                    <p className="font-medium">{s.title}</p>
                    {s.details && <p className="mt-0.5 text-muted">{s.details}</p>}
                  </div>
                </li>
              ))}
            </ol>
            <div className="rounded-xl bg-surface2 p-3 text-xs text-muted">
              <p>Last checked {fmtDate(detail.data.last_verified)}. This is general guidance, not legal advice. Rules and fees change, so confirm with the official source.</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {detail.data.sources.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">{s.name}<ExternalLink className="size-3" /></a>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
