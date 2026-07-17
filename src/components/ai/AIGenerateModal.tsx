"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/Modal";
import { Alert, Button } from "@/components/ui";
import { useAIGeneration } from "@/hooks/useAIGeneration";
import { courseApi, moduleApi, resourceApi, asList } from "@/lib/endpoints";
import type {
  AIDifficulty, AIGeneratedQuestion, AIGenerationConfig, AISourceType, Formation, ModuleItem,
} from "@/lib/types";
import { AIThinking } from "./AIThinking";

// ── Constantes de configuration (G-02) ────────────────────────────────────────

const DIFFICULTIES: { value: AIDifficulty; label: string; hint: string }[] = [
  { value: "FACILE",        label: "Facile",        hint: "Rappel de notions de base" },
  { value: "INTERMEDIAIRE", label: "Intermédiaire", hint: "Application et analyse" },
  { value: "DIFFICILE",     label: "Difficile",     hint: "Réflexion et synthèse" },
];

const SOURCES: { value: AISourceType; label: string; hint: string; icon: string }[] = [
  { value: "SCRIPT", label: "Script vidéo", hint: "Transcription YouTube du module", icon: "▶" },
  { value: "PDF",     label: "Document PDF", hint: "Contenu extrait du livre/PDF associé", icon: "▤" },
];

export interface AIGenerateTarget {
  formationId: number;
  formationTitle: string;
  moduleId?: number | null;
  courseId?: number | null;
  contextLabel: string; // ex. "Formation entière" ou "Module 2 - Méditation & Silence"
}

export interface AIGenerateResult {
  questions: AIGeneratedQuestion[];
  config: AIGenerationConfig;
  niveauSuggere: AIDifficulty | null;
  rangSuggere: number | null;
  simulated: boolean;
  targetFormationId: number;
  targetCourseId: number | null;
}

