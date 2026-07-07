"use client";
import React from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader } from "@/components/ui/Card";
import type { StatsResponse } from "@/lib/types";

const CATEGORY_COLORS = [
  "#22c55e",
  "#16a34a",
  "#4ade80",
  "#86efac",
  "#a3a3a3",
  "#737373",
  "#d4d4d4",
  "#6b7280",
];

const PRIORITY_COLORS: Record<string, string> = {
  High: "#22c55e",
  Medium: "#16a34a",
  Low: "#737373",
  Unassigned: "#a3a3a3",
};

// Shared tooltip style — covers container, label row, and value row
const CHART_TOOLTIP_CONTENT: React.CSSProperties = {
  backgroundColor: "#0f0f0f",
  border: "1px solid rgba(34,197,94,0.3)",
  borderRadius: "12px",
  color: "#e5e5e5",
};
const CHART_TOOLTIP_LABEL: React.CSSProperties = { color: "#a3a3a3", fontWeight: 500 };
const CHART_TOOLTIP_ITEM: React.CSSProperties = { color: "#22c55e" };
const legendFormatter = (value: string) => (
  <span style={{ color: "#d4d4d4", fontSize: 12 }}>{value}</span>
);

type AnalyticsClientProps = {
  stats: StatsResponse | null;
  error?: string;
};

export function AnalyticsClient({ stats, error }: AnalyticsClientProps) {
  if (error || !stats) {
    return (
      <>
        <Header title="Analytics" description="Visual insights from your email intelligence" />
        <Card className="border-green-950 bg-green-950/20">
          <p className="text-neutral-400">
            {error ?? "Unable to load analytics. Make sure the backend is running."}
          </p>
        </Card>
      </>
    );
  }

  const categoryData = stats.category_distribution.map((item) => ({
    name: item.category ?? "Uncategorized",
    value: item.count,
  }));

  const priorityData = stats.priority_distribution.map((item) => ({
    name: item.priority ?? "Unassigned",
    value: item.count,
  }));

  const monthlyData = stats.monthly_volume.map((item) => ({
    month: item.month,
    emails: item.count,
  }));

  return (
    <>
      <Header
        title="Analytics"
        description="Visual insights from your email intelligence"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Category Distribution"
            description="How your emails are classified by AI"
          />
          {categoryData.length === 0 ? (
            <p className="text-sm text-neutral-600">No data yet. Sync Gmail to get started.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART_TOOLTIP_CONTENT}
                  labelStyle={CHART_TOOLTIP_LABEL}
                  itemStyle={CHART_TOOLTIP_ITEM}
                />
                <Legend formatter={legendFormatter} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Priority Distribution"
            description="Email importance breakdown"
          />
          {priorityData.length === 0 ? (
            <p className="text-sm text-neutral-600">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(64,64,64,0.3)" />
                <XAxis dataKey="name" stroke="#525252" fontSize={12} />
                <YAxis stroke="#525252" fontSize={12} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_CONTENT}
                  labelStyle={CHART_TOOLTIP_LABEL}
                  itemStyle={CHART_TOOLTIP_ITEM}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {priorityData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={PRIORITY_COLORS[entry.name] ?? "#14532d"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Monthly Email Volume"
            description="Email activity over time"
          />
          {monthlyData.length === 0 ? (
            <p className="text-sm text-neutral-600">No monthly data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(64,64,64,0.3)" />
                <XAxis dataKey="month" stroke="#525252" fontSize={12} />
                <YAxis stroke="#525252" fontSize={12} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_CONTENT}
                  labelStyle={CHART_TOOLTIP_LABEL}
                  itemStyle={CHART_TOOLTIP_ITEM}
                />
                <Line
                  type="monotone"
                  dataKey="emails"
                  stroke="#166534"
                  strokeWidth={2}
                  dot={{ fill: "#14532d", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#166534" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardHeader title="Quick Stats" description="Click any stat to view those emails" />
          <dl className="grid grid-cols-2 gap-4">
            {/* Total Emails — no filter */}
            <Link
              href="/inbox"
              className="group rounded-xl border border-neutral-900 bg-neutral-950/50 p-4 transition-all hover:border-green-900 hover:bg-green-950/20"
            >
              <dt className="text-xs text-neutral-600 group-hover:text-green-600 transition-colors">Total Emails</dt>
              <dd className="mt-1 flex items-end justify-between">
                <span className="text-2xl font-bold text-neutral-200">{stats.total_emails}</span>
                <ArrowRight className="h-4 w-4 text-neutral-700 transition-all group-hover:translate-x-0.5 group-hover:text-green-600" />
              </dd>
            </Link>

            {/* Internships */}
            <Link
              href="/inbox?category=Internship"
              className="group rounded-xl border border-neutral-900 bg-neutral-950/50 p-4 transition-all hover:border-green-900 hover:bg-green-950/20"
            >
              <dt className="text-xs text-neutral-600 group-hover:text-green-600 transition-colors">Internships</dt>
              <dd className="mt-1 flex items-end justify-between">
                <span className="text-2xl font-bold text-neutral-300">{stats.internship_count}</span>
                <ArrowRight className="h-4 w-4 text-neutral-700 transition-all group-hover:translate-x-0.5 group-hover:text-green-600" />
              </dd>
            </Link>

            {/* Placements */}
            <Link
              href="/inbox?category=Placement"
              className="group rounded-xl border border-neutral-900 bg-neutral-950/50 p-4 transition-all hover:border-green-900 hover:bg-green-950/20"
            >
              <dt className="text-xs text-neutral-600 group-hover:text-green-600 transition-colors">Placements</dt>
              <dd className="mt-1 flex items-end justify-between">
                <span className="text-2xl font-bold text-neutral-300">{stats.placement_count}</span>
                <ArrowRight className="h-4 w-4 text-neutral-700 transition-all group-hover:translate-x-0.5 group-hover:text-green-600" />
              </dd>
            </Link>

            {/* High Priority */}
            <Link
              href="/inbox?priority=High"
              className="group rounded-xl border border-neutral-900 bg-neutral-950/50 p-4 transition-all hover:border-green-900 hover:bg-green-950/20"
            >
              <dt className="text-xs text-neutral-600 group-hover:text-green-600 transition-colors">High Priority</dt>
              <dd className="mt-1 flex items-end justify-between">
                <span className="text-2xl font-bold text-neutral-400">{stats.high_priority_count}</span>
                <ArrowRight className="h-4 w-4 text-neutral-700 transition-all group-hover:translate-x-0.5 group-hover:text-green-600" />
              </dd>
            </Link>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Categories" description="Click to filter inbox by category" />
          <ul className="space-y-2">
            {categoryData.map((item, index) => (
              <li key={item.name}>
                <Link
                  href={`/inbox?category=${encodeURIComponent(item.name)}`}
                  className="group flex items-center justify-between rounded-lg px-2 py-1.5 transition-all hover:bg-neutral-900"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                    />
                    <span className="text-sm text-neutral-400 group-hover:text-neutral-200 transition-colors">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-500">{item.value}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-700 transition-all group-hover:translate-x-0.5 group-hover:text-green-600" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
