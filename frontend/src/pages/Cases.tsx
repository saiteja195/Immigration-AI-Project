import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, ChevronDown, Copy, ExternalLink, FolderOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { CaseStage, STAGE_LABEL, stageTone } from "@/components/CaseStage";
import { Badge, EmptyState, Modal, PageHeader, SelectField, Skeleton } from "@/components/ui";
import { useAddCase, useCases, useDeleteCase, useDependents, useUpdateCase } from "@/lib/queries";
import { daysLabel, daysUntil, fmtDate } from "@/lib/format";
import { FORM_TYPES, type Case, type FormType, type Stage } from "@/lib/types";
import { differenceInCalendarDays, parseISO } from "date-fns";

const STAGES: Stage[] = ["received", "biometrics", "in_review", "rfe", "approved", "denied", "other"];
const USCIS_STATUS = "https://egov.uscis.gov/casestatus/landing.do";
const USCIS_TIMES = "https://egov.uscis.gov/processing-times/";

function CaseCard({ c, onUpdate }: { c: Case; onUpdate: (c: Case) => void }) {
  const del = useDeleteCase();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const since = c.filed_date ? differenceInCalendarDays(new Date(), parseISO(c.filed_date)) : null;
  const rfeDays = c.stage === "rfe" && c.rfe_due_date ? daysUntil(c.rfe_due_date) : null;

  async function copy() {
    try { await navigator.clipboard.writeText(c.receipt_number); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Could not copy. Select the number and copy it."); }
  }

  return (
    <motion.article layout="position" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className={clsx("card space-y-4 p-5", c.closed && "opacity-80")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{c.form_type}</Badge>
            <h3 className="truncate font-medium">{c.label || `${c.form_type} case`}</h3>
            {c.owner !== "me" && <Badge>{c.owner}</Badge>}
          </div>
          <button onClick={copy} className="group mt-1.5 inline-flex cursor-pointer items-center gap-1.5 font-mono text-sm text-muted transition-colors hover:text-fg" aria-label={`Copy receipt number ${c.receipt_number}`}>
            {c.receipt_number}
            {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />}
          </button>
        </div>
        <Badge tone={stageTone(c.stage)}>{STAGE_LABEL[c.stage]}</Badge>
      </div>

      <CaseStage stage={c.stage} />

      {rfeDays !== null && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
          <p>Response to the RFE is due <span className="font-medium">{fmtDate(c.rfe_due_date!)}</span> ({daysLabel(rfeDays)}).</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted">
        <span>{c.status_text || "No status text yet"}</span>
        {c.filed_date && <span>Filed {fmtDate(c.filed_date)}{since !== null && since >= 0 && ` · ${since} days ago`}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="subtle" className="h-9" onClick={() => onUpdate(c)}>Update status</Button>
        <a href={USCIS_STATUS} target="_blank" rel="noreferrer noopener" onClick={copy} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-surface2 hover:text-fg">
          Check on USCIS <ExternalLink className="size-3.5" />
        </a>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted hover:text-fg">
          History <ChevronDown className={clsx("size-4 transition-transform", open && "rotate-180")} />
        </button>
        <button onClick={() => window.confirm(`Stop tracking ${c.receipt_number}?`) && del.mutate(c.id)} aria-label="Delete case" className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="size-4" /></button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <ol className="space-y-3 border-l border-line pl-4 pt-1">
              {[...c.history].reverse().map((h, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute -left-[1.3125rem] top-1.5 size-2.5 rounded-full bg-accent ring-4 ring-surface" />
                  <p className="font-medium">{STAGE_LABEL[h.stage]}<span className="font-normal text-muted"> · {fmtDate(h.date)}</span></p>
                  {h.status_text && <p className="text-xs text-muted">{h.status_text}</p>}
                </li>
              ))}
            </ol>
            {c.notes && <p className="mt-3 rounded-xl bg-surface2 p-3 text-sm text-muted">{c.notes}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export default function Cases() {
  const cases = useCases();
  const deps = useDependents();
  const add = useAddCase();
  const update = useUpdateCase();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Case | null>(null);

  // add form
  const [receipt, setReceipt] = useState("");
  const [form, setForm] = useState<FormType>("I-765");
  const [label, setLabel] = useState("");
  const [owner, setOwner] = useState("me");
  const [filed, setFiled] = useState("");
  const [err, setErr] = useState("");

  // edit form
  const [stage, setStage] = useState<Stage>("received");
  const [statusText, setStatusText] = useState("");
  const [notes, setNotes] = useState("");
  const [rfeDue, setRfeDue] = useState("");

  function openEdit(c: Case) {
    setEditing(c); setStage(c.stage); setStatusText(c.status_text); setNotes(c.notes); setRfeDue(c.rfe_due_date ?? "");
  }

  function submitAdd(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (!/^[A-Za-z]{3}\d{10}$/.test(receipt.replace(/[^A-Za-z0-9]/g, ""))) {
      return setErr("A receipt number is 3 letters and 10 digits, e.g. EAC2190000000.");
    }
    add.mutate(
      { receipt_number: receipt, form_type: form, label, owner, filed_date: filed || null, stage: "received", status_text: "", notes: "", rfe_due_date: null },
      { onSuccess: () => { setAdding(false); setReceipt(""); setLabel(""); setFiled(""); }, onError: (e) => setErr(e instanceof Error ? e.message : "Could not add the case.") },
    );
  }

  function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    update.mutate(
      { id: editing.id, stage, status_text: statusText, notes, rfe_due_date: stage === "rfe" && rfeDue ? rfeDue : null },
      { onSuccess: () => setEditing(null) },
    );
  }

  const list = cases.data ?? [];

  return (
    <div>
      <PageHeader
        title="Cases"
        subtitle="Track your USCIS filings by receipt number."
        action={<Button onClick={() => setAdding(true)}><Plus className="size-4" /> Add case</Button>}
      />
      <p className="mb-5 text-xs text-muted">
        USCIS doesn't let apps read case status automatically, so update the stage yourself. Use "Check on USCIS" to look it up
        (it copies your receipt number first). See current <a className="text-accent hover:underline" href={USCIS_TIMES} target="_blank" rel="noreferrer noopener">processing times</a>.
      </p>

      {cases.isLoading ? (
        <div className="space-y-4"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
      ) : list.length === 0 ? (
        <EmptyState icon={<FolderOpen className="size-5" />} title="No cases yet" text="Add a receipt number from your I-797C notice to follow its progress and get a reminder if USCIS asks for more evidence." action={<Button onClick={() => setAdding(true)}><Plus className="size-4" /> Add your first case</Button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">{list.map((c) => <CaseCard key={c.id} c={c} onUpdate={openEdit} />)}</div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a case" footer={<Button type="submit" form="add-case" loading={add.isPending} className="w-full">Add case</Button>}>
        <form id="add-case" onSubmit={submitAdd} className="space-y-4" noValidate>
          <Field label="Receipt number" value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="EAC2190000000" className="font-mono uppercase" autoComplete="off" />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Form" value={form} onChange={(e) => setForm(e.target.value as FormType)}>{FORM_TYPES.map((f) => <option key={f}>{f}</option>)}</SelectField>
            <Field label="Date filed" type="date" value={filed} onChange={(e) => setFiled(e.target.value)} />
          </div>
          <Field label="Nickname (optional)" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="H-4 EAD renewal" maxLength={80} />
          <SelectField label="Whose case?" value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="me">Me</option>
            {deps.data?.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </SelectField>
          {err && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Update status" footer={<Button type="submit" form="edit-case" loading={update.isPending} className="w-full">Save</Button>}>
        <form id="edit-case" onSubmit={submitEdit} className="space-y-4">
          <SelectField label="Stage" value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </SelectField>
          <Field label="Status on USCIS (optional)" value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder="Case Is Being Actively Reviewed" maxLength={200} />
          {stage === "rfe" && <Field label="RFE response due date" type="date" value={rfeDue} onChange={(e) => setRfeDue(e.target.value)} />}
          <div className="space-y-1.5">
            <label htmlFor="case-notes" className="text-sm font-medium">Notes</label>
            <textarea id="case-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
