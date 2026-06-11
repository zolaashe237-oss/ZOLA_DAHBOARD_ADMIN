"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  asList, downloadBlob,
  financeApi, financeApi2, transactionsApi,
} from "@/lib/endpoints";
import {
  MOCK_LATE_COTISATIONS,
  MOCK_MONTHLY_REVENUE,
  MOCK_PAYMENT_BREAKDOWN,
  MOCK_TRANSACTION_KPIS,
} from "@/lib/mocks";
import type {
  LateMember, MonthlyRevenue, PaymentBreakdown, TransactionKPIs,
} from "@/lib/types";
import { Alert, Button, Card, Input, Select, errorMessage } from "@/components/ui";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000).toLocaleString("fr-FR")} k`;
  return n.toLocaleString("fr-FR");
}

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return `M ${pts[0]?.[0] ?? 0},${pts[0]?.[1] ?? 0}`;
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

// ── KPI Tile ──────────────────────────────────────────────────────────────────

function KpiTile({ label, value, unit, sub, accent, trendPct, trendLabel }: {
  label: string; value: string; unit?: string; sub?: string;
  accent?: string; trendPct?: number; trendLabel?: string;
}) {
  const up = (trendPct ?? 0) >= 0;
  return (
    <div className="kpi-tile" style={{ "--tile-accent": accent ?? "var(--gold)" } as React.CSSProperties}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", flexWrap: "wrap" }}>
        <span>{value}</span>
        {unit && <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--muted)" }}>{unit}</span>}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {trendPct !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.3rem" }}>
          <span style={{
            fontSize: "0.70rem", fontWeight: 700,
            color: up ? "var(--ok)" : "var(--bad)",
            background: up ? "var(--ok-bg)" : "var(--bad-bg)",
            padding: "0.06rem 0.38rem", borderRadius: 99,
          }}>
            {up ? "↑" : "↓"} {Math.abs(trendPct).toFixed(1)} %
          </span>
          {trendLabel && <span style={{ fontSize: "0.67rem", color: "var(--muted-2)" }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

// ── Graphique courbe + aire (SVG) ─────────────────────────────────────────────

function LineAreaChart({ data }: { data: MonthlyRevenue[] }) {
  if (data.length < 2) return null;

  const W = 700, H = 210;
  const ML = 58, MR = 22, MT = 22, MB = 32;
  const PW = W - ML - MR;
  const PH = H - MT - MB;
  const max = Math.max(...data.map((d) => d.amount), 1);
  const avg = data.reduce((s, d) => s + d.amount, 0) / data.length;

  const px = (i: number) => ML + (i / (data.length - 1)) * PW;
  const py = (v: number) => MT + PH * (1 - v / max);

  const pts: [number, number][] = data.map((d, i) => [px(i), py(d.amount)]);
  const linePath = smoothPath(pts);
  const areaPath = `${linePath} L ${pts[pts.length - 1][0]},${MT + PH} L ${pts[0][0]},${MT + PH} Z`;

  // 5 niveaux de grille
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Revenus mensuels — 12 mois glissants</h2>
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.80rem" }}>
          <span style={{ color: "var(--muted)" }}>
            Total : <strong style={{ color: "var(--gold-2)" }}>
              {data.reduce((s, d) => s + d.amount, 0).toLocaleString("fr-FR")} FCFA
            </strong>
          </span>
          <span style={{ color: "var(--muted)" }}>
            Moy. : <strong style={{ color: "var(--ink)" }}>
              {Math.round(avg).toLocaleString("fr-FR")} FCFA
            </strong>
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <defs>
          <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#c9a227" stopOpacity="0.22" />
            <stop offset="88%" stopColor="#c9a227" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grille horizontale */}
        {gridLevels.map((r, i) => {
          const v = max * r;
          const y = py(v);
          return (
            <g key={i}>
              <line x1={ML} x2={W - MR} y1={y} y2={y}
                stroke="rgba(160,130,70,0.13)" strokeWidth="1" strokeDasharray="4 4" />
              <text x={ML - 6} y={y + 4} textAnchor="end"
                fontSize="9" fill="#9e8e74" fontFamily="Inter,sans-serif">
                {fmtShort(v)}
              </text>
            </g>
          );
        })}

        {/* Ligne moyenne */}
        <line x1={ML} x2={W - MR} y1={py(avg)} y2={py(avg)}
          stroke="#52b083" strokeWidth="1.2" strokeDasharray="5 3" strokeOpacity="0.55" />
        <text x={W - MR + 4} y={py(avg) + 4} fontSize="8" fill="#52b083" fontFamily="Inter,sans-serif">
          moy.
        </text>

        {/* Aire */}
        <path d={areaPath} fill="url(#finGrad)" />

        {/* Courbe */}
        <path d={linePath} fill="none" stroke="#c9a227" strokeWidth="2.8"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Points + étiquettes */}
        {pts.map(([cx, cy], i) => {
          const d = data[i];
          const isLast = i === data.length - 1;
          const isMax  = d.amount === max;
          const showLabel = isLast || isMax || i === 0;
          return (
            <g key={i}>
              {showLabel && (
                <text x={cx} y={cy - 9} textAnchor="middle"
                  fontSize="8.5" fontWeight={isLast ? "700" : "500"}
                  fill={isLast ? "#c9a227" : "#6b5c42"} fontFamily="Inter,sans-serif">
                  {fmtShort(d.amount)}
                </text>
              )}
              <circle cx={cx} cy={cy}
                r={isLast || isMax ? 5 : 3.5}
                fill={isLast ? "#c9a227" : "#fefcf4"}
                stroke="#c9a227" strokeWidth={isLast ? 0 : 2} />
              <text x={cx} y={H - 4} textAnchor="middle"
                fontSize="9" fontWeight={isLast ? "700" : "400"}
                fill={isLast ? "#c9a227" : "#9e8e74"} fontFamily="Inter,sans-serif">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </>
  );
}

// ── Diagramme donut répartition (SVG) ────────────────────────────────────────

function DonutChart({ data }: { data: PaymentBreakdown[] }) {
  if (data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.amount, 0);
  if (total === 0) return null;

  const R = 64, CX = 100, CY = 100;
  const C = 2 * Math.PI * R;

  let cumDash = 0;
  const segs = data.map((d) => {
    const dash   = (d.amount / total) * C;
    const offset = cumDash;
    cumDash += dash;
    return { ...d, dash, offset, pct: d.amount / total };
  });

  return (
    <>
      <h2 style={{ fontSize: "1rem", marginBottom: "1rem" }}>Répartition ce mois</h2>
      <div style={{ display: "flex", gap: "1.2rem", alignItems: "center" }}>
        {/* Donut SVG */}
        <div style={{ flexShrink: 0, width: 168 }}>
          <svg viewBox="0 0 200 200" style={{ width: "100%", display: "block" }}>
            {/* Fond */}
            <circle cx={CX} cy={CY} r={R} fill="none"
              stroke="rgba(160,130,70,0.11)" strokeWidth="26" />
            <g transform={`rotate(-90, ${CX}, ${CY})`}>
              {segs.map((s, i) => (
                <circle key={i} cx={CX} cy={CY} r={R}
                  fill="none" stroke={s.color} strokeWidth="25"
                  strokeDasharray={`${s.dash} ${C - s.dash}`}
                  strokeDashoffset={-s.offset} />
              ))}
            </g>
            {/* Centre */}
            <text x="100" y="95" textAnchor="middle"
              fontSize="15" fontWeight="800" fill="#2d2010" fontFamily="Inter,sans-serif">
              {fmtShort(total)}
            </text>
            <text x="100" y="112" textAnchor="middle"
              fontSize="8" fill="#9e8e74" fontFamily="Inter,sans-serif">
              FCFA ce mois
            </text>
          </svg>
        </div>

        {/* Légende + barres */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {segs.map((s) => (
            <div key={s.kind}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.24rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 500 }}>{s.label}</span>
                </div>
                <div style={{ display: "flex", gap: "0.55rem", alignItems: "baseline" }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--muted-2)" }}>{s.count} pmt.</span>
                  <span style={{ fontSize: "0.80rem", fontWeight: 700, color: "var(--ink)", minWidth: 68, textAlign: "right" }}>
                    {s.amount.toLocaleString("fr-FR")} F
                  </span>
                </div>
              </div>
              <div style={{ height: 4, background: "var(--bg-3)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${s.pct * 100}%`, background: s.color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Graphique barres comparaison (SVG) ────────────────────────────────────────

