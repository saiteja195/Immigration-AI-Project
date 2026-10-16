import { LayoutDashboard, type LucideIcon } from "lucide-react";

export interface NavItem { to: string; label: string; icon: LucideIcon }

export const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
];
