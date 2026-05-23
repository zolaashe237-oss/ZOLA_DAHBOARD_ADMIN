// Types du back-office admin, alignés sur les serializers DRF.

export type UserStatus = "ACTIF" | "RESTREINT" | "BLOQUE";
export type Role = "MEMBER" | "ADMIN";
export type Category = "LIVRE" | "FORMATION" | "LIBRE";
export type ContentType = "VIDEO" | "PDF" | "AUDIO";

export interface User {
  id: number;
  email: string;
  full_name: string;
  photo: string | null;
  role: Role;
  status: UserStatus;
  email_verified: boolean;
  nb_warnings: number;
  created_at: string;
  last_login: string | null;
}

export interface MemberDetail extends User {
  status_changed_at: string;
  subscriptions: { id: number; type: string; start: string; end: string | null; active: boolean }[];
  payments: { id: number; type: string; status: string; amount: number; paid_at: string }[];
  quiz_results: { content: number; title: string; score: number; validated: boolean }[];
}

export interface DashboardKPIs {
  members_active: number;
  members_restricted: number;
  revenue_month: number;
  cotisations_late: number;
  reports_pending: number;
  new_members_month: number;
  modules_validated_month: number;
}

export type SubscriptionType = "MEMBRE";

export interface ContentItem {
  id: number;
  content_type: ContentType;
  title: string;
  description: string;
  category: Category;
  order: number;
  active: boolean;
  collection: number | null;
  access_subscription_types: SubscriptionType[];
  bucket_key: string;
  thumbnail_key: string;   // clé MinIO (écriture)
  thumbnail: string;       // URL signée (lecture)
  quiz_threshold: number;
  quiz_active: boolean;
}

export interface ReportItem {
  id: number;
  target_type: "POST" | "COMMENT";
  target_id: number;
  reason: string;
  reporter: string;
  signal_count: number;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  actor: number | null;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string;
  reason: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_url: string;
  category: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
