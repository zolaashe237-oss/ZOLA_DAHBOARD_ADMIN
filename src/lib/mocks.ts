/**
 * Données de démonstration — chaque page les utilise comme état initial.
 * Remplacées par les vraies données API dès que le serveur répond.
 */
import type {
  AudioItem,
  AuditEntry, CommunityChannel, CommunityPost, DashboardKPIs,
  Formation, FormationProgressStat,
  LateMember, LibraryPdf, LiveSession,
  MemberDetail, MemberProgressEntry, MonthlyRevenue,
  PaymentBreakdown,
  ProgressionKPIs, QuizItem, QuizResult, ReportItem, SubscriptionPlan,
  Transaction, TransactionKPIs, User,
} from "./types";

// ── Dashboard KPIs ────────────────────────────────────────────────────────────

export const MOCK_KPIS: DashboardKPIs = {
  members_active:          247,
  new_members_month:        23,
  revenue_month:        485000,
  cotisations_late:          3,
  members_restricted:        5,
  reports_pending:           2,
  modules_validated_month:  89,
};

// ── Bibliothèque PDF ──────────────────────────────────────────────────────────

export const MOCK_LIBRARY: LibraryPdf[] = [
  {
    id: 1, title: "Guide de Méditation Quotidienne",
    description: "Un parcours de 30 jours pour ancrer la pratique de la méditation dans votre vie. Exercices guidés, conseils de posture et affirmations positives pour chaque journée.",
    category: "Méditation", branche: "GENERALE", access_level: "PUBLIC",
    bucket_key: "lib/meditation-guide.pdf", file_url: null, cover_url: null,
    nb_pages: 48, size_mo: 2.3, is_active: true,
    created_at: "2026-02-10T09:00:00Z", updated_at: "2026-02-10T09:00:00Z",
  },
  {
    id: 2, title: "Nutrition & Bien-être Familial",
    description: "Recettes et conseils nutritionnels adaptés aux familles africaines. Découvrez comment allier tradition culinaire et équilibre alimentaire moderne pour toute la famille.",
    category: "Nutrition", branche: "GENERALE", access_level: "MEMBRE",
    bucket_key: "lib/nutrition-famille.pdf", file_url: null, cover_url: null,
    nb_pages: 92, size_mo: 5.8, is_active: true,
    created_at: "2026-02-28T10:30:00Z", updated_at: "2026-03-01T08:00:00Z",
  },
  {
    id: 3, title: "Le Chemin de la Femme Africaine",
    description: "Un voyage intérieur au cœur de l'identité féminine africaine. Explorez vos racines, votre puissance intérieure et construisez une vision de vous-même ancrée dans votre héritage.",
    category: "Développement personnel", branche: "FEMME", access_level: "FEMME",
    bucket_key: "lib/chemin-femme.pdf", file_url: null, cover_url: null,
    nb_pages: 156, size_mo: 8.4, is_active: true,
    created_at: "2026-03-15T14:00:00Z", updated_at: "2026-03-15T14:00:00Z",
  },
  {
    id: 4, title: "Éveil Spirituel — Tome I",
    description: "Fondements de la spiritualité africaine et universelle. Ce premier tome pose les bases d'une démarche consciente vers l'éveil : connaissance de soi, connexion à l'invisible, rituels quotidiens.",
    category: "Spiritualité", branche: "GENERALE", access_level: "MEMBRE",
    bucket_key: "lib/eveil-tome1.pdf", file_url: null, cover_url: null,
    nb_pages: 201, size_mo: 12.1, is_active: true,
    created_at: "2026-04-02T11:00:00Z", updated_at: "2026-04-05T16:00:00Z",
  },
  {
    id: 5, title: "Activités d'Éveil pour les Petits",
    description: "40 activités ludiques et éducatives pour éveiller la curiosité spirituelle et émotionnelle des enfants de 4 à 10 ans. Fiches imprimables, histoires et jeux inclus.",
    category: "Éducation", branche: "ENFANT", access_level: "ENFANT",
    bucket_key: "lib/activites-enfants.pdf", file_url: null, cover_url: null,
    nb_pages: 64, size_mo: 4.6, is_active: true,
    created_at: "2026-04-20T09:30:00Z", updated_at: "2026-04-20T09:30:00Z",
  },
  {
    id: 6, title: "Harmonie Corps & Âme",
    description: "Programme de bien-être holistique de 8 semaines pour la femme moderne. Yoga doux, phytothérapie africaine, journaling et soins naturels pour retrouver l'équilibre intérieur.",
    category: "Bien-être", branche: "FEMME", access_level: "MEMBRE",
    bucket_key: "lib/harmonie-corps-ame.pdf", file_url: null, cover_url: null,
    nb_pages: 78, size_mo: 6.2, is_active: false,
    created_at: "2026-05-08T13:00:00Z", updated_at: "2026-06-01T10:00:00Z",
  },
];

// ── Audiothèque ───────────────────────────────────────────────────────────────

