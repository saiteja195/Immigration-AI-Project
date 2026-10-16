import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, FileText, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Checkbox } from "./Checkbox";
import { Badge } from "./ui";
import { daysUntil, daysLabel, fmtShort } from "@/lib/format";
import { useDeleteTask, useUpdateTask } from "@/lib/queries";
import type { Task } from "@/lib/types";

export function DueChip({ iso, done }: { iso: string | null; done: boolean }) {
  if (!iso) return null;
  const d = daysUntil(iso);
  if (done) return <Badge>{fmtShort(iso)}</Badge>;
  return <Badge tone={d < 0 ? "danger" : d <= 3 ? "warn" : "muted"}>{d < 0 || d <= 7 ? daysLabel(d) : fmtShort(iso)}</Badge>;
}

export function TaskItem({ task, compact = false }: { task: Task; compact?: boolean }) {
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(task.notes);
  const expandable = !compact;

  return (
    <motion.li layout="position" className="group">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface2/60">
        <Checkbox checked={task.done} label={`Mark "${task.title}" as ${task.done ? "not done" : "done"}`} onChange={(v) => update.mutate({ id: task.id, done: v })} />
        <button
          onClick={() => expandable && setOpen((o) => !o)}
          className={clsx("min-w-0 flex-1 cursor-pointer text-left text-sm transition-colors", task.done && "text-muted line-through decoration-muted/50")}
          aria-expanded={expandable ? open : undefined}
        >
          <span className="block truncate">{task.title}</span>
        </button>
        <DueChip iso={task.due_date} done={task.done} />
        {expandable && (
          <button onClick={() => setOpen((o) => !o)} aria-label="Show details" className="grid size-7 cursor-pointer place-items-center rounded-lg text-muted opacity-60 transition-opacity hover:opacity-100">
            <ChevronDown className={clsx("size-4 transition-transform", open && "rotate-180")} />
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="ml-11 space-y-3 pb-3 pr-2 text-sm">
              {task.details && <p className="text-muted">{task.details}</p>}
              {task.required_docs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {task.required_docs.map((d) => (
                    <span key={d} className="inline-flex items-center gap-1 rounded-lg bg-surface2 px-2 py-1 text-xs"><FileText className="size-3 text-muted" />{d}</span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted" htmlFor={`due-${task.id}`}>Due</label>
                <input
                  id={`due-${task.id}`} type="date" value={task.due_date ?? ""}
                  onChange={(e) => update.mutate({ id: task.id, due_date: e.target.value || null })}
                  className="h-8 rounded-lg border border-line bg-surface px-2 text-xs outline-none focus:border-accent"
                />
                <button onClick={() => remove.mutate(task.id)} className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="size-3.5" />Delete</button>
              </div>
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                onBlur={() => notes !== task.notes && update.mutate({ id: task.id, notes })}
                placeholder="Add a note…" rows={2}
                className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
