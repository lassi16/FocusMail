"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1500): Promise<T> {
  let lastErr: Error = new Error("Unknown error");
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<import("@/lib/types").StatsResponse | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const data = await fetchWithRetry(() => api.getStats());
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to backend");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <ProtectedRoute>
      <AppShell>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              </div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <p className="text-red-400 text-sm mb-3 font-mono bg-neutral-900 border border-neutral-700 rounded p-3">{error}</p>
              <button
                onClick={fetchStats}
                className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <DashboardClient initialStats={stats} error={error} />
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