export const MOCK_AUDIO: AudioItem[] = [
  {
    id: 1, title: "Méditation guidée — Ancrage du matin",
    description: "Commencez chaque journée par cette méditation de 15 minutes pour ancrer votre énergie et poser une intention claire.",
    category: "Méditation", branche: "GENERALE", access_level: "PUBLIC",
    bucket_key: "audio/meditation-ancrage.mp3", file_url: null, cover_url: null,
    duration_sec: 912, size_mo: 13.2, audio_format: "mp3",
    is_active: true, is_gratuit: false,
    created_at: "2026-02-12T09:00:00Z", updated_at: "2026-02-12T09:00:00Z",
  },
  {
    id: 2, title: "Cours audio — Introduction à la spiritualité africaine",
    description: "Premier épisode de la série : origines, principes fondamentaux et pratiques ancestrales de la spiritualité africaine.",
    category: "Spiritualité", branche: "GENERALE", access_level: "MEMBRE",
    bucket_key: "audio/spiritualite-intro.mp3", file_url: null, cover_url: null,
    duration_sec: 2748, size_mo: 38.5, audio_format: "mp3",
    is_active: true, is_gratuit: false,
    created_at: "2026-03-01T10:00:00Z", updated_at: "2026-03-01T10:00:00Z",
  },
  {
    id: 3, title: "Relaxation profonde — Nuit paisible",
    description: "Séance de relaxation progressive pour préparer un sommeil réparateur. Sons binauraux et voix douce pour lâcher prise.",
    category: "Bien-être", branche: "GENERALE", access_level: "MEMBRE",
    bucket_key: "audio/relaxation-nuit.mp3", file_url: null, cover_url: null,
    duration_sec: 1980, size_mo: 28.1, audio_format: "mp3",
    is_active: true, is_gratuit: true,
    created_at: "2026-03-18T15:00:00Z", updated_at: "2026-03-18T15:00:00Z",
  },
  {
    id: 4, title: "Affirmations de la femme accomplie",
    description: "30 affirmations positives enregistrées en français et en lingala pour renforcer l'estime de soi et la confiance féminine.",
    category: "Développement personnel", branche: "FEMME", access_level: "FEMME",
    bucket_key: "audio/affirmations-femme.mp3", file_url: null, cover_url: null,
    duration_sec: 1320, size_mo: 18.7, audio_format: "mp3",
    is_active: true, is_gratuit: false,
    created_at: "2026-04-05T11:00:00Z", updated_at: "2026-04-05T11:00:00Z",
  },
  {
    id: 5, title: "Histoire du soir — Le lion et la sagesse",
    description: "Conte africain narré pour les enfants de 5 à 10 ans. Valeurs de courage, partage et respect de la nature à travers une aventure captivante.",
    category: "Conte", branche: "ENFANT", access_level: "ENFANT",
    bucket_key: "audio/conte-lion-sagesse.mp3", file_url: null, cover_url: null,
    duration_sec: 780, size_mo: 11.3, audio_format: "mp3",
    is_active: true, is_gratuit: false,
    created_at: "2026-04-22T09:30:00Z", updated_at: "2026-04-22T09:30:00Z",
  },
  {
    id: 6, title: "Chants & Prières du matin",
    description: "Collection de chants spirituels africains pour accompagner le réveil et nourrir l'âme dès les premières heures du jour.",
    category: "Spiritualité", branche: "FEMME", access_level: "FEMME",
    bucket_key: "audio/chants-matin.mp3", file_url: null, cover_url: null,
    duration_sec: 2160, size_mo: 30.4, audio_format: "mp3",
    is_active: false, is_gratuit: false,
    created_at: "2026-05-10T14:00:00Z", updated_at: "2026-06-01T10:00:00Z",
  },
];

// ── Formations ────────────────────────────────────────────────────────────────

export const MOCK_FORMATIONS: Formation[] = [
  {
    id: 1, title: "Développement Personnel Intégral",
    description: "Une formation complète pour transformer votre vie de l'intérieur. 5 modules progressifs couvrant connaissance de soi, gestion des émotions, communication et vision de vie.",
    category: "FORMATION", access_subscription_types: ["MEMBRE"],
    cover_url: "", cover_key: "", status: "PUBLISHED", publish_at: null,
    order: 1, module_count: 5,
    niveau: "DEBUTANT", branche: "GENERALE", nb_episodes: 14, nb_gratuits: 3,
    modules_preview: [
      { id: 1, title: "Connaissance de Soi",   episode_count: 4 },
      { id: 2, title: "Gestion des Émotions",  episode_count: 3 },
      { id: 3, title: "Communication",          episode_count: 2 },
    ],
    created_at: "2026-01-15T09:00:00Z", updated_at: "2026-02-01T12:00:00Z",
  },
  {
    id: 2, title: "Nutrition & Équilibre de Vie",
    description: "Apprenez à nourrir votre corps et votre esprit avec sagesse. Recettes, conseils nutritionnels et rituels de bien-être adaptés au mode de vie africain.",
    category: "FORMATION", access_subscription_types: ["MEMBRE"],
    cover_url: "", cover_key: "", status: "PUBLISHED", publish_at: null,
    order: 2, module_count: 3,
    niveau: "DEBUTANT", branche: "GENERALE", nb_episodes: 9, nb_gratuits: 2,
    modules_preview: [
      { id: 4, title: "Fondamentaux nutritionnels", episode_count: 4 },
      { id: 5, title: "Rituels alimentaires",       episode_count: 3 },
      { id: 6, title: "Recettes & Pratiques",        episode_count: 2 },
    ],
    created_at: "2026-02-01T10:00:00Z", updated_at: "2026-02-20T14:00:00Z",
  },
  {
    id: 3, title: "Éveil Spirituel — Niveau Débutant",
    description: "Premiers pas vers une spiritualité consciente et ancrée. Méditation, reconnexion à vos ancêtres, et rituels simples pour le quotidien.",
    category: "FORMATION", access_subscription_types: ["MEMBRE"],
    cover_url: "", cover_key: "", status: "PUBLISHED", publish_at: null,
    order: 3, module_count: 4,
    niveau: "INTERMEDIAIRE", branche: "GENERALE", nb_episodes: 12, nb_gratuits: 2,
    modules_preview: [
      { id: 7, title: "Introduction à l'Ashé",  episode_count: 3 },
      { id: 8, title: "Méditation & Silence",   episode_count: 3 },
      { id: 9, title: "Les Rituels du Matin",   episode_count: 3 },
    ],
    created_at: "2026-03-10T08:00:00Z", updated_at: "2026-03-25T16:00:00Z",
  },
  {
    id: 4, title: "Leadership au Féminin",
    description: "Révélez votre leadership naturel en tant que femme africaine. Management bienveillant, prise de parole en public et stratégies de croissance professionnelle.",
    category: "FORMATION", access_subscription_types: ["MEMBRE"],
    cover_url: "", cover_key: "", status: "DRAFT", publish_at: null,
    order: 4, module_count: 2,
    niveau: "AVANCE", branche: "FEMME", nb_episodes: 6, nb_gratuits: 0,
    modules_preview: [
      { id: 10, title: "Identité & Posture",    episode_count: 3 },
      { id: 11, title: "Stratégie & Vision",    episode_count: 3 },
    ],
    created_at: "2026-05-01T09:00:00Z", updated_at: "2026-06-01T10:00:00Z",
  },
  {
    id: 5, title: "Éducation Bienveillante",
    description: "Outils pratiques pour accompagner le développement de vos enfants avec douceur, fermeté et amour. Inspiré des pédagogies africaines et Montessori.",
    category: "FORMATION", access_subscription_types: [],
    cover_url: "", cover_key: "", status: "SCHEDULED",
    publish_at: "2026-07-01T06:00:00Z",
    order: 5, module_count: 0,
    niveau: "INTERMEDIAIRE", branche: "ENFANT", nb_episodes: 0, nb_gratuits: 0,
    modules_preview: [],
    created_at: "2026-06-01T11:00:00Z", updated_at: "2026-06-05T09:00:00Z",
  },
];

