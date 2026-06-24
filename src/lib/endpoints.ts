// Appels API du back-office. Tout passe par le client `api` (Bearer + refresh auto).
import { api } from "./api";
import type {
  Article,
  AudioItem,
  AuditEntry,
  CommunityChannel,
  CommunityPost,
  CourseItem,
  DashboardKPIs,
  Formation,
  FormationProgressStat,
  LateMember,
  LibraryPdf,
  LiveSession,
  MemberDetail,
  MemberProgressEntry,
  ModuleItem,
  MonthlyRevenue,
  Paginated,
  PaymentBreakdown,
  ProgressionKPIs,
  QuizItem,
  QuizResult,
  ReportItem,
  ResourceItem,
  SubscriptionPlan,
  Transaction,
  TransactionKPIs,
  User,
} from "./types";

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post<{ access?: string; user?: User; requires_otp?: boolean }>("/auth/login/", data),
  verifyOtp: (data: { email: string; code: string }) =>
    api.post<{ access: string; user: User }>("/auth/verify-otp/", data),
  resendOtp: (data: { email: string }) =>
    api.post("/auth/resend-otp/", data),
  refresh: () => api.post<{ access: string }>("/auth/refresh/"),
  logout: () => api.post("/auth/logout/"),
  me: () => api.get<User>("/me/"),
};

// ── Compte admin courant & gestion de l'équipe ───────────────────────────────

export const adminAccountApi = {
  // Profil de l'admin connecté
  updateMe: (data: { full_name?: string; email?: string }) =>
    api.patch<User>("/me/", data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post("/me/change-password/", data),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<{ url: string; key: string }>("/me/avatar/", fd);
  },

  // Gestion de l'équipe admin
  listAdmins: () =>
    api.get<User[] | Paginated<User>>("/admin/admins/"),
  createAdmin: (data: {
    email: string;
    full_name: string;
    password: string;
    is_super_admin?: boolean;
  }) => api.post<User>("/admin/admins/", data),
  updateAdmin: (id: number, data: Partial<User>) =>
    api.patch<User>(`/admin/admins/${id}/`, data),
  deactivateAdmin: (id: number, reason: string) =>
    api.post(`/admin/admins/${id}/deactivate/`, { reason }),
  activateAdmin: (id: number) =>
    api.post(`/admin/admins/${id}/activate/`),
  resetAdminPassword: (id: number) =>
    api.post<{ temp_password: string }>(`/admin/admins/${id}/reset-password/`),
  removeAdmin: (id: number) =>
    api.delete(`/admin/admins/${id}/`),
};

export const dashboardApi = {
  kpis: () => api.get<DashboardKPIs>("/admin/dashboard/"),
};

export const membersApi = {
  list: (params?: { status?: string; search?: string }) =>
    api.get<Paginated<User>>("/admin/members/", { params }),
  detail: (id: number) => api.get<MemberDetail>(`/admin/members/${id}/`),
  create: (data: { email: string; full_name: string; password: string; access_levels?: string[] }) =>
    api.post<User>("/admin/members/", data),
  update: (id: number, data: { full_name?: string; email?: string; phone?: string | null; country?: string | null; access_levels?: string[] }) =>
    api.patch<User>(`/admin/members/${id}/`, data),
  block: (id: number, reason: string) => api.post(`/admin/members/${id}/block/`, { reason }),
  unblock: (id: number) => api.post(`/admin/members/${id}/unblock/`),
  warn: (id: number, reason: string) =>
    api.post<{ nb_warnings: number; recidive_alert: boolean }>(`/admin/members/${id}/warn/`, { reason }),
  resetPassword: (id: number) =>
    api.post<{ temp_password: string }>(`/admin/members/${id}/reset-password/`),
  delete: (id: number) => api.delete(`/admin/members/${id}/`),
  lateCotisations: () => api.get<LateMember[] | Paginated<LateMember>>("/admin/members/late/"),
};

type List<T> = T[] | Paginated<T>;

export const formationApi = {
  list: () => api.get<List<Formation>>("/admin/formations/"),
  detail: (id: number) => api.get<Formation>(`/admin/formations/${id}/`),
  create: (data: Partial<Formation>) => api.post<Formation>("/admin/formations/", data),
  update: (id: number, data: Partial<Formation>) => api.patch<Formation>(`/admin/formations/${id}/`, data),
  remove: (id: number) => api.delete(`/admin/formations/${id}/`),
  publish: (id: number) => api.post<Formation>(`/admin/formations/${id}/publish/`),
  uploadCover: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<{ url: string; key: string }>(`/admin/formations/${id}/cover/`, fd);
  },
};

export const moduleApi = {
  list: (formationId: number) =>
    api.get<List<ModuleItem>>("/admin/modules/", { params: { formation: formationId } }),
  create: (data: Partial<ModuleItem>) => api.post<ModuleItem>("/admin/modules/", data),
  update: (id: number, data: Partial<ModuleItem>) => api.patch<ModuleItem>(`/admin/modules/${id}/`, data),
  remove: (id: number) => api.delete(`/admin/modules/${id}/`),
};

