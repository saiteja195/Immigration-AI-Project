export type VisaType = string;

export type DateField =
  | "i94_expiry" | "visa_stamp_expiry" | "passport_expiry" | "ead_expiry" | "i20_end_date" | "i797_expiry"
  | "ds2019_end_date" | "green_card_expiry" | "conditional_residence_expiry" | "advance_parole_expiry" | "esta_expiry";

export interface VisaInfo {
  code: string; category: string; name: string; description: string;
  dates: { field: DateField; label: string }[];
}
export interface VisaCatalog { categories: { id: string; label: string }[]; visas: VisaInfo[] }

export interface User { id: string; email: string; full_name: string }

export interface Profile extends Record<DateField, string | null> {
  visa_type: VisaType;
  country_of_citizenship: string;
  employer_or_school: string;
}

export interface Dependent {
  id: string; name: string; relationship: string; visa_type: VisaType;
  i94_expiry: string | null; passport_expiry: string | null; ead_expiry: string | null;
}

export interface KeyDate { label: string; owner: string; due: string; days_left: number }

export interface WorkflowSummary {
  id: string; title: string; topic: string; description: string; applies_to: string[];
  last_verified: string; recommended: boolean;
}
export interface Workflow extends WorkflowSummary {
  sources: { name: string; url: string }[];
  steps: { title: string; details: string; due_in_days: number; required_docs: string[] }[];
}

export interface Goal { id: string; workflow_id: string; title: string; total: number; completed: number }

export interface Task {
  id: string; goal_id: string | null; title: string; details: string;
  due_date: string | null; done: boolean; notes: string; required_docs: string[];
}

export interface Citation { title: string; url: string }
export interface ChatAction { type: "plan" | "task"; title: string }
export interface ChatMessage { role: "user" | "assistant"; content: string; citations?: Citation[]; actions?: ChatAction[] }
export interface ChatReply { reply: string; citations: Citation[]; actions: ChatAction[] }

export interface AppNotification { id: string; kind: string; title: string; body: string; link: string; tone: "danger" | "warn" | "ok"; created: string; read: boolean }
export interface NotificationList { unread: number; items: AppNotification[] }
export interface ReminderPrefs { email_enabled: boolean; task_reminders: boolean; windows: number[]; email_available?: boolean }

export const FORM_TYPES = ["I-129", "I-765", "I-485", "I-539", "I-140", "I-131", "I-130", "I-751", "I-90", "N-400", "Other"] as const;
export type FormType = (typeof FORM_TYPES)[number];
export type Stage = "received" | "biometrics" | "in_review" | "rfe" | "approved" | "denied" | "other";
export interface CaseHistory { date: string; stage: Stage; status_text: string }
export interface Case {
  id: string; receipt_number: string; form_type: FormType; label: string; owner: string;
  filed_date: string | null; stage: Stage; status_text: string; notes: string; rfe_due_date: string | null;
  closed: boolean; history: CaseHistory[];
}
export type NewCase = Omit<Case, "id" | "closed" | "history">;

export type DocKind = "passport" | "visa" | "i94" | "i797" | "i20" | "ead" | "marriage" | "degree" | "employment" | "tax" | "other";
export const DOC_KINDS: { id: DocKind; label: string }[] = [
  { id: "passport", label: "Passport" }, { id: "visa", label: "Visa stamp" }, { id: "i94", label: "I-94" },
  { id: "i797", label: "I-797 notice" }, { id: "i20", label: "I-20 / DS-2019" }, { id: "ead", label: "EAD card" },
  { id: "marriage", label: "Marriage certificate" }, { id: "degree", label: "Degree or transcript" },
  { id: "employment", label: "Employment letter" }, { id: "tax", label: "Tax return" }, { id: "other", label: "Other" },
];
export interface VaultDoc { id: string; name: string; kind: DocKind; content_type: string; size: number; created: string; has_text: boolean }
export interface VaultStatus { enabled: boolean; assistant_access: boolean; max_upload_mb: number }
