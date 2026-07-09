// Types du back-office admin, alignés sur les serializers DRF.

export type UserStatus = "ACTIF" | "RESTREINT" | "BLOQUE";

// ── Transactions / Historique des paiements ───────────────────────────────────

export type PaymentStatus = "REUSSI" | "EN_ATTENTE" | "ECHOUE" | "REMBOURSE" | "EXONERE";
export type PaymentKind   = "COTISATION" | "INSCRIPTION" | "DON" | "CADEAU" | "REMBOURSEMENT" | "EXONERATION";
export type PaymentMethod = "MTN_MOBILE_MONEY" | "ORANGE_MONEY" | "MANUEL" | "VIREMENT";

export interface Transaction {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  kind: PaymentKind;
  status: PaymentStatus;
  amount: number;
  currency: string;
  payment_method: PaymentMethod | null;
  reference: string | null;
  reason: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface TransactionKPIs {
  revenue_total:     number;
  revenue_month:     number;
  count_pending:     number;
  count_refunded:    number;
  count_failed:      number;
  count_total:       number;
}
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
  /** Branches actives : ["MEMBRE"], ["MEMBRE","FEMME"], etc. */
  access_levels?: string[];
  phone?: string | null;
  country?: string | null;
}

export interface MemberDetail extends User {
  status_changed_at: string;
  subscriptions: {
    id: number; type: string; start: string; end: string | null; active: boolean;
    billing?: string; tranches_paid?: number; tranches_total?: number;
  }[];
  payments: { id: number; type: string; status: string; amount: number; paid_at: string | null }[];
  quiz_results: { quiz: number; title: string; score: number; validated: boolean }[];
  formations_progress?: {
    formation_id: number; formation_title: string;
    progress_pct: number; modules_completed: number; modules_total: number;
    quiz_score: number | null; completed: boolean;
  }[];
}

export interface LateMember extends User {
  months_late: number;
  amount_due:  number;
}

export interface QuizResult {
  id:         number;
  user_id:    number;
  user_name:  string;
  user_email: string;
  quiz_id:    number;
  quiz_title: string;
  score:      number;
  max_score:  number;
  validated:  boolean;
  attempts:   number;
  passed_at:  string | null;
  created_at: string;
}

export interface MonthlyRevenue {
  label:  string;
  amount: number;
}

export interface DashboardKPIs {
  members_active: number;
  members_restricted: number;
  revenue_month: number;
  cotisations_late: number;
  reports_pending: number;
  new_members_month: number;
  modules_validated_month: number;
  revenue_total?: number;
  collection_rate?: number;
  unpaid_amount?: number;
  monthly_revenue?: MonthlyRevenue[];
  payment_breakdown?: PaymentBreakdown[];
}

export type SubscriptionType  = "MEMBRE";
export type FormationStatus   = "DRAFT" | "SCHEDULED" | "PUBLISHED";
export type FormationNiveau   = "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE";
export type VideoSource       = "YOUTUBE" | "UPLOAD";

/**
 * LIBRE   → accessible à tous gratuitement
 * PAYANTE → réservé aux membres ayant payé (des aperçus gratuits restent possibles)
 */
export type FormationAcces = "LIBRE" | "PAYANTE";

export interface FormationModulePreview {
  id:             number;
  title:          string;
  episode_count:  number;
}

export interface Formation {
  id: number;
  title: string;
  description: string;
  category: Category;
  access_subscription_types: SubscriptionType[];
  /** Aucun chapitre ni épisode ne peut être gratuit quand is_payant=true */
  is_payant?: boolean;
  cover_url: string;
  cover_key: string;
  status: FormationStatus;
  publish_at: string | null;
  order: number;
  module_count: number;
  /* Champs enrichis (renvoyés par le serializer détaillé) */
  niveau:           FormationNiveau | null;
  branche:          Branche | null;
  nb_episodes:      number;
  nb_gratuits:      number;
  modules_preview?: FormationModulePreview[];
  created_at: string;
  updated_at: string;
}

// ── Import automatique depuis YouTube (F2) ───────────────────────────────────

export interface YoutubeImportPreviewCourse {
  title: string;
  youtube_url: string;
  duration_sec: number | null;
}

export interface YoutubeImportPreviewModule {
  title: string;
  courses: YoutubeImportPreviewCourse[];
}

export interface YoutubeImportPreview {
  formation_title: string;
  playlist_url: string;
  modules: YoutubeImportPreviewModule[];
  total_videos: number;
}

