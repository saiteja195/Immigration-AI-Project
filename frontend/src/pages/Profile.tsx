import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { Badge, PageHeader, SelectField, Skeleton, VisaSelect } from "@/components/ui";
import { useAddDependent, useDeleteDependent, useDependents, useProfile, useSaveProfile, useVisas } from "@/lib/queries";
import type { DateField, Profile, VisaType } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { ReminderSettings } from "@/components/ReminderSettings";

const ALL_DATE_LABELS: Record<DateField, string> = {
  i94_expiry: "I-94 expiry", visa_stamp_expiry: "Visa stamp expiry", passport_expiry: "Passport expiry", ead_expiry: "EAD expiry",
  i20_end_date: "I-20 end date", i797_expiry: "I-797 approval expiry", ds2019_end_date: "DS-2019 end date",
  green_card_expiry: "Green card expiry", conditional_residence_expiry: "Conditional residence ends",
  advance_parole_expiry: "Advance parole expiry", esta_expiry: "ESTA expiry",
};

const EMPTY: Profile = {
  visa_type: "H-1B", country_of_citizenship: "India", employer_or_school: "",
  i94_expiry: null, visa_stamp_expiry: null, passport_expiry: null, ead_expiry: null, i20_end_date: null, i797_expiry: null,
  ds2019_end_date: null, green_card_expiry: null, conditional_residence_expiry: null, advance_parole_expiry: null, esta_expiry: null,
};

function Dependents() {
  const deps = useDependents();
  const add = useAddDependent();
  const remove = useDeleteDependent();
  const visas = useVisas();
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
          <VisaSelect label="Visa or status" value={visa} onChange={setVisa} catalog={visas.data} />
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
  const visas = useVisas();
  const [form, setForm] = useState<Profile>(EMPTY);

  useEffect(() => { if (profile.data) setForm(profile.data); }, [profile.data]);

  // Show the dates that matter for this status, plus any date already saved.
  const current = visas.data?.visas.find((v) => v.code === form.visa_type);
  const dateFields = [
    ...(current?.dates ?? []),
    ...(Object.keys(ALL_DATE_LABELS) as DateField[])
      .filter((f) => form[f] && !current?.dates.some((d) => d.field === f))
      .map((f) => ({ field: f, label: ALL_DATE_LABELS[f] })),
  ];

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Keep these up to date and we'll watch the deadlines for you." />
      {profile.isLoading ? <Skeleton className="h-96" /> : (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="card space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <VisaSelect label="Current status" value={form.visa_type} onChange={(c) => set("visa_type", c)} catalog={visas.data} />
            <Field label="Country of citizenship" value={form.country_of_citizenship} onChange={(e) => set("country_of_citizenship", e.target.value)} />
            <div className="sm:col-span-2"><Field label="Employer or school" value={form.employer_or_school} onChange={(e) => set("employer_or_school", e.target.value)} /></div>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted">Key dates</h2>
            {current && <p className="mb-4 rounded-xl bg-surface2 p-3 text-sm text-muted">{current.description}</p>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dateFields.map(({ field, label }) => (
                <Field key={field} label={label} type="date" value={form[field] ?? ""} onChange={(e) => set(field, e.target.value || null)} />
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
