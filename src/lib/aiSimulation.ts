/**
 * Moteur de simulation locale de l'agent IA Gemini 3.5 (back-office).
 *
 * Le backend (IAB1-IAB10, Edwin) n'est pas encore déployé au moment où ces
 * écrans sont construits. Ce module reproduit fidèlement le contrat d'API
 * documenté (job asynchrone, polling, questions QCM/QRO, verdicts QRO) avec
 * un contenu français réaliste et thématique, afin que les interfaces soient
 * démontrables dès maintenant. `endpoints.ts` appelle toujours l'API réelle
 * en premier - ce fichier n'intervient qu'en secours (voir `withAIFallback`).
 */
import type {
  AIDifficulty, AIGeneratedQuestion, AIGenerationConfig,
  AIQuizHistoryEntry, AIQuizJob, AIQROReviewItem, QuizChoice, QuizItem,
} from "./types";

// ── Utilitaires ────────────────────────────────────────────────────────────────

let seedCounter = 1;
function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${(seedCounter++).toString(36)}`;
}

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ── Banque thématique (contenu Zola Ashé) ───────────────────────────────────────

interface QcmTemplate { text: string; correct: string; distractors: string[]; }
interface QcmMultiTemplate { text: string; corrects: string[]; distractors: string[]; }
interface QroTemplate { text: string; criteria: string[]; }

const THEMES: Record<string, { qcm: QcmTemplate[]; qcmMulti: QcmMultiTemplate[]; qro: QroTemplate[] }> = {
  developpement: {
    qcm: [
      { text: "Quelle est la première étape recommandée pour développer la connaissance de soi ?", correct: "L'observation sans jugement de ses pensées et émotions", distractors: ["La comparaison systématique avec les autres", "L'évitement de toute introspection", "La recherche immédiate de solutions extérieures"] },
      { text: "Parmi les propositions suivantes, laquelle définit le mieux l'intelligence émotionnelle ?", correct: "La capacité à reconnaître et réguler ses émotions et celles des autres", distractors: ["La capacité à cacher ses émotions en toute circonstance", "La maîtrise exclusive du raisonnement logique", "L'absence totale d'émotions négatives"] },
      { text: "Quel est l'objectif principal d'un exercice de gratitude quotidien ?", correct: "Réorienter l'attention vers les aspects positifs du vécu", distractors: ["Ignorer les difficultés rencontrées", "Comparer sa situation à celle des autres", "Éviter de fixer des objectifs"] },
      { text: "Quelle attitude favorise le plus la résilience face à un échec ?", correct: "Considérer l'échec comme une source d'apprentissage", distractors: ["Éviter désormais toute nouvelle tentative", "Rejeter la responsabilité sur autrui", "Minimiser l'importance de l'objectif initial"] },
    ],
    qcmMulti: [
      { text: "Quelles pratiques contribuent à renforcer la résilience personnelle ? (Plusieurs réponses correctes)", corrects: ["Cultiver un réseau de soutien social", "Adopter une vision de croissance face aux obstacles"], distractors: ["Éviter toute situation incertaine", "Rejeter systématiquement les retours négatifs"] },
      { text: "Parmi ces éléments, lesquels font partie de l'intelligence émotionnelle ? (Plusieurs réponses correctes)", corrects: ["La conscience de soi", "L'empathie envers autrui"], distractors: ["L'absence de tout ressenti négatif", "La maîtrise exclusive du raisonnement abstrait"] },
    ],
    qro: [
      { text: "Décrivez une situation récente où vous avez pratiqué l'observation sans jugement de vos émotions, et expliquez ce que cela vous a appris.", criteria: ["Illustre une situation concrète et personnelle", "Distingue clairement l'observation du jugement", "Formule un apprentissage ou une prise de conscience"] },
      { text: "Expliquez avec vos mots la différence entre réagir et répondre face à une émotion forte.", criteria: ["Définit correctement la réaction (automatique)", "Définit correctement la réponse (réfléchie)", "Illustre par un exemple pertinent"] },
    ],
  },
  meditation: {
    qcm: [
      { text: "Quelle est la durée minimale conseillée pour une séance de méditation quotidienne destinée aux débutants ?", correct: "5 à 10 minutes", distractors: ["Au moins 1 heure", "30 minutes exactement", "Aucune durée n'est recommandée"] },
      { text: "La méditation de pleine conscience consiste principalement à :", correct: "Observer ses pensées sans s'y attacher", distractors: ["Vider totalement l'esprit de toute pensée", "Penser uniquement à des choses positives", "Réciter des mantras à voix haute en continu"] },
      { text: "Quel est le rôle de la respiration dans une pratique méditative guidée ?", correct: "Servir d'ancrage pour ramener l'attention au moment présent", distractors: ["Accélérer le rythme cardiaque pour rester éveillé", "N'a aucun rôle particulier", "Remplacer la concentration mentale"] },
    ],
    qcmMulti: [
      { text: "Quels sont les bénéfices reconnus d'une pratique régulière de la méditation ? (Plusieurs réponses correctes)", corrects: ["Réduction du stress et de l'anxiété", "Amélioration de la concentration et de l'attention"], distractors: ["Suppression totale de toutes les pensées négatives", "Remplacement du sommeil réparateur"] },
    ],
    qro: [
      { text: "Décrivez les sensations physiques et mentales que vous observez généralement dans les deux premières minutes d'une méditation.", criteria: ["Mentionne des sensations physiques concrètes", "Mentionne l'état mental ou émotionnel", "Le ton reste descriptif et non jugeant"] },
    ],
  },
  nutrition: {
    qcm: [
      { text: "Combien de portions de légumes sont généralement recommandées par jour pour un adulte ?", correct: "Au moins 5 portions", distractors: ["2 portions suffisent largement", "Il n'existe aucune recommandation précise", "1 portion par semaine"] },
      { text: "Quel principe guide une alimentation équilibrée selon les recommandations abordées dans ce module ?", correct: "La diversité et la modération des groupes alimentaires", distractors: ["L'exclusion totale des féculents", "La consommation exclusive de protéines animales", "Le jeûne prolongé systématique"] },
    ],
    qcmMulti: [
      { text: "Quels aliments sont considérés comme des sources de protéines végétales de qualité ? (Plusieurs réponses correctes)", corrects: ["Les légumineuses (lentilles, pois chiches)", "Le tofu et les produits à base de soja"], distractors: ["Le sucre blanc raffiné", "Les boissons sucrées industrielles"] },
    ],
    qro: [
      { text: "Proposez un exemple de repas équilibré adapté à une famille, en justifiant vos choix nutritionnels.", criteria: ["Le repas proposé est cohérent et réaliste", "Les groupes alimentaires principaux sont représentés", "La justification nutritionnelle est correcte"] },
    ],
  },
  spiritualite: {
    qcm: [
      { text: "Dans la démarche spirituelle présentée, que désigne la notion d'« ancrage » ?", correct: "Le fait de se relier consciemment au moment présent et à ses racines", distractors: ["Un rituel réservé uniquement aux cérémonies collectives", "Une technique de mémorisation de textes sacrés", "Un exercice physique de renforcement musculaire"] },
      { text: "Quel est l'objectif des rituels du matin évoqués dans ce module ?", correct: "Poser une intention consciente pour la journée", distractors: ["Remplacer le petit-déjeuner", "Éviter tout contact avec autrui avant midi", "Réciter des formules sans réflexion personnelle"] },
    ],
    qcmMulti: [
      { text: "Quels éléments caractérisent une pratique spirituelle enracinée dans la tradition africaine ? (Plusieurs réponses correctes)", corrects: ["La connexion à l'énergie des ancêtres", "Le respect du lien entre corps, âme et communauté"], distractors: ["L'individualisme radical sans engagement communautaire", "Le rejet de toute pratique corporelle"] },
    ],
    qro: [
      { text: "Expliquez comment un rituel simple pratiqué chaque matin peut influencer votre état d'esprit durant la journée.", criteria: ["Décrit un rituel concret et personnel", "Établit un lien logique avec l'état d'esprit", "La réponse est cohérente avec le contenu du module"] },
    ],
  },
  leadership_femme: {
    qcm: [
      { text: "Qu'est-ce qui caractérise le leadership bienveillant présenté dans ce module ?", correct: "L'écoute active associée à une prise de décision assumée", distractors: ["L'autorité imposée sans dialogue", "L'évitement systématique de toute décision", "La délégation totale sans suivi"] },
      { text: "Quelle posture favorise une prise de parole en public plus affirmée ?", correct: "La préparation associée à une respiration maîtrisée", distractors: ["L'improvisation totale sans préparation", "L'évitement du contact visuel", "La lecture intégrale d'un texte sans y croire"] },
    ],
    qcmMulti: [
      { text: "Quels sont les piliers du leadership au féminin abordés dans ce module ? (Plusieurs réponses correctes)", corrects: ["L'affirmation de soi sans agressivité", "La création d'un réseau de soutien professionnel"], distractors: ["L'imitation des modèles masculins dominants", "L'effacement face aux figures d'autorité"] },
    ],
    qro: [
      { text: "Décrivez une situation où vous avez dû affirmer votre position en tant que femme leader, et comment vous l'avez gérée.", criteria: ["Situation concrète et pertinente", "Décrit une posture de leadership assumée", "Tire un enseignement ou une réflexion"] },
    ],
  },
  education_enfant: {
    qcm: [
      { text: "Quelle attitude favorise le développement de l'autonomie chez l'enfant ?", correct: "Laisser l'enfant essayer avant d'intervenir", distractors: ["Faire systématiquement à sa place", "Ignorer ses tentatives", "Le comparer à d'autres enfants"] },
      { text: "Dans l'éducation bienveillante, la fermeté sert principalement à :", correct: "Poser un cadre sécurisant et cohérent", distractors: ["Punir sans explication", "Éviter toute règle", "Contrôler chaque décision de l'enfant"] },
    ],
    qcmMulti: [
      { text: "Quels comportements de l'adulte favorisent la confiance en soi chez l'enfant ? (Plusieurs réponses correctes)", corrects: ["Valoriser les efforts plutôt que le résultat", "Laisser l'enfant vivre ses erreurs sans les dramatiser"], distractors: ["Comparer l'enfant à ses frères et sœurs pour le motiver", "Intervenir immédiatement à chaque difficulté"] },
    ],
    qro: [
      { text: "Donnez un exemple de situation où fermeté et bienveillance ont été appliquées ensemble avec un enfant.", criteria: ["Situation concrète et réaliste", "Illustre à la fois fermeté et bienveillance", "Cohérence avec les principes du module"] },
    ],
  },
};

function detectTheme(hint: string): keyof typeof THEMES {
  const h = hint.toLowerCase();
  if (/m[ée]dit/.test(h))              return "meditation";
  if (/nutrition|aliment|recette/.test(h)) return "nutrition";
  if (/spirit|ash[ée]|rituel|[ée]veil/.test(h)) return "spiritualite";
  if (/leader|f[ée]minin/.test(h))      return "leadership_femme";
  if (/enfant|parent|[ée]ducation/.test(h)) return "education_enfant";
  return "developpement";
}

function buildQcm(t: QcmTemplate, difficulty: AIDifficulty, order: number): AIGeneratedQuestion {
  const choicesText = shuffle([t.correct, ...t.distractors]);
  const choices: QuizChoice[] = choicesText.map((text, i) => ({ text, is_correct: text === t.correct, order: i + 1 }));
  return { client_id: uid("q"), type: "QCM", text: t.text, choices, criteria: [], difficulty, suggested_rank: order };
}

function buildQcmMulti(t: QcmMultiTemplate, difficulty: AIDifficulty, order: number): AIGeneratedQuestion {
  const correctSet = new Set(t.corrects);
  const choicesText = shuffle([...t.corrects, ...t.distractors]);
  const choices: QuizChoice[] = choicesText.map((text, i) => ({ text, is_correct: correctSet.has(text), order: i + 1 }));
  return { client_id: uid("q"), type: "QCM_MULTI", text: t.text, choices, criteria: [], difficulty, suggested_rank: order };
}

function buildQro(t: QroTemplate, difficulty: AIDifficulty, order: number): AIGeneratedQuestion {
  return { client_id: uid("q"), type: "QRO", text: t.text, choices: [], criteria: t.criteria, difficulty, suggested_rank: order };
}

/** Génère un jeu de questions cohérent avec la configuration demandée. */
export function simulateQuestions(config: AIGenerationConfig): AIGeneratedQuestion[] {
  const hint  = `${config.module_title ?? ""} ${config.formation_title ?? ""}`;
  const theme = THEMES[detectTheme(hint)];
  const nbQcmMulti = config.nb_qcm_multi ?? 0;

  const qcmPool      = theme.qcm.length      ? theme.qcm      : THEMES.developpement.qcm;
  const qcmMultiPool = theme.qcmMulti.length ? theme.qcmMulti : THEMES.developpement.qcmMulti;
  const qroPool      = theme.qro.length      ? theme.qro      : THEMES.developpement.qro;

  const qcmPicks = pick(qcmPool, Math.min(config.nb_qcm, qcmPool.length));
  while (qcmPicks.length < config.nb_qcm) qcmPicks.push(pick(THEMES.developpement.qcm, 1)[0]);

  const qcmMultiPicks = pick(qcmMultiPool, Math.min(nbQcmMulti, qcmMultiPool.length));
  while (qcmMultiPicks.length < nbQcmMulti) qcmMultiPicks.push(pick(THEMES.developpement.qcmMulti, 1)[0]);

  const qroPicks = pick(qroPool, Math.min(config.nb_qro, qroPool.length));
  while (qroPicks.length < config.nb_qro) qroPicks.push(pick(THEMES.developpement.qro, 1)[0]);

  const offset1 = qcmPicks.length;
  const offset2 = offset1 + qcmMultiPicks.length;
  return [
    ...qcmPicks.map((t, i) => buildQcm(t, config.difficulty, i + 1)),
    ...qcmMultiPicks.map((t, i) => buildQcmMulti(t, config.difficulty, offset1 + i + 1)),
    ...qroPicks.map((t, i) => buildQro(t, config.difficulty, offset2 + i + 1)),
  ];
}

/** Régénère une question isolée (bouton « Régénérer » dans l'aperçu). */
export function simulateSingleQuestion(
  config: AIGenerationConfig, type: "QCM" | "QCM_MULTI" | "QRO", order: number,
): AIGeneratedQuestion {
  const hint  = `${config.module_title ?? ""} ${config.formation_title ?? ""}`;
  const theme = THEMES[detectTheme(hint)];
  if (type === "QCM") {
    const pool = theme.qcm.length ? theme.qcm : THEMES.developpement.qcm;
    return buildQcm(pick(pool, 1)[0], config.difficulty, order);
  }
  if (type === "QCM_MULTI") {
    const pool = theme.qcmMulti.length ? theme.qcmMulti : THEMES.developpement.qcmMulti;
    return buildQcmMulti(pick(pool, 1)[0], config.difficulty, order);
  }
  const pool = theme.qro.length ? theme.qro : THEMES.developpement.qro;
  return buildQro(pick(pool, 1)[0], config.difficulty, order);
}

// ── Cycle de vie d'un job simulé (PENDING → IN_PROGRESS → DONE) ────────────────

const jobs = new Map<string, AIQuizJob>();

/** Démarre un job simulé et retourne son identifiant (même contrat que POST generate-ai/). */
export function startSimulatedJob(config: AIGenerationConfig): string {
  const jobId = uid("sim-job");
  jobs.set(jobId, {
    job_id: jobId, status: "PENDING", progress: 0,
    formation_title: config.formation_title, module_title: config.module_title,
    simulated: true,
  });

  const totalSteps = 9 + Math.floor(Math.random() * 5); // ~9–13 paliers → ~3-6s au total
  let step = 0;

  const tick = () => {
    const job = jobs.get(jobId);
    if (!job) return;
    step += 1;
    job.status   = "IN_PROGRESS";
    job.progress = Math.min(96, Math.round((step / totalSteps) * 100));

    if (step >= totalSteps) {
      job.status         = "DONE";
      job.progress       = 100;
      job.questions      = simulateQuestions(config);
      job.niveau_suggere = config.difficulty;
      job.rang_suggere   = Math.floor(Math.random() * 6) + 1;
      jobs.set(jobId, job);
      return;
    }
    jobs.set(jobId, job);
    setTimeout(tick, 320 + Math.random() * 260);
  };
  setTimeout(tick, 260);

  return jobId;
}

/** Lit l'état courant d'un job simulé (même contrat que GET generate-ai/{job_id}/). */
export function getSimulatedJob(jobId: string): AIQuizJob | null {
  return jobs.get(jobId) ?? null;
}

// ── File de revue QRO (secours démonstration) ───────────────────────────────────

export const SIMULATED_QRO_QUEUE: AIQROReviewItem[] = [
  {
    id: 1, quiz_id: 3, quiz_title: "QCM - Introduction à la méditation",
    question_text: "Décrivez les sensations physiques et mentales que vous observez généralement dans les deux premières minutes d'une méditation.",
    chapter_context: "Module 2 - Méditation & Silence - Éveil Spirituel, Niveau Débutant",
    member_name: "Fatou Diallo",
    member_answer: "Au début je sens surtout mes épaules tendues et j'ai plein de pensées qui reviennent sur la journée. Après quelques minutes ça se calme un peu et je me concentre sur ma respiration.",
    ai_score: 13, ai_verdict: "A_REVOIR",
    ai_justification: "La réponse mentionne des sensations physiques et un effet de calme, mais reste imprécise sur l'état mental initial - score à la limite du seuil de validation.",
    created_at: "2026-07-04T09:20:00Z",
  },
  {
    id: 2, quiz_id: 1, quiz_title: "Examen final - Développement Personnel",
    question_text: "Décrivez une situation récente où vous avez pratiqué l'observation sans jugement de vos émotions, et expliquez ce que cela vous a appris.",
    chapter_context: "Module 1 - Connaissance de Soi - Développement Personnel Intégral",
    member_name: "Rose Koudou",
    member_answer: "Une fois où j'étais énervée contre ma sœur, j'ai juste respiré et regardé ce que je ressentais sans essayer de me calmer tout de suite. J'ai remarqué que la colère montait puis redescendait toute seule si je ne la nourrissais pas de pensées.",
    ai_score: 17, ai_verdict: "A_REVOIR",
    ai_justification: "Réponse riche et personnelle, mais la distinction entre observation et jugement n'est pas explicitement formulée - vérification humaine recommandée avant validation complète.",
    created_at: "2026-07-04T14:05:00Z",
  },
  {
    id: 3, quiz_id: 2, quiz_title: "Examen final - Nutrition",
    question_text: "Proposez un exemple de repas équilibré adapté à une famille, en justifiant vos choix nutritionnels.",
    chapter_context: "Module 3 - Recettes & Pratiques - Nutrition & Équilibre de Vie",
    member_name: "Nathalie Gbossou",
    member_answer: "Je pense qu'un bon repas c'est du riz avec de la viande, c'est ce qu'on mange souvent chez nous.",
    ai_score: 9, ai_verdict: "A_REVOIR",
    ai_justification: "La réponse manque de justification nutritionnelle et ne mentionne pas la diversité des groupes alimentaires - score faible mais pas clairement négatif, un avis humain est requis.",
    created_at: "2026-07-05T08:40:00Z",
  },
];

// ── Parcours progressif par branche (secours démonstration) ────────────────────

export const SIMULATED_PARCOURS: QuizItem[] = [
  { id: 1001, course: null, formation: 1, title: "QCM - Connaissance de Soi",                pass_threshold: 12, active: true, questions: [], created_at: "2026-02-10T12:00:00Z", generated_by_ai: true,  ai_source: "SCRIPT", niveau: "FACILE",        rang: 1, branche: null, status: "PUBLISHED" },
  { id: 1002, course: null, formation: 1, title: "QCM - Gestion des Émotions",                pass_threshold: 12, active: true, questions: [], created_at: "2026-02-18T12:00:00Z", generated_by_ai: true,  ai_source: "SCRIPT", niveau: "INTERMEDIAIRE", rang: 2, branche: null, status: "PUBLISHED" },
  { id: 1,    course: null, formation: 1, title: "Examen final - Développement Personnel",    pass_threshold: 14, active: true, questions: [], created_at: "2026-02-10T12:00:00Z", generated_by_ai: false, ai_source: null,     niveau: "DIFFICILE",     rang: 3, branche: null, status: "PUBLISHED" },
  { id: 1003, course: null, formation: 3, title: "QCM - Introduction à l'Ashé",               pass_threshold: 10, active: true, questions: [], created_at: "2026-03-12T09:00:00Z", generated_by_ai: true,  ai_source: "PDF",    niveau: "FACILE",        rang: 4, branche: null, status: "DRAFT" },
  { id: 2001, course: null, formation: 4, title: "QCM - Identité & Posture",                  pass_threshold: 12, active: true, questions: [], created_at: "2026-07-04T09:00:00Z", generated_by_ai: true,  ai_source: "SCRIPT", niveau: "INTERMEDIAIRE", rang: 1, branche: "FEMME",    status: "PUBLISHED" },
  { id: 2002, course: null, formation: 4, title: "QCM - Stratégie & Vision",                  pass_threshold: 14, active: true, questions: [], created_at: "2026-07-05T09:00:00Z", generated_by_ai: true,  ai_source: "SCRIPT", niveau: "DIFFICILE",     rang: 2, branche: "FEMME",    status: "DRAFT" },
  { id: 3001, course: null, formation: 5, title: "QCM - Bases de l'éducation bienveillante",  pass_threshold: 10, active: true, questions: [], created_at: "2026-06-10T09:00:00Z", generated_by_ai: true,  ai_source: "PDF",    niveau: "FACILE",        rang: 1, branche: "ENFANT",   status: "DRAFT" },
];

// ── Historique des générations IA (secours démonstration) ───────────────────────

export const SIMULATED_AI_HISTORY: AIQuizHistoryEntry[] = [
  { id: 101, quiz_title: "QCM - Les fondements de la gratitude",        source_title: "Développement Personnel Intégral - Module 2",   ai_source: "SCRIPT", generated_by_ai: true,  validated_by: "Garnel (Admin)", status: "PUBLISHED", niveau: "FACILE",        created_at: "2026-07-03T10:12:00Z" },
  { id: 102, quiz_title: "QCM - Rituels du matin",                       source_title: "Éveil Spirituel - Niveau Débutant - Module 3",   ai_source: "PDF",    generated_by_ai: true,  validated_by: "Garnel (Admin)", status: "DRAFT",     niveau: "INTERMEDIAIRE", created_at: "2026-07-04T16:45:00Z" },
  { id: 103, quiz_title: "Examen final - Nutrition",                     source_title: "Nutrition & Équilibre de Vie",                    ai_source: null,     generated_by_ai: false, validated_by: null,             status: "PUBLISHED", niveau: null,            created_at: "2026-02-25T10:00:00Z" },
  { id: 104, quiz_title: "QCM - Leadership et prise de parole",          source_title: "Leadership au Féminin - Module 1",                ai_source: "SCRIPT", generated_by_ai: true,  validated_by: null,             status: "DRAFT",     niveau: "DIFFICILE",     created_at: "2026-07-05T09:30:00Z" },
];