function BarCompareChart({ data }: { data: MonthlyRevenue[] }) {
  if (data.length < 2) return null;

  // 6 derniers mois comparés 2 à 2 (M-1 vs M)
  const recent = data.slice(-6);
  const W = 340, H = 140;
  const ML = 44, MR = 12, MT = 16, MB = 28;
  const PW = W - ML - MR;
  const PH = H - MT - MB;
  const max = Math.max(...recent.map((d) => d.amount), 1);
  const barW = (PW / recent.length) * 0.62;
  const gap  = (PW / recent.length) * 0.38 / 2;

  const gridLevels = [0.5, 1.0];

  return (
    <>
      <h2 style={{ fontSize: "1rem", marginBottom: "0.65rem" }}>Progression — 6 derniers mois</h2>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        {/* Grille */}
        {gridLevels.map((r, i) => {
          const y = MT + PH * (1 - r);
          return (
            <g key={i}>
              <line x1={ML} x2={W - MR} y1={y} y2={y}
                stroke="rgba(160,130,70,0.13)" strokeWidth="1" strokeDasharray="3 3" />
              <text x={ML - 5} y={y + 4} textAnchor="end"
                fontSize="8" fill="#9e8e74" fontFamily="Inter,sans-serif">
                {fmtShort(max * r)}
              </text>
            </g>
          );
        })}

        {/* Barres */}
        {recent.map((d, i) => {
          const h   = ((d.amount / max) * PH);
          const x   = ML + i * (PW / recent.length) + gap;
          const y   = MT + PH - h;
          const prev = recent[i - 1];
          const up   = !prev || d.amount >= prev.amount;
          const isLast = i === recent.length - 1;
          const color  = isLast ? "#c9a227" : up ? "#52b083" : "#9e8e74";

          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h}
                rx="3" fill={color} opacity={isLast ? 1 : 0.75} />
              {/* Valeur */}
              {isLast && (
                <text x={x + barW / 2} y={y - 5} textAnchor="middle"
                  fontSize="8" fontWeight="700" fill="#c9a227" fontFamily="Inter,sans-serif">
                  {fmtShort(d.amount)}
                </text>
              )}
              {/* Label mois */}
              <text x={x + barW / 2} y={H - 4} textAnchor="middle"
                fontSize="9" fontWeight={isLast ? "700" : "400"}
                fill={isLast ? "#c9a227" : "#9e8e74"} fontFamily="Inter,sans-serif">
                {d.label}
              </text>
              {/* Flèche tendance */}
              {prev && (
                <text x={x + barW / 2} y={y - 14} textAnchor="middle"
                  fontSize="9" fill={up ? "#2e9460" : "#c0402c"} fontFamily="Inter,sans-serif">
                  {up ? "↑" : "↓"}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </>
  );
}

// ── Cotisations en retard ─────────────────────────────────────────────────────

function LateCotisations({ items, onReminder }: {
  items: LateMember[]; onReminder: () => void;
}) {
  const totalDue = items.reduce((s, m) => s + m.amount_due, 0);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
        <h2 style={{ fontSize: "1rem" }}>
          Cotisations en retard
          {items.length > 0 && (
            <span style={{ marginLeft: "0.5rem", fontSize: "0.65rem", fontWeight: 700, color: "var(--warn)", background: "var(--warn-bg)", border: "1px solid rgba(154,110,16,0.25)", padding: "0.06rem 0.45rem", borderRadius: 99 }}>
              {items.length}
            </span>
          )}
        </h2>
        <Button variant="ghost" onClick={onReminder} style={{ fontSize: "0.78rem", padding: "0.32rem 0.7rem" }}>
          Envoyer relances
        </Button>
      </div>

      {items.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "0.88rem", padding: "0.5rem 0" }}>
          ✓ Aucun retard — tout est à jour !
        </p>
      ) : (
        <>
          <table className="tbl">
            <thead>
              <tr>
                <th>Membre</th>
                <th style={{ textAlign: "center" }}>Retard</th>
                <th style={{ textAlign: "right" }}>Montant dû</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: "0.855rem", color: "var(--gold-2)" }}>{m.full_name}</div>
                    <div style={{ color: "var(--muted-2)", fontSize: "0.76rem" }}>{m.email}</div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{
                      fontSize: "0.68rem", fontWeight: 700, borderRadius: 99,
                      color: m.months_late >= 3 ? "var(--bad)" : "var(--warn)",
                      background: m.months_late >= 3 ? "var(--bad-bg)" : "var(--warn-bg)",
                      border: `1px solid ${m.months_late >= 3 ? "rgba(192,64,44,0.28)" : "rgba(154,110,16,0.25)"}`,
                      padding: "0.05rem 0.45rem",
                    }}>
                      {m.months_late} mois
                    </span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontSize: "0.875rem", color: "var(--cream)" }}>
                    {m.amount_due.toLocaleString("fr-FR")} F
                  </td>
                  <td>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <Link href={`/membres/${m.id}`}>
                        <Button variant="ghost" style={{ fontSize: "0.74rem", padding: "0.26rem 0.58rem" }}>
                          Fiche
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{
            marginTop: "0.65rem", padding: "0.5rem 0.75rem",
            background: "var(--bad-bg)", border: "1px solid rgba(192,64,44,0.22)",
            borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "0.78rem", color: "var(--bad)" }}>Total dû</span>
            <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--bad)" }}>
              {totalDue.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
        </>
      )}
    </>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function FinancePage() {
  const [error,     setError]     = useState("");
  const [info,      setInfo]      = useState("");
  const [revenue,   setRevenue]   = useState<MonthlyRevenue[]>(MOCK_MONTHLY_REVENUE);
  const [late,      setLate]      = useState<LateMember[]>(MOCK_LATE_COTISATIONS);
  const [breakdown, setBreakdown] = useState<PaymentBreakdown[]>(MOCK_PAYMENT_BREAKDOWN);
  const [kpis,      setKpis]      = useState<TransactionKPIs>(MOCK_TRANSACTION_KPIS);

  const [manual, setManual] = useState({ user_id: "", kind: "COTISATION", reason: "" });

  const wrap = async (fn: () => Promise<unknown>, ok: string) => {
    setError(""); setInfo("");
    try { await fn(); setInfo(ok); } catch (e) { setError(errorMessage(e)); }
  };

  const load = useCallback(async () => {
    const [revRes, lateRes, bdRes, kpisRes] = await Promise.allSettled([
      financeApi2.monthlyRevenue(),
      financeApi2.lateCotisations(),
      financeApi2.paymentBreakdown(),
      transactionsApi.kpis(),
    ]);
    if (revRes.status  === "fulfilled" && revRes.value.data.length > 0)
      setRevenue(revRes.value.data);
    if (lateRes.status === "fulfilled") {
      const list = asList(lateRes.value.data);
      if (list.length > 0) setLate(list);
    }
    if (bdRes.status   === "fulfilled" && bdRes.value.data.length > 0)
      setBreakdown(bdRes.value.data);
    if (kpisRes.status === "fulfilled")
      setKpis(kpisRes.value.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Métriques dérivées
  const revenueMonth  = revenue.at(-1)?.amount ?? 0;
  const revenuePrev   = revenue.at(-2)?.amount ?? 0;
  const revenueYear   = revenue.reduce((s, d) => s + d.amount, 0);
  const growthPct     = revenuePrev > 0 ? ((revenueMonth - revenuePrev) / revenuePrev) * 100 : 0;
  const lateAmount    = late.reduce((s, m) => s + m.amount_due, 0);
  const cotisantsCount = breakdown.find((b) => b.kind === "COTISATION")?.count ?? 0;

  return (
    <div className="fade-up">
      <div className="page-header">
        <div className="eyebrow">Administration financière</div>
        <h1>Finance</h1>
        <p>Tableau de bord — revenus, cotisations et paiements manuels.</p>
      </div>

      <Alert>{error}</Alert>
      {info && <Alert kind="success">{info}</Alert>}

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <KpiTile
          label="Revenus ce mois"
          value={fmtShort(revenueMonth)}
          unit="FCFA"
          trendPct={growthPct}
          trendLabel="vs mois préc."
          accent="#c9a227"
        />
        <KpiTile
          label="Revenus 12 mois"
          value={fmtShort(revenueYear)}
          unit="FCFA"
          sub="12 mois glissants"
          accent="#5b8fd4"
        />
        <KpiTile
          label="Cotisants ce mois"
          value={String(cotisantsCount)}
          sub="paiements cotisation"
          accent="#52b083"
        />
        <KpiTile
          label="En attente"
          value={String(kpis.count_pending)}
          sub={`${kpis.count_failed} échoué${kpis.count_failed !== 1 ? "s" : ""}`}
          accent="#9a6e10"
        />
        <KpiTile
          label="Retards"
          value={String(late.length)}
          sub={late.length > 0 ? `${lateAmount.toLocaleString("fr-FR")} FCFA dûs` : "Tout à jour ✓"}
          accent={late.length > 0 ? "#c0402c" : "#2e9460"}
        />
      </div>

      {/* ── Courbe revenus 12 mois ────────────────────────────────────────── */}
      <Card style={{ marginBottom: "1.25rem" }}>
        <LineAreaChart data={revenue} />
      </Card>

      {/* ── Donut + Barres ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
        <Card>
          <DonutChart data={breakdown} />
        </Card>
        <Card>
          <BarCompareChart data={revenue} />
        </Card>
      </div>

      {/* ── Cotisations en retard ─────────────────────────────────────────── */}
      <Card style={{ marginBottom: "1.25rem" }}>
        <LateCotisations
          items={late}
          onReminder={() => wrap(() => financeApi.sendReminders(), "Relances envoyées !")}
        />
      </Card>

      {/* ── Paiement manuel + Exports ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        <Card>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.85rem" }}>Paiement manuel</h2>
          <Input label="ID membre" value={manual.user_id}
            onChange={(e) => setManual({ ...manual, user_id: e.target.value })} />
          <Select label="Type" value={manual.kind}
            onChange={(e) => setManual({ ...manual, kind: e.target.value })}>
            <option value="INSCRIPTION">Droit d&apos;inscription</option>
            <option value="COTISATION">Cotisation mensuelle</option>
            <option value="DON">Don volontaire</option>
          </Select>
          <Input label="Motif" value={manual.reason}
            onChange={(e) => setManual({ ...manual, reason: e.target.value })} />
          <Button
            onClick={() => wrap(
              () => financeApi.manual({ user_id: Number(manual.user_id), kind: manual.kind, reason: manual.reason }),
              "Paiement enregistré.",
            )}
          >
            Valider le paiement
          </Button>
        </Card>

        <Card>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.85rem" }}>Exports</h2>
          <p style={{ fontSize: "0.83rem", color: "var(--muted)", marginBottom: "0.85rem", lineHeight: 1.6 }}>
            Téléchargez les données membres et paiements au format CSV pour import comptable ou suivi externe.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", alignItems: "flex-start" }}>
            <Button variant="ghost" onClick={() => wrap(
              async () => downloadBlob((await financeApi.exportMembers()).data as Blob, "membres.csv"),
              "Export membres téléchargé.",
            )}>
              ⬇ Export membres (CSV)
            </Button>
            <Button variant="ghost" onClick={() => wrap(
              async () => downloadBlob((await financeApi.exportPayments()).data as Blob, "paiements.csv"),
              "Export paiements téléchargé.",
            )}>
              ⬇ Export paiements (CSV)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