export function AIGenerateModal({
  formations,
  preset,
  onClose,
  onGenerated,
}: {
  formations: Formation[];
  /** Pré-rempli par l'action rapide « ✨ » d'une ligne du tableau - sinon l'admin choisit la formation. */
  preset?: AIGenerateTarget | null;
  onClose: () => void;
  onGenerated: (result: AIGenerateResult) => void;
}) {
  const [formationId, setFormationId] = useState<string>(preset ? String(preset.formationId) : "");
  const [modules,      setModules]     = useState<ModuleItem[]>([]);
  const [moduleId,     setModuleId]    = useState<string>(preset?.moduleId ? String(preset.moduleId) : "");
  const [loadingMods,  setLoadingMods] = useState(false);

  const [nbQuestions,   setNbQuestions]  = useState(8);
  const [nbQcm,         setNbQcm]       = useState(4);
  const [nbQcmMulti,    setNbQcmMulti]  = useState(2);
  const [difficulty,   setDifficulty] = useState<AIDifficulty>("INTERMEDIAIRE");
  const [source,       setSource]     = useState<AISourceType>("SCRIPT");
  const [formError,    setFormError]  = useState("");

  const [youtubeUrl,   setYoutubeUrl]   = useState<string>("");
  const [pdfResourceId, setPdfResourceId] = useState<string>("");
  const [loadingResources, setLoadingResources] = useState(false);

  // Mode examen final : preset.courseId === null
  const isFinalExam = !!(preset && preset.courseId === null);
  const [allChapterUrls,   setAllChapterUrls]   = useState<string[]>([]);
  const [loadingFinalExam, setLoadingFinalExam] = useState(false);

  const gen = useAIGeneration();

  // Charge les modules de la formation choisie (contexte + thématisation de la simulation).
  useEffect(() => {
    const targetFormId = preset ? preset.formationId : (formationId ? Number(formationId) : null);
    if (!targetFormId) { setModules([]); setModuleId(""); return; }
    setLoadingMods(true);
    moduleApi.list(targetFormId)
      .then((r) => {
        const mods = asList(r.data);
        setModules(mods);
        if (preset?.moduleId) {
          setModuleId(String(preset.moduleId));
        } else if (mods.length > 0) {
          setModuleId(String(mods[0].id));
        }
      })
      .catch(() => setModules([]))
      .finally(() => setLoadingMods(false));
  }, [formationId, preset]);

  // Examen final : collecte les URLs YouTube de TOUS les chapitres
  useEffect(() => {
    if (!isFinalExam || modules.length === 0) return;
    setLoadingFinalExam(true);
    setAllChapterUrls([]);
    Promise.all(
      modules.map(async (m) => {
        try {
          const courses = asList((await courseApi.list(m.id)).data);
          if (!courses.length) return null;
          const resources = asList((await resourceApi.list(courses[0].id)).data);
          const videoRes = resources.find(
            (r) => r.resource_type === "VIDEO" && r.video_source === "YOUTUBE",
          );
          return videoRes?.youtube_url ?? null;
        } catch {
          return null;
        }
      }),
    )
      .then((urls) => setAllChapterUrls(urls.filter(Boolean) as string[]))
      .finally(() => setLoadingFinalExam(false));
  }, [isFinalExam, modules]);

  // Récupère les ressources du module sélectionné (mode chapitre seulement)
  useEffect(() => {
    if (isFinalExam || !moduleId) {
      setYoutubeUrl("");
      setPdfResourceId("");
      return;
    }
    setLoadingResources(true);
    setYoutubeUrl("");
    setPdfResourceId("");
    courseApi.list(Number(moduleId))
      .then(async (res) => {
        const courses = asList(res.data);
        if (courses.length > 0) {
          const firstCourse = courses[0];
          const resList = asList((await resourceApi.list(firstCourse.id)).data);
          const videoRes = resList.find(r => r.resource_type === "VIDEO" && r.video_source === "YOUTUBE");
          if (videoRes?.youtube_url) setYoutubeUrl(videoRes.youtube_url);
          const pdfRes = resList.find(r => r.resource_type === "PDF");
          if (pdfRes?.id) setPdfResourceId(String(pdfRes.id));
        }
      })
      .catch((err) => {
        console.error("Erreur lors du chargement des ressources du module", err);
      })
      .finally(() => setLoadingResources(false));
  }, [isFinalExam, moduleId]);

  const nbQro = nbQuestions - nbQcm - nbQcmMulti;

  const formationTitle = preset?.formationTitle
    ?? formations.find((f) => String(f.id) === formationId)?.title ?? "";
  const moduleTitle = preset?.contextLabel
    ?? modules.find((m) => String(m.id) === moduleId)?.title ?? "";

  const isSourceMissing = !isFinalExam &&
    ((source === "SCRIPT" && !youtubeUrl) || (source === "PDF" && !pdfResourceId));

  const totalQcm = nbQcm + nbQcmMulti;
  const canSubmit = isFinalExam
    ? !loadingFinalExam && allChapterUrls.length > 0 && nbQuestions >= 5 && nbQuestions <= 20 && totalQcm >= 0 && totalQcm <= nbQuestions && nbQro >= 0
    : !!formationTitle && !!moduleId && !loadingResources && !isSourceMissing && nbQuestions >= 5 && nbQuestions <= 20 && totalQcm >= 0 && totalQcm <= nbQuestions && nbQro >= 0;

  const buildConfig = (): AIGenerationConfig => {
    const ratioQcmQro = nbQuestions > 0 ? (nbQcm + nbQcmMulti) / nbQuestions : 0.6;
    if (isFinalExam) {
      return {
        nb_questions: nbQuestions, nb_qcm: nbQcm, nb_qcm_multi: nbQcmMulti, nb_qro: nbQro,
        difficulty,
        source: "MULTI_YOUTUBE",
        formation: preset!.formationId,
        course: null,
        formation_title: formationTitle,
        module_title: `Examen final — ${formationTitle}`,
        moduleId: modules[0]?.id ?? null,
        source_ref: allChapterUrls.join(","),
        source_text: "",
        ratio_qcm_qro: ratioQcmQro,
      };
    }
    return {
      nb_questions: nbQuestions, nb_qcm: nbQcm, nb_qcm_multi: nbQcmMulti, nb_qro: nbQro,
      difficulty, source,
      formation: preset ? preset.formationId : (formationId ? Number(formationId) : undefined),
      course: preset ? (preset.courseId ?? null) : null,
      formation_title: formationTitle,
      module_title: moduleTitle,
      moduleId: Number(moduleId),
      source_ref: source === "SCRIPT" ? youtubeUrl : pdfResourceId,
      source_text: "",
      ratio_qcm_qro: ratioQcmQro,
    };
  };

  const submit = async () => {
    setFormError("");
    if (!formationTitle) { setFormError("Choisissez une formation cible."); return; }
    if (isSourceMissing) {
      setFormError(source === "SCRIPT" ? "Le module sélectionné n'a pas de vidéo YouTube comme source." : "Le module sélectionné n'a pas de document PDF comme source.");
      return;
    }
    await gen.start(buildConfig());
  };

  // Remonte le résultat au parent dès que le job simulé/réel est DONE.
  useEffect(() => {
    if (gen.phase === "done") {
      const config = buildConfig();
      onGenerated({
        questions: gen.questions,
        config,
        niveauSuggere: gen.niveauSuggere,
        rangSuggere: gen.rangSuggere,
        simulated: gen.simulated,
        targetFormationId: config.formation ?? Number(formationId),
        targetCourseId: config.course ?? null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen.phase]);

  const generating = gen.phase === "generating";

  return (
    <Modal onClose={onClose} title="Générer un quiz avec l'IA" maxWidth={560}>
      {gen.phase === "error" ? (
        <div>
          <Alert>{gen.error}</Alert>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: ".5rem", marginTop: "1rem" }}>
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button onClick={submit}>Réessayer</Button>
          </div>
        </div>
      ) : generating ? (
        <AIThinking progress={gen.progress} />
      ) : (
        <div>
          <Alert>{formError}</Alert>

          {/* ── Cible ── */}
          {preset ? (
            <div style={{
              display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap",
              padding: ".65rem .85rem", marginBottom: "1.1rem",
              background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: "var(--radius-sm)",
            }}>
              <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>Cible :</span>
              <strong style={{ fontSize: ".85rem", color: "var(--cream)" }}>{preset.formationTitle}</strong>
              <span style={{ fontSize: ".78rem", color: "var(--muted-2)" }}>- {preset.contextLabel}</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginBottom: "1.1rem" }}>
              <label style={{ display: "block" }}>
                <span className="field-label">Formation cible</span>
                <select className="select" value={formationId} onChange={(e) => { setFormationId(e.target.value); setModuleId(""); }}>
                  <option value="">- Choisir une formation -</option>
                  {formations.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
              </label>
              <label style={{ display: "block" }}>
                <span className="field-label">Module (optionnel)</span>
                <select className="select" value={moduleId} onChange={(e) => setModuleId(e.target.value)}
                        disabled={!formationId || loadingMods}>
                  <option value="">{loadingMods ? "Chargement…" : "Formation entière (examen)"}</option>
                  {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </label>
            </div>
          )}

          {/* ── Nombre de questions ── */}
          <div style={{ marginBottom: "1.1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".35rem" }}>
              <span className="field-label" style={{ marginBottom: 0 }}>Nombre de questions</span>
              <span style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--gold-2)" }}>{nbQuestions}</span>
            </div>
            <input
              type="range" min={5} max={20} value={nbQuestions}
              onChange={(e) => {
                const n = Number(e.target.value);
                setNbQuestions(n);
                setNbQcm((prev) => Math.min(prev, n));
                setNbQcmMulti((prev) => Math.min(prev, Math.max(0, n - nbQcm)));
              }}
              style={{ width: "100%", accentColor: "var(--gold)" }}
            />
          </div>

          {/* ── Répartition QCM / QCM multi / QRO ── */}
          <div style={{ marginBottom: "1.2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".35rem" }}>
              <span className="field-label" style={{ marginBottom: 0 }}>Répartition</span>
              <span style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--gold-2)" }}>
                {nbQcm} QCM
                {nbQcmMulti > 0 && <> + <span style={{ color: "#8b5cf6" }}>{nbQcmMulti} QCM ☑</span></>}
                {" "}+ {nbQro} QRO
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".35rem" }}>
              <span style={{ fontSize: ".73rem", color: "var(--muted-2)", minWidth: 90 }}>QCM (1 réponse)</span>
              <input
                type="range" min={0} max={Math.max(0, nbQuestions - nbQcmMulti)} value={nbQcm}
                onChange={(e) => setNbQcm(Number(e.target.value))}
                style={{ flex: 1, accentColor: "var(--terra-2)" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
              <span style={{ fontSize: ".73rem", color: "#8b5cf6", minWidth: 90 }}>QCM multi ☑</span>
              <input
                type="range" min={0} max={Math.max(0, nbQuestions - nbQcm)} value={nbQcmMulti}
                onChange={(e) => setNbQcmMulti(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#8b5cf6" }}
              />
            </div>
          </div>

          {/* ── Difficulté ── */}
          <div style={{ marginBottom: "1.2rem" }}>
            <span className="field-label">Niveau de difficulté</span>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  className={`chip press ${difficulty === d.value ? "on" : ""}`}
                  onClick={() => setDifficulty(d.value)}
                  title={d.hint}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Source d'extraction ── */}
          <div style={{ marginBottom: "1.4rem" }}>
            <span className="field-label">Source d&apos;extraction</span>
            {isFinalExam ? (
              // Mode examen final : toutes les vidéos de la formation
              <div style={{
                marginTop: ".4rem",
                padding: ".55rem .75rem",
                background: "var(--bg-2)",
                border: "1px solid var(--line-soft)",
                borderRadius: "var(--radius-sm)",
                fontSize: ".82rem",
              }}>
                {loadingFinalExam ? (
                  <span style={{ color: "var(--gold-2)" }}>Collecte des vidéos de la formation…</span>
                ) : allChapterUrls.length > 0 ? (
                  <span style={{ color: "var(--ok)" }}>
                    ✓ {allChapterUrls.length} vidéo{allChapterUrls.length > 1 ? "s" : ""} collectée{allChapterUrls.length > 1 ? "s" : ""}
                    {" "}<span style={{ color: "var(--muted)" }}>sur {modules.length} chapitre{modules.length > 1 ? "s" : ""}</span>
                    {" "}— Gemini va analyser l&apos;ensemble de la formation
                  </span>
                ) : (
                  <span style={{ color: "var(--bad)" }}>
                    ⚠️ Aucune vidéo YouTube trouvée dans cette formation.
                  </span>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                  {SOURCES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={`chip press ${source === s.value ? "on" : ""}`}
                      onClick={() => setSource(s.value)}
                      title={s.hint}
                      disabled={loadingResources}
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
                {loadingResources && (
                  <p style={{ color: "var(--gold-2)", fontSize: ".78rem", marginTop: ".35rem" }}>
                    Chargement des ressources du module...
                  </p>
                )}
                {!loadingResources && source === "SCRIPT" && !youtubeUrl && moduleId && (
                  <p style={{ color: "var(--bad)", fontSize: ".78rem", marginTop: ".35rem" }}>
                    ⚠️ Aucun script vidéo (YouTube) trouvé pour ce module.
                  </p>
                )}
                {!loadingResources && source === "PDF" && !pdfResourceId && moduleId && (
                  <p style={{ color: "var(--bad)", fontSize: ".78rem", marginTop: ".35rem" }}>
                    ⚠️ Aucun document PDF trouvé pour ce module.
                  </p>
                )}
              </>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: ".5rem" }}>
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button onClick={submit} disabled={!canSubmit}>✨ Générer le quiz</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
