import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Logo } from "@/components/Logo";
import { AccountMenu } from "@/components/AccountMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { useNotificationActions } from "@/lib/queries";
import { NAV } from "./nav";

export function AppShell() {
  const { pathname } = useLocation();
  const { check } = useNotificationActions();
  useEffect(() => { check().catch(() => {}); }, []); // run today's reminder check once per visit
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 z-30 hidden h-dvh flex-col border-r border-line p-4 lg:flex">
        <div className="flex items-center gap-3 px-2 py-3">
          <Logo />
          <span className="font-semibold tracking-tight">Immigration AI</span>
          <span className="ml-auto"><NotificationBell align="left" /></span>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                clsx(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "text-accent" : "text-muted hover:bg-surface2 hover:text-fg",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-accent-soft" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
                  )}
                  <Icon className="relative size-[18px]" />
                  <span className="relative">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <AccountMenu placement="up" />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-semibold tracking-tight">Immigration AI</span>
        </div>
        <div className="flex items-center gap-1"><NotificationBell align="right" /><div className="w-12"><AccountMenu placement="down" /></div></div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-8 lg:pb-12 lg:pt-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom tabs */}
      {NAV.length > 1 && (
        <nav aria-label="Main" className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-2xl border border-line bg-surface/90 p-1.5 shadow-[var(--shadow-lg)] backdrop-blur lg:hidden" style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => clsx("flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors", isActive ? "bg-accent-soft text-accent" : "text-muted")}>
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
