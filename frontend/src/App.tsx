import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/layout/AppShell";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";

function Protected() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-dvh place-items-center"><div className="skeleton h-10 w-40" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <AppShell />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<Protected />}>
        <Route index element={<Dashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
