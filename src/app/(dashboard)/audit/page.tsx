"use client";

import { useCallback, useEffect, useState } from "react";

import { auditApi } from "@/lib/endpoints";
import { MOCK_AUDIT_ENTRIES } from "@/lib/mocks";
import type { AuditEntry } from "@/lib/types";
import { Alert, Badge, Button, Card, Pagination, errorMessage, usePagination } from "@/components/ui";

// ── Constantes ────────────────────────────────────────────────────────────────

const ACTION_COLOR: Record<string, string> = {
  MEMBER_BLOCK:      "var(--danger)",
  MEMBER_WARN:       "var(--warn)",
  MEMBER_UNBLOCK:    "var(--ok)",
  MEMBER_CREATE:     "#5b8fd4",
  CONTENT_REMOVE:    "#b5532a",
  PAYMENT_EXONERATE: "#7d7264",
  PAYMENT_MANUAL:    "#c9a227",
  QUIZ_RESET:        "var(--gold)",
  FORMATION_PUBLISH: "var(--ok)",
  ADMIN_CREATE:      "#5b8fd4",
  ADMIN_DEACTIVATE:  "var(--danger)",
};

const ACTION_LABEL: Record<string, string> = {
  MEMBER_BLOCK:      "Blocage membre",
  MEMBER_WARN:       "Avertissement",
  MEMBER_UNBLOCK:    "Déblocage membre",
  MEMBER_CREATE:     "Création membre",
  CONTENT_REMOVE:    "Suppression contenu",
  PAYMENT_EXONERATE: "Exonération",
  PAYMENT_MANUAL:    "Paiement manuel",
  QUIZ_RESET:        "Reset quiz",
  FORMATION_PUBLISH: "Publication formation",
  ADMIN_CREATE:      "Création admin",
  ADMIN_DEACTIVATE:  "Désactivation admin",
};

const KNOWN_ACTIONS = Object.keys(ACTION_LABEL);

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [entries,    setEntries]    = useState<AuditEntry[]>(MOCK_AUDIT_ENTRIES);
  const [filterAction, setFilterAction] = useState("");
  const [filterFrom,   setFilterFrom]   = useState("");
  const [filterTo,     setFilterTo]     = useState("");
  const [error,        setError]        = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const { data } = await auditApi.list({ action: filterAction || undefined });
      const list = Array.isArray(data) ? data : (data as { results: AuditEntry[] }).results ?? [];
      if (list.length > 0) setEntries(list);
    } catch (e) { setError(errorMessage(e)); }
  }, [filterAction]);

  useEffect(() => { load(); }, [load]);

  // ── Filtrage local (dates + action) ──────────────────────────────────────

  const filtered = entries.filter((e) => {
    if (filterAction && !e.action.toUpperCase().includes(filterAction.toUpperCase())) return false;
    if (filterFrom) {
      const from = new Date(filterFrom).getTime();
      if (new Date(e.created_at).getTime() < from) return false;
    }
    if (filterTo) {
      const to = new Date(filterTo).getTime() + 86_400_000; // inclure la journée
      if (new Date(e.created_at).getTime() > to) return false;
    }
    return true;
  });

  const filterKey = `${filterAction}|${filterFrom}|${filterTo}`;
  const { page, totalPages, paged, total, pageSize, setPageSize, go } =
    usePagination(filtered, 20, filterKey);

  const hasFilters = !!(filterAction || filterFrom || filterTo);
  const resetFilters = () => { setFilterAction(""); setFilterFrom(""); setFilterTo(""); };

  const fmtDate = (s: string) =>
    new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="fade-up">
      {/* Header */}
      <div className="page-header">
        <div className="eyebrow">Sécurité</div>
        <h1>Journal d&apos;audit</h1>
        <p>
          Toutes les actions administratives tracées sur la plateforme.{" "}
          <strong>{total}</strong> entrée{total !== 1 ? "s" : ""}
          {hasFilters && <span style={{ color: "var(--muted)" }}> (filtrées)</span>}.
        </p>
      </div>

      <Alert>{error}</Alert>

      {/* Filtres */}
      <Card style={{ padding: "0.85rem 1.1rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "flex-end" }}>

          {/* Action — select parmi les actions connues */}
          <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: "0 1 220px" }}>
            <span className="field-label">Type d&apos;action</span>
            <select className="select" value={filterAction} style={{ margin: 0 }}
              onChange={(e) => setFilterAction(e.target.value)}>
              <option value="">Toutes les actions</option>
              {KNOWN_ACTIONS.map((a) => (
                <option key={a} value={a}>{ACTION_LABEL[a] ?? a}</option>
              ))}
            </select>
          </label>

          {/* Date de début */}
          <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: "0 1 150px" }}>
            <span className="field-label">Du</span>
            <input type="date" className="input" value={filterFrom} style={{ margin: 0 }}
              onChange={(e) => setFilterFrom(e.target.value)} />
          </label>

          {/* Date de fin */}
          <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: "0 1 150px" }}>
            <span className="field-label">Au</span>
            <input type="date" className="input" value={filterTo} style={{ margin: 0 }}
              onChange={(e) => setFilterTo(e.target.value)} />
          </label>

          {hasFilters && (
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
            </div>
          )}
        </div>
      </Card>

      {/* Tableau */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ width: "100%", minWidth: 680 }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>Date</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Cible</th>
                <th>Motif</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((a) => (
                <tr key={a.id}>
                  {/* Date */}
                  <td style={{ whiteSpace: "nowrap", color: "var(--muted)", fontSize: "0.80rem" }}>
                    {fmtDate(a.created_at)}
                  </td>

                  {/* Acteur */}
                  <td style={{ fontSize: "0.83rem", color: "var(--muted-2)" }}>
                    {a.actor_email ?? <span style={{ color: "var(--muted-2)", fontStyle: "italic" }}>système</span>}
                  </td>

                  {/* Action */}
                  <td>
                    <Badge color={ACTION_COLOR[a.action] ?? "var(--muted-2)"}>
                      {ACTION_LABEL[a.action] ?? a.action}
                    </Badge>
                  </td>

                  {/* Cible */}
                  <td style={{ whiteSpace: "nowrap" }}>
                    {a.target_type ? (
                      <span style={{
                        fontSize: "0.78rem", fontFamily: "monospace",
                        color: "var(--muted-2)", background: "var(--bg-2)",
                        padding: "0.1rem 0.4rem", borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--line-soft)",
                      }}>
                        {a.target_type} #{a.target_id}
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted-2)" }}>—</span>
                    )}
                  </td>

                  {/* Motif */}
                  <td style={{ fontSize: "0.83rem", color: "var(--muted)", maxWidth: 300 }}>
                    {a.reason || <span style={{ color: "var(--muted-2)", fontStyle: "italic" }}>—</span>}
                  </td>
                </tr>
              ))}

              {paged.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted)" }}>
                    Aucune entrée trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total}
          pageSize={pageSize} onPage={go} onPageSize={setPageSize} />
      </Card>
    </div>
  );
}
