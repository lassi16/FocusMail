import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: "a" | "b" | "c" | "d" | "e";
};

const accentStyles = {
  a: "from-green-950/60 to-black border-green-900/40 text-neutral-400",
  b: "from-neutral-950 to-black border-green-950/50 text-neutral-400",
  c: "from-green-950/40 to-neutral-950 border-green-900/30 text-neutral-500",
  d: "from-black to-green-950/30 border-neutral-800 text-neutral-400",
  e: "from-green-950/80 to-black border-green-900/50 text-neutral-300",
};

export function StatCard({ title, value, subtitle, icon, accent = "a" }: StatCardProps) {
  return (
    <div
      className={cn(
        "glass-card glass-card-hover relative overflow-hidden p-5",
        "bg-gradient-to-br border",
        accentStyles[accent]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-neutral-200">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-neutral-600">{subtitle}</p>}
        </div>
        <div className="rounded-xl border border-green-950 bg-green-950/50 p-3 text-neutral-400">{icon}</div>
      </div>
    </div>
  );
}