// ── Lives ─────────────────────────────────────────────────────────────────────

export const MOCK_LIVES: LiveSession[] = [
  {
    id: 1, title: "Méditation Collective du Dimanche",
    description: "Rejoignez notre cercle hebdomadaire de méditation guidée. Ouvert à tous les niveaux. Amenez votre tapis et un carnet.",
    scheduled_at: "2026-06-15T10:00:00Z", status: "PLANIFIE", platform: "ZOOM",
    link: "https://zoom.us/j/123456789", branche: "GENERALE", replay_url: null,
    created_at: "2026-06-05T09:00:00Z", updated_at: "2026-06-05T09:00:00Z",
  },
  {
    id: 2, title: "Q&A Nutrition — Dr. Moussa Diallo",
    description: "Posez vos questions sur la nutrition holistique à notre expert. Spécial alimentation africaine et grossesse.",
    scheduled_at: "2026-06-22T18:00:00Z", status: "PLANIFIE", platform: "YOUTUBE",
    link: "https://youtube.com/live/abc123", branche: "FEMME", replay_url: null,
    created_at: "2026-06-07T10:00:00Z", updated_at: "2026-06-07T10:00:00Z",
  },
  {
    id: 3, title: "Cercle de Femmes — Juillet",
    description: "Espace d'échange bienveillant entre femmes Zola Ashé. Thème du mois : confiance en soi et affirmation de soi.",
    scheduled_at: "2026-07-06T17:00:00Z", status: "PLANIFIE", platform: "ZOOM",
    link: "https://zoom.us/j/987654321", branche: "FEMME", replay_url: null,
    created_at: "2026-06-08T14:00:00Z", updated_at: "2026-06-08T14:00:00Z",
  },
  {
    id: 4, title: "Méditation Guidée — Archive Mai",
    description: "Session de méditation de 45 minutes sur le thème du lâcher-prise. Plus de 120 participants présents.",
    scheduled_at: "2026-05-25T10:00:00Z", status: "TERMINE", platform: "ZOOM",
    link: "https://zoom.us/j/555444333", branche: "GENERALE",
    replay_url: "https://youtube.com/watch?v=replay1",
    created_at: "2026-05-15T08:00:00Z", updated_at: "2026-05-25T12:00:00Z",
  },
  {
    id: 5, title: "Atelier Éducation Parentale",
    description: "Atelier pratique avec exercices et mises en situation. 45 parents participants. Très positif !",
    scheduled_at: "2026-05-11T16:00:00Z", status: "TERMINE", platform: "MEET",
    link: "https://meet.google.com/xyz-abc-def", branche: "ENFANT",
    replay_url: "https://youtube.com/watch?v=replay2",
    created_at: "2026-05-01T09:00:00Z", updated_at: "2026-05-11T18:30:00Z",
  },
];

// ── Membres ───────────────────────────────────────────────────────────────────

