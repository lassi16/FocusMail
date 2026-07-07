"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  CalendarClock,
  Mail,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import type { StatsResponse } from "@/lib/types";
import {
  extractSenderName,
  formatDate,
  formatDateTime,
  getCategoryColor,
  getEventTypeColor,
  getPriorityColor,
  truncate,
} from "@/lib/utils";
import Link from "next/link";

type DashboardClientProps = {
  initialStats: StatsResponse | null;
  error?: string;
};

export function DashboardClient({ initialStats, error }: DashboardClientProps) {
  const router = useRouter();
  const [stats, setStats] = useState(initialStats);
  const [syncing, setSyncing] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState("");

  const handleAiSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = aiQuery.trim();
    if (!q) return;
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  };

  const handleSync = async () => {
    setSyncing(true);
    setActionMessage(null);
    try {
      const result = await api.syncGmail();
      setActionMessage(`Synced ${result.inserted} new email${result.inserted === 1 ? "" : "s"}`);
      const fresh = await api.getStats();
      setStats(fresh);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleIndex = async () => {
    setIndexing(true);
    setActionMessage(null);
    try {
      const result = await api.indexEmails();
      setActionMessage(`Indexed ${result.indexed} email${result.indexed === 1 ? "" : "s"} for AI search`);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Indexing failed");
    } finally {
      setIndexing(false);
    }
  };

  const aiSearchBar = (
    <form
      onSubmit={handleAiSearch}
      className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 transition-all focus-within:border-green-900 focus-within:ring-1 focus-within:ring-green-900/40"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-neutral-600" />
      <input
        type="text"
        value={aiQuery}
        onChange={(e) => setAiQuery(e.target.value)}
        placeholder='Ask AI… e.g. "Show internship deadlines"'
        className="min-w-0 flex-1 bg-transparent text-sm text-neutral-300 placeholder:text-neutral-600 focus:outline-none"
      />
      <button
        type="submit"
        disabled={!aiQuery.trim()}
        className="shrink-0 rounded-lg bg-green-900/50 px-2.5 py-1 text-xs font-medium text-green-400 transition-all hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Ask →
      </button>
    </form>
  );

  if (error || !stats) {
    return (
      <>
        <Header
          title="Dashboard"
          description="Overview of your intelligent inbox"
          onSync={handleSync}
          onIndex={handleIndex}
          syncing={syncing}
          indexing={indexing}
          centerSlot={aiSearchBar}
        />
        <Card className="border-green-950 bg-green-950/20">
          <p className="text-neutral-400">
            {error ?? "Unable to load dashboard. Make sure the backend is running at http://127.0.0.1:8000"}
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <Header
        title="Dashboard"
        description="Overview of your intelligent inbox"
        onSync={handleSync}
        onIndex={handleIndex}
        syncing={syncing}
        indexing={indexing}
        centerSlot={aiSearchBar}
      />
      {actionMessage && (
        <div className="mb-6 animate-fade-in rounded-xl border border-green-900/50 bg-green-950/30 px-4 py-3 text-sm text-neutral-400">
          {actionMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Emails" value={stats.total_emails} icon={<Mail className="h-5 w-5" />} accent="a" />
        <StatCard title="Internships" value={stats.internship_count} icon={<Briefcase className="h-5 w-5" />} accent="b" />
        <StatCard title="Placements" value={stats.placement_count} icon={<TrendingUp className="h-5 w-5" />} accent="c" />
        <StatCard title="High Priority" value={stats.high_priority_count} icon={<Star className="h-5 w-5" />} accent="d" />
        <StatCard title="Deadlines (7d)" value={stats.upcoming_deadlines} icon={<CalendarClock className="h-5 w-5" />} accent="e" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card hover>
          <CardHeader
            title="Upcoming Events"
            description="Deadlines, interviews, and meetings this week"
            action={
              <Link href="/calendar" className="text-xs text-neutral-500 hover:text-neutral-400">
                View all →
              </Link>
            }
          />
          {stats.upcoming_events.length === 0 ? (
            <p className="text-sm text-neutral-600">No upcoming events detected yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.upcoming_events.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start gap-3 rounded-xl border border-neutral-900 bg-neutral-950/50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={getEventTypeColor(event.event_type)}>
                        {event.event_type.replace(/_/g, " ")}
                      </Badge>
                      {event.priority && (
                        <Badge className={getPriorityColor(event.priority)}>{event.priority}</Badge>
                      )}
                    </div>
                    <p className="mt-1.5 font-medium text-neutral-300">{event.title}</p>
                    <p className="mt-0.5 text-xs text-neutral-600">
                      {formatDate(event.event_date)}
                      {event.event_time ? ` · ${event.event_time}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card hover>
          <CardHeader
            title="Recent Important Emails"
            description="High priority messages from your inbox"
            action={
              <Link href="/inbox?priority=High" className="text-xs text-neutral-500 hover:text-neutral-400">
                View inbox →
              </Link>
            }
          />
          {stats.recent_important_emails.length === 0 ? (
            <p className="text-sm text-neutral-600">No high priority emails yet. Sync Gmail to get started.</p>
          ) : (
            <ul className="space-y-3">
              {stats.recent_important_emails.map((email) => (
                <li key={email.id}>
                  <Link
                    href={`/inbox?id=${email.id}`}
                    className="block rounded-xl border border-neutral-900 bg-neutral-950/50 p-3 transition-colors hover:border-green-950"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {email.category && (
                        <Badge className={getCategoryColor(email.category)}>{email.category}</Badge>
                      )}
                      <Badge className={getPriorityColor(email.priority)}>{email.priority ?? "—"}</Badge>
                    </div>
                    <p className="mt-1.5 font-medium text-neutral-300">{email.subject}</p>
                    <p className="mt-0.5 text-xs text-neutral-600">
                      {extractSenderName(email.sender)} · {formatDateTime(email.received_at)}
                    </p>
                    {email.body && (
                      <p className="mt-2 text-xs text-neutral-500">{truncate(email.body, 100)}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
