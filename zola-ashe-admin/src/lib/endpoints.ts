// Appels API du back-office. Tout passe par le client `api` (Bearer + refresh auto).
import { api } from "./api";
import type {
  Article,
  AuditEntry,
  ContentItem,
  DashboardKPIs,
  MemberDetail,
  Paginated,
  ReportItem,
  User,
} from "./types";

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post<{ access: string; user: User }>("/auth/login/", data),
  refresh: () => api.post<{ access: string }>("/auth/refresh/"),
  logout: () => api.post("/auth/logout/"),
  me: () => api.get<User>("/me/"),
};

export const dashboardApi = {
  kpis: () => api.get<DashboardKPIs>("/admin/dashboard/"),
};

export const membersApi = {
  list: (params?: { status?: string; search?: string }) =>
    api.get<Paginated<User>>("/admin/members/", { params }),
  detail: (id: number) => api.get<MemberDetail>(`/admin/members/${id}/`),
  block: (id: number, reason: string) => api.post(`/admin/members/${id}/block/`, { reason }),
  unblock: (id: number) => api.post(`/admin/members/${id}/unblock/`),
  warn: (id: number, reason: string) =>
    api.post<{ nb_warnings: number; recidive_alert: boolean }>(`/admin/members/${id}/warn/`, { reason }),
  resetPassword: (id: number) => api.post(`/admin/members/${id}/reset-password/`),
};

export const contentApi = {
  list: () => api.get<ContentItem[] | Paginated<ContentItem>>("/admin/content/"),
  create: (data: Partial<ContentItem>) => api.post<ContentItem>("/admin/content/", data),
  update: (id: number, data: Partial<ContentItem>) => api.patch(`/admin/content/${id}/`, data),
  remove: (id: number) => api.delete(`/admin/content/${id}/`),
  // Upload du média (vidéo/PDF/audio) vers MinIO → renvoie la clé bucket.
  upload: (file: File, contentType: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("content_type", contentType);
    return api.post<{ bucket_key: string; size_mo: number }>("/admin/content/upload/", fd);
  },
  // Prévisualisation admin : URL signée du média (sans contrôle d'abonnement).
  preview: (id: number) =>
    api.get<{ url: string; content_type: string }>(`/admin/content/${id}/preview/`),
  resetQuiz: (data: { user_id: number; content_id: number; reason: string }) =>
    api.post("/admin/quiz/reset/", data),
};

export const financeApi = {
  manual: (data: { user_id: number; kind: string; amount?: number; reason: string }) =>
    api.post("/admin/payments/manual/", data),
  refund: (data: { user_id: number; amount: number; reason: string }) =>
    api.post("/admin/payments/refund/", data),
  exonerate: (data: { user_id: number; reason: string }) =>
    api.post("/admin/payments/exonerate/", data),
  sendReminders: () => api.post<{ reminded: number }>("/admin/reminders/send/"),
  exportMembers: () => api.get("/admin/exports/members.csv", { responseType: "blob" }),
  exportPayments: () => api.get("/admin/exports/payments.csv", { responseType: "blob" }),
};

/** Déclenche le téléchargement d'un blob renvoyé par l'API (CSV authentifié). */
export function downloadBlob(data: Blob, filename: string) {
  const url = window.URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export const blogApi = {
  list: () => api.get<Article[] | Paginated<Article>>("/admin/blog/"),
  create: (data: Partial<Article>) => api.post<Article>("/admin/blog/", data),
  update: (id: number, data: Partial<Article>) => api.patch(`/admin/blog/${id}/`, data),
  remove: (id: number) => api.delete(`/admin/blog/${id}/`),
};

export const moderationApi = {
  reports: () => api.get<ReportItem[]>("/admin/reports/"),
  handle: (id: number) => api.post(`/admin/reports/${id}/handle/`),
  deletePost: (id: number, reason: string) => api.post(`/admin/posts/${id}/delete/`, { reason }),
  deleteComment: (id: number, reason: string) => api.post(`/admin/comments/${id}/delete/`, { reason }),
};

export const auditApi = {
  list: (params?: { action?: string }) =>
    api.get<Paginated<AuditEntry>>("/admin/audit/", { params }),
};
