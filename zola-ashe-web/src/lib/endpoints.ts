// Fonctions d'appel à l'API, typées. Toutes passent par le client `api`
// (injection du Bearer + refresh automatique sur 401).
import { api } from "./api";
import type {
  Article,
  ContentItem,
  Paginated,
  Post,
  Subscription,
  User,
} from "./types";

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; full_name: string; password: string; password2: string }) =>
    api.post("/auth/register/", data),

  verifyOtp: (data: { email: string; code: string }) =>
    api.post("/auth/verify-otp/", data),

  resendOtp: (email: string) => api.post("/auth/resend-otp/", { email }),

  login: (data: { email: string; password: string }) =>
    api.post<{ access: string; user: User }>("/auth/login/", data),

  refresh: () => api.post<{ access: string }>("/auth/refresh/"),

  logout: () => api.post("/auth/logout/"),

  passwordForgot: (email: string) => api.post("/auth/password/forgot/", { email }),

  passwordReset: (data: { email: string; code: string; new_password: string }) =>
    api.post("/auth/password/reset/", data),
};

// ─── Profil ───────────────────────────────────────────────────────────────────
export const meApi = {
  get: () => api.get<User>("/me/"),
  update: (data: Partial<Pick<User, "full_name">>) => api.patch<User>("/me/", data),
};

// ─── Contenu ────────────────────────────────────────────────────────────────
export const contentApi = {
  list: (params?: { category?: string; content_type?: string; collection?: number }) =>
    api.get<Paginated<ContentItem>>("/content/", { params }),

  detail: (id: number) => api.get<ContentItem>(`/content/${id}/`),

  stream: (id: number) => api.get<{ url: string; expires_in: number }>(`/content/${id}/stream/`),

  submitQuiz: (id: number, score: number) =>
    api.post(`/content/${id}/quiz/submit/`, { score }),
};

// ─── Billing ──────────────────────────────────────────────────────────────────
export const billingApi = {
  subscriptionTypes: () =>
    api.get<{ kind: string; label: string; amount: number }[]>("/billing/subscription-types/"),

  initiate: (kind: string, amount?: number) =>
    api.post<{ checkout_url: string; reference: string; amount: number }>(
      "/billing/payments/initiate/",
      { kind, ...(amount ? { amount } : {}) },
    ),

  mySubscriptions: () =>
    api.get<Subscription[] | Paginated<Subscription>>("/billing/subscriptions/"),

  myPayments: () => api.get<Paginated<unknown>>("/billing/payments/"),
};

// ─── Blog / Journal (public) ──────────────────────────────────────────────────
export const blogApi = {
  list: () => api.get<Article[] | { results: Article[] }>("/blog/"),
  detail: (slug: string) => api.get<Article>(`/blog/${slug}/`),
};

// ─── Communauté ───────────────────────────────────────────────────────────────
export const communityApi = {
  feed: () => api.get<Paginated<Post>>("/community/posts/"),

  createPost: (data: { text: string; audience?: string }) =>
    api.post<Post>("/community/posts/", data),

  toggleLike: (id: number) =>
    api.post<{ liked: boolean; likes_count: number }>(`/community/posts/${id}/like/`),

  comments: (id: number) => api.get(`/community/posts/${id}/comments/`),

  addComment: (id: number, text: string) =>
    api.post(`/community/posts/${id}/comments/`, { text }),

  report: (data: { target_type: "POST" | "COMMENT"; target_id: number; reason: string }) =>
    api.post("/community/reports/", data),
};