export const courseApi = {
  list: (moduleId: number) =>
    api.get<List<CourseItem>>("/admin/courses/", { params: { module: moduleId } }),
  create: (data: Partial<CourseItem>) => api.post<CourseItem>("/admin/courses/", data),
  update: (id: number, data: Partial<CourseItem>) => api.patch<CourseItem>(`/admin/courses/${id}/`, data),
  remove: (id: number) => api.delete(`/admin/courses/${id}/`),
};

export const resourceApi = {
  list: (courseId: number) =>
    api.get<List<ResourceItem>>("/admin/resources/", { params: { course: courseId } }),
  create: (data: Partial<ResourceItem>) => api.post<ResourceItem>("/admin/resources/", data),
  update: (id: number, data: Partial<ResourceItem>) => api.patch<ResourceItem>(`/admin/resources/${id}/`, data),
  remove: (id: number) => api.delete(`/admin/resources/${id}/`),
  // Upload du média (vidéo/PDF/audio) vers MinIO → renvoie la clé bucket.
  upload: (file: File, contentType: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("content_type", contentType);
    return api.post<{ bucket_key: string; size_mo: number }>("/admin/content/upload/", fd);
  },
  preview: (id: number) =>
    api.get<{ url: string; resource_type: string }>(`/admin/resources/${id}/preview/`),
};

export const quizApi = {
  list: (formationId: number) =>
    api.get<List<QuizItem>>("/admin/quizzes/", { params: { formation: formationId } }),
  listAll: (params?: { formation?: number; course?: number }) =>
    api.get<List<QuizItem>>("/admin/quizzes/", { params }),
  create: (data: Partial<QuizItem>) => api.post<QuizItem>("/admin/quizzes/", data),
  update: (id: number, data: Partial<QuizItem>) => api.patch<QuizItem>(`/admin/quizzes/${id}/`, data),
  remove: (id: number) => api.delete(`/admin/quizzes/${id}/`),
};

export const resetQuizApi = (data: { user_id: number; quiz_id: number; reason: string }) =>
  api.post("/admin/quiz/reset/", data);

export const setQuizScoreApi = (data: { user_id: number; quiz_id: number; score: number }) =>
  api.post("/admin/quiz/score/", data);

export const quizResultsApi = {
  list: (params?: { quiz_id?: number; formation_id?: number; search?: string }) =>
    api.get<QuizResult[] | Paginated<QuizResult>>("/admin/quiz/results/", { params }),
};

export const financeApi2 = {
  monthlyRevenue:   () => api.get<MonthlyRevenue[]>("/admin/finance/monthly/"),
  lateCotisations:  () => api.get<LateMember[] | Paginated<LateMember>>("/admin/finance/late/"),
  paymentBreakdown: () => api.get<PaymentBreakdown[]>("/admin/finance/breakdown/"),
};

/** Normalise une réponse liste paginée ou non en tableau. */
export function asList<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results;
}

export const financeApi = {
  manual: (data: { user_id: number; kind: string; amount?: number; reason: string }) =>
    api.post("/admin/payments/manual/", data),
  refund: (data: { user_id: number; amount: number; reason: string }) =>
    api.post("/admin/payments/refund/", data),
  exonerate: (data: { user_id: number; reason: string }) =>
    api.post("/admin/payments/exonerate/", data),
  sendReminders: (data?: { user_id?: number }) =>
    api.post<{ reminded: number }>("/admin/reminders/send/", data ?? {}),
  exportMembers: (params?: { date_from?: string; date_to?: string }) =>
    api.get("/admin/exports/members.csv", { params, responseType: "blob" }),
  exportPayments: (params?: { date_from?: string; date_to?: string }) =>
    api.get("/admin/exports/payments.csv", { params, responseType: "blob" }),
};

export const billingPaymentsApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    kind?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
  }) => api.get<Transaction[] | Paginated<Transaction>>("/billing/payments/", { params }),
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
  createAdminPost: (data: { title: string; body: string; type: string; is_admin_post: boolean; is_pinned: boolean }) =>
    api.post("/admin/posts/", data),
};

export const auditApi = {
  list: (params?: { action?: string; date_from?: string; date_to?: string; page?: number; page_size?: number }) =>
    api.get<AuditEntry[] | Paginated<AuditEntry>>("/admin/audit/", { params }),
};

// ── Lives / Sessions en direct ──────────────────────────────────────────────

export const livesApi = {
  list: () => api.get<LiveSession[] | Paginated<LiveSession>>("/admin/lives/"),
  create: (data: Partial<LiveSession>) => api.post<LiveSession>("/admin/lives/", data),
  update: (id: number, data: Partial<LiveSession>) =>
    api.patch<LiveSession>(`/admin/lives/${id}/`, data),
  remove: (id: number) => api.delete(`/admin/lives/${id}/`),
};

