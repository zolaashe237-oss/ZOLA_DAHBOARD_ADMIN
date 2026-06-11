"use client";

import { useEffect, useRef, useState } from "react";

import { quizApi } from "@/lib/endpoints";
import type { Formation, QuizItem, QuizQuestion } from "@/lib/types";
import { Alert, Button, errorMessage } from "@/components/ui";

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyQuestion(order: number): QuizQuestion {
  return {
    text: "", multiple: false, order,
    choices: [
      { text: "", is_correct: true,  order: 1 },
      { text: "", is_correct: false, order: 2 },
    ],
  };
}

// ── Sous-composant : une question ─────────────────────────────────────────────

function QuestionCard({
  q, qi, total,
  onChange, onRemove,
}: {
  q: QuizQuestion; qi: number; total: number;
  onChange: (patch: Partial<QuizQuestion>) => void;
  onRemove: () => void;
}) {
  const setChoice = (ci: number, patch: Partial<QuizQuestion["choices"][number]>) =>
    onChange({
      choices: q.choices.map((c, k) => (k === ci ? { ...c, ...patch } : c)),
    });

  const addChoice = () =>
    onChange({
      choices: [...q.choices, { text: "", is_correct: false, order: q.choices.length + 1 }],
    });

  const removeChoice = (ci: number) =>
    onChange({ choices: q.choices.filter((_, k) => k !== ci) });

  const markCorrect = (ci: number, checked: boolean) => {
    if (q.multiple) {
      setChoice(ci, { is_correct: checked });
    } else {
      onChange({ choices: q.choices.map((c, k) => ({ ...c, is_correct: k === ci })) });
    }
  };

  return (
    <div style={{
      border: "1px solid var(--line-soft)",
      borderRadius: "var(--radius)",
      overflow: "hidden",
      marginBottom: ".75rem",
    }}>
      {/* En-tête question */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: ".65rem 1rem",
        background: "var(--bg-2)",
        borderBottom: "1px solid var(--line-soft)",
      }}>
        <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--muted)", letterSpacing: ".04em", textTransform: "uppercase" }}>
          Question {qi + 1}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: ".35rem", cursor: "pointer", fontSize: ".78rem", color: "var(--muted)" }}>
            <input
              type="checkbox"
              checked={q.multiple}
              onChange={(e) => onChange({ multiple: e.target.checked })}
              style={{ accentColor: "var(--gold)" }}
            />
            Choix multiples
          </label>
          {total > 1 && (
            <button
              onClick={onRemove}
              title="Supprimer cette question"
              style={{ background: "none", border: "none", color: "var(--muted-2)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: ".15rem" }}
            >
              🗑
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: ".9rem 1rem" }}>
        {/* Texte de la question */}
        <div style={{ marginBottom: ".75rem" }}>
          <div className="field-label">Question</div>
          <textarea
            className="input"
            rows={2}
            placeholder="Rédigez votre question ici…"
            value={q.text}
            onChange={(e) => onChange({ text: e.target.value })}
            style={{ resize: "vertical", margin: 0 }}
          />
        </div>

        {/* Zone image (optionnelle) */}
        <div style={{
          border: "1.5px dashed var(--line-soft)",
          borderRadius: "var(--radius-sm)",
          padding: ".75rem 1rem",
          display: "flex", alignItems: "center", gap: ".75rem",
          marginBottom: ".9rem",
          background: "var(--bg)",
          cursor: "not-allowed",
          opacity: .55,
        }}>
          <span style={{ fontSize: "1.3rem" }}>☁</span>
          <div style={{ flex: 1, fontSize: ".78rem", color: "var(--muted)" }}>
            Choisir un fichier ou glisser-déposer ici.
            <div style={{ fontSize: ".72rem", color: "var(--muted-2)", marginTop: ".1rem" }}>
              JPEG, PNG — jusqu&apos;à 10 Mo
            </div>
          </div>
          <button
            disabled
            className="btn btn-ghost btn-sm"
            style={{ opacity: 1, cursor: "not-allowed" }}
          >
            Parcourir
          </button>
        </div>

        {/* Réponses */}
        <div className="field-label" style={{ marginBottom: ".45rem" }}>Réponses</div>
        <div style={{ display: "flex", flexDirection: "column", gap: ".4rem", marginBottom: ".45rem" }}>
          {q.choices.map((c, ci) => (
            <div key={ci} style={{
              display: "flex", alignItems: "center", gap: ".5rem",
              padding: ".4rem .55rem",
              background: c.is_correct ? "rgba(82,176,131,.08)" : "transparent",
              border: `1px solid ${c.is_correct ? "rgba(82,176,131,.25)" : "var(--line-soft)"}`,
              borderRadius: "var(--radius-sm)",
              transition: "all .15s",
            }}>
              {/* Input texte */}
              <input
                className="input"
                style={{ flex: 1, margin: 0, background: "transparent", border: "none",
                         boxShadow: "none", padding: ".3rem .4rem", fontSize: ".86rem" }}
                placeholder={`Option ${ci + 1}`}
                value={c.text}
                onChange={(e) => setChoice(ci, { text: e.target.value })}
              />
              {/* Radio / Checkbox — marque la bonne réponse */}
              <label
                title={q.multiple ? "Bonne réponse" : "Bonne réponse (une seule)"}
                style={{ display: "flex", alignItems: "center", gap: ".3rem", cursor: "pointer",
                         fontSize: ".75rem", color: c.is_correct ? "var(--ok)" : "var(--muted-2)",
                         whiteSpace: "nowrap", flexShrink: 0 }}
              >
                <input
                  type={q.multiple ? "checkbox" : "radio"}
                  name={`correct-${qi}`}
                  checked={c.is_correct}
                  onChange={(e) => markCorrect(ci, e.target.checked)}
                  style={{ accentColor: "var(--ok)", width: 15, height: 15 }}
                />
                {c.is_correct ? "Correct" : "Réponse"}
              </label>
              {/* Supprimer */}
              {q.choices.length > 2 && (
                <button
                  onClick={() => removeChoice(ci)}
                  title="Retirer cette option"
                  style={{ background: "none", border: "none", color: "var(--muted-2)",
                           cursor: "pointer", fontSize: ".9rem", lineHeight: 1, flexShrink: 0 }}
                >
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addChoice}
          style={{ background: "none", border: "none", color: "var(--gold-2)", cursor: "pointer",
                   fontSize: ".82rem", fontWeight: 600, padding: ".2rem 0",
                   display: "flex", alignItems: "center", gap: ".3rem" }}
        >
          + Ajouter une réponse
        </button>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function QuizEditor({
  quiz,
  course,
  formation: defaultFormation,
  formations = [],
  onClose,
  onSaved,
}: {
  quiz: QuizItem | null;
  course?: number;
  formation?: number;
  formations?: Formation[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title,       setTitle]       = useState(quiz?.title ?? "");
  const [threshold,   setThreshold]   = useState(quiz?.pass_threshold ?? 14);
  const [active,      setActive]      = useState(quiz?.active ?? true);
  const [formationId, setFormationId] = useState<string>(
    String(quiz?.formation ?? defaultFormation ?? ""),
  );
  const [questions,   setQuestions]   = useState<QuizQuestion[]>(
    quiz?.questions?.length ? quiz.questions : [emptyQuestion(1)],
  );
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error,   setError]   = useState("");

  const bodyRef = useRef<HTMLDivElement>(null);

  // Escape pour fermer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const setQ = (i: number, patch: Partial<QuizQuestion>) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const addQuestion = () => {
    setQuestions((qs) => [...qs, emptyQuestion(qs.length + 1)]);
    setTimeout(() => bodyRef.current?.scrollTo({ top: 9999, behavior: "smooth" }), 50);
  };

  const save = async () => {
    setError(""); setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        pass_threshold: threshold,
        active,
        ...(course ? { course } : { formation: formationId ? Number(formationId) : undefined }),
        questions: questions.map((q, qi) => ({
          text: q.text, multiple: q.multiple, order: qi + 1,
          ...(q.id ? { id: q.id } : {}),
          choices: q.choices.map((c, ci) => ({
            text: c.text, is_correct: c.is_correct, order: ci + 1,
            ...(c.id ? { id: c.id } : {}),
          })),
        })),
      };
      if (quiz) await quizApi.update(quiz.id, payload);
      else       await quizApi.create(payload);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!quiz) return;
    setDeleting(true);
    try { await quizApi.remove(quiz.id); onSaved(); }
    catch (e) { setError(errorMessage(e)); setDeleting(false); }
  };

  const valid = title.trim().length > 0 &&
    questions.length > 0 &&
    questions.every(
      (q) => q.text.trim() &&
        q.choices.some((c) => c.is_correct) &&
        q.choices.every((c) => c.text.trim()),
    );

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(8,6,5,.75)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1.25rem",
        overflowY: "auto",
      }}
    >
      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 16px 64px rgba(0,0,0,.7)",
          width: "100%",
          maxWidth: 620,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          margin: "auto",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.1rem 1.4rem",
          borderBottom: "1px solid var(--line-soft)",
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
            {quiz ? "Modifier le quiz" : "Créer un quiz"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "var(--bg-2)", border: "1px solid var(--line-soft)",
              color: "var(--muted)", cursor: "pointer",
              width: 30, height: 30, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: ".85rem", transition: "all .15s",
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Corps (scrollable) ── */}
        <div ref={bodyRef} style={{ overflowY: "auto", padding: "1.2rem 1.4rem", flex: 1 }}>
          <Alert>{error}</Alert>

          {/* Infos du quiz */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginBottom: "1.1rem" }}>
            {/* Titre */}
            <div style={{ gridColumn: "1/-1" }}>
              <label className="field-label">Titre du quiz</label>
              <input
                className="input"
                placeholder="ex. Examen final — Développement Personnel"
                value={title}
                style={{ margin: 0 }}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Formation (si pas de cours prédéfini) */}
            {!course && (
              <div>
                <label className="field-label">Formation</label>
                <select
                  className="select"
                  value={formationId}
                  style={{ margin: 0 }}
                  onChange={(e) => setFormationId(e.target.value)}
                >
                  <option value="">— Choisir une formation —</option>
                  {formations.map((f) => (
                    <option key={f.id} value={f.id}>{f.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Seuil de réussite */}
            <div>
              <label className="field-label">Seuil de réussite (sur 20)</label>
              <input
                className="input"
                type="number" min={0} max={20}
                value={threshold}
                style={{ margin: 0 }}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </div>

            {/* Statut */}
            <div style={{ gridColumn: course ? "1/-1" : "auto" }}>
              <label className="field-label">Statut</label>
              <select
                className="select"
                value={active ? "ACTIVE" : "INACTIVE"}
                style={{ margin: 0 }}
                onChange={(e) => setActive(e.target.value === "ACTIVE")}
              >
                <option value="ACTIVE">● Actif</option>
                <option value="INACTIVE">● Inactif</option>
              </select>
            </div>
          </div>

          {/* Séparateur */}
          <div style={{
            borderTop: "1px solid var(--line-soft)",
            margin: "1rem 0",
            display: "flex", alignItems: "center", gap: ".75rem",
          }}>
            <span style={{ fontSize: ".72rem", fontWeight: 600, letterSpacing: ".08em",
                           textTransform: "uppercase", color: "var(--muted-2)",
                           background: "var(--bg-1)", padding: "0 .5rem",
                           marginTop: "-1px", whiteSpace: "nowrap" }}>
              {questions.length} question{questions.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Questions */}
          {questions.map((q, qi) => (
            <QuestionCard
              key={qi}
              q={q} qi={qi} total={questions.length}
              onChange={(patch) => setQ(qi, patch)}
              onRemove={() => setQuestions((qs) => qs.filter((_, idx) => idx !== qi))}
            />
          ))}

          {/* + Ajouter une question */}
          <button
            onClick={addQuestion}
            style={{
              width: "100%", background: "none",
              border: "1.5px dashed var(--line-soft)",
              color: "var(--gold-2)", cursor: "pointer",
              padding: ".6rem", borderRadius: "var(--radius-sm)",
              fontSize: ".86rem", fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: ".35rem",
              transition: "all .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line-soft)"; }}
          >
            + Ajouter une question
          </button>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "1rem 1.4rem",
          borderTop: "1px solid var(--line-soft)",
          flexShrink: 0,
          gap: ".5rem",
        }}>
          <div>
            {quiz && (
              <Button variant="danger" loading={deleting} onClick={remove}>
                Supprimer le quiz
              </Button>
            )}
          </div>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button onClick={save} loading={saving} disabled={!valid}>
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
