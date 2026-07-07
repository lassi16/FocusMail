"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type AuthMode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "login") {
        // Login
        if (!formData.email || !formData.password) {
          throw new Error("Email and password are required");
        }

        const response = await api.auth.login(formData.email, formData.password);
        
        // Store token and user info
        localStorage.setItem("auth_token", response.access_token);
        localStorage.setItem("user", JSON.stringify(response.user));
        
        setSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        // Register
        if (!formData.email || !formData.password || !formData.confirmPassword) {
          throw new Error("Email, password, and confirm password are required");
        }

        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        if (formData.password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }

        const response = await api.auth.register(
          formData.email,
          formData.password,
          formData.firstName,
          formData.lastName
        );
        
        // Store token and user info
        localStorage.setItem("auth_token", response.access_token);
        localStorage.setItem("user", JSON.stringify(response.user));
        
        setSuccess("Registration successful! Redirecting...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-neutral-100 mb-2">FocusMail</h1>
            <p className="text-neutral-500">AI-Powered Email Intelligence</p>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2 mb-8 bg-neutral-800 p-1 rounded-lg">
            <button
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 rounded font-medium transition-all ${
                mode === "login"
                  ? "bg-green-900 text-green-200 shadow"
                  : "text-neutral-500 hover:text-neutral-400"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setMode("register");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 rounded font-medium transition-all ${
                mode === "register"
                  ? "bg-green-900 text-green-200 shadow"
                  : "text-neutral-500 hover:text-neutral-400"
              }`}
            >
              Register
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-neutral-800 border border-neutral-700 rounded text-neutral-300 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-950 border border-green-800 rounded text-green-200 text-sm">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name fields for register */}
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    First Name (optional)
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="John"
                    className="w-full px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Last Name (optional)
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Doe"
                    className="w-full px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className="w-full px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                required
              />
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                required
              />
              {mode === "register" && (
                <p className="text-xs text-neutral-500 mt-1">
                  Minimum 6 characters
                </p>
              )}
            </div>

            {/* Confirm password field for register */}
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  required
                />
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-6"
            >
              {loading
                ? mode === "login"
                  ? "Logging in..."
                  : "Creating account..."
                : mode === "login"
                ? "Login"
                : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="h-px flex-1 bg-neutral-700" />
            <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              or
            </span>
            <span className="h-px flex-1 bg-neutral-700" />
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/auth/login`;
            }}
            className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-semibold text-neutral-100 transition hover:border-green-500 hover:text-green-200"
          >
            <span>Continue with Google</span>
          </button>

          {/* Info text */}
          <p className="text-center text-sm text-neutral-500 mt-6">
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
                setSuccess(null);
              }}
              className="text-green-600 hover:underline font-medium"
            >
              {mode === "login" ? "Register" : "Login"}
            </button>
          </p>

          {/* Features info */}
          <div className="mt-8 pt-6 border-t border-neutral-700">
            <p className="text-xs text-neutral-500 text-center mb-3 font-medium">
              Connect your email accounts:
            </p>
            <div className="space-y-2 text-xs text-neutral-400">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                Gmail
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                Outlook (Coming soon)
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                Other providers (Coming soon)
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
