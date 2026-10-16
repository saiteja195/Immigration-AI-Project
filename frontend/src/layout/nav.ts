import { Compass, FolderOpen, LayoutDashboard, ListChecks, Sparkles, UserRound, type LucideIcon } from "lucide-react";

export interface NavItem { to: string; label: string; icon: LucideIcon }

export const NAV: NavItem[] = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/cases", label: "Cases", icon: FolderOpen },
  { to: "/plans", label: "Plans", icon: Compass },
  { to: "/chat", label: "Assistant", icon: Sparkles },
  { to: "/profile", label: "Profile", icon: UserRound },
];
