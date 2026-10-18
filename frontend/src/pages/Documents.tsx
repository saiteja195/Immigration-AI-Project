import { useRef, useState, type DragEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Download, FileImage, FileText, Info, Lock, Search, Trash2, UploadCloud } from "lucide-react";
import clsx from "clsx";
import { Badge, EmptyState, PageHeader, SelectField, Skeleton } from "@/components/ui";
import { Switch } from "@/components/Switch";
import { useDeleteDocument, useDocuments, useUploadDocument, useVaultSettings, useVaultStatus } from "@/lib/queries";
import { DOC_KINDS, type DocKind } from "@/lib/types";
import { fmtDate } from "@/lib/format";

const GUESS: [RegExp, DocKind][] = [
  [/passport/i, "passport"], [/i-?797/i, "i797"], [/i-?94/i, "i94"], [/(i-?20|ds-?2019)/i, "i20"],
  [/ead|i-?766/i, "ead"], [/marriage/i, "marriage"], [/(degree|transcript)/i, "degree"], [/(tax|w-?2|1040)/i, "tax"], [/visa/i, "visa"],
];
const guess = (name: string): DocKind => GUESS.find(([re]) => re.test(name))?.[1] ?? "other";
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const label = (k: DocKind) => DOC_KINDS.find((d) => d.id === k)?.label ?? k;

export default function Documents() {
  const status = useVaultStatus();
  const docs = useDocuments();
  const upload = useUploadDocument();
  const remove = useDeleteDocument();
  const settings = useVaultSettings();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [kind, setKind] = useState<DocKind | "auto">("auto");
  const [busy, setBusy] = useState(false);

  const enabled = status.data?.enabled ?? false;
  const maxMb = status.data?.max_upload_mb ?? 5;

  async function handle(files: FileList | File[]) {
    setBusy(true);
    for (const file of Array.from(files)) {
      if (file.size > maxMb * 1024 * 1024) { toast.error(`${file.name} is larger than ${maxMb} MB.`); continue; }
      try {
        await upload.mutateAsync({ file, kind: kind === "auto" ? guess(file.name) : kind });
        toast.success(`Saved ${file.name}`);
      } catch { /* the mutation already showed the error */ }
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); if (enabled && e.dataTransfer.files.length) handle(e.dataTransfer.files); };

  return (
    <div className="space-y-5">
      <PageHeader title="Documents" subtitle="Keep your passport, I-797 and other papers in one private place." />

      {status.data && !enabled && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-warn" />
          <p>The vault isn't set up yet. Add <code className="rounded bg-surface2 px-1.5 py-0.5">ENCRYPTION_KEY</code> to the backend <code className="rounded bg-surface2 px-1.5 py-0.5">.env</code> and restart. The README shows how to make one.</p>
        </div>
      )}

      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Lock className="size-5" /></span>
          <div>
            <p className="font-medium">Encrypted and private</p>
            <p className="text-sm text-muted">Files are encrypted before they are stored. Only you can open them.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="max-w-xs text-right">
            <p className="text-sm font-medium">Let the assistant read my documents</p>
            <p className="text-xs text-muted">Off by default. When on, short excerpts are sent to the AI service to answer your questions.</p>
          </div>
          <Switch label="Let the assistant read my documents" checked={status.data?.assistant_access ?? false} disabled={!enabled || settings.isPending} onChange={(v) => settings.mutate(v)} />
        </div>
      </section>

      <motion.div
        onDragOver={(e) => { e.preventDefault(); if (enabled) setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
        animate={{ scale: over ? 1.01 : 1 }}
        className={clsx("rounded-2xl border-2 border-dashed p-8 text-center transition-colors", over ? "border-accent bg-accent-soft" : "border-line", !enabled && "opacity-50")}
      >
        <UploadCloud className={clsx("mx-auto size-8 transition-colors", over ? "text-accent" : "text-muted")} />
        <p className="mt-3 font-medium">{busy ? "Uploading…" : "Drop files here"}</p>
        <p className="mt-1 text-sm text-muted">PDF, PNG or JPG, up to {maxMb} MB each</p>
        <div className="mx-auto mt-4 flex max-w-sm flex-wrap items-end justify-center gap-3">
          <div className="min-w-40 flex-1 text-left">
            <SelectField label="Document type" value={kind} onChange={(e) => setKind(e.target.value as DocKind | "auto")} disabled={!enabled}>
              <option value="auto">Detect from file name</option>
              {DOC_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </SelectField>
          </div>
          <button type="button" disabled={!enabled || busy} onClick={() => input.current?.click()} className="h-11 cursor-pointer rounded-xl bg-accent px-5 text-sm font-medium text-accent-fg transition-[filter] hover:brightness-110 disabled:pointer-events-none disabled:opacity-60">
            Choose files
          </button>
        </div>
        <input ref={input} type="file" multiple hidden accept="application/pdf,image/png,image/jpeg" onChange={(e) => e.target.files && handle(e.target.files)} aria-label="Choose files to upload" />
      </motion.div>

      {docs.isLoading ? (
        <Skeleton className="h-32" />
      ) : docs.data?.length ? (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {docs.data.map((d) => (
              <motion.li key={d.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="card flex items-center gap-4 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface2 text-muted">{d.content_type === "application/pdf" ? <FileText className="size-5" /> : <FileImage className="size-5" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted">{kb(d.size)} · <span className="sm:hidden">{label(d.kind)} · </span>added {fmtDate(d.created.slice(0, 10))}</p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <Badge tone="accent">{label(d.kind)}</Badge>
                  {d.has_text && <Badge tone="ok"><Search className="size-3" /> Searchable</Badge>}
                </div>
                <a href={`/api/documents/${d.id}/download`} aria-label={`Download ${d.name}`} className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-fg"><Download className="size-4" /></a>
                <button onClick={() => window.confirm(`Delete ${d.name}?`) && remove.mutate(d.id)} aria-label={`Delete ${d.name}`} className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="size-4" /></button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <EmptyState icon={<FileText className="size-5" />} title="No documents yet" text="Upload a scan of your passport, I-797 or I-20 so everything is in one place." />
      )}
    </div>
  );
}