export interface YoutubeImportResult {
  formation: Formation;
  modules_created: number;
  courses_created: number;
  simulated?: boolean;
}

export interface ModuleItem {
  id: number;
  formation: number;
  parent: number | null;
  title: string;
  description: string;
  order: number;
  /** Chapitre accessible gratuitement (aperçu, ignoré si formation is_payant) */
  is_gratuit?: boolean;
  created_at: string;
}

export interface CourseItem {
  id: number;
  module: number;
  title: string;
  description: string;
  order: number;
  /** Épisode accessible gratuitement (aperçu, ignoré si formation is_payant) */
  is_gratuit?: boolean;
  created_at: string;
}

export interface ResourceItem {
  id: number;
  course: number;
  resource_type: ContentType;
  title: string;
  description: string;
  order: number;
  video_source: VideoSource;
  youtube_url: string;
  bucket_key: string;
  thumbnail_url: string;
  thumbnail_key: string;
  thumbnail: string;
  nb_pages: number | null;
  duration_sec: number | null;
  size_mo: number | null;
  audio_format: string;
  created_at: string;
}

export interface QuizChoice {
  id?: number;
  text: string;
  is_correct: boolean;
  order: number;
}

export interface QuizQuestion {
  id?: number;
  text: string;
  multiple: boolean;
  order: number;
  choices: QuizChoice[];
  /** Type IA - absent = QCM classique (rétro-compatible). QRO = réponse ouverte notée par Gemini. */
  type?: AIQuestionType;
  /** Critères d'évaluation IA pour une question QRO (choices reste [] dans ce cas). */
  criteria?: string[];
}

export interface QuizItem {
  id: number;
  course: number | null;
  formation: number | null;
  title: string;
  pass_threshold: number;
  active: boolean;
  questions: QuizQuestion[];
  created_at: string;
  /** F4 - livre PDF associé à ce quiz (association bidirectionnelle). */
  library_pdf?: number | null;
  library_pdf_title?: string | null;
  /** Métadonnées agent IA (IAB2/IAB8) - absentes sur les quiz créés manuellement. */
  generated_by_ai?: boolean;
  ai_source?: AISourceType | null;
  niveau?: AIDifficulty | null;
  rang?: number | null;
  branche?: Branche | null;
  status?: "DRAFT" | "PUBLISHED";
}

// ── Agent IA - Génération de quiz (Gemini 3.5) ────────────────────────────────
// Réf. sprint SPR-ZOLA-S06-2026 · Axe 1 · Tâches G-01 à G-07 (back-office admin)

export type AIQuestionType = "QCM" | "QRO";
export type AIDifficulty   = "FACILE" | "INTERMEDIAIRE" | "DIFFICILE";
export type AISourceType   = "SCRIPT" | "PDF";
export type AIJobStatus    = "PENDING" | "IN_PROGRESS" | "DONE" | "FAILED";
export type QROVerdict     = "VALIDE" | "NON_VALIDE" | "A_REVOIR";

export interface AIGenerationConfig {
  nb_questions: number;
  nb_qcm: number;
  nb_qro: number;
  difficulty: AIDifficulty;
  source: AISourceType;
  /** Cible de la génération - au moins un des trois doit être fourni. */
  formation?: number | null;
  course?: number | null;
  module_title?: string;
  formation_title?: string;
}

/** Question telle que retournée par l'IA, avant publication (id client uniquement). */
export interface AIGeneratedQuestion {
  client_id: string;
  type: AIQuestionType;
  text: string;
  choices: QuizChoice[];
  criteria: string[];
  difficulty: AIDifficulty;
  suggested_rank: number;
  regenerating?: boolean;
}

export interface AIQuizJob {
  job_id: string;
  status: AIJobStatus;
  progress: number;
  formation_title?: string;
  module_title?: string;
  niveau_suggere?: AIDifficulty;
  rang_suggere?: number;
  questions?: AIGeneratedQuestion[];
  error?: string;
  /** true si la réponse provient du moteur de simulation local (backend IA pas encore branché). */
  simulated?: boolean;
}

export interface AIQROReviewItem {
  id: number;
  quiz_id: number;
  quiz_title: string;
  question_text: string;
  chapter_context: string;
  member_name: string;
  member_answer: string;
  ai_score: number;
  ai_verdict: QROVerdict;
  ai_justification: string;
  created_at: string;
}

