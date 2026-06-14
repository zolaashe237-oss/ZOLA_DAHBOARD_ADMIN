"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { financeApi, membersApi } from "@/lib/endpoints";
import { getMockMemberDetail } from "@/lib/mocks";
import type { MemberDetail } from "@/lib/types";
import { Alert, Badge, Button, Card, Input, Select, errorMessage } from "@/components/ui";
import { ConfirmModal, Modal } from "@/components/Modal";

// ── Constantes ────────────────────────────────────────────────────────────────

const BRANCH_CFG: Record<string, { color: string; label: string; icon: string; desc: string }> = {
  MEMBRE: { color: "#c9a227", label: "Espace Membre",  icon: "◉", desc: "Accès général à la plateforme" },
  FEMME:  { color: "#b5532a", label: "Branche Femme",  icon: "♀", desc: "Contenus & cercle féminin" },
  ENFANT: { color: "#52b083", label: "Branche Enfant", icon: "◈", desc: "Ressources pour les enfants" },
};

const STATUS_COLOR: Record<string, string> = {
  ACTIF: "var(--ok)", RESTREINT: "var(--warn)", BLOQUE: "var(--danger)",
};
const STATUS_LABEL: Record<string, string> = {
  ACTIF: "Actif", RESTREINT: "Restreint", BLOQUE: "Bloqué",
};

const PAY_COLOR: Record<string, string> = {
  REUSSI: "var(--ok)", EN_ATTENTE: "var(--warn)", ECHOUE: "var(--danger)",
  REMBOURSE: "var(--muted)", EXONERE: "var(--muted-2)",
};
const PAY_LABEL: Record<string, string> = {
  REUSSI: "Réussi", EN_ATTENTE: "En attente", ECHOUE: "Échoué",
  REMBOURSE: "Remboursé", EXONERE: "Exonéré",
};

const BILLING_LABEL: Record<string, string> = {
  ANNUEL: "Annuel", TRANCHES: "Par tranches", MENSUEL: "Mensuel",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtAmt(n: number) { return n.toLocaleString("fr-FR") + " FCFA"; }

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 72 }: { name: string; size?: number }) {
  const p = name.trim().split(" ");
  const ini = ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #c9a227, #b5532a)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.38) + "px", fontWeight: 800, color: "#fff",
    }}>
      {ini}
    </div>
  );
}

// ── Barre de progression ──────────────────────────────────────────────────────

function ProgressBar({ pct, color = "var(--gold)", height = 6 }: {
  pct: number; color?: string; height?: number;
}) {
  return (
    <div style={{ background: "var(--line-soft)", borderRadius: 99, height, overflow: "hidden", flex: 1 }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%",
        background: color, borderRadius: 99, transition: "width .5s",
      }} />
    </div>
  );
}

// ── Modal — Modifier le profil ────────────────────────────────────────────────

