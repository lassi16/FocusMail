import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
};

const variants = {
  primary:
    "bg-green-900 hover:bg-green-800 text-neutral-200 font-medium shadow-lg shadow-black/40 border border-green-950",
  secondary:
    "bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800",
  ghost: "bg-transparent hover:bg-neutral-900 text-neutral-400 border border-transparent hover:text-neutral-300",
  danger:
    "bg-neutral-950 hover:bg-neutral-900 text-neutral-400 border border-neutral-800",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-300" />
      )}
      {children}
    </button>
  );
}
