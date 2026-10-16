export type VisaType =
  | "F-1" | "F-1 OPT" | "F-1 STEM OPT" | "F-2" | "H-1B" | "H-4" | "H-4 EAD"
  | "Green Card Pending" | "Green Card" | "Other";

export const VISA_TYPES: VisaType[] = [
  "F-1", "F-1 OPT", "F-1 STEM OPT", "F-2", "H-1B", "H-4", "H-4 EAD",
  "Green Card Pending", "Green Card", "Other",
];

export interface User { id: string; email: string; full_name: string }

export interface Profile {
  visa_type: VisaType;
  country_of_citizenship: string;
  employer_or_school: string;
  i94_expiry: string | null;
  visa_stamp_expiry: string | null;
  passport_expiry: string | null;
  ead_expiry: string | null;
  i20_end_date: string | null;
  i797_expiry: string | null;
}

export interface Dependent {
  id: string; name: string; relationship: string; visa_type: VisaType;
  i94_expiry: string | null; passport_expiry: string | null; ead_expiry: string | null;
}

export interface KeyDate { label: string; owner: string; due: string; days_left: number }

export interface WorkflowSummary {
  id: string; title: string; description: string; applies_to: string[];
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
