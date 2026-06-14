"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { asList, quizResultsApi, resetQuizApi, quizApi } from "@/lib/endpoints";
import { MOCK_QUIZ_RESULTS, MOCK_QUIZZES } from "@/lib/mocks";
import type { QuizItem, QuizResult } from "@/lib/types";
import { Alert, Badge, Button, Card, Input, Pagination, Select, errorMessage, usePagination } from "@/components/ui";
import { ConfirmModal } from "@/components/Modal";

export default function QuizResultsPage() {
  const [results,      setResults]      = useState<QuizResult[]>(MOCK_QUIZ_RESULTS);
  const [quizzes,      setQuizzes]      = useState<QuizItem[]>(MOCK_QUIZZES);
  const [filterQuiz,   setFilterQuiz]   = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [error,        setError]        = useState("");
  const [info,         setInfo]         = useState("");
  const [resetting,    setResetting]    = useState<number | null>(null);
  const [resetTarget,  setResetTarget]  = useState<QuizResult | null>(null);

  const load = useCallback(async () => {
    try {
      const [resData, qData] = await Promise.all([
        quizResultsApi.list({
          quiz_id:    filterQuiz   ? Number(filterQuiz) : undefined,
          search:     filterSearch || undefined,
        }),
        quizApi.listAll(),
      ]);
      const list = asList(resData.data);
      if (list.length > 0) setResults(list);
      setQuizzes(asList(qData.data));
    } catch { /* garde les mocks */ }
  }, [filterQuiz, filterSearch]);

  useEffect(() => { load(); }, [load]);

  const doReset = async (r: QuizResult, reason: string) => {
    setResetting(r.id); setError(""); setInfo("");
    try {
      await resetQuizApi({ user_id: r.user_id, quiz_id: r.quiz_id, reason });
      setInfo(`Quiz réinitialisé pour ${r.user_name}.`);
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setResetting(null); }
  };

  const filtered = results.filter((r) => {
    if (filterQuiz   && String(r.quiz_id) !== filterQuiz) return false;
    if (filterSearch && !r.user_name.toLowerCase().includes(filterSearch.toLowerCase())
                     && !r.user_email.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    if (filterStatus === "VALIDE"    && !r.validated)  return false;
    if (filterStatus === "ECHOUE"    &&  r.validated)  return false;
    return true;
  });

  const filterKey = `${filterSearch}|${filterQuiz}|${filterStatus}`;
  const { page, totalPages, paged, total, pageSize, setPageSize, go } = usePagination(filtered, 20, filterKey);

  const scoreColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 70) return "#5fb98a";
    if (pct >= 50) return "#d9a441";
    return "#cf5a3c";
  };

  return (
    <div className="fade-up">
      <div className="page-header">
        <div className="eyebrow">Quiz & QCM</div>
        <h1>Résultats des quiz</h1>
        <p>
          {results.length} résultat{results.length !== 1 ? "s" : ""} · {" "}
          {results.filter((r) => r.validated).length} validé{results.filter((r) => r.validated).length !== 1 ? "s" : ""}
        </p>
      </div>

      <Alert>{error}</Alert>
      {info && <Alert kind="success">{info}</Alert>}

      {/* Filtres */}
      <div style={{ display: "flex", gap: ".75rem", alignItems: "flex-end", marginBottom: "1.1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input
            label="Rechercher (nom / email)"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Nom ou email du membre…"
          />
        </div>
        <div style={{ width: 230 }}>
          <Select label="Quiz" value={filterQuiz} onChange={(e) => setFilterQuiz(e.target.value)}>
            <option value="">Tous les quiz</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>{q.title}</option>
            ))}
          </Select>
        </div>
        <div style={{ width: 160 }}>
          <Select label="Résultat" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tous</option>
            <option value="VALIDE">Validés</option>
            <option value="ECHOUE">Non validés</option>
          </Select>
        </div>
        <Link href="/quizz" style={{ marginBottom: ".85rem" }}>
          <Button variant="ghost">← Retour aux quiz</Button>
        </Link>
      </div>

      {/* Tableau */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Quiz</th>
              <th style={{ textAlign: "right" }}>Score</th>
              <th>Résultat</th>
              <th>Tentatives</th>
              <th>Passé le</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/membres/${r.user_id}`} style={{ textDecoration: "none" }}>
                    <div style={{ fontWeight: 600, fontSize: ".875rem", color: "var(--gold-2)" }}>
                      {r.user_name}
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: ".78rem" }}>{r.user_email}</div>
                  </Link>
                </td>
                <td style={{ fontSize: ".83rem", color: "var(--muted)", maxWidth: 220 }}>
                  {r.quiz_title}
                </td>
                <td style={{ textAlign: "right" }}>
                  <span style={{ fontWeight: 700, color: scoreColor(r.score, r.max_score) }}>
                    {r.score}
                  </span>
                  <span style={{ color: "var(--muted-2)", fontSize: ".8rem" }}>
                    &nbsp;/ {r.max_score}
                  </span>
                </td>
                <td>
                  <Badge color={r.validated ? "var(--ok)" : "var(--danger)"}>
                    {r.validated ? "Validé" : "Non validé"}
                  </Badge>
                </td>
                <td style={{ color: "var(--muted)", fontSize: ".83rem", textAlign: "center" }}>
                  {r.attempts}
                </td>
                <td style={{ color: "var(--muted)", fontSize: ".78rem", whiteSpace: "nowrap" }}>
                  {r.passed_at
                    ? new Date(r.passed_at).toLocaleDateString("fr-FR")
                    : <span style={{ color: "var(--muted-2)" }}>—</span>}
                </td>
                <td>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      className="btn-sm"
                      variant="danger"
                      loading={resetting === r.id}
                      onClick={() => setResetTarget(r)}
                    >
                      Réinitialiser
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted)" }}>
                  Aucun résultat trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page} totalPages={totalPages} total={total}
          pageSize={pageSize} onPage={go} onPageSize={setPageSize}
        />
      </Card>

      {resetTarget && (
        <ConfirmModal
          title="Réinitialiser le quiz"
          message={`Remettre à zéro le résultat de ${resetTarget.user_name} pour « ${resetTarget.quiz_title} » ?`}
          withReason
          reasonLabel="Motif de la réinitialisation"
          confirmLabel="Réinitialiser"
          onClose={() => setResetTarget(null)}
          onConfirm={async (reason) => {
            await doReset(resetTarget, reason);
            setResetTarget(null);
          }}
        />
      )}
    </div>
  );
}
