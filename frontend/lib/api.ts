import type {
  ChatResponse,
  Email,
  EmailsResponse,
  EventsResponse,
  IndexResponse,
  StatsResponse,
  SyncResponse,
} from "./types";

const SERVER_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

function getApiBase(): string {
  return SERVER_API_BASE;
}

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  
  // Get token from localStorage if available
  let headers: HeadersInit = {
    "Content-Type": "application/json",
    ...init?.headers,
  };
  
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers = {
        ...headers,
        "Authorization": `Bearer ${token}`
      };
    }
  }

  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (networkErr) {
    const detail = networkErr instanceof Error ? networkErr.message : String(networkErr);
    throw new Error(
      `Cannot reach the backend (${detail}). Make sure uvicorn is running at ${getApiBase()}.`
    );
  }

  if (!response.ok) {
    // If the JWT is expired/invalid, clear local session and redirect to login
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      window.location.href = "/auth";
      throw new Error("Session expired. Please log in again.");
    }

    let message = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail) message = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      const text = await response.text().catch(() => "");
      if (text) message = text;
    }
    throw new Error(message);
  }

  return response.json();
}

export const api = {
  // Auth endpoints
  auth: {
    register: (email: string, password: string, firstName?: string, lastName?: string) =>
      fetchApi<{ access_token: string; token_type: string; user: any }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
          }),
        }
      ),

    login: (email: string, password: string) =>
      fetchApi<{ access_token: string; token_type: string; user: any }>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      ),

    getCurrentUser: () =>
      fetchApi<any>("/api/auth/me"),

    logout: () =>
      fetchApi<{ message: string }>("/api/auth/logout", {
        method: "POST",
      }),
  },

  getStats: () => fetchApi<StatsResponse>("/stats"),

  getEmails: (params?: {
    categories?: string[];
    priorities?: string[];
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    params?.categories?.forEach((category) => searchParams.append("category", category));
    params?.priorities?.forEach((priority) => searchParams.append("priority", priority));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const query = searchParams.toString();
    return fetchApi<EmailsResponse>(`/emails${query ? `?${query}` : ""}`);
  },

  getEmail: (id: number) => fetchApi<Email>(`/emails/${id}`),

  getEvents: (params?: {
    event_type?: string;
    priority?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.event_type) searchParams.set("event_type", params.event_type);
    if (params?.priority) searchParams.set("priority", params.priority);
    if (params?.from_date) searchParams.set("from_date", params.from_date);
    if (params?.to_date) searchParams.set("to_date", params.to_date);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return fetchApi<EventsResponse>(`/events${query ? `?${query}` : ""}`);
  },

  chat: (query: string) =>
    fetchApi<ChatResponse>(`/chat?query=${encodeURIComponent(query)}`),

  search: (query: string) =>
    fetchApi<{ documents: string[] }>(`/search?query=${encodeURIComponent(query)}`),

  syncGmail: () => fetchApi<SyncResponse>("/gmail/sync"),

  indexEmails: () => fetchApi<IndexResponse>("/index-emails"),

  detectIntent: (query: string) =>
    fetchApi<{ query: string; domain: string }>(
      `/detect-intent?query=${encodeURIComponent(query)}`
    ),
};
