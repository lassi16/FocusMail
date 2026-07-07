"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import type { EmailEvent } from "@/lib/types";
import { cn, getEventTypeColor, getPriorityColor } from "@/lib/utils";

type CalendarClientProps = {
  initialEvents: EmailEvent[];
  error?: string;
};

function normalizeEventDate(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function eventInMonth(eventDate: string, month: Date): boolean {
  return normalizeEventDate(eventDate).startsWith(format(month, "yyyy-MM"));
}

function formatEventDay(dateStr: string): { month: string; day: string } {
  const normalized = normalizeEventDate(dateStr);
  const [year, month, day] = normalized.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return {
    month: format(date, "MMM"),
    day: format(date, "d"),
  };
}

export function CalendarClient({ initialEvents, error: initialError }: CalendarClientProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [events, setEvents] = useState<EmailEvent[]>(initialEvents);
  const [initialLoading, setInitialLoading] = useState(initialEvents.length === 0 && !initialError);
  const [fetchError, setFetchError] = useState<string | null>(initialError ?? null);
  const loadedAllEvents = useRef(initialEvents.length > 0);

  const monthKey = format(currentMonth, "yyyy-MM");

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [monthKey]);

  useEffect(() => {
    if (loadedAllEvents.current) return;
    loadedAllEvents.current = true;

    let cancelled = false;
    setInitialLoading(true);
    setFetchError(null);

    api
      .getEvents({ limit: 500 })
      .then((data) => {
        if (!cancelled) setEvents(data.events);
      })
      .catch((err) => {
        if (!cancelled) {
          loadedAllEvents.current = false;
          setFetchError(err instanceof Error ? err.message : "Failed to load events");
        }
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EmailEvent[]>();
    for (const event of events) {
      if (!event.event_date) continue;
      const key = normalizeEventDate(event.event_date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  const selectedEvents = selectedDate
    ? eventsByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? []
    : [];

  const monthEvents = useMemo(
    () =>
      [...events]
        .filter((event) => event.event_date && eventInMonth(event.event_date, currentMonth))
        .sort((a, b) => normalizeEventDate(a.event_date!).localeCompare(normalizeEventDate(b.event_date!))),
    [events, monthKey]
  );

  const goToPreviousMonth = () => {
    setCurrentMonth((date) => startOfMonth(subMonths(date, 1)));
  };

  const goToNextMonth = () => {
    setCurrentMonth((date) => startOfMonth(addMonths(date, 1)));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    setSelectedDate(today);
  };

  return (
    <>
      <Header
        title="Calendar"
        description="Events extracted from your emails — interviews, deadlines, meetings"
      />

      {fetchError && (
        <Card className="mb-6 border-green-950 bg-green-950/20">
          <p className="text-neutral-400">{fetchError}</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="relative lg:col-span-2">
          <div className="mb-4 flex h-10 items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-200">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="ghost" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-600">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="relative grid min-h-[432px] grid-cols-7 grid-rows-6 gap-1">
            {calendarDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(key) ?? [];
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const inMonth = isSameMonth(day, currentMonth);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative flex min-h-[72px] flex-col rounded-xl border p-2 text-left transition-colors",
                    inMonth ? "border-neutral-900" : "border-transparent opacity-40",
                    isSelected
                      ? "border-green-900 bg-green-950/40"
                      : "hover:border-neutral-800 hover:bg-neutral-950"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isSameDay(day, new Date()) ? "text-neutral-300" : "text-neutral-500"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 min-h-[32px] space-y-0.5">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="truncate rounded px-1 py-0.5 text-[10px] bg-green-950/80 text-neutral-500"
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-neutral-600">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {initialLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-[1px]">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-800 border-t-neutral-500" />
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title={selectedDate ? format(selectedDate, "EEEE, MMM d") : "Select a date"}
              description={`${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"}`}
            />
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-neutral-600">No events on this date.</p>
            ) : (
              <ul className="space-y-3">
                {selectedEvents.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-xl border border-neutral-900 bg-neutral-950/50 p-3"
                  >
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className={getEventTypeColor(event.event_type)}>
                        {event.event_type.replace(/_/g, " ")}
                      </Badge>
                      {event.priority && (
                        <Badge className={getPriorityColor(event.priority)}>{event.priority}</Badge>
                      )}
                    </div>
                    <p className="mt-1.5 font-medium text-neutral-300">{event.title}</p>
                    {event.event_time && (
                      <p className="mt-0.5 text-xs text-neutral-600">{event.event_time}</p>
                    )}
                    {event.email_subject && (
                      <p className="mt-1 text-xs text-neutral-700">From: {event.email_subject}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title={format(currentMonth, "MMMM yyyy")}
              description={`${monthEvents.length} event${monthEvents.length === 1 ? "" : "s"} this month`}
            />
            {monthEvents.length === 0 ? (
              <p className="text-sm text-neutral-600">No events in this month.</p>
            ) : (
              <ul className="space-y-2">
                {monthEvents.map((event) => {
                  const { month, day } = event.event_date
                    ? formatEventDay(event.event_date)
                    : { month: "—", day: "—" };
                  return (
                    <li
                      key={event.id}
                      className="flex items-start gap-3 rounded-lg border border-neutral-900 px-3 py-2"
                    >
                      <div className="min-w-[48px] text-center">
                        <p className="text-xs text-neutral-600">{month}</p>
                        <p className="text-lg font-bold text-neutral-400">{day}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-300">{event.title}</p>
                        <Badge className={cn("mt-1", getEventTypeColor(event.event_type))}>
                          {event.event_type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
