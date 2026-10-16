import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Field = forwardRef<HTMLInputElement, Props>(function Field({ label, error, type, className, ...rest }, ref) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={isPassword && show ? "text" : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={clsx(
            "h-11 w-full rounded-xl border bg-surface px-3.5 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted/70",
            "focus:border-accent focus:ring-4 focus:ring-accent-soft",
            error ? "border-danger" : "border-line",
            isPassword && "pr-11",
            className,
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-muted hover:text-fg"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error && <p id={`${id}-err`} role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
});
