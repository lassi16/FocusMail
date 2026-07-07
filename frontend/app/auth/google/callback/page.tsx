"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const { setAuthenticatedUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");

    if (!token) {
      setError("Missing authentication token from Google callback.");
      setLoading(false);
      return;
    }

    async function completeSignIn(authToken: string) {
      try {
        localStorage.setItem("auth_token", authToken);
        const user = await api.auth.getCurrentUser();
        setAuthenticatedUser(user, authToken);
        router.replace("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to complete login.");
      } finally {
        setLoading(false);
      }
    }

    completeSignIn(token);
  }, [router, setAuthenticatedUser]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-black flex items-center justify-center p-4 text-center">
      <div className="w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-950/90 px-8 py-12 shadow-2xl shadow-black/40">
        <h1 className="text-2xl font-semibold text-neutral-100 mb-4">Signing you in...</h1>
        {loading && (
          <p className="text-neutral-400">Finishing Google sign-in and connecting your account.</p>
        )}
        {!loading && error && (
          <div className="rounded-xl bg-red-950/80 p-4 text-red-200 border border-red-700">
            <p className="font-semibold">Sign-in failed</p>
            <p className="mt-2 text-sm text-red-100">{error}</p>
            <button
              type="button"
              onClick={() => router.replace("/auth")}
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
            >
              Return to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
