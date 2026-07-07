export type Email = {
  id: number;
  gmail_id: string;
  sender: string;
  subject: string;
  body: string | null;
  category: string | null;
  priority: string | null;
  action_item: string | null;
  deadline: string | null;
  received_at: string | null;
  event_count?: number;
  events?: EmailEvent[];
};

export type EmailEvent = {
  id: number;
  email_id: number;
  event_type: string;
  title: string | null;
  description: string | null;
  event_date: string | null;
  event_time: string | null;
  priority: string | null;
  status: string | null;
  email_subject?: string | null;
  email_sender?: string | null;
};

export type EmailsResponse = {
  total: number;
  limit: number;
  offset: number;
  emails: Email[];
};

export type EventsResponse = {
  total: number;
  events: EmailEvent[];
};

export type DistributionItem = {
  category?: string;
  priority?: string;
  count: number;
};

export type MonthlyVolume = {
  month: string;
  count: number;
};

export type StatsResponse = {
  total_emails: number;
  internship_count: number;
  placement_count: number;
  high_priority_count: number;
  upcoming_deadlines: number;
  category_distribution: DistributionItem[];
  priority_distribution: DistributionItem[];
  monthly_volume: MonthlyVolume[];
  upcoming_events: EmailEvent[];
  recent_important_emails: Email[];
};

export type ChatResponse = {
  answer: string;
};

export type SyncResponse = {
  inserted: number;
};

export type IndexResponse = {
  indexed: number;
};