export interface AIQuizHistoryEntry {
  id: number;
  quiz_title: string;
  source_title: string;
  ai_source: AISourceType | null;
  generated_by_ai: boolean;
  validated_by: string | null;
  status: "DRAFT" | "PUBLISHED";
  niveau: AIDifficulty | null;
  created_at: string;
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

// ── Lives / Sessions en direct ──────────────────────────────────────────────

export type LiveStatus = "PLANIFIE" | "EN_COURS" | "TERMINE";
export type Branche = "GENERALE" | "FEMME" | "ENFANT";
export type LivePlatform = "ZOOM" | "YOUTUBE" | "MEET" | "TEAMS";

export interface LiveSession {
  id: number;
  title: string;
  description: string;
  scheduled_at: string;
  status: LiveStatus;
  platform: LivePlatform;
  link: string;
  branche: Branche;
  replay_url: string | null;
  created_at: string;
  updated_at: string;
}

// ── Plans d'abonnement / Tarification ────────────────────────────────────────

export type PlanBilling = "ANNUEL" | "TRANCHES" | "MENSUEL";

export interface SubscriptionPlan {
  id: number;
  name: string;
  billing: PlanBilling;
  price_total: number;
  nb_tranches: number;
  tranche_amount: number | null;
  description: string;
  is_active: boolean;
  access_levels: string[];
  formation_ids: number[];
  created_at: string;
  updated_at: string;
}

// ── Communauté ────────────────────────────────────────────────────────────────

export type PostStatus = "PUBLIE" | "MODERE" | "ARCHIVE";
export type PostType   = "ANNONCE" | "DISCUSSION" | "QUESTION";

export interface CommunityChannel {
  id: number;
  name: string;
  slug: string;
  description: string;
  branche: Branche;
  color: string;
  is_active: boolean;
  post_count: number;
  created_at: string;
}

export interface CommunityPost {
  id: number;
  author_name: string;
  author_email: string | null;
  channel: number | null;
  channel_name: string | null;
  type: PostType;
  title: string;
  body: string;
  is_pinned: boolean;
  is_admin_post: boolean;
  status: PostStatus;
  comment_count: number;
  report_count: number;
  created_at: string;
  updated_at: string;
}

// ── Progression des membres ───────────────────────────────────────────────────

export interface ProgressionKPIs {
  total_enrollments:   number;
  total_completions:   number;
  avg_completion_rate: number;
  avg_quiz_score:      number | null;
}

export interface FormationProgressStat {
  formation_id:     number;
  formation_title:  string;
  cover_url:        string | null;
  enrolled_count:   number;
  completed_count:  number;
  completion_rate:  number;
  avg_quiz_score:   number | null;
  avg_progress_pct: number;
}

export interface MemberProgressEntry {
  user_id:           number;
  user_name:         string;
  user_email:        string;
  formation_id:      number;
  formation_title:   string;
  progress_pct:      number;
  modules_completed: number;
  modules_total:     number;
  quiz_score:        number | null;
  last_activity:     string | null;
  completed:         boolean;
}

// ── Répartition des paiements ─────────────────────────────────────────────────

export interface PaymentBreakdown {
  kind:   string;
  label:  string;
  amount: number;
  count:  number;
  color:  string;
}

// ── Bibliothèque PDF standalone ───────────────────────────────────────────────

export type PdfAccess = "PUBLIC" | "MEMBRE" | "FEMME" | "ENFANT";

// ── Audiothèque ───────────────────────────────────────────────────────────────

export interface AudioItem {
  id: number;
  title: string;
  description: string;
  category: string;
  branche: Branche;
  access_level: PdfAccess;
  bucket_key: string;
  file_url: string | null;
  cover_url: string | null;
  duration_sec: number | null;
  size_mo: number | null;
  audio_format: string | null;
  is_active: boolean;
  is_gratuit?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LibraryPdf {
  id: number;
  title: string;
  description: string;
  category: string;
  branche: Branche;
  access_level: PdfAccess;
  bucket_key: string;
  file_url: string | null;
  cover_url: string | null;
  nb_pages: number | null;
  size_mo: number | null;
  is_active: boolean;
  /** F4 - quiz associé à ce document, s'il existe. */
  linked_quiz_id?: number | null;
  linked_quiz_title?: string | null;
  /** Accessible gratuitement même si access_level est restreint */
  is_gratuit?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SocialLinksConfig {
  facebook_url: string;
  instagram_url: string;
  youtube_url: string;
  tiktok_url: string;
  updated_at?: string;
}