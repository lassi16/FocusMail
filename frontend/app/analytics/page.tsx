import { AppShell } from "@/components/layout/AppShell";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  let stats = null;
  let error: string | undefined;

  try {
    stats = await api.getStats();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to connect to backend";
  }

  return (
    <AppShell>
      <AnalyticsClient stats={stats} error={error} />
    </AppShell>
  );
}
