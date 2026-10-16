import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronDown, Compass, ListChecks, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { Ring } from "@/components/Ring";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { TaskItem } from "@/components/TaskItem";
import { Button } from "@/components/Button";
import { useAddTask, useDeleteGoal, useGoals, useTasks } from "@/lib/queries";
import type { Task } from "@/lib/types";

type Filter = "all" | "open" | "done";

function Section({ title, tasks, all, onDelete }: { title: string; tasks: Task[]; all: Task[]; onDelete?: () => void }) {
  const [open, setOpen] = useState(true);
  const done = all.filter((t) => t.done).length;
  const pct = all.length ? done / all.length : 0;
  return (
    <motion.section layout="position" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
          <Ring value={pct} size={44} stroke={5} color={pct === 1 ? "var(--ok)" : "var(--accent)"}>
            <span className="text-[10px] font-semibold">{Math.round(pct * 100)}%</span>
          </Ring>
          <span className="min-w-0">
            <span className="block truncate font-medium">{title}</span>
            <span className="block text-xs text-muted">{done} of {all.length} done</span>
          </span>
          <ChevronDown className={clsx("ml-auto size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
        </button>
        {onDelete && (
          <button onClick={() => window.confirm(`Remove "${title}" and its tasks?`) && onDelete()} aria-label={`Remove ${title}`} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="size-4" /></button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden border-t border-line px-2 py-1">
            {tasks.map((t) => <TaskItem key={t.id} task={t} />)}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export default function Tasks() {
  const tasks = useTasks();
  const goals = useGoals();
  const addTask = useAddTask();
  const delGoal = useDeleteGoal();
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const all = tasks.data ?? [];
  const visible = all.filter((t) => filter === "all" || (filter === "done" ? t.done : !t.done));
  const custom = visible.filter((t) => !t.goal_id);

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    addTask.mutate({ title: t }, { onSuccess: () => { setTitle(""); toast.success("Task added"); } });
  }

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Everything you need to do, in one place." />

      <form onSubmit={submit} className="card mb-4 flex items-center gap-2 p-2 pl-4">
        <Plus className="size-4 text-muted" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task, e.g. Renew passport" aria-label="New task" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70" />
        <Button type="submit" className="h-10" loading={addTask.isPending} disabled={!title.trim()}>Add</Button>
      </form>

      <div className="mb-4 inline-flex rounded-xl bg-surface2 p-1" role="tablist" aria-label="Filter tasks">
        {(["all", "open", "done"] as Filter[]).map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={clsx("relative cursor-pointer rounded-lg px-4 py-1.5 text-sm capitalize transition-colors", filter === f ? "font-medium" : "text-muted hover:text-fg")}>
            {filter === f && <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-lg bg-surface shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <span className="relative">{f}</span>
          </button>
        ))}
      </div>

      {tasks.isLoading || goals.isLoading ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : all.length === 0 ? (
        <EmptyState icon={<ListChecks className="size-5" />} title="Nothing to do yet" text="Start a plan to get a step-by-step checklist, or add your own task above." action={<Link to="/plans"><Button><Compass className="size-4" /> Browse plans</Button></Link>} />
      ) : (
        <div className="space-y-4">
          {goals.data?.map((g) => {
            const list = visible.filter((t) => t.goal_id === g.id);
            return list.length ? <Section key={g.id} title={g.title} tasks={list} all={all.filter((t) => t.goal_id === g.id)} onDelete={() => delGoal.mutate(g.id)} /> : null;
          })}
          {custom.length > 0 && <Section title="My tasks" tasks={custom} all={all.filter((t) => !t.goal_id)} />}
          {visible.length === 0 && <p className="py-10 text-center text-sm text-muted">No {filter} tasks.</p>}
        </div>
      )}
    </div>
  );
}
