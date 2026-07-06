"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/Modal";
import { Alert, Button } from "@/components/ui";
import { useAIGeneration } from "@/hooks/useAIGeneration";
import { moduleApi } from "@/lib/endpoints";
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
  const [moduleId,     setModuleId]    = useState<string>("");
  const [loadingMods,  setLoadingMods] = useState(false);

  const [nbQuestions, setNbQuestions] = useState(8);
  const [nbQcm,        setNbQcm]      = useState(5);
  const [difficulty,   setDifficulty] = useState<AIDifficulty>("INTERMEDIAIRE");
  const [source,       setSource]     = useState<AISourceType>("SCRIPT");
  const [formError,    setFormError]  = useState("");

  const gen = useAIGeneration();

  // Charge les modules de la formation choisie (contexte + thématisation de la simulation).
  useEffect(() => {
    if (preset || !formationId) { setModules([]); setModuleId(""); return; }
    setLoadingMods(true);
    moduleApi.list(Number(formationId))
      .then((r) => setModules(Array.isArray(r.data) ? r.data : r.data.results))
      .catch(() => setModules([]))
      .finally(() => setLoadingMods(false));
  }, [formationId, preset]);

  const nbQro = nbQuestions - nbQcm;

  const formationTitle = preset?.formationTitle
    ?? formations.find((f) => String(f.id) === formationId)?.title ?? "";
  const moduleTitle = preset?.contextLabel
    ?? modules.find((m) => String(m.id) === moduleId)?.title ?? "";

  const canSubmit = !!formationTitle && nbQuestions >= 5 && nbQuestions <= 20 && nbQcm >= 0 && nbQcm <= nbQuestions;

  const buildConfig = (): AIGenerationConfig => ({
    nb_questions: nbQuestions, nb_qcm: nbQcm, nb_qro: nbQro,
    difficulty, source,
    formation: preset ? preset.formationId : (formationId ? Number(formationId) : undefined),
    course: preset ? (preset.courseId ?? null) : null,
    formation_title: formationTitle,
    module_title: moduleTitle,
  });

  const submit = async () => {
    setFormError("");
    if (!formationTitle) { setFormError("Choisissez une formation cible."); return; }
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
              }}
              style={{ width: "100%", accentColor: "var(--gold)" }}
            />
          </div>

          {/* ── Ratio QCM / QRO ── */}
          <div style={{ marginBottom: "1.2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".35rem" }}>
              <span className="field-label" style={{ marginBottom: 0 }}>Répartition QCM / QRO</span>
              <span style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--gold-2)" }}>
                {nbQcm} QCM + {nbQro} QRO
              </span>
            </div>
            <input
              type="range" min={0} max={nbQuestions} value={nbQcm}
              onChange={(e) => setNbQcm(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--terra-2)" }}
            />
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
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {SOURCES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`chip press ${source === s.value ? "on" : ""}`}
                  onClick={() => setSource(s.value)}
                  title={s.hint}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
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