export const MOCK_MEMBERS: User[] = [
  { id: 1, email: "marieclaire.ahouandjinou@gmail.com", full_name: "Marie-Claire Ahouandjinou", photo: null, role: "MEMBER", status: "ACTIF",     email_verified: true,  nb_warnings: 0, created_at: "2026-01-10T09:00:00Z", last_login: "2026-06-08T07:30:00Z", access_levels: ["MEMBRE"],               phone: "+229 97 12 34 56", country: "Bénin" },
  { id: 2, email: "fatou.diallo@yahoo.fr",              full_name: "Fatou Diallo",               photo: null, role: "MEMBER", status: "ACTIF",     email_verified: true,  nb_warnings: 1, created_at: "2026-01-22T14:00:00Z", last_login: "2026-06-07T19:00:00Z", access_levels: ["MEMBRE", "FEMME"],      phone: "+221 77 456 78 90", country: "Sénégal" },
  { id: 3, email: "aminata.kouyate@gmail.com",          full_name: "Aminata Kouyaté",            photo: null, role: "MEMBER", status: "ACTIF",     email_verified: true,  nb_warnings: 0, created_at: "2026-02-03T10:00:00Z", last_login: "2026-06-09T08:00:00Z", access_levels: ["MEMBRE", "FEMME", "ENFANT"], phone: "+224 620 11 22 33", country: "Guinée" },
  { id: 4, email: "chantal.ndzinzou@hotmail.com",       full_name: "Chantal Ndzinzou",           photo: null, role: "MEMBER", status: "RESTREINT", email_verified: true,  nb_warnings: 3, created_at: "2026-02-14T11:00:00Z", last_login: "2026-05-30T16:00:00Z", access_levels: ["MEMBRE"],               phone: "+237 699 88 77 66", country: "Cameroun" },
  { id: 5, email: "sophie.tchibozo@gmail.com",          full_name: "Sophie Tchibozo",            photo: null, role: "MEMBER", status: "ACTIF",     email_verified: true,  nb_warnings: 0, created_at: "2026-03-01T08:30:00Z", last_login: "2026-06-08T20:00:00Z", access_levels: ["MEMBRE", "ENFANT"],     phone: "+229 95 44 55 66", country: "Bénin" },
  { id: 6, email: "nathalie.gbossou@gmail.com",         full_name: "Nathalie Gbossou",           photo: null, role: "MEMBER", status: "ACTIF",     email_verified: false, nb_warnings: 2, created_at: "2026-03-18T15:00:00Z", last_login: "2026-06-05T11:30:00Z", access_levels: ["MEMBRE"],               phone: "+33 6 12 34 56 78",  country: "France" },
  { id: 7, email: "aicha.traore@orange.fr",             full_name: "Aïcha Traoré",               photo: null, role: "MEMBER", status: "BLOQUE",    email_verified: true,  nb_warnings: 3, created_at: "2026-04-05T09:00:00Z", last_login: "2026-05-20T14:00:00Z", access_levels: [],                       phone: "+223 76 00 11 22",  country: "Mali" },
  { id: 8, email: "rose.koudou@gmail.com",              full_name: "Rose Koudou",                photo: null, role: "MEMBER", status: "ACTIF",     email_verified: true,  nb_warnings: 0, created_at: "2026-05-10T10:00:00Z", last_login: "2026-06-08T18:00:00Z", access_levels: ["MEMBRE", "FEMME"],      phone: "+225 07 89 01 23 45", country: "Côte d'Ivoire" },
];

// ── Transactions ──────────────────────────────────────────────────────────────

export const MOCK_TRANSACTION_KPIS: TransactionKPIs = {
  revenue_total:   3_240_000,
  revenue_month:     485_000,
  count_pending:           4,
  count_refunded:          2,
  count_failed:            1,
  count_total:            87,
};

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 1,  user_id: 1, user_name: "Marie-Claire Ahouandjinou", user_email: "marieclaire.ahouandjinou@gmail.com", kind: "COTISATION",  status: "REUSSI",     amount: 15000, currency: "XAF", payment_method: "MTN_MOBILE_MONEY", reference: "MTN-2026-0001", reason: null,                    paid_at: "2026-06-01T09:15:00Z", created_at: "2026-06-01T09:10:00Z" },
  { id: 2,  user_id: 2, user_name: "Fatou Diallo",              user_email: "fatou.diallo@yahoo.fr",              kind: "COTISATION",  status: "REUSSI",     amount: 15000, currency: "XAF", payment_method: "ORANGE_MONEY",     reference: "OM-2026-0024",  reason: null,                    paid_at: "2026-06-02T14:30:00Z", created_at: "2026-06-02T14:25:00Z" },
  { id: 3,  user_id: 3, user_name: "Aminata Kouyaté",           user_email: "aminata.kouyate@gmail.com",          kind: "INSCRIPTION", status: "REUSSI",     amount: 25000, currency: "XAF", payment_method: "MTN_MOBILE_MONEY", reference: "MTN-2026-0056", reason: "Inscription formation", paid_at: "2026-06-03T10:00:00Z", created_at: "2026-06-03T09:55:00Z" },
  { id: 4,  user_id: 5, user_name: "Sophie Tchibozo",           user_email: "sophie.tchibozo@gmail.com",          kind: "COTISATION",  status: "EN_ATTENTE", amount: 15000, currency: "XAF", payment_method: "ORANGE_MONEY",     reference: null,            reason: null,                    paid_at: null,                   created_at: "2026-06-04T16:00:00Z" },
  { id: 5,  user_id: 8, user_name: "Rose Koudou",               user_email: "rose.koudou@gmail.com",              kind: "DON",         status: "REUSSI",     amount: 5000,  currency: "XAF", payment_method: "MTN_MOBILE_MONEY", reference: "MTN-2026-0088", reason: "Don soutien plateforme", paid_at: "2026-06-04T18:00:00Z", created_at: "2026-06-04T17:55:00Z" },
  { id: 6,  user_id: 6, user_name: "Nathalie Gbossou",          user_email: "nathalie.gbossou@gmail.com",         kind: "COTISATION",  status: "ECHOUE",     amount: 15000, currency: "XAF", payment_method: "MTN_MOBILE_MONEY", reference: null,            reason: "Solde insuffisant",     paid_at: null,                   created_at: "2026-06-05T08:30:00Z" },
  { id: 7,  user_id: 3, user_name: "Aminata Kouyaté",           user_email: "aminata.kouyate@gmail.com",          kind: "COTISATION",  status: "REUSSI",     amount: 15000, currency: "XAF", payment_method: "MANUEL",           reference: "MAN-2026-012",  reason: "Paiement espèces",      paid_at: "2026-06-05T11:00:00Z", created_at: "2026-06-05T10:55:00Z" },
  { id: 8,  user_id: 4, user_name: "Chantal Ndzinzou",          user_email: "chantal.ndzinzou@hotmail.com",       kind: "COTISATION",  status: "EXONERE",    amount: 0,     currency: "XAF", payment_method: null,               reference: null,            reason: "Situation difficile",   paid_at: "2026-06-05T14:00:00Z", created_at: "2026-06-05T13:50:00Z" },
  { id: 9,  user_id: 1, user_name: "Marie-Claire Ahouandjinou", user_email: "marieclaire.ahouandjinou@gmail.com", kind: "COTISATION",  status: "REMBOURSE",  amount: 15000, currency: "XAF", payment_method: "MTN_MOBILE_MONEY", reference: "MTN-2026-0099", reason: "Double paiement",       paid_at: "2026-06-06T09:00:00Z", created_at: "2026-06-06T08:50:00Z" },
  { id: 10, user_id: 5, user_name: "Sophie Tchibozo",           user_email: "sophie.tchibozo@gmail.com",          kind: "INSCRIPTION", status: "EN_ATTENTE", amount: 25000, currency: "XAF", payment_method: "VIREMENT",         reference: "VIR-2026-003",  reason: null,                    paid_at: null,                   created_at: "2026-06-07T15:00:00Z" },
];

