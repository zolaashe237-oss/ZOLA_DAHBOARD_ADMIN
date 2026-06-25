"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { asList, formationApi } from "@/lib/endpoints";
import type { Branche, Formation, FormationAcces, FormationNiveau, FormationStatus } from "@/lib/types";
import { Alert, Button, Input, Select, Textarea, errorMessage } from "@/components/ui";
import { ConfirmModal } from "@/components/Modal";
import { FormationCard } from "@/components/FormationCard";

// ── Groupement par branche ────────────────────────────────────────────────────

const BRANCH_COLS: { key: Branche; label: string; color: string; emoji: string }[] = [
  { key: "GENERALE", label: "Membres — Général", color: "#5b8fd4", emoji: "◉" },
  { key: "FEMME",    label: "Espace Femmes",     color: "#b5532a", emoji: "♀" },
  { key: "ENFANT",   label: "Espace Enfants",    color: "#52b083", emoji: "◈" },
];

const EMPTY = {
  title: "", description: "",
  category: "FORMATION" as Formation["category"],
  niveau: "" as FormationNiveau | "",
  branche: "" as Branche | "",
  acces: "MEMBRES" as FormationAcces,
  status: "DRAFT" as FormationStatus,
  publish_at: "",
};

type FormState = typeof EMPTY;

function accesToApi(acces: FormationAcces) {
  return {
    access_subscription_types: (acces === "PAYANTE" ? ["MEMBRE"] : []) as ("MEMBRE")[],
    is_payant: acces === "PAYANTE",
  };
}

function buildPreview(f: FormState, coverUrl: string): Formation {
  return {
    id: 0,
    title:       f.title.trim() || "Titre de la formation",
    description: f.description.trim(),
    category:    f.category,
    ...accesToApi(f.acces),
    cover_url: coverUrl, cover_key: "",
    status: f.status,
    publish_at: f.status === "SCHEDULED" && f.publish_at
      ? new Date(f.publish_at).toISOString() : null,
    order: 0, module_count: 0,
    niveau:      f.niveau  || null,
    branche:     f.branche || null,
    nb_episodes: 0, nb_gratuits: 0,
    modules_preview: [],
    created_at: "", updated_at: "",
  };
}

// ── Sélecteur d'accès (Gratuit / Payant) ─────────────────────────────────────

