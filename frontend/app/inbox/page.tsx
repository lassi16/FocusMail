import { AppShell } from "@/components/layout/AppShell";
import { InboxClient } from "@/components/inbox/InboxClient";
import { api } from "@/lib/api";
import { parseMultiParam } from "@/lib/inbox-filters";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    id?: string;
    priority?: string | string[];
    category?: string | string[];
    search?: string;
  }>;
};

export default async function InboxPage({ searchParams }: PageProps) {
  const params = await searchParams;
  let emails: Awaited<ReturnType<typeof api.getEmails>>["emails"] = [];
  let total = 0;
  let error: string | undefined;
  const initialEmailId = params.id ? parseInt(params.id, 10) : undefined;
  const initialCategories = parseMultiParam(params.category);
  const initialPriorities = parseMultiParam(params.priority);
  const initialSearch = params.search ?? "";

  try {
    const data = await api.getEmails({
      categories: initialCategories.length > 0 ? initialCategories : undefined,
      priorities: initialPriorities.length > 0 ? initialPriorities : undefined,
      search: initialSearch || undefined,
      limit: 50,
    });
    emails = data.emails;
    total = data.total;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to connect to backend";
  }

  return (
    <AppShell>
      <InboxClient
        initialEmails={emails}
        initialTotal={total}
        initialEmailId={initialEmailId}
        initialCategories={initialCategories}
        initialPriorities={initialPriorities}
        initialSearch={initialSearch}
        error={error}
      />
    </AppShell>
  );
}