// ── Plans d'abonnement ────────────────────────────────────────────────────────

export const MOCK_PLANS: SubscriptionPlan[] = [
  {
    id: 1,
    kind: "INSCRIPTION",
    name: "Espace Membre — Annuel",
    billing: "ANNUEL",
    price_total: 47500,
    nb_tranches: 1,
    tranche_amount: 47500,
    description: "Accès annuel à l'Espace Membres. Un seul règlement de 47 500 FCFA pour toute l'année.",
    is_active: true,
    access_levels: ["MEMBRE"],
    formation_ids: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    kind: "COTISATION",
    name: "Espace Membre — En tranches",
    billing: "TRANCHES",
    price_total: 60000,
    nb_tranches: 6,
    tranche_amount: 10000,
    description: "Accès annuel à l'Espace Membres, réglé en 6 mensualités de 10 000 FCFA.",
    is_active: true,
    access_levels: ["MEMBRE"],
    formation_ids: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 3,
    kind: "BRANCHE_FEMME",
    name: "Accès espace Femme",
    billing: "ANNUEL",
    price_total: 25000,
    nb_tranches: 1,
    tranche_amount: 25000,
    description: "Accès à l'Espace Femmes — cercle d'échange, contenus et lives dédiés.",
    is_active: true,
    access_levels: ["FEMME"],
    formation_ids: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 4,
    kind: "BRANCHE_ENFANT",
    name: "Accès espace Enfant",
    billing: "ANNUEL",
    price_total: 20000,
    nb_tranches: 1,
    tranche_amount: 20000,
    description: "Accès à l'Espace Enfants — ressources éducatives, lives et contenus pour les petits.",
    is_active: true,
    access_levels: ["ENFANT"],
    formation_ids: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 5,
    kind: "DON",
    name: "Don volontaire",
    billing: "MENSUEL",
    price_total: 0,
    nb_tranches: 1,
    tranche_amount: null,
    description: "Soutien libre sans engagement ni accès supplémentaire.",
    is_active: true,
    access_levels: [],
    formation_ids: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

// ── Canaux communautaires ─────────────────────────────────────────────────────

export const MOCK_CHANNELS: CommunityChannel[] = [
  { id: 1, name: "Annonces Officielles", slug: "annonces", description: "Actualités et annonces de l'équipe Zola Ashé.", branche: "GENERALE", color: "#c9a227", is_active: true, post_count: 12, created_at: "2026-01-01T00:00:00Z" },
  { id: 2, name: "Cercle des Femmes",    slug: "femmes",   description: "Espace d'échange bienveillant réservé aux femmes.",                branche: "FEMME",    color: "#b5532a", is_active: true, post_count: 34, created_at: "2026-01-01T00:00:00Z" },
  { id: 3, name: "Coin des Petits",      slug: "enfants",  description: "Ressources et discussions pour les parents et leurs enfants.",    branche: "ENFANT",   color: "#52b083", is_active: true, post_count: 18, created_at: "2026-02-01T00:00:00Z" },
  { id: 4, name: "Témoignages & Partage",slug: "temoins",  description: "Partagez vos transformations et inspirez la communauté.",         branche: "GENERALE", color: "#5b8fd4", is_active: true, post_count: 47, created_at: "2026-02-15T00:00:00Z" },
];

export const MOCK_POSTS: CommunityPost[] = [
  { id: 1,  author_name: "Admin Zola Ashé", author_email: "admin@zolaashe.com", channel: 1, channel_name: "Annonces Officielles", type: "ANNONCE",    title: "Nouveau module disponible — Éveil Spirituel",        body: "Nous sommes heureux d'annoncer la mise en ligne du module 4 de la formation Éveil Spirituel. Bonne découverte à toutes !",   is_pinned: true,  is_admin_post: true,  status: "PUBLIE",  comment_count: 5,  report_count: 0, created_at: "2026-06-08T08:00:00Z", updated_at: "2026-06-08T08:00:00Z" },
  { id: 2,  author_name: "Admin Zola Ashé", author_email: "admin@zolaashe.com", channel: 1, channel_name: "Annonces Officielles", type: "ANNONCE",    title: "Live Méditation — Dimanche 15 juin à 10h",           body: "Rejoignez-nous ce dimanche pour notre méditation collective mensuelle sur Zoom. Lien d'accès envoyé par email.",              is_pinned: false, is_admin_post: true,  status: "PUBLIE",  comment_count: 8,  report_count: 0, created_at: "2026-06-05T10:00:00Z", updated_at: "2026-06-05T10:00:00Z" },
  { id: 3,  author_name: "Fatou Diallo",    author_email: null,                 channel: 4, channel_name: "Témoignages & Partage", type: "DISCUSSION", title: "Transformation après 3 mois — Mon expérience",       body: "Je voulais partager avec vous l'impact que Zola Ashé a eu sur ma vie ces trois derniers mois. La méditation quotidienne a tout changé...", is_pinned: false, is_admin_post: false, status: "PUBLIE",  comment_count: 14, report_count: 0, created_at: "2026-06-07T14:30:00Z", updated_at: "2026-06-07T14:30:00Z" },
  { id: 4,  author_name: "Sophie Tchibozo", author_email: null,                 channel: 2, channel_name: "Cercle des Femmes",    type: "QUESTION",   title: "Comment concilier vie de famille et formation ?",     body: "Bonjour à toutes. Je suis maman de 3 enfants et j'ai du mal à trouver du temps pour les modules. Des conseils ?",            is_pinned: false, is_admin_post: false, status: "PUBLIE",  comment_count: 7,  report_count: 0, created_at: "2026-06-06T17:00:00Z", updated_at: "2026-06-06T17:00:00Z" },
  { id: 5,  author_name: "Rose Koudou",     author_email: null,                 channel: 3, channel_name: "Coin des Petits",      type: "DISCUSSION", title: "Activité méditation pour enfants de 6 ans ?",         body: "Bonjour ! Mon fils de 6 ans veut essayer la méditation. Avez-vous des ressources adaptées pour cet âge ?",                 is_pinned: false, is_admin_post: false, status: "PUBLIE",  comment_count: 4,  report_count: 0, created_at: "2026-06-05T09:00:00Z", updated_at: "2026-06-05T09:00:00Z" },
  { id: 6,  author_name: "Chantal N.",      author_email: null,                 channel: 4, channel_name: "Témoignages & Partage", type: "DISCUSSION", title: "Ce post est inapproprié — signalement",              body: "Contenu non conforme aux règles de la communauté.",                                                                         is_pinned: false, is_admin_post: false, status: "MODERE",  comment_count: 0,  report_count: 3, created_at: "2026-06-04T11:00:00Z", updated_at: "2026-06-05T08:00:00Z" },
];

// ── Progression ───────────────────────────────────────────────────────────────

export const MOCK_PROGRESSION_KPIS: ProgressionKPIs = {
  total_enrollments:   428,
  total_completions:   186,
  avg_completion_rate: 43.5,
  avg_quiz_score:      14.2,
};

export const MOCK_FORMATION_STATS: FormationProgressStat[] = [
  { formation_id: 1, formation_title: "Développement Personnel Intégral", cover_url: null, enrolled_count: 182, completed_count: 87, completion_rate: 47.8, avg_quiz_score: 15.1, avg_progress_pct: 64.2 },
  { formation_id: 2, formation_title: "Nutrition & Équilibre de Vie",     cover_url: null, enrolled_count: 134, completed_count: 62, completion_rate: 46.3, avg_quiz_score: 14.8, avg_progress_pct: 58.7 },
  { formation_id: 3, formation_title: "Éveil Spirituel — Niveau Débutant",cover_url: null, enrolled_count: 112, completed_count: 37, completion_rate: 33.0, avg_quiz_score: 12.9, avg_progress_pct: 41.3 },
];

export const MOCK_MEMBER_PROGRESS: MemberProgressEntry[] = [
  { user_id: 1, user_name: "Marie-Claire Ahouandjinou", user_email: "marieclaire.ahouandjinou@gmail.com", formation_id: 1, formation_title: "Développement Personnel Intégral", progress_pct: 100, modules_completed: 5, modules_total: 5, quiz_score: 17, last_activity: "2026-06-08T07:30:00Z", completed: true  },
  { user_id: 3, user_name: "Aminata Kouyaté",           user_email: "aminata.kouyate@gmail.com",          formation_id: 1, formation_title: "Développement Personnel Intégral", progress_pct: 80,  modules_completed: 4, modules_total: 5, quiz_score: 15, last_activity: "2026-06-09T08:00:00Z", completed: false },
  { user_id: 5, user_name: "Sophie Tchibozo",           user_email: "sophie.tchibozo@gmail.com",          formation_id: 2, formation_title: "Nutrition & Équilibre de Vie",     progress_pct: 60,  modules_completed: 2, modules_total: 3, quiz_score: 13, last_activity: "2026-06-08T20:00:00Z", completed: false },
  { user_id: 2, user_name: "Fatou Diallo",               user_email: "fatou.diallo@yahoo.fr",              formation_id: 3, formation_title: "Éveil Spirituel — Niveau Débutant", progress_pct: 25,  modules_completed: 1, modules_total: 4, quiz_score: null, last_activity: "2026-06-07T19:00:00Z", completed: false },
  { user_id: 8, user_name: "Rose Koudou",               user_email: "rose.koudou@gmail.com",              formation_id: 1, formation_title: "Développement Personnel Intégral", progress_pct: 40,  modules_completed: 2, modules_total: 5, quiz_score: null, last_activity: "2026-06-08T18:00:00Z", completed: false },
];

// ── Quiz ──────────────────────────────────────────────────────────────────────

export const MOCK_QUIZZES: QuizItem[] = [
  {
    id: 1, course: null, formation: 1, title: "Examen final — Développement Personnel",
    pass_threshold: 14, active: true,
    questions: [
      { id: 1, text: "Quelle est la première étape de la connaissance de soi ?", multiple: false, order: 1, choices: [{ id: 1, text: "L'observation sans jugement", is_correct: true, order: 1 }, { id: 2, text: "La comparaison avec les autres", is_correct: false, order: 2 }, { id: 3, text: "La critique personnelle", is_correct: false, order: 3 }] },
      { id: 2, text: "Parmi ces éléments, lesquels font partie de l'intelligence émotionnelle ?", multiple: true, order: 2, choices: [{ id: 4, text: "La conscience de soi", is_correct: true, order: 1 }, { id: 5, text: "L'empathie", is_correct: true, order: 2 }, { id: 6, text: "La maîtrise financière", is_correct: false, order: 3 }] },
    ],
    created_at: "2026-02-10T12:00:00Z",
  },
  {
    id: 2, course: null, formation: 2, title: "Examen final — Nutrition",
    pass_threshold: 12, active: true,
    questions: [
      { id: 3, text: "Combien de portions de légumes sont recommandées par jour ?", multiple: false, order: 1, choices: [{ id: 7, text: "Au moins 5 portions", is_correct: true, order: 1 }, { id: 8, text: "2 portions suffisent", is_correct: false, order: 2 }, { id: 9, text: "Aucune recommandation précise", is_correct: false, order: 3 }] },
    ],
    created_at: "2026-02-25T10:00:00Z",
  },
  {
    id: 3, course: 4, formation: null, title: "QCM — Introduction à la méditation",
    pass_threshold: 10, active: true,
    questions: [
      { id: 4, text: "Quelle est la durée minimale conseillée pour une séance de méditation quotidienne ?", multiple: false, order: 1, choices: [{ id: 10, text: "5 à 10 minutes", is_correct: true, order: 1 }, { id: 11, text: "Au moins 1 heure", is_correct: false, order: 2 }, { id: 12, text: "30 minutes exactement", is_correct: false, order: 3 }] },
      { id: 5, text: "La méditation de pleine conscience consiste à :", multiple: false, order: 2, choices: [{ id: 13, text: "Vider totalement l'esprit", is_correct: false, order: 1 }, { id: 14, text: "Observer ses pensées sans s'y attacher", is_correct: true, order: 2 }, { id: 15, text: "Penser à des choses positives uniquement", is_correct: false, order: 3 }] },
    ],
    created_at: "2026-03-20T09:00:00Z",
  },
];

// ── Fiche détail membre ───────────────────────────────────────────────────────

export function getMockMemberDetail(userId: number): MemberDetail {
  const base = MOCK_MEMBERS.find((m) => m.id === userId) ?? MOCK_MEMBERS[0];
  const hasFemme  = base.access_levels?.includes("FEMME")  ?? false;
  const hasEnfant = base.access_levels?.includes("ENFANT") ?? false;

  const subscriptions: MemberDetail["subscriptions"] = [
    {
      id: userId * 10 + 1,
      type: "Espace Membre — Annuel",
      start: "2026-01-01",
      end: "2027-01-01",
      active: true,
      billing: "ANNUEL",
    },
    {
      id: userId * 10,
      type: "Espace Membre — Annuel",
      start: "2025-01-01",
      end: "2026-01-01",
      active: false,
      billing: "ANNUEL",
    },
  ];
  if (hasFemme) {
    subscriptions.push({
      id: userId * 10 + 2,
      type: "Branche Femme",
      start: "2026-03-01",
      end: "2027-03-01",
      active: true,
      billing: "ANNUEL",
    });
  }
  if (hasEnfant) {
    subscriptions.push({
      id: userId * 10 + 3,
      type: "Branche Enfant — En tranches",
      start: "2026-02-01",
      end: "2026-08-01",
      active: true,
      billing: "TRANCHES",
      tranches_paid: 4,
      tranches_total: 6,
    });
  }

  const payments: MemberDetail["payments"] = [
    { id: userId * 100 + 3, type: "COTISATION",  status: "REUSSI",     amount: 2000,  paid_at: "2026-06-01T10:00:00Z" },
    { id: userId * 100 + 2, type: "COTISATION",  status: "REUSSI",     amount: 2000,  paid_at: "2026-05-01T10:00:00Z" },
    { id: userId * 100 + 1, type: "COTISATION",  status: "REUSSI",     amount: 2000,  paid_at: "2026-04-01T10:00:00Z" },
    { id: userId * 100,     type: "INSCRIPTION", status: "REUSSI",     amount: 45700, paid_at: base.created_at },
  ];
  if (userId === 4) {
    payments[0] = { ...payments[0], status: "EN_ATTENTE", paid_at: null };
    payments[1] = { ...payments[1], status: "ECHOUE", paid_at: null };
  }

  const memberProgress = MOCK_MEMBER_PROGRESS.filter((p) => p.user_id === userId);

  return {
    ...base,
    status_changed_at: base.created_at,
    subscriptions,
    payments,
    quiz_results: userId === 1
      ? [
          { quiz: 1, title: "Examen final — Développement Personnel", score: 17, validated: true  },
          { quiz: 3, title: "QCM — Introduction à la méditation",     score: 12, validated: false },
        ]
      : [
          { quiz: 1, title: "Examen final — Développement Personnel", score: 11, validated: false },
        ],
    formations_progress: memberProgress.map((p) => ({
      formation_id:       p.formation_id,
      formation_title:    p.formation_title,
      progress_pct:       p.progress_pct,
      modules_completed:  p.modules_completed,
      modules_total:      p.modules_total,
      quiz_score:         p.quiz_score,
      completed:          p.completed,
    })),
  };
}

// ── Cotisations en retard ─────────────────────────────────────────────────────

export const MOCK_LATE_COTISATIONS: LateMember[] = [
  { ...MOCK_MEMBERS[1], months_late: 2, amount_due: 30000 },
  { ...MOCK_MEMBERS[3], months_late: 4, amount_due: 60000 },
  { ...MOCK_MEMBERS[5], months_late: 1, amount_due: 15000 },
];

// ── Répartition des paiements (ce mois) ──────────────────────────────────────

export const MOCK_PAYMENT_BREAKDOWN: PaymentBreakdown[] = [
  { kind: "COTISATION",  label: "Cotisation mensuelle", amount: 390000, count: 26, color: "#c9a227" },
  { kind: "INSCRIPTION", label: "Inscription formation", amount: 75000,  count: 3,  color: "#52b083" },
  { kind: "DON",         label: "Don libre",             amount: 12000,  count: 4,  color: "#5b8fd4" },
  { kind: "CADEAU",      label: "Cadeau / Parrainage",   amount: 8000,   count: 1,  color: "#b5532a" },
];

// ── Revenus mensuels (12 mois glissants) ──────────────────────────────────────

export const MOCK_MONTHLY_REVENUE: MonthlyRevenue[] = [
  { label: "Juil",  amount: 285000 },
  { label: "Août",  amount: 310000 },
  { label: "Sep",   amount: 345000 },
  { label: "Oct",   amount: 290000 },
  { label: "Nov",   amount: 375000 },
  { label: "Déc",   amount: 420000 },
  { label: "Jan",   amount: 380000 },
  { label: "Fév",   amount: 395000 },
  { label: "Mar",   amount: 415000 },
  { label: "Avr",   amount: 450000 },
  { label: "Mai",   amount: 465000 },
  { label: "Jun",   amount: 485000 },
];

// ── Résultats quiz ────────────────────────────────────────────────────────────

export const MOCK_QUIZ_RESULTS: QuizResult[] = [
  { id: 1,  user_id: 1, user_name: "Marie-Claire Ahouandjinou", user_email: "marieclaire.ahouandjinou@gmail.com", quiz_id: 1, quiz_title: "Examen final — Développement Personnel", score: 17, max_score: 20, validated: true,  attempts: 1, passed_at: "2026-05-20T14:00:00Z", created_at: "2026-05-20T13:45:00Z" },
  { id: 2,  user_id: 3, user_name: "Aminata Kouyaté",           user_email: "aminata.kouyate@gmail.com",          quiz_id: 1, quiz_title: "Examen final — Développement Personnel", score: 15, max_score: 20, validated: true,  attempts: 2, passed_at: "2026-05-25T10:00:00Z", created_at: "2026-05-22T09:00:00Z" },
  { id: 3,  user_id: 8, user_name: "Rose Koudou",               user_email: "rose.koudou@gmail.com",              quiz_id: 1, quiz_title: "Examen final — Développement Personnel", score: 11, max_score: 20, validated: false, attempts: 1, passed_at: null,                   created_at: "2026-06-01T11:00:00Z" },
  { id: 4,  user_id: 5, user_name: "Sophie Tchibozo",           user_email: "sophie.tchibozo@gmail.com",          quiz_id: 2, quiz_title: "Examen final — Nutrition",               score: 14, max_score: 20, validated: true,  attempts: 1, passed_at: "2026-06-03T15:00:00Z", created_at: "2026-06-03T14:50:00Z" },
  { id: 5,  user_id: 2, user_name: "Fatou Diallo",              user_email: "fatou.diallo@yahoo.fr",              quiz_id: 3, quiz_title: "QCM — Introduction à la méditation",     score: 8,  max_score: 20, validated: false, attempts: 3, passed_at: null,                   created_at: "2026-06-05T16:00:00Z" },
  { id: 6,  user_id: 1, user_name: "Marie-Claire Ahouandjinou", user_email: "marieclaire.ahouandjinou@gmail.com", quiz_id: 3, quiz_title: "QCM — Introduction à la méditation",     score: 12, max_score: 20, validated: false, attempts: 1, passed_at: null,                   created_at: "2026-06-06T09:00:00Z" },
];

// ── Signalements (modération) ─────────────────────────────────────────────────

export const MOCK_REPORTS: ReportItem[] = [
  { id: 1, target_type: "POST",    target_id: 42, reason: "Contenu offensant envers des membres",   reporter: "fatou.diallo@yahoo.fr",        signal_count: 3, created_at: "2026-06-09T14:22:00Z" },
  { id: 2, target_type: "COMMENT", target_id: 87, reason: "Spam publicitaire répété",               reporter: "aminata.kouyate@gmail.com",    signal_count: 1, created_at: "2026-06-10T08:15:00Z" },
  { id: 3, target_type: "POST",    target_id: 55, reason: "Désinformation médicale non vérifiée",   reporter: "rose.koudou@gmail.com",        signal_count: 2, created_at: "2026-06-10T10:45:00Z" },
];

// ── Journal d'audit ───────────────────────────────────────────────────────────

export const MOCK_AUDIT_ENTRIES: AuditEntry[] = [
  { id: 1, actor: 99, actor_email: "admin@zolaashe.com", action: "MEMBER_BLOCK",      target_type: "User",       target_id: "4",  reason: "Comportement abusif répété",         payload: {}, created_at: "2026-06-09T16:00:00Z" },
  { id: 2, actor: 99, actor_email: "admin@zolaashe.com", action: "MEMBER_WARN",       target_type: "User",       target_id: "6",  reason: "Langage inapproprié en communauté",  payload: {}, created_at: "2026-06-09T15:30:00Z" },
  { id: 3, actor: 99, actor_email: "admin@zolaashe.com", action: "CONTENT_REMOVE",    target_type: "Post",       target_id: "42", reason: "Signalement validé après vérification", payload: {}, created_at: "2026-06-09T14:45:00Z" },
  { id: 4, actor: 99, actor_email: "admin@zolaashe.com", action: "PAYMENT_EXONERATE", target_type: "Payment",    target_id: "12", reason: "Situation précaire attestée",        payload: {}, created_at: "2026-06-08T11:00:00Z" },
  { id: 5, actor: 99, actor_email: "admin@zolaashe.com", action: "QUIZ_RESET",        target_type: "QuizResult", target_id: "3",  reason: "Erreur technique signalée par le membre", payload: {}, created_at: "2026-06-07T09:15:00Z" },
  { id: 6, actor: 99, actor_email: "admin@zolaashe.com", action: "MEMBER_UNBLOCK",    target_type: "User",       target_id: "4",  reason: "Situation résolue, engagement positif", payload: {}, created_at: "2026-06-06T17:00:00Z" },
  { id: 7, actor: 99, actor_email: "admin@zolaashe.com", action: "FORMATION_PUBLISH", target_type: "Formation",  target_id: "3",  reason: "",                                   payload: {}, created_at: "2026-06-05T14:00:00Z" },
  { id: 8, actor: 99, actor_email: "admin@zolaashe.com", action: "MEMBER_CREATE",     target_type: "User",       target_id: "9",  reason: "",                                   payload: {}, created_at: "2026-06-04T10:30:00Z" },
];
