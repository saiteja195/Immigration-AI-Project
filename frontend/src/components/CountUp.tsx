import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

export function CountUp({ to }: { to: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? to : 0);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    if (reduce) { mv.set(to); return; }
    const controls = animate(mv, to, { duration: 1.1, ease: "easeOut" });
    return () => controls.stop();
  }, [to, reduce, mv]);
  return <motion.span>{text}</motion.span>;
}
