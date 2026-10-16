import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth";
import { getScheme, setScheme, type Scheme } from "@/lib/theme";

const OPTIONS: { value: Scheme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function AccountMenu({ placement = "up" }: { placement?: "up" | "down" }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [scheme, setLocal] = useState<Scheme>(getScheme);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const initials = user.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface2"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{initials}</span>
        <span className="min-w-0 flex-1 max-lg:hidden">
          <span className="block truncate text-sm font-medium">{user.full_name}</span>
          <span className="block truncate text-xs text-muted">{user.email}</span>
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: placement === "up" ? 8 : -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={clsx(
              "card absolute z-50 w-64 p-3 shadow-[var(--shadow-lg)]",
              placement === "up" ? "bottom-full mb-2 left-0" : "top-full mt-2 right-0",
            )}
          >
            <p className="px-1 pb-2 text-xs font-medium uppercase tracking-wide text-muted">Appearance</p>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface2 p-1">
              {OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  role="menuitemradio"
                  aria-checked={scheme === value}
                  onClick={() => { setScheme(value); setLocal(value); }}
                  className={clsx(
                    "flex cursor-pointer flex-col items-center gap-1 rounded-lg py-2 text-xs transition-colors",
                    scheme === value ? "bg-surface font-medium shadow-sm" : "text-muted hover:text-fg",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
            <button
              role="menuitem"
              onClick={() => logout()}
              className="mt-3 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted transition-colors hover:bg-surface2 hover:text-danger"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
