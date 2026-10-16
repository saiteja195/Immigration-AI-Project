import { differenceInCalendarDays, format, parseISO } from "date-fns";

export type Tone = "danger" | "warn" | "ok";

export const fmtDate = (iso: string) => format(parseISO(iso), "MMM d, yyyy");
export const fmtShort = (iso: string) => format(parseISO(iso), "MMM d");
export const daysUntil = (iso: string) => differenceInCalendarDays(parseISO(iso), new Date());

export function tone(days: number): Tone {
  if (days <= 30) return "danger";
  if (days <= 90) return "warn";
  return "ok";
}

export function daysLabel(days: number) {
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 60) return `${days} days`;
  if (days < 700) return `${Math.round(days / 30)} months`;
  return `${(days / 365).toFixed(1)} years`;
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
