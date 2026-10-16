import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, CheckCircle2, ExternalLink, Info, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { Markdown } from "@/components/Markdown";
import { PageHeader, Skeleton } from "@/components/ui";
import { clearChat, sendChat, useChatHistory, useChatStatus } from "@/lib/queries";
import type { ChatMessage } from "@/lib/types";

const SUGGESTIONS = [
  "What should I do before my EAD expires?",
  "What are the steps to switch from F-1 to H-1B?",
  "Create a plan for getting my driver's license",
  "Can my H-4 spouse work in the US?",
];

const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

function Bubble({ m }: { m: ChatMessage }) {
  const mine = m.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={clsx("flex gap-3", mine && "justify-end")}>
      {!mine && <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Sparkles className="size-4" /></span>}
      <div className={clsx("max-w-[85%] text-sm leading-relaxed", mine ? "rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-accent-fg" : "min-w-0 flex-1 pt-1")}>
        {mine ? <p className="whitespace-pre-wrap">{m.content}</p> : <Markdown>{m.content}</Markdown>}
        {!!m.actions?.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {m.actions.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-ok/14 px-2.5 py-1 text-xs font-medium text-ok"><CheckCircle2 className="size-3.5" />Created {a.type}: {a.title}</span>
            ))}
          </div>
        )}
        {!!m.citations?.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {m.citations.map((c) => (
              <a key={c.url} href={c.url} target="_blank" rel="noreferrer noopener" title={c.title} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent">
                <span className="truncate">{host(c.url)}</span><ExternalLink className="size-3 shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Chat() {
  const qc = useQueryClient();
  const status = useChatStatus();
  const history = useChatHistory();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (history.data && !loaded.current) { loaded.current = true; setMessages(history.data); }
  }, [history.data]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content }]);
    try {
      const r = await sendChat(content);
      setMessages((m) => [...m, { role: "assistant", content: r.reply, citations: r.citations, actions: r.actions }]);
      if (r.actions.length) {
        qc.invalidateQueries({ queryKey: ["goals"] });
        qc.invalidateQueries({ queryKey: ["tasks"] });
        toast.success(`Created ${r.actions.length} ${r.actions.length === 1 ? "item" : "items"} for you`);
      }
    } catch (e) {
      setMessages((m) => m.slice(0, -1));
      setInput(content);
      toast.error(e instanceof Error ? e.message : "Could not send your message.");
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => { e.preventDefault(); send(input); };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };
  async function reset() {
    await clearChat();
    setMessages([]);
    qc.removeQueries({ queryKey: ["chat-history"] });
  }

  const disabled = status.data?.enabled === false;

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col lg:min-h-[calc(100dvh-6rem)]">
      <PageHeader
        title="Assistant"
        subtitle="Ask about your visa. Answers use official US government sources."
        action={messages.length > 0 && (
          <button onClick={reset} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface2 hover:text-fg"><RotateCcw className="size-3.5" /> New chat</button>
        )}
      />

      {disabled && (
        <div role="status" className="mb-4 flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-warn" />
          <p>The assistant isn't set up yet. Add <code className="rounded bg-surface2 px-1.5 py-0.5">ANTHROPIC_API_KEY</code> to the backend <code className="rounded bg-surface2 px-1.5 py-0.5">.env</code> and restart.</p>
        </div>
      )}

      <div className="flex-1 space-y-6 pb-10" aria-live="polite">
        {history.isLoading ? (
          <Skeleton className="h-24" />
        ) : messages.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid place-items-center py-10 text-center">
            <span className="float grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent"><Sparkles className="size-6" /></span>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">How can I help today?</h2>
            <p className="mt-1 max-w-sm text-sm text-muted">I can explain your options, check official sources, and turn steps into tasks.</p>
            <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <motion.button key={s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} disabled={disabled} onClick={() => send(s)} className="card cursor-pointer rounded-xl p-3.5 text-left text-sm transition-colors hover:border-accent disabled:pointer-events-none disabled:opacity-50">
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          messages.map((m, i) => <Bubble key={i} m={m} />)
        )}
        <AnimatePresence>
          {busy && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3" aria-label="Assistant is typing">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Sparkles className="size-4" /></span>
              <span className="flex gap-1.5"><i className="dot" /><i className="dot" style={{ animationDelay: "0.15s" }} /><i className="dot" style={{ animationDelay: "0.3s" }} /></span>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottom} />
      </div>

      <div className="sticky bottom-24 bg-gradient-to-t from-bg from-70% to-transparent pt-4 lg:bottom-0 lg:pb-2">
        <form onSubmit={submit} className="card flex items-end gap-2 p-2 shadow-[var(--shadow-lg)]">
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} rows={1} maxLength={2000} disabled={disabled}
            placeholder="Ask about your visa, deadlines or next steps…" aria-label="Message"
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted/70 disabled:opacity-60 [field-sizing:content]"
          />
          <motion.button whileTap={{ scale: 0.92 }} type="submit" disabled={!input.trim() || busy || disabled} aria-label="Send" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl bg-accent text-accent-fg transition-opacity disabled:opacity-40">
            <ArrowUp className="size-5" />
          </motion.button>
        </form>
        <p className="mt-2 text-center text-xs text-muted">General information, not legal advice. Check with your DSO or an attorney for your case.</p>
      </div>
    </div>
  );
}
