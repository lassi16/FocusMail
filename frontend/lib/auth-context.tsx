"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => void;
  setAuthenticatedUser: (userData: User, accessToken: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth from localStorage, then validate the token server-side.
  // If the token is expired/invalid the session is cleared immediately so the
  // user is redirected to /auth rather than seeing a broken dashboard.
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("user");

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    // Optimistically restore from cache so the UI is not blank while we validate
    setToken(storedToken);
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch { /* ignore bad JSON */ }
    }

    // Validate against the server in the background
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/api/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("token invalid");
        return res.json();
      })
      .then((userData) => {
        // Refresh user data from server in case it changed
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      })
      .catch(() => {
        // Token rejected — clear session and send to login
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
        if (typeof window !== "undefined") {
          window.location.href = "/auth";
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.auth.login(email, password);
    localStorage.setItem("auth_token", response.access_token);
    localStorage.setItem("user", JSON.stringify(response.user));
    setToken(response.access_token);
    setUser(response.user);
  };

  const setAuthenticatedUser = (userData: User, accessToken: string) => {
    localStorage.setItem("auth_token", accessToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  };

  const register = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    const response = await api.auth.register(email, password, firstName, lastName);
    localStorage.setItem("auth_token", response.access_token);
    localStorage.setItem("user", JSON.stringify(response.user));
    setToken(response.access_token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        setAuthenticatedUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
