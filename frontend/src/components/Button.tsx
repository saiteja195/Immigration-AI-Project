import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

interface Props extends HTMLMotionProps<"button"> {
  variant?: "primary" | "subtle" | "ghost";
  loading?: boolean;
}

const styles = {
  primary: "bg-accent text-accent-fg shadow-sm hover:brightness-110",
  subtle: "bg-surface2 text-fg hover:brightness-95",
  ghost: "text-muted hover:text-fg hover:bg-surface2",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", loading, disabled, className, children, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-[filter,background-color,color] disabled:opacity-60 disabled:pointer-events-none cursor-pointer",
        styles[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children as React.ReactNode}
    </motion.button>
  );
});
