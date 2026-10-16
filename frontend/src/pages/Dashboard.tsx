import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";

export default function Dashboard() {
  const { user } = useAuth();
  const first = user?.full_name.split(" ")[0];
  return (
    <div>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-[clamp(1.6rem,1.2rem+1.5vw,2.25rem)] font-semibold tracking-tight">
        Hi {first} 👋
      </motion.h1>
      <p className="mt-2 text-muted">Your dashboard is on its way.</p>
    </div>
  );
}
