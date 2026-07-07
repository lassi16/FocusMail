"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { api } from "@/lib/api";
import {
  buildInboxQueryString,
  loadInboxFilters,
  saveInboxFilters,
} from "@/lib/inbox-filters";
import type { Email } from "@/lib/types";
import {
  cn,
  extractSenderName,
  formatDateTime,
  getCategoryColor,
  getEventTypeColor,
  getPriorityColor,
  truncate,
} from "@/lib/utils";

const CATEGORIES = ["Internship", "Placement", "College", "Meeting", "Finance", "Personal", "Promotion", "Spam"];
const PRIORITIES = ["High", "Medium", "Low"];

type InboxClientProps = {
  initialEmails: Email[];
  initialTotal: number;
  initialEmailId?: number;
  initialCategories?: string[];
  initialPriorities?: string[];
  initialSearch?: string;
  error?: string;
};

export function InboxClient({
  initialEmails,
  initialTotal,
  initialEmailId,
  initialCategories = [],
  initialPriorities = [],
  initialSearch = "",
  error,
}: InboxClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [emails, setEmails] = useState(initialEmails);
  const [total, setTotal] = useState(initialTotal);
  const [selectedId, setSelectedId] = useState<number | null>(initialEmailId ?? initialEmails[0]?.id ?? null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [priorities, setPriorities] = useState<string[]>(initialPriorities);
  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(error ?? null);

  const hydrated = useRef(false);
  const skipFetch = useRef(true);
  const skipPersist = useRef(true);

  const hasUrlFilters =
    initialCategories.length > 0 || initialPriorities.length > 0 || initialSearch.length > 0;

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    if (!hasUrlFilters) {
      const saved = loadInboxFilters();
      if (saved.categories.length > 0 || saved.priorities.length > 0 || saved.search) {
        setCategories(saved.categories);
        setPriorities(saved.priorities);
        setSearch(saved.search);
      }
    } else {
      saveInboxFilters({
        categories: initialCategories,
        priorities: initialPriorities,
        search: initialSearch,
      });
    }
  }, [hasUrlFilters, initialCategories, initialPriorities, initialSearch]);

  const persistFilters = useCallback(
    (nextCategories: string[], nextPriorities: string[], nextSearch: string, emailId?: number | null) => {
      const filters = {
        categories: nextCategories,
        priorities: nextPriorities,
        search: nextSearch,
      };
      saveInboxFilters(filters);
      const query = buildInboxQueryString(filters, emailId);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    persistFilters(categories, priorities, search, selectedId);
  }, [categories, priorities, search, selectedId, persistFilters]);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.getEmails({
        categories: categories.length > 0 ? categories : undefined,
        priorities: priorities.length > 0 ? priorities : undefined,
        search: search || undefined,
        limit: 50,
      });
      setEmails(data.emails);
      setTotal(data.total);
      setSelectedId((prev) => {
        if (data.emails.length === 0) return null;
        if (prev && data.emails.find((e) => e.id === prev)) return prev;
        return data.emails[0].id;
      });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load emails");
    } finally {
      setLoading(false);
    }
  }, [categories, priorities, search]);

  useEffect(() => {
    if (skipFetch.current) {
      skipFetch.current = false;
      return;
    }
    const timer = setTimeout(loadEmails, 300);
    return () => clearTimeout(timer);
  }, [loadEmails]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedEmail(null);
      return;
    }
    setDetailLoading(true);
    api
      .getEmail(selectedId)
      .then(setSelectedEmail)
      .catch(() => setSelectedEmail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const clearFilters = () => {
    setCategories([]);
    setPriorities([]);
    setSearch("");
    saveInboxFilters({ categories: [], priorities: [], search: "" });
    router.replace(pathname, { scroll: false });
  };

  return (
    <>
      <Header
        title="Inbox"
        description={`${total} emails · Smart filtering and AI categorization`}
      />

      {fetchError && (
        <Card className="mb-6 border-green-950 bg-green-950/20">
          <p className="text-neutral-400">{fetchError}</p>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
          <input
            type="text"
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-black py-2.5 pl-10 pr-4 text-sm text-neutral-300 placeholder:text-neutral-600 focus:border-green-950 focus:outline-none focus:ring-1 focus:ring-green-950"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectFilter
            label="All Categories"
            options={CATEGORIES}
            selected={categories}
            onChange={setCategories}
          />
          <MultiSelectFilter
            label="All Priorities"
            options={PRIORITIES}
            selected={priorities}
            onChange={setPriorities}
          />
          {(categories.length > 0 || priorities.length > 0 || search) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="grid h-[calc(100vh-220px)] gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2 overflow-hidden p-0">
          <div className="border-b border-neutral-900 px-4 py-3 text-xs text-neutral-600">
            {loading ? "Loading..." : `${emails.length} of ${total} emails`}
          </div>
          <ul className="scrollbar-thin h-[calc(100%-44px)] overflow-y-auto">
            {emails.length === 0 ? (
              <li className="p-6 text-center text-sm text-neutral-600">No emails found.</li>
            ) : (
              emails.map((email) => (
                <li key={email.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(email.id)}
                    className={cn(
                      "w-full border-b border-neutral-900 px-4 py-3 text-left transition-colors",
                      selectedId === email.id
                        ? "bg-green-950/40 border-l-2 border-l-green-900"
                        : "hover:bg-neutral-950"
                    )}
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {email.category && (
                        <Badge className={getCategoryColor(email.category)}>{email.category}</Badge>
                      )}
                      {email.priority && (
                        <Badge className={getPriorityColor(email.priority)}>{email.priority}</Badge>
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-sm font-medium text-neutral-300">{email.subject}</p>
                    <p className="mt-0.5 truncate text-xs text-neutral-600">
                      {extractSenderName(email.sender)}
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-700">{formatDateTime(email.received_at)}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card className="lg:col-span-3 overflow-hidden p-0">
          {detailLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-800 border-t-neutral-500" />
            </div>
          ) : selectedEmail ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-neutral-900 p-5">
                <div className="flex flex-wrap gap-2">
                  {selectedEmail.category && (
                    <Badge className={getCategoryColor(selectedEmail.category)}>
                      {selectedEmail.category}
                    </Badge>
                  )}
                  {selectedEmail.priority && (
                    <Badge className={getPriorityColor(selectedEmail.priority)}>
                      {selectedEmail.priority}
                    </Badge>
                  )}
                </div>
                <h2 className="mt-3 text-xl font-semibold text-neutral-200">{selectedEmail.subject}</h2>
                <p className="mt-2 text-sm text-neutral-500">
                  From: <span className="text-neutral-400">{selectedEmail.sender}</span>
                </p>
                <p className="text-xs text-neutral-600">{formatDateTime(selectedEmail.received_at)}</p>
                {selectedEmail.action_item && (
                  <div className="mt-3 rounded-lg border border-green-950 bg-green-950/30 px-3 py-2 text-sm text-neutral-400">
                    Action: {selectedEmail.action_item}
                  </div>
                )}
              </div>
              <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-400">
                  {selectedEmail.body ?? "No content available."}
                </pre>
                {selectedEmail.events && selectedEmail.events.length > 0 && (
                  <div className="mt-6 border-t border-neutral-900 pt-5">
                    <h3 className="mb-3 text-sm font-semibold text-neutral-400">Extracted Events</h3>
                    <ul className="space-y-2">
                      {selectedEmail.events.map((event) => (
                        <li
                          key={event.id}
                          className="rounded-lg border border-neutral-900 bg-neutral-950/50 p-3"
                        >
                          <Badge className={getEventTypeColor(event.event_type)}>
                            {event.event_type.replace(/_/g, " ")}
                          </Badge>
                          <p className="mt-1.5 text-sm font-medium text-neutral-300">{event.title}</p>
                          {event.description && (
                            <p className="mt-0.5 text-xs text-neutral-600">{truncate(event.description, 150)}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-600">
              Select an email to view details
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
