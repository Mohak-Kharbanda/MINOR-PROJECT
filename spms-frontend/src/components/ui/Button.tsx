import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-ink shadow-[0_8px_24px_-10px_rgb(var(--brand)/0.8)] hover:brightness-110 hover:shadow-[0_10px_30px_-8px_rgb(var(--brand)/0.9)]",
  secondary: "bg-surface-2 text-ink border border-line hover:bg-surface-3",
  outline: "border border-line bg-surface text-ink hover:border-brand/50 hover:text-brand",
  ghost: "text-ink-muted hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger text-white hover:brightness-110 shadow-[0_8px_24px_-12px_rgb(var(--danger)/0.9)]",
  success: "bg-success text-white hover:brightness-110 shadow-[0_8px_24px_-12px_rgb(var(--success)/0.9)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-xl",
};

export function buttonClass({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "relative inline-flex select-none items-center justify-center font-medium transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55",
    VARIANTS[variant],
    SIZES[size],
    className
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={buttonClass({ variant, size, className })}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

/** A router link styled as a button (avoids nesting a <button> inside an <a>). */
export function LinkButton({ variant, size, icon, className, children, ...rest }: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