// ── Plans d'abonnement / Tarification ────────────────────────────────────────

export const plansApi = {
  list: () => api.get<SubscriptionPlan[] | Paginated<SubscriptionPlan>>("/admin/plans/"),
  create: (data: Partial<SubscriptionPlan>) =>
    api.post<SubscriptionPlan>("/admin/plans/", data),
  update: (id: number, data: Partial<SubscriptionPlan>) =>
    api.patch<SubscriptionPlan>(`/admin/plans/${id}/`, data),
  remove: (id: number) => api.delete(`/admin/plans/${id}/`),
  toggle: (id: number) => api.post<SubscriptionPlan>(`/admin/plans/${id}/toggle/`),
};

// ── Transactions / Historique des paiements ───────────────────────────────────

export const transactionsApi = {
  kpis: () =>
    api.get<TransactionKPIs>("/admin/transactions/kpis/"),
  list: (params?: {
    status?:  string;
    kind?:    string;
    method?:  string;
    search?:  string;
    date_from?: string;
    date_to?:   string;
    page?:      number;
    page_size?: number;
  }) =>
    api.get<Transaction[] | Paginated<Transaction>>("/admin/transactions/", { params }),
  detail: (id: number) =>
    api.get<Transaction>(`/admin/transactions/${id}/`),
  export: () =>
    api.get("/admin/exports/payments.csv", { responseType: "blob" }),
};

// ── Communauté ────────────────────────────────────────────────────────────────

export const communityApi = {
  // Canaux
  listChannels: () =>
    api.get<CommunityChannel[] | Paginated<CommunityChannel>>("/admin/community/channels/"),
  createChannel: (data: Partial<CommunityChannel>) =>
    api.post<CommunityChannel>("/admin/community/channels/", data),
  updateChannel: (id: number, data: Partial<CommunityChannel>) =>
    api.patch<CommunityChannel>(`/admin/community/channels/${id}/`, data),
  removeChannel: (id: number) => api.delete(`/admin/community/channels/${id}/`),

  // Posts
  listPosts: (params?: { channel?: number; type?: string; status?: string; search?: string }) =>
    api.get<CommunityPost[] | Paginated<CommunityPost>>("/admin/community/posts/", { params }),
  createPost: (data: Partial<CommunityPost>) =>
    api.post<CommunityPost>("/admin/community/posts/", data),
  updatePost: (id: number, data: Partial<CommunityPost>) =>
    api.patch<CommunityPost>(`/admin/community/posts/${id}/`, data),
  removePost: (id: number) => api.delete(`/admin/community/posts/${id}/`),
  pinPost: (id: number) =>
    api.post<CommunityPost>(`/admin/community/posts/${id}/pin/`),
  moderatePost: (id: number, reason: string) =>
    api.post(`/admin/community/posts/${id}/moderate/`, { reason }),
};

// ── Progression des membres ───────────────────────────────────────────────────

export const progressionApi = {
  kpis: () =>
    api.get<ProgressionKPIs>("/admin/progression/kpis/"),
  formationStats: () =>
    api.get<FormationProgressStat[] | Paginated<FormationProgressStat>>("/admin/progression/stats/"),
  memberProgress: (params?: { formation_id?: number; search?: string; completed?: boolean }) =>
    api.get<MemberProgressEntry[] | Paginated<MemberProgressEntry>>(
      "/admin/progression/members/",
      { params },
    ),
  resetProgress: (data: { user_id: number; formation_id: number; reason: string }) =>
    api.post("/admin/progression/reset/", data),
};

// ── Audiothèque ───────────────────────────────────────────────────────────────

export const audioApi = {
  list:   ()                         => api.get<AudioItem[] | Paginated<AudioItem>>("/admin/audio/"),
  create: (data: Partial<AudioItem>) => api.post<AudioItem>("/admin/audio/", data),
  update: (id: number, data: Partial<AudioItem>) =>
    api.patch<AudioItem>(`/admin/audio/${id}/`, data),
  remove: (id: number) => api.delete(`/admin/audio/${id}/`),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("content_type", "AUDIO");
    return api.post<{ bucket_key: string; size_mo: number; duration_sec: number }>(
      "/admin/content/upload/",
      fd,
    );
  },
};

// ── Bibliothèque PDF standalone ───────────────────────────────────────────────

export const libraryApi = {
  list: () => api.get<LibraryPdf[] | Paginated<LibraryPdf>>("/admin/library/"),
  create: (data: Partial<LibraryPdf>) => api.post<LibraryPdf>("/admin/library/", data),
  update: (id: number, data: Partial<LibraryPdf>) =>
    api.patch<LibraryPdf>(`/admin/library/${id}/`, data),
  remove: (id: number) => api.delete(`/admin/library/${id}/`),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("content_type", "PDF");
    return api.post<{ bucket_key: string; size_mo: number; nb_pages: number }>(
      "/admin/content/upload/",
      fd,
    );
  },
};
