import { Compass, LayoutDashboard, ListChecks, Sparkles, UserRound, type LucideIcon } from "lucide-react";

export interface NavItem { to: string; label: string; icon: LucideIcon }

export const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/plans", label: "Plans", icon: Compass },
  { to: "/chat", label: "Assistant", icon: Sparkles },
  { to: "/profile", label: "Profile", icon: UserRound },
];
