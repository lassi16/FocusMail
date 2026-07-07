import { AppShell } from "@/components/layout/AppShell";
import { CalendarClient } from "@/components/calendar/CalendarClient";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  let events: Awaited<ReturnType<typeof api.getEvents>>["events"] = [];
  let error: string | undefined;

  try {
    const data = await api.getEvents({ limit: 500 });
    events = data.events;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to connect to backend";
  }

  return (
    <AppShell>
      <CalendarClient initialEvents={events} error={error} />
    </AppShell>
  );
}
