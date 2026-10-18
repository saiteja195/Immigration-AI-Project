import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/layout/AuthLayout";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { useAuth, useSignupsOpen } from "@/lib/auth";

export default function Login() {
  const { user, login } = useAuth();
  const signups = useSignupsOpen();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to see your status and tasks.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" loading={busy} className="w-full">Sign in</Button>
      </form>
      {signups.data?.signups_open !== false && (
        <p className="mt-6 text-center text-sm text-muted">
          New here? <Link to="/signup" className="font-medium text-accent hover:underline">Create an account</Link>
        </p>
      )}
    </AuthLayout>
  );
}
