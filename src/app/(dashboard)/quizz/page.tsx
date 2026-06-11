"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { asList, formationApi, quizApi } from "@/lib/endpoints";
import { MOCK_FORMATIONS, MOCK_QUIZZES } from "@/lib/mocks";
import type { Formation, QuizItem } from "@/lib/types";
import { Alert, Badge, Button, Card, Input, Pagination, Select, errorMessage, usePagination } from "@/components/ui";
import { ConfirmModal } from "@/components/Modal";
import { QuizEditor } from "@/components/QuizEditor";

type QuizTarget = { quiz: QuizItem | null };

export default function QuizzPage() {
  const [formations,       setFormations]       = useState<Formation[]>(MOCK_FORMATIONS);
  const [quizzes,          setQuizzes]          = useState<QuizItem[]>(MOCK_QUIZZES);
  const [filterFormation,  setFilterFormation]  = useState("");
  const [filterType,       setFilterType]       = useState("");
  const [filterSearch,     setFilterSearch]     = useState("");
  const [quizTarget,       setQuizTarget]       = useState<QuizTarget | null>(null);
  const [deleteTarget,     setDeleteTarget]     = useState<QuizItem | null>(null);
  const [error,            setError]            = useState("");
  const [info,             setInfo]             = useState("");

  // ── Chargements ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setError("");
    try {
      const [fRes, qRes] = await Promise.all([
        formationApi.list(),
        quizApi.listAll(),
      ]);
      setFormations(asList(fRes.data));
      setQuizzes(asList(qRes.data));
    } catch { /* garde les mocks */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtres ───────────────────────────────────────────────────────────────

  const filtered = quizzes.filter((q) => {
    if (filterFormation && String(q.formation) !== filterFormation) return false;
    if (filterType === "EXAM" && q.course !== null)                  return false;
    if (filterType === "QCM"  && q.course === null)                  return false;
    if (filterSearch && !q.title.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const filterKey = `${filterSearch}|${filterFormation}|${filterType}`;
  const { page, totalPages, paged, total, pageSize, setPageSize, go } = usePagination(filtered, 10, filterKey);

  // ── Suppression ───────────────────────────────────────────────────────────

  const doDelete = async (q: QuizItem) => {
    setError(""); setInfo("");
    try {
      await quizApi.remove(q.id);
      setInfo(`Quiz « ${q.title} » supprimé.`);
      await load();
    } catch (e) { setError(errorMessage(e)); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formationTitle = (id: number | null) =>
    id ? (formations.find((f) => f.id === id)?.title ?? `#${id}`) : null;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="fade-up">
      {/* Header */}
      <div className="page-header">
        <div className="eyebrow">Contenu pédagogique</div>
        <h1>Quiz & QCM</h1>
        <p>
          {quizzes.length} quiz au total ·{" "}
          {quizzes.filter((q) => q.active).length} actif{quizzes.filter((q) => q.active).length !== 1 ? "s" : ""}
        </p>
      </div>

      <Alert>{error}</Alert>
      {info && <Alert kind="success">{info}</Alert>}

      {/* ── Barre filtres + action ── */}
      <div style={{ display: "flex", gap: ".75rem", alignItems: "flex-end", marginBottom: "1.1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input
            label="Rechercher"
            value={filterSearch}
            placeholder="Titre du quiz…"
            onChange={(e) => setFilterSearch(e.target.value)}
          />
        </div>
        <div style={{ width: 220 }}>
          <Select label="Formation" value={filterFormation} onChange={(e) => setFilterFormation(e.target.value)}>
            <option value="">Toutes les formations</option>
            {formations.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
          </Select>
        </div>
        <div style={{ width: 180 }}>
          <Select label="Type" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Tous</option>
            <option value="EXAM">Examen final</option>
            <option value="QCM">QCM cours</option>
          </Select>
        </div>
        <Button
          style={{ marginBottom: ".85rem" }}
          onClick={() => { setQuizTarget({ quiz: null }); setError(""); setInfo(""); }}
        >
          + Créer un quiz
        </Button>
        <Link href="/quizz/resultats" style={{ marginBottom: ".85rem" }}>
          <Button variant="ghost">Voir les résultats →</Button>
        </Link>
      </div>

      {/* ── Tableau ── */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ width: "100%", minWidth: 640 }}>
            <thead>
              <tr>
                <th>Titre du quiz</th>
                <th>Formation</th>
                <th>Type</th>
                <th style={{ textAlign: "center" }}>Questions</th>
                <th style={{ textAlign: "center" }}>Seuil</th>
                <th>Statut</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((q) => (
                <tr key={q.id}>
                  {/* Titre */}
                  <td>
                    <button
                      onClick={() => setQuizTarget({ quiz: q })}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer",
                               textAlign: "left", color: "var(--cream)", fontWeight: 600,
                               fontSize: ".875rem", fontFamily: "var(--sans)" }}
                    >
                      {q.title}
                    </button>
                  </td>

                  {/* Formation */}
                  <td style={{ fontSize: ".82rem" }}>
                    {q.formation
                      ? (
                          <Link href={`/contenu/${q.formation}`}
                                style={{ color: "var(--gold-2)", textDecoration: "none",
                                         maxWidth: 180, display: "block",
                                         overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {formationTitle(q.formation)}
                          </Link>
                        )
                      : <span style={{ color: "var(--muted)" }}>—</span>}
                  </td>

                  {/* Type */}
                  <td>
                    {q.course === null
                      ? <Badge color="var(--gold)">Examen final</Badge>
                      : <Badge color="var(--ok)">QCM cours</Badge>}
                  </td>

                  {/* Questions */}
                  <td style={{ textAlign: "center", color: "var(--muted)", fontSize: ".88rem" }}>
                    {q.questions.length}
                  </td>

                  {/* Seuil */}
                  <td style={{ textAlign: "center", color: "var(--muted-2)", fontSize: ".82rem" }}>
                    {q.pass_threshold}/20
                  </td>

                  {/* Statut */}
                  <td>
                    <Badge color={q.active ? "var(--ok)" : "var(--muted)"}>
                      {q.active ? "Actif" : "Inactif"}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td>
                    <div style={{ display: "flex", gap: ".35rem", justifyContent: "flex-end" }}>
                      {/* Éditer */}
                      <button
                        onClick={() => setQuizTarget({ quiz: q })}
                        title="Modifier"
                        style={{
                          background: "var(--bg-2)", border: "1px solid var(--line-soft)",
                          borderRadius: "var(--radius-sm)", width: 32, height: 32,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", color: "var(--gold-2)", fontSize: "1rem",
                          transition: "all .15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-3)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-2)"; }}
                      >
                        ✎
                      </button>
                      {/* Supprimer */}
                      <button
                        onClick={() => setDeleteTarget(q)}
                        title="Supprimer"
                        style={{
                          background: "var(--bad-bg)", border: "1px solid rgba(201,80,58,.3)",
                          borderRadius: "var(--radius-sm)", width: 32, height: 32,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", color: "var(--bad)", fontSize: ".9rem",
                          transition: "all .15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(201,80,58,.22)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bad-bg)"; }}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {paged.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>
                    Aucun quiz trouvé.{" "}
                    <button
                      onClick={() => setQuizTarget({ quiz: null })}
                      style={{ background: "none", border: "none", color: "var(--gold-2)",
                               cursor: "pointer", fontWeight: 600 }}
                    >
                      Créer le premier quiz →
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page} totalPages={totalPages} total={total}
          pageSize={pageSize} onPage={go} onPageSize={setPageSize}
        />
      </Card>

      {/* ── Éditeur ── */}
      {quizTarget && (
        <QuizEditor
          quiz={quizTarget.quiz}
          formations={formations}
          onClose={() => setQuizTarget(null)}
          onSaved={() => {
            setQuizTarget(null);
            load();
            setInfo(quizTarget.quiz ? "Quiz mis à jour." : "Quiz créé avec succès.");
          }}
        />
      )}

      {/* ── Confirmation suppression ── */}
      {deleteTarget && (
        <ConfirmModal
          title="Supprimer ce quiz"
          message={`« ${deleteTarget.title} » et toutes ses questions seront supprimés définitivement.`}
          confirmLabel="Supprimer"
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await doDelete(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
