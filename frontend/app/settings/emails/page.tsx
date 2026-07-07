"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Mail, Check, Plus, Trash2 } from "lucide-react";

interface ConnectedEmail {
  id: number;
  email: string;
  provider: string;
  is_connected: boolean;
  created_at: string;
}

export default function EmailAccountsPage() {
  const [connectedEmails, setConnectedEmails] = useState<ConnectedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingEmail, setAddingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("gmail");

  useEffect(() => {
    // Fetch connected emails from backend
    fetchConnectedEmails();
  }, []);

  const fetchConnectedEmails = async () => {
    try {
      setLoading(true);
      // TODO: Implement API call to fetch user's connected emails
      // For now, we'll use mock data
      setConnectedEmails([]);
    } catch (error) {
      console.error("Error fetching connected emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectEmail = async () => {
    if (!newEmail) return;

    setAddingEmail(true);
    try {
      // TODO: Implement API call to connect email
      console.log(`Connecting ${newEmail} via ${selectedProvider}`);

      // Mock: Add to list
      const mockEmail: ConnectedEmail = {
        id: Date.now(),
        email: newEmail,
        provider: selectedProvider,
        is_connected: false,
        created_at: new Date().toISOString(),
      };
      setConnectedEmails([...connectedEmails, mockEmail]);
      setNewEmail("");
    } catch (error) {
      console.error("Error connecting email:", error);
    } finally {
      setAddingEmail(false);
    }
  };

  const handleDisconnectEmail = async (id: number) => {
    try {
      // TODO: Implement API call to disconnect email
      setConnectedEmails(connectedEmails.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Error disconnecting email:", error);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <Header
          title="Connected Email Accounts"
          description="Manage your email accounts and connect new ones"
        />

        <div className="space-y-6">
          {/* Add New Email */}
          <Card>
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-neutral-100">
                Add New Email Account
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Email Provider
                  </label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-green-700"
                  >
                    <option value="gmail">Gmail</option>
                    <option value="outlook">Outlook (Coming soon)</option>
                    <option value="yahoo">Yahoo (Coming soon)</option>
                    <option value="imap">IMAP (Coming soon)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleConnectEmail}
                    disabled={!newEmail || addingEmail || selectedProvider !== "gmail"}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4" />
                    {addingEmail ? "Connecting..." : "Connect Email"}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-neutral-500">
                Currently, only Gmail is supported. Other email providers coming soon!
              </p>
            </div>
          </Card>

          {/* Connected Emails List */}
          <Card>
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-neutral-100">
                Your Connected Emails
              </h2>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block">
                    <div className="w-8 h-8 border-4 border-neutral-700 border-t-green-600 rounded-full animate-spin"></div>
                  </div>
                </div>
              ) : connectedEmails.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-400">
                    No connected emails yet. Add one above to get started!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {connectedEmails.map((email) => (
                    <div
                      key={email.id}
                      className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-lg border border-neutral-700 hover:border-neutral-600 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center">
                          {email.provider === "gmail" ? (
                            <span className="text-white font-bold text-sm">G</span>
                          ) : (
                            <Mail className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-neutral-100 font-medium">{email.email}</p>
                          <p className="text-xs text-neutral-500">
                            {email.provider.charAt(0).toUpperCase() +
                              email.provider.slice(1)}{" "}
                            • Connected{" "}
                            {new Date(email.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {email.is_connected ? (
                          <div className="flex items-center gap-1 px-3 py-1 bg-green-500/10 rounded text-green-400 text-xs">
                            <Check className="h-3 w-3" />
                            Connected
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-3 py-1 bg-amber-500/10 rounded text-amber-400 text-xs">
                            Pending
                          </div>
                        )}
                        <button
                          onClick={() => handleDisconnectEmail(email.id)}
                          className="p-2 hover:bg-neutral-700 rounded transition-colors text-neutral-400 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Info Card */}
          <Card>
            <div className="p-6 space-y-3">
              <h3 className="text-sm font-semibold text-neutral-100">
                How it works
              </h3>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li className="flex gap-2">
                  <span className="text-blue-500">1.</span>
                  <span>Add your email account using the form above</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500">2.</span>
                  <span>
                    You'll be redirected to Gmail to authorize access
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500">3.</span>
                  <span>
                    FocusMail will sync your emails and analyze them with AI
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500">4.</span>
                  <span>
                    View all your emails organized by category, priority, and
                    events
                  </span>
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