function EditProfileModal({ member, onClose, onSaved }: {
  member: MemberDetail; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    full_name: member.full_name,
    email:     member.email,
    phone:     member.phone ?? "",
    country:   member.country ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      await membersApi.update(member.id, {
        full_name: form.full_name,
        email:     form.email,
        phone:     form.phone || null,
        country:   form.country || null,
      });
      onSaved(); onClose();
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Modifier le profil" onClose={onClose} maxWidth={440}>
      <Alert>{error}</Alert>
      <form onSubmit={submit}>
        <Input label="Nom complet" value={form.full_name} required
          onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <Input label="Adresse email" type="email" value={form.email} required
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Téléphone" value={form.phone} placeholder="+229 97 12 34 56"
          onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label="Pays" value={form.country} placeholder="Bénin"
          onChange={(e) => setForm({ ...form, country: e.target.value })} />
        <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
          <Button variant="ghost" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal — Modifier les accès branches ──────────────────────────────────────

function EditBranchesModal({ member, onClose, onSaved }: {
  member: MemberDetail; onClose: () => void; onSaved: () => void;
}) {
  const [levels,  setLevels]  = useState<string[]>(member.access_levels ?? []);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const toggle = (l: string) =>
    setLevels((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      await membersApi.update(member.id, { access_levels: levels });
      onSaved(); onClose();
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Modifier les accès" onClose={onClose} maxWidth={420}>
      <Alert>{error}</Alert>
      <p style={{ fontSize: ".85rem", color: "var(--muted)", marginBottom: "1.2rem" }}>
        Cochez les branches auxquelles ce membre doit avoir accès.
      </p>
      <form onSubmit={submit}>
        <div style={{ display: "flex", flexDirection: "column", gap: ".85rem", marginBottom: "1.4rem" }}>
          {Object.entries(BRANCH_CFG).map(([key, cfg]) => (
            <label key={key} style={{
              display: "flex", gap: "0.75rem", alignItems: "flex-start", cursor: "pointer",
              padding: "0.7rem 0.85rem", borderRadius: "var(--radius-sm)",
              border: `1px solid ${levels.includes(key) ? cfg.color + "55" : "var(--line-soft)"}`,
              background: levels.includes(key) ? `${cfg.color}08` : "transparent",
              transition: "all .15s",
            }}>
              <input type="checkbox" checked={levels.includes(key)} onChange={() => toggle(key)}
                style={{ marginTop: "0.1rem", accentColor: cfg.color }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: ".9rem", color: levels.includes(key) ? cfg.color : "var(--cream)" }}>
                  {cfg.icon} {cfg.label}
                </div>
                <div style={{ fontSize: ".77rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                  {cfg.desc}
                </div>
              </div>
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
          <Button variant="ghost" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal — Paiement manuel ───────────────────────────────────────────────────

function ManualPaymentModal({ memberId, memberName, onClose, onDone }: {
  memberId: number; memberName: string; onClose: () => void; onDone: () => void;
}) {
  const [form, setForm] = useState({ kind: "COTISATION", amount: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      await (financeApi as any).manual({
        user_id: memberId,
        kind:    form.kind,
        amount:  form.amount ? Number(form.amount) : undefined,
        reason:  form.reason,
      });
      onDone(); onClose();
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Valider un paiement manuel" onClose={onClose} maxWidth={430}>
      <Alert>{error}</Alert>
      <div style={{ marginBottom: "0.85rem", padding: "0.55rem 0.75rem", background: "var(--bg-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--line-soft)", fontSize: ".84rem", color: "var(--muted)" }}>
        Membre : <strong style={{ color: "var(--ink)" }}>{memberName}</strong>
      </div>
      <form onSubmit={submit}>
        <Select label="Type de paiement" value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          <option value="COTISATION">Cotisation mensuelle</option>
          <option value="INSCRIPTION">Droit d&apos;inscription</option>
          <option value="DON">Don volontaire</option>
        </Select>
        <Input label="Montant (FCFA)" type="number" min={0} value={form.amount}
          placeholder="ex : 2000"
          onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Input label="Motif" value={form.reason} required
          placeholder="Paiement espèces — juin 2026"
          onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
          <Button variant="ghost" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>Confirmer</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = Number(params.id);

  const [member,       setMember]       = useState<MemberDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [info,         setInfo]         = useState("");
  const [busy,         setBusy]         = useState("");

  const [showBlockDlg,    setShowBlockDlg]    = useState(false);
  const [showWarnDlg,     setShowWarnDlg]     = useState(false);
  const [showResetDlg,    setShowResetDlg]    = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditBranch,  setShowEditBranch]  = useState(false);
  const [showPayment,     setShowPayment]     = useState(false);
  const [showDeleteDlg,   setShowDeleteDlg]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await membersApi.detail(userId);
      setMember(data);
    } catch {
      setMember(getMockMemberDetail(userId));
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const unblock = async () => {
    setBusy("unblock"); setError(""); setInfo("");
    try { await membersApi.unblock(userId); setInfo("Membre débloqué."); await load(); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(""); }
  };

  if (loading) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Chargement…</div>
  );
  if (!member) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Membre introuvable.</div>
  );

  const statusColor = STATUS_COLOR[member.status] ?? "var(--muted)";

  return (
    <div className="fade-up">
      {/* Retour */}
      <button onClick={() => router.back()} style={{
        background: "none", border: "none", color: "var(--muted)", cursor: "pointer",
        fontSize: ".83rem", padding: "0 0 1.1rem", display: "flex", alignItems: "center", gap: ".35rem",
      }}>
        ← Retour aux membres
      </button>

      <Alert>{error}</Alert>
      {info && <Alert kind="success">{info}</Alert>}

      {/* ── En-tête membre ── */}
      <Card style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", flexWrap: "wrap" }}>
          <Avatar name={member.full_name} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".6rem", flexWrap: "wrap", marginBottom: ".35rem" }}>
              <h1 style={{ fontSize: "1.25rem", margin: 0 }}>{member.full_name}</h1>
              <Badge color={statusColor}>{STATUS_LABEL[member.status] ?? member.status}</Badge>
              {member.nb_warnings > 0 && (
                <Badge color={member.nb_warnings >= 3 ? "var(--danger)" : "var(--warn)"}>
                  ⚠ {member.nb_warnings} avertissement{member.nb_warnings > 1 ? "s" : ""}
                </Badge>
              )}
              {!member.email_verified && (
                <Badge color="var(--muted)">Email non vérifié</Badge>
              )}
            </div>
            <div style={{ fontSize: ".88rem", color: "var(--muted-2)", marginBottom: ".7rem" }}>
              {member.email}
            </div>
            {/* Branches actives */}
            <div style={{ display: "flex", gap: ".45rem", flexWrap: "wrap" }}>
              {(member.access_levels ?? []).length === 0 ? (
                <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>Aucune branche active</span>
              ) : (member.access_levels ?? []).map((l) => {
                const cfg = BRANCH_CFG[l];
                if (!cfg) return null;
                return (
                  <span key={l} style={{
                    display: "inline-flex", alignItems: "center", gap: ".3rem",
                    fontSize: ".76rem", fontWeight: 700, borderRadius: 99, padding: ".18rem .6rem",
                    color: cfg.color, background: `${cfg.color}13`,
                    border: `1px solid ${cfg.color}30`,
                  }}>
                    {cfg.icon} {cfg.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", alignSelf: "flex-start" }}>
            <Button style={{ fontSize: ".78rem", padding: ".3rem .65rem" }} variant="ghost"
              onClick={() => setShowEditProfile(true)}>
              ✎ Profil
            </Button>
            <Button style={{ fontSize: ".78rem", padding: ".3rem .65rem" }} variant="ghost"
              onClick={() => setShowEditBranch(true)}>
              ⊕ Branches
            </Button>
            <Button style={{ fontSize: ".78rem", padding: ".3rem .65rem" }} variant="ghost"
              onClick={() => setShowPayment(true)}>
              + Paiement
            </Button>
            <Button style={{ fontSize: ".78rem", padding: ".3rem .65rem" }} variant="ghost"
              onClick={() => setShowWarnDlg(true)}>
              ⚑ Avertir
            </Button>
            <Button style={{ fontSize: ".78rem", padding: ".3rem .65rem" }} variant="ghost"
              onClick={() => setShowResetDlg(true)}>
              🔑 MDP
            </Button>
            {member.status === "BLOQUE" ? (
              <Button style={{ fontSize: ".78rem", padding: ".3rem .65rem" }}
                loading={busy === "unblock"} onClick={unblock}>
                Débloquer
              </Button>
            ) : (
              <Button style={{ fontSize: ".78rem", padding: ".3rem .65rem" }} variant="danger"
                onClick={() => setShowBlockDlg(true)}>
                Bloquer
              </Button>
            )}
            <Button style={{ fontSize: ".78rem", padding: ".3rem .65rem" }} variant="danger"
              onClick={() => setShowDeleteDlg(true)}>
              🗑 RGPD
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Infos + Abonnements ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        {/* Informations personnelles */}
        <Card>
          <h2 style={{ fontSize: "1rem", marginBottom: ".9rem" }}>Informations</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".84rem" }}>
            <tbody>
              {([
                ["Rôle",               member.role],
                ["Pays",               member.country ?? "—"],
                ["Téléphone",          member.phone ?? "—"],
                ["Inscrit le",         fmt(member.created_at)],
                ["Dernière connexion",  fmt(member.last_login)],
                ["Statut changé le",   fmt(member.status_changed_at)],
              ] as [string, string][]).map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: ".45rem .2rem", color: "var(--muted)", width: "50%" }}>{label}</td>
                  <td style={{ padding: ".45rem .2rem", color: "var(--cream)" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Abonnements */}
        <Card>
          <h2 style={{ fontSize: "1rem", marginBottom: ".9rem" }}>Abonnements</h2>
          {member.subscriptions.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>Aucun abonnement.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              {member.subscriptions.map((s) => (
                <div key={s.id} style={{
                  padding: ".6rem .75rem", borderRadius: "var(--radius-sm)",
                  border: `1px solid ${s.active ? "var(--gold-2)22" : "var(--line-soft)"}`,
                  background: s.active ? "var(--gold-bg)" : "transparent",
                  opacity: s.active ? 1 : 0.65,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".3rem" }}>
                    <span style={{ fontWeight: 700, fontSize: ".85rem", color: s.active ? "var(--gold-2)" : "var(--muted)" }}>
                      {s.type}
                    </span>
                    <div style={{ display: "flex", gap: ".35rem" }}>
                      {s.billing && (
                        <Badge color="var(--muted-2)">{BILLING_LABEL[s.billing] ?? s.billing}</Badge>
                      )}
                      <Badge color={s.active ? "var(--ok)" : "var(--muted)"}>
                        {s.active ? "Actif" : "Expiré"}
                      </Badge>
                    </div>
                  </div>
                  <div style={{ fontSize: ".77rem", color: "var(--muted)" }}>
                    {fmt(s.start)} → {s.end ? fmt(s.end) : "∞"}
                  </div>
                  {/* Barre de tranches */}
                  {s.billing === "TRANCHES" && s.tranches_total != null && (
                    <div style={{ marginTop: ".5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".72rem", color: "var(--muted)", marginBottom: ".3rem" }}>
                        <span>Tranches payées</span>
                        <strong style={{ color: "var(--gold-2)" }}>
                          {s.tranches_paid ?? 0} / {s.tranches_total}
                        </strong>
                      </div>
                      <ProgressBar pct={((s.tranches_paid ?? 0) / s.tranches_total) * 100} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Branches actives (cartes visuelles) ── */}
      {(member.access_levels ?? []).length > 0 && (
        <Card style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: ".9rem" }}>Accès actifs</h2>
          <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
            {(member.access_levels ?? []).map((l) => {
              const cfg = BRANCH_CFG[l];
              if (!cfg) return null;
              return (
                <div key={l} style={{
                  flex: "1 1 160px", padding: "1rem 1.1rem", borderRadius: "var(--radius-sm)",
                  border: `1px solid ${cfg.color}30`, background: `${cfg.color}08`,
                  display: "flex", flexDirection: "column", gap: ".3rem",
                }}>
                  <span style={{ fontSize: "1.5rem" }}>{cfg.icon}</span>
                  <strong style={{ fontSize: ".9rem", color: cfg.color }}>{cfg.label}</strong>
                  <span style={{ fontSize: ".76rem", color: "var(--muted)" }}>{cfg.desc}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Progression formations ── */}
      {(member.formations_progress ?? []).length > 0 && (
        <Card style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: ".9rem" }}>
            Progression des formations
            <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: ".82rem", marginLeft: ".5rem" }}>
              ({member.formations_progress!.length} formation{member.formations_progress!.length > 1 ? "s" : ""})
            </span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
            {member.formations_progress!.map((fp) => (
              <div key={fp.formation_id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".35rem" }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: ".88rem" }}>{fp.formation_title}</span>
                    {fp.completed && (
                      <span style={{ marginLeft: ".5rem" }}>
                        <Badge color="var(--ok)">Terminée</Badge>
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: ".75rem", alignItems: "center", fontSize: ".78rem", color: "var(--muted-2)" }}>
                    <span>{fp.modules_completed}/{fp.modules_total} modules</span>
                    {fp.quiz_score != null && (
                      <span>Quiz : <strong style={{ color: fp.quiz_score >= 14 ? "var(--ok)" : "var(--warn)" }}>
                        {fp.quiz_score}/20
                      </strong></span>
                    )}
                    <strong style={{ color: "var(--gold-2)" }}>{fp.progress_pct}%</strong>
                  </div>
                </div>
                <ProgressBar
                  pct={fp.progress_pct}
                  color={fp.completed ? "var(--ok)" : "var(--gold)"}
                  height={7}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Historique des paiements ── */}
      <Card style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".9rem" }}>
          <h2 style={{ fontSize: "1rem", margin: 0 }}>
            Historique des paiements
            <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: ".82rem", marginLeft: ".5rem" }}>
              ({member.payments.length} transaction{member.payments.length !== 1 ? "s" : ""})
            </span>
          </h2>
          <Button style={{ fontSize: ".76rem", padding: ".28rem .6rem" }} variant="ghost"
            onClick={() => setShowPayment(true)}>
            + Ajouter
          </Button>
        </div>
        {member.payments.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>Aucun paiement enregistré.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Type</th>
                <th>Statut</th>
                <th style={{ textAlign: "right" }}>Montant</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {member.payments.map((p) => (
                <tr key={p.id}>
                  <td style={{ color: "var(--muted-2)", fontSize: ".78rem" }}>#{p.id}</td>
                  <td style={{ fontSize: ".83rem" }}>{p.type}</td>
                  <td>
                    <Badge color={PAY_COLOR[p.status] ?? "var(--muted)"}>
                      {PAY_LABEL[p.status] ?? p.status}
                    </Badge>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontSize: ".88rem" }}>
                    {p.amount === 0 ? <span style={{ color: "var(--muted)" }}>—</span> : fmtAmt(p.amount)}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: ".83rem" }}>{fmt(p.paid_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Quiz résultats ── */}
      {member.quiz_results.length > 0 && (
        <Card>
          <h2 style={{ fontSize: "1rem", marginBottom: ".9rem" }}>
            Résultats quiz
            <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: ".82rem", marginLeft: ".5rem" }}>
              ({member.quiz_results.length} quiz passé{member.quiz_results.length !== 1 ? "s" : ""})
            </span>
          </h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>Formation / Quiz</th>
                <th style={{ textAlign: "right" }}>Score</th>
                <th>Résultat</th>
              </tr>
            </thead>
            <tbody>
              {member.quiz_results.map((r) => (
                <tr key={r.quiz}>
                  <td style={{ fontSize: ".88rem" }}>{r.title}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>
                    <span style={{ color: r.score >= 14 ? "var(--ok)" : r.score >= 10 ? "var(--warn)" : "var(--danger)" }}>
                      {r.score}
                    </span>
                    <span style={{ color: "var(--muted)", fontWeight: 400 }}>/20</span>
                  </td>
                  <td>
                    <Badge color={r.validated ? "var(--ok)" : "var(--danger)"}>
                      {r.validated ? "Validé" : "Non validé"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Modales ── */}

      {showEditProfile && (
        <EditProfileModal member={member}
          onClose={() => setShowEditProfile(false)}
          onSaved={() => { setInfo("Profil mis à jour."); load(); }} />
      )}

      {showEditBranch && (
        <EditBranchesModal member={member}
          onClose={() => setShowEditBranch(false)}
          onSaved={() => { setInfo("Accès branches mis à jour."); load(); }} />
      )}

      {showPayment && (
        <ManualPaymentModal memberId={userId} memberName={member.full_name}
          onClose={() => setShowPayment(false)}
          onDone={() => { setInfo("Paiement enregistré."); load(); }} />
      )}

      {showBlockDlg && (
        <ConfirmModal
          title={`Bloquer ${member.full_name}`}
          message="Le membre ne pourra plus se connecter ni accéder au contenu."
          withReason reasonLabel="Motif du blocage" confirmLabel="Bloquer"
          onClose={() => setShowBlockDlg(false)}
          onConfirm={async (reason) => {
            await membersApi.block(userId, reason);
            setInfo("Membre bloqué."); setShowBlockDlg(false); await load();
          }}
        />
      )}

      {showWarnDlg && (
        <ConfirmModal
          title={`Avertir ${member.full_name}`}
          message="Un avertissement officiel sera enregistré sur son profil."
          withReason reasonLabel="Motif de l'avertissement" confirmLabel="Avertir"
          variant="primary"
          onClose={() => setShowWarnDlg(false)}
          onConfirm={async (reason) => {
            const { data } = await membersApi.warn(userId, reason);
            let msg = `Avertissement envoyé. Total : ${data.nb_warnings}.`;
            if (data.recidive_alert) {
              msg += " ⚠ Alerte récidive : ce membre a atteint 3 avertissements ou plus.";
            }
            setInfo(msg);
            setShowWarnDlg(false); await load();
          }}
        />
      )}

      {showResetDlg && (
        <ConfirmModal
          title="Réinitialiser le mot de passe"
          message={`Un mot de passe temporaire sera généré pour ${member.full_name}. Communiquez-le lui en privé.`}
          confirmLabel="Réinitialiser" variant="primary"
          onClose={() => setShowResetDlg(false)}
          onConfirm={async () => {
            const { data } = await membersApi.resetPassword(userId);
            setInfo(`MDP temporaire : ${data.temp_password}`);
            setShowResetDlg(false);
          }}
        />
      )}

      {showDeleteDlg && (
        <ConfirmModal
          title={`Purge RGPD - ${member.full_name}`}
          message="Cette action anonymisera définitivement les données personnelles du membre conformément au RGPD. Les paiements et résultats de quiz seront préservés de façon anonyme."
          confirmLabel="Anonymiser le compte" variant="danger"
          onClose={() => setShowDeleteDlg(false)}
          onConfirm={async () => {
            await membersApi.delete(userId);
            setShowDeleteDlg(false);
            router.push("/membres");
          }}
        />
      )}
    </div>
  );
}
