import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { Badge, PageHeader, SelectField, Skeleton } from "@/components/ui";
import { useAddDependent, useDeleteDependent, useDependents, useProfile, useSaveProfile } from "@/lib/queries";
import { VISA_TYPES, type Profile, type VisaType } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { ReminderSettings } from "@/components/ReminderSettings";

const DATE_FIELDS: { key: keyof Profile; label: string }[] = [
  { key: "i94_expiry", label: "I-94 expiry" },
  { key: "visa_stamp_expiry", label: "Visa stamp expiry" },
  { key: "passport_expiry", label: "Passport expiry" },
  { key: "ead_expiry", label: "EAD expiry" },
  { key: "i20_end_date", label: "I-20 end date" },
  { key: "i797_expiry", label: "I-797 approval expiry" },
];

const EMPTY: Profile = {
  visa_type: "H-1B", country_of_citizenship: "India", employer_or_school: "",
  i94_expiry: null, visa_stamp_expiry: null, passport_expiry: null, ead_expiry: null, i20_end_date: null, i797_expiry: null,
};

function Dependents() {
  const deps = useDependents();
  const add = useAddDependent();
  const remove = useDeleteDependent();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [rel, setRel] = useState("spouse");
  const [visa, setVisa] = useState<VisaType>("H-4");
  const [i94, setI94] = useState("");
  const [ead, setEad] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    add.mutate(
      { name: name.trim(), relationship: rel, visa_type: visa, i94_expiry: i94 || null, passport_expiry: null, ead_expiry: ead || null },
      { onSuccess: () => { setAdding(false); setName(""); setI94(""); setEad(""); toast.success("Family member added"); } },
    );
  }

  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-medium"><Users className="size-4 text-muted" /> Family</h2>
        {!adding && <Button variant="subtle" className="h-9" onClick={() => setAdding(true)}><Plus className="size-4" /> Add</Button>}
      </div>
      <ul className="space-y-2">
        {deps.data?.map((d) => (
          <motion.li layout key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 rounded-xl bg-surface2 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{d.name} <span className="font-normal capitalize text-muted">· {d.relationship}</span></p>
              <p className="text-xs text-muted">{[d.i94_expiry && `I-94 ${fmtDate(d.i94_expiry)}`, d.ead_expiry && `EAD ${fmtDate(d.ead_expiry)}`].filter(Boolean).join(" · ") || "No dates added"}</p>
            </div>
            <Badge tone="accent">{d.visa_type}</Badge>
            <button onClick={() => remove.mutate(d.id)} aria-label={`Remove ${d.name}`} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="size-4" /></button>
          </motion.li>
        ))}
        {!deps.isLoading && !deps.data?.length && !adding && <p className="py-4 text-center text-sm text-muted">Add a spouse or child to track their dates too.</p>}
      </ul>
      {adding && (
        <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <SelectField label="Relationship" value={rel} onChange={(e) => setRel(e.target.value)}><option value="spouse">Spouse</option><option value="child">Child</option></SelectField>
          <SelectField label="Visa" value={visa} onChange={(e) => setVisa(e.target.value as VisaType)}>{VISA_TYPES.map((v) => <option key={v}>{v}</option>)}</SelectField>
          <Field label="I-94 expiry" type="date" value={i94} onChange={(e) => setI94(e.target.value)} />
          <Field label="EAD expiry" type="date" value={ead} onChange={(e) => setEad(e.target.value)} />
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button type="submit" loading={add.isPending}>Add family member</Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </motion.form>
      )}
    </section>
  );
}

export default function ProfilePage() {
  const profile = useProfile();
  const save = useSaveProfile();
  const [form, setForm] = useState<Profile>(EMPTY);

  useEffect(() => { if (profile.data) setForm(profile.data); }, [profile.data]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Keep these up to date and we'll watch the deadlines for you." />
      {profile.isLoading ? <Skeleton className="h-96" /> : (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="card space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Current status" value={form.visa_type} onChange={(e) => set("visa_type", e.target.value as VisaType)}>
              {VISA_TYPES.map((v) => <option key={v}>{v}</option>)}
            </SelectField>
            <Field label="Country of citizenship" value={form.country_of_citizenship} onChange={(e) => set("country_of_citizenship", e.target.value)} />
            <div className="sm:col-span-2"><Field label="Employer or school" value={form.employer_or_school} onChange={(e) => set("employer_or_school", e.target.value)} /></div>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted">Key dates</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DATE_FIELDS.map(({ key, label }) => (
                <Field key={key} label={label} type="date" value={(form[key] as string | null) ?? ""} onChange={(e) => set(key, (e.target.value || null) as never)} />
              ))}
            </div>
          </div>
          <Button type="submit" loading={save.isPending}>Save profile</Button>
        </form>
      )}
      <Dependents />
      <ReminderSettings />
    </div>
  );
}
