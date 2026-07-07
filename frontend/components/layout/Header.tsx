"use client";

import { RefreshCw, Database, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

type HeaderProps = {
  title: string;
  description?: string;
  onSync?: () => void;
  onIndex?: () => void;
  syncing?: boolean;
  indexing?: boolean;
  centerSlot?: React.ReactNode;
};

export function Header({
  title,
  description,
  onSync,
  onIndex,
  syncing,
  indexing,
  centerSlot,
}: HeaderProps) {
  const { logout, user } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/auth");
  };

  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-200">{title}</h1>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      </div>

      {centerSlot && <div className="flex-1 px-4">{centerSlot}</div>}
      <div className="flex items-center gap-3">
        {(onSync || onIndex) && (
          <div className="flex flex-wrap gap-2">
            {onSync && (
              <Button variant="secondary" size="sm" onClick={onSync} loading={syncing}>
                <RefreshCw className="h-4 w-4" />
                Sync Gmail
              </Button>
            )}
            {onIndex && (
              <Button variant="ghost" size="sm" onClick={onIndex} loading={indexing}>
                <Database className="h-4 w-4" />
                Index Emails
              </Button>
            )}
          </div>
        )}
        
        {/* User info and logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-neutral-700">
          <div className="text-right">
            <p className="text-sm font-medium text-neutral-200">{user?.first_name || user?.email?.split("@")[0] || "User"}</p>
            <p className="text-xs text-neutral-500">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-neutral-200"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
