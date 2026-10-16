import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import clsx from "clsx";
import { useNotificationActions, useNotifications } from "@/lib/queries";

const DOT = { danger: "bg-danger", warn: "bg-warn", ok: "bg-ok" };

export function NotificationBell({ align = "left" }: { align?: "left" | "right" }) {
  const { data } = useNotifications();
  const { markRead, readAll } = useNotificationActions();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = data?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} className="relative grid size-9 cursor-pointer place-items-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-fg">
        <Bell className="size-[18px]" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.15 }} className={clsx("card absolute top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden shadow-[var(--shadow-lg)]", align === "left" ? "left-0" : "right-0")}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-medium">Notifications</p>
              {unread > 0 && <button onClick={() => readAll.mutate()} className="cursor-pointer text-xs text-accent hover:underline">Mark all read</button>}
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {data?.items.length ? data.items.map((n) => (
                <li key={n.id}>
                  <button onClick={() => { if (!n.read) markRead.mutate(n.id); setOpen(false); navigate(n.link); }} className={clsx("flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition-colors hover:bg-surface2", !n.read && "bg-accent-soft/50")}>
                    <span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-line" : DOT[n.tone])} />
                    <span className="min-w-0">
                      <span className={clsx("block text-sm", !n.read && "font-medium")}>{n.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-muted/80">{formatDistanceToNow(parseISO(n.created.endsWith("Z") ? n.created : `${n.created}Z`), { addSuffix: true })}</span>
                    </span>
                  </button>
                </li>
              )) : (
                <li className="grid place-items-center gap-2 px-4 py-10 text-center text-sm text-muted"><BellOff className="size-5" />You're all caught up</li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
