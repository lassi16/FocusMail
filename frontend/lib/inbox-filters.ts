const STORAGE_KEY = "focusmail-inbox-filters";

export type InboxFilters = {
  categories: string[];
  priorities: string[];
  search: string;
};

export function loadInboxFilters(): InboxFilters {
  if (typeof window === "undefined") {
    return { categories: [], priorities: [], search: "" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { categories: [], priorities: [], search: "" };
    const parsed = JSON.parse(raw) as InboxFilters;
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      priorities: Array.isArray(parsed.priorities) ? parsed.priorities : [],
      search: typeof parsed.search === "string" ? parsed.search : "",
    };
  } catch {
    return { categories: [], priorities: [], search: "" };
  }
}

export function saveInboxFilters(filters: InboxFilters) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

export function buildInboxQueryString(filters: InboxFilters, emailId?: number | null): string {
  const params = new URLSearchParams();
  filters.categories.forEach((category) => params.append("category", category));
  filters.priorities.forEach((priority) => params.append("priority", priority));
  if (filters.search) params.set("search", filters.search);
  if (emailId) params.set("id", String(emailId));
  return params.toString();
}

export function parseMultiParam(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
