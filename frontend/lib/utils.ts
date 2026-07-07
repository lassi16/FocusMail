import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function truncate(text: string, max = 120): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export function extractSenderName(sender: string): string {
  const match = sender.match(/^([^<]+)/);
  if (match) return match[1].trim().replace(/"/g, "");
  return sender;
}

export function getCategoryColor(category: string | null): string {
  const map: Record<string, string> = {
    Internship: "bg-green-950/60 text-neutral-400 border-green-900/40",
    Placement: "bg-green-950/50 text-neutral-400 border-green-900/35",
    College: "bg-green-950/40 text-neutral-500 border-green-900/30",
    Meeting: "bg-neutral-900 text-neutral-400 border-green-950/40",
    Finance: "bg-green-950/30 text-neutral-500 border-green-900/25",
    Personal: "bg-neutral-950 text-neutral-500 border-neutral-800",
    Promotion: "bg-neutral-900/80 text-neutral-500 border-neutral-800",
    Spam: "bg-neutral-950 text-neutral-600 border-neutral-900",
  };
  return map[category ?? ""] ?? "bg-neutral-950 text-neutral-500 border-neutral-800";
}

export function getPriorityColor(priority: string | null): string {
  const map: Record<string, string> = {
    High: "bg-green-950/70 text-neutral-300 border-green-900/50",
    Medium: "bg-green-950/40 text-neutral-400 border-green-900/30",
    Low: "bg-neutral-950 text-neutral-600 border-neutral-800",
  };
  return map[priority ?? ""] ?? "bg-neutral-950 text-neutral-600 border-neutral-800";
}

export function getEventTypeColor(type: string): string {
  const map: Record<string, string> = {
    interview: "bg-green-950/60 text-neutral-400",
    application_deadline: "bg-green-950/70 text-neutral-300",
    meeting: "bg-green-950/50 text-neutral-400",
    orientation: "bg-green-950/40 text-neutral-500",
    assignment: "bg-green-950/50 text-neutral-400",
    exam: "bg-green-950/40 text-neutral-500",
  };
  return map[type.toLowerCase()] ?? "bg-neutral-950 text-neutral-500";
}