function AccesSelector({ value, onChange }: {
  value: FormationAcces;
  onChange: (v: FormationAcces) => void;
}) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <span className="field-label">Accès à la formation</span>
      <div style={{ display: "flex", gap: "0.45rem", marginTop: "0.38rem" }}>
        {([
          { value: "LIBRE"   as FormationAcces, icon: "🌐", label: "Gratuit",  sub: "Accessible à tous",          color: "#2e9460" },
          { value: "PAYANTE" as FormationAcces, icon: "🔑", label: "Payant",   sub: "Réservé aux membres abonnés", color: "#c9a227" },
        ]).map((o) => {
          const active = value === o.value;
          return (
            <button key={o.value} type="button" onClick={() => onChange(o.value)} style={{
              flex: 1, textAlign: "left", padding: "0.55rem 0.7rem", borderRadius: 7,
              border: active ? `2px solid ${o.color}` : "1.5px solid var(--line-soft)",
              background: active ? `${o.color}12` : "var(--bg-2)",
              cursor: "pointer", transition: "all .14s",
            }}>
              <div style={{ fontSize: "1.1rem", marginBottom: "0.14rem" }}>{o.icon}</div>
              <div style={{ fontSize: "0.80rem", fontWeight: 800, color: active ? o.color : "var(--cream)" }}>
                {o.label}
              </div>
              <div style={{ fontSize: "0.67rem", color: active ? o.color : "var(--muted-2)", marginTop: "0.1rem" }}>
                {o.sub}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Sélecteur d'image de couverture ──────────────────────────────────────────

function CoverPicker({ previewUrl, onFile }: {
  previewUrl: string;
  onFile: (file: File, url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onFile(file, url);
    e.target.value = "";
  };

  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <div style={{
        fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)",
        marginBottom: "0.35rem", letterSpacing: "0.04em",
      }}>
        Image de couverture
      </div>
      <div
        onClick={() => ref.current?.click()}
        style={{
          height: 140,
          borderRadius: 8,
          border: `2px dashed ${previewUrl ? "#c9a22760" : "#d0c8b880"}`,
          background: previewUrl
            ? `center/cover no-repeat url(${previewUrl})`
            : "rgba(201,162,39,0.04)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          transition: "border-color .15s, background .15s",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = "#c9a22799";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = previewUrl ? "#c9a22760" : "#d0c8b880";
        }}
      >
        {previewUrl ? (
          /* Overlay on hover */
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(20,10,0,0.42)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: 0,
            transition: "opacity .15s",
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0"; }}
          >
            <span style={{
              color: "#fff", fontSize: "0.78rem", fontWeight: 700,
              background: "rgba(0,0,0,0.35)", padding: "0.3rem 0.7rem", borderRadius: 6,
            }}>
              Changer l&apos;image
            </span>
          </div>
        ) : (
          <div style={{ textAlign: "center", pointerEvents: "none" }}>
            <div style={{ fontSize: "1.6rem", marginBottom: "0.35rem", opacity: 0.45 }}>🖼</div>
            <div style={{ fontSize: "0.78rem", color: "#a0907a", fontWeight: 500 }}>
              Cliquer pour ajouter une couverture
            </div>
            <div style={{ fontSize: "0.68rem", color: "#c0a880", marginTop: "0.18rem" }}>
              JPG, PNG, WebP — recommandé 1280×720
            </div>
          </div>
        )}
      </div>
      <input
        ref={ref} type="file" accept="image/*"
        style={{ display: "none" }} onChange={pick}
      />
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function ContenuPage() {
  const [items,        setItems]        = useState<Formation[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [form,         setForm]         = useState({ ...EMPTY });
  const [coverFile,    setCoverFile]    = useState<File | null>(null);
  const [coverUrl,     setCoverUrl]     = useState("");
  const [showForm,     setShowForm]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [info,         setInfo]         = useState("");
  const [removeTarget, setRemoveTarget] = useState<Formation | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCat,    setFilterCat]    = useState("");

  // Libérer l'URL objet quand on change d'image ou qu'on ferme le formulaire
  const setCover = (file: File, url: string) => {
    if (coverUrl) URL.revokeObjectURL(coverUrl);
    setCoverFile(file);
    setCoverUrl(url);
  };

  const resetForm = () => {
    if (coverUrl) URL.revokeObjectURL(coverUrl);
    setForm({ ...EMPTY });
    setCoverFile(null);
    setCoverUrl("");
  };

  const load = useCallback(() => {
    setLoading(true);
    formationApi.list()
      .then((r) => setItems(asList(r.data)))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setInfo(""); setSaving(true);
    try {
      const res = await formationApi.create({
        title: form.title, description: form.description, category: form.category,
        ...accesToApi(form.acces),
        status: form.status,
        publish_at: form.status === "SCHEDULED" && form.publish_at
          ? new Date(form.publish_at).toISOString() : null,
        ...(form.niveau  ? { niveau:  form.niveau  } : {}),
        ...(form.branche ? { branche: form.branche } : {}),
      });
      if (coverFile) {
        try {
          await formationApi.uploadCover(res.data.id, coverFile);
        } catch {
          // La formation est créée — l'image peut être rajoutée depuis les paramètres
          setInfo("Formation créée (l'image de couverture n'a pas pu être envoyée).");
          resetForm(); setShowForm(false); load(); return;
        }
      }
      setInfo("Formation créée. Ouvrez-la pour ajouter des chapitres et épisodes.");
      resetForm(); setShowForm(false); load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const publish = async (f: Formation) => {
    try { await formationApi.publish(f.id); load(); }
    catch (e) { setError(errorMessage(e)); }
  };

  const unpublish = async (f: Formation) => {
    try { await formationApi.update(f.id, { status: "DRAFT" }); load(); }
    catch (e) { setError(errorMessage(e)); }
  };

  const doRemove = async (f: Formation) => {
    try { await formationApi.remove(f.id); load(); setInfo("Formation supprimée."); }
    catch (e) { setError(errorMessage(e)); }
  };

  const filtered = items.filter((f) => {
    if (filterStatus && f.status !== filterStatus) return false;
    if (filterCat    && f.category !== filterCat)  return false;
    return true;
  });

  const published = items.filter((f) => f.status === "PUBLISHED").length;

  return (
    <div className="fade-up">

      {/* ── Header ── */}
      <div className="page-header">
        <div className="eyebrow">Contenu pédagogique</div>
        <h1>Catalogue des formations</h1>
        <p>
          {items.length} formation{items.length !== 1 ? "s" : ""} ·{" "}
          {published} publiée{published !== 1 ? "s" : ""}
        </p>
      </div>

      <Alert>{error}</Alert>
      {info && <Alert kind="success">{info}</Alert>}

      {/* ── Barre filtres + action ── */}
      <div style={{
        display: "flex", gap: ".75rem", alignItems: "flex-end",
        marginBottom: "1.25rem", flexWrap: "wrap",
      }}>
        <div style={{ width: 170 }}>
          <Select label="Statut" value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="PUBLISHED">Publié</option>
            <option value="SCHEDULED">Programmé</option>
            <option value="DRAFT">Brouillon</option>
          </Select>
        </div>
        <div style={{ width: 185 }}>
          <Select label="Catégorie" value={filterCat}
                  onChange={(e) => setFilterCat(e.target.value)}>
            <option value="">Toutes catégories</option>
            <option value="FORMATION">Formation</option>
            <option value="LIVRE">Bibliothèque</option>
            <option value="LIBRE">Accès libre</option>
          </Select>
        </div>
        <Button
          style={{ marginBottom: ".85rem" }}
          onClick={() => {
            if (showForm) resetForm();
            setShowForm(!showForm); setError("");
          }}
        >
          {showForm ? "✕ Annuler" : "+ Nouvelle formation"}
        </Button>
      </div>

      {/* ── Formulaire création avec aperçu live ── */}
      {showForm && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr minmax(280px, 320px)",
          gap: "1.25rem",
          alignItems: "start",
          marginBottom: "1.75rem",
        }}>
          {/* ── Panneau formulaire ── */}
          <div style={{
            background: "var(--bg-1)", border: "1px solid var(--line-soft)",
            borderRadius: "var(--radius)", padding: "1.4rem 1.5rem",
          }}>
            <h2 style={{
              fontSize: "1rem", fontWeight: 700,
              color: "var(--cream)", marginBottom: "1.1rem",
            }}>
              Nouvelle formation
            </h2>
            <form onSubmit={create}>
              {/* ── Couverture ── */}
              <CoverPicker previewUrl={coverUrl} onFile={setCover} />

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: ".8rem" }}>
                <Input label="Titre" value={form.title} required
                       onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Select label="Catégorie" value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value as Formation["category"] })}>
                  <option value="FORMATION">Formation</option>
                  <option value="LIVRE">Bibliothèque</option>
                  <option value="LIBRE">Accès libre</option>
                </Select>
              </div>
              <Textarea
                label="Description" value={form.description} maxLength={600}
                placeholder="Présentez le contenu, les objectifs et ce que les membres apprendront…"
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
                <Select label="Niveau" value={form.niveau}
                        onChange={(e) => setForm({ ...form, niveau: e.target.value as FormationNiveau | "" })}>
                  <option value="">— Niveau —</option>
                  <option value="DEBUTANT">Débutant</option>
                  <option value="INTERMEDIAIRE">Intermédiaire</option>
                  <option value="AVANCE">Avancé</option>
                </Select>
                <Select label="Branche" value={form.branche}
                        onChange={(e) => setForm({ ...form, branche: e.target.value as Branche | "" })}>
                  <option value="">— Branche —</option>
                  <option value="GENERALE">Général</option>
                  <option value="FEMME">Femme</option>
                  <option value="ENFANT">Enfant</option>
                </Select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
                <Select label="Publication" value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value as FormationStatus })}>
                  <option value="DRAFT">Brouillon</option>
                  <option value="SCHEDULED">Programmé (différé)</option>
                  <option value="PUBLISHED">Publier maintenant</option>
                </Select>
                {form.status === "SCHEDULED" && (
                  <Input label="Date de mise en ligne" type="datetime-local"
                         value={form.publish_at}
                         onChange={(e) => setForm({ ...form, publish_at: e.target.value })} />
                )}
              </div>
              <AccesSelector
                value={form.acces}
                onChange={(v) => setForm({ ...form, acces: v })}
              />
              <Button type="submit" loading={saving}>Créer la formation</Button>
            </form>
          </div>

          {/* ── Panneau aperçu live ── */}
          <div>
            <div style={{
              fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "var(--muted)",
              marginBottom: "0.55rem",
              display: "flex", alignItems: "center", gap: "0.4rem",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#5fb98a",
                display: "inline-block",
                boxShadow: "0 0 0 3px rgba(95,185,138,0.25)",
              }} />
              Aperçu en temps réel
            </div>
            <FormationCard
              formation={buildPreview(form, coverUrl)}
              onPublish={() => {}}
              onRemove={() => {}}
              preview
            />
          </div>
        </div>
      )}

      {/* ── Catalogue — sections par branche (horizontal → vertical) ── */}
      {loading && items.length === 0 ? (
        <div style={{
          padding: "3rem", textAlign: "center",
          color: "var(--muted)", fontSize: "0.88rem",
          background: "var(--bg-1)", border: "1px solid var(--line-soft)",
          borderRadius: "var(--radius)",
        }}>
          Chargement du catalogue...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {BRANCH_COLS.map((col) => {
            const colItems = filtered.filter((f) => (f.branche ?? "GENERALE") === col.key);
            return (
              <section key={col.key}>
                {/* ── En-tête de section ── */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.7rem",
                  padding: "0.6rem 1rem",
                  background: `${col.color}0e`,
                  border: `1px solid ${col.color}28`,
                  borderLeft: `4px solid ${col.color}`,
                  borderRadius: "var(--radius)",
                  marginBottom: "0.9rem",
                }}>
                  <span style={{ fontSize: "1.15rem", lineHeight: 1 }}>{col.emoji}</span>
                  <span style={{ fontSize: "0.90rem", fontWeight: 800, color: col.color, flex: 1, letterSpacing: "0.02em" }}>
                    {col.label}
                  </span>
                  <span style={{
                    fontSize: "0.70rem", fontWeight: 700,
                    background: `${col.color}1a`, color: col.color,
                    border: `1px solid ${col.color}38`,
                    padding: "0.10rem 0.52rem", borderRadius: 99,
                  }}>
                    {colItems.length} formation{colItems.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* ── Grille de cartes ── */}
                {colItems.length === 0 ? (
                  <div style={{
                    padding: "1.6rem", textAlign: "center",
                    color: "var(--muted)", fontSize: "0.82rem",
                    border: "1px dashed var(--line-soft)", borderRadius: "var(--radius)",
                  }}>
                    Aucune formation dans cette section.
                  </div>
                ) : (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(295px, 1fr))",
                    gap: "1rem",
                  }}>
                    {colItems.map((f) => (
                      <FormationCard
                        key={f.id}
                        formation={f}
                        onPublish={publish}
                        onUnpublish={unpublish}
                        onRemove={setRemoveTarget}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* ── Confirmation suppression définitive ── */}
      {removeTarget && (
        <ConfirmModal
          title="Supprimer cette formation ?"
          message={`« ${removeTarget.title} » sera supprimée définitivement avec tous ses chapitres, épisodes et quiz. Cette action est irréversible.`}
          confirmLabel="Supprimer définitivement"
          onClose={() => setRemoveTarget(null)}
          onConfirm={async () => {
            await doRemove(removeTarget);
            setRemoveTarget(null);
          }}
        />
      )}
    </div>
  );
}
