import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
};

export function Card({ children, className, hover }: CardProps) {
  return (
    <div className={cn("glass-card p-5", hover && "glass-card-hover", className)}>
      {children}
    </div>
  );
}

type CardHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-base font-semibold text-neutral-200">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-neutral-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}
