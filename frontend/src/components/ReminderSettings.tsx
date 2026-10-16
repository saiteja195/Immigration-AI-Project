import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import clsx from "clsx";
import { Switch } from "./Switch";
import { Button } from "./Button";
import { Skeleton } from "./ui";
import { useReminderPrefs, useSaveReminderPrefs } from "@/lib/queries";
import type { ReminderPrefs } from "@/lib/types";

const WINDOWS = [180, 120, 90, 60, 30, 14, 7];

export function ReminderSettings() {
  const prefs = useReminderPrefs();
  const save = useSaveReminderPrefs();
  const [form, setForm] = useState<ReminderPrefs | null>(null);
  useEffect(() => { if (prefs.data) setForm(prefs.data); }, [prefs.data]);

  if (!form) return <Skeleton className="h-56" />;
  const toggleWindow = (w: number) =>
    setForm({ ...form, windows: form.windows.includes(w) ? form.windows.filter((x) => x !== w) : [...form.windows, w] });

  return (
    <section className="card space-y-5 p-6">
      <h2 className="flex items-center gap-2 font-medium"><Bell className="size-4 text-muted" /> Reminders</h2>

      <div>
        <p className="mb-1 text-sm font-medium">Remind me before a date expires</p>
        <p className="mb-3 text-xs text-muted">We notify you once per chosen point (I-94, passport, EAD and other dates).</p>
        <div className="flex flex-wrap gap-2">
          {WINDOWS.map((w) => (
            <button key={w} type="button" aria-pressed={form.windows.includes(w)} onClick={() => toggleWindow(w)} className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors", form.windows.includes(w) ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-fg")}>
              {w} days
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div><p className="text-sm font-medium">Task reminders</p><p className="text-xs text-muted">When a task is due tomorrow, today, or overdue.</p></div>
        <Switch label="Task reminders" checked={form.task_reminders} onChange={(v) => setForm({ ...form, task_reminders: v })} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Email me too</p>
          <p className="text-xs text-muted">{form.email_available ? "One short email per day, only when something is new." : "Email isn't set up on this server yet. You'll still get in-app notifications."}</p>
        </div>
        <Switch label="Email reminders" checked={form.email_enabled} disabled={!form.email_available} onChange={(v) => setForm({ ...form, email_enabled: v })} />
      </div>

      <Button onClick={() => save.mutate(form)} loading={save.isPending} disabled={form.windows.length === 0}>Save reminder settings</Button>
    </section>
  );
}
