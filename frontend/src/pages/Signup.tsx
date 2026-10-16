import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/layout/AuthLayout";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth";

export default function Signup() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await signup(name.trim(), email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Takes under a minute. Your data stays private.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="you@example.com" />
        <Field label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        {formError && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>}
        <Button type="submit" loading={busy} className="w-full">Create account</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account? <Link to="/login" className="font-medium text-accent hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
