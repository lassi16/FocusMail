"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  Inbox,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const settingsItems = [
  { href: "/settings/emails", label: "Connected Emails", icon: Mail },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-neutral-900 bg-black">
      <div className="flex h-16 items-center gap-3 border-b border-neutral-900 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-950 border border-green-900">
          <Mail className="h-5 w-5 text-neutral-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            <span className="gradient-text">Focus</span>
            <span className="text-neutral-300">Mail</span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-neutral-600">AI Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-green-950/60 text-neutral-300 border border-green-900/50"
                  : "text-neutral-500 hover:bg-neutral-950 hover:text-neutral-400"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  active ? "text-neutral-400" : "text-neutral-600 group-hover:text-neutral-500"
                )}
              />
              {label}
              {href === "/chat" && (
                <Sparkles className="ml-auto h-3.5 w-3.5 text-neutral-600 opacity-70" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings Section */}
      <div className="border-t border-neutral-900 p-4 space-y-3">
        <p className="px-3 text-xs font-semibold uppercase tracking-widest text-neutral-600">Settings</p>
        {settingsItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-green-950/60 text-neutral-300 border border-green-900/50"
                  : "text-neutral-500 hover:bg-neutral-950 hover:text-neutral-400"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  active ? "text-neutral-400" : "text-neutral-600 group-hover:text-neutral-500"
                )}
              />
              {label}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-neutral-900 p-4">
        <div className="rounded-xl border border-green-950 bg-green-950/20 p-4">
          <p className="text-xs font-medium text-neutral-400">Powered by AI</p>
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-600">
            Semantic search, smart categorization, and natural language queries over your inbox.
          </p>
        </div>
      </div>
    </aside>
  );
}
