"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { contentApi } from "@/lib/endpoints";
import type { ContentItem, Paginated, SubscriptionType } from "@/lib/types";
import { Alert, Badge, Button, Card, Input, Select, errorMessage } from "@/components/ui";
import { MediaModal } from "@/components/MediaModal";
import { Thumb } from "@/components/Thumb";

const SUB_TYPES: { value: SubscriptionType; label: string }[] = [
  { value: "MEMBRE", label: "Réservé aux membres" },
];
const SUB_LABEL: Record<string, string> = Object.fromEntries(SUB_TYPES.map((s) => [s.value, s.label]));

const CATEGORIES: { value: ContentItem["category"]; label: string }[] = [
  { value: "FORMATION", label: "Formation" },
  { value: "LIVRE", label: "Livre" },
  { value: "LIBRE", label: "Accès libre" },
];
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

const empty = {
  content_type: "VIDEO" as ContentItem["content_type"],
  title: "", category: "FORMATION" as ContentItem["category"], order: 0,
  bucket_key: "", thumbnail_key: "", access: [] as SubscriptionType[],
  quiz_active: false, quiz_threshold: 15,
};

export default function ContenuPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [preview, setPreview] = useState<{ title: string; url: string; type: string } | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState("");   // aperçu local de la miniature
  const [thumbUploading, setThumbUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  // Ferme la modale et libère l'URL objet locale (prévisualisation pré-publication).
  const closePreview = () => {
    if (preview?.url.startsWith("blob:")) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const load = useCallback(async () => {
    try {
      const { data } = await contentApi.list();
      setItems(Array.isArray(data) ? data : (data as Paginated<ContentItem>).results);
    } catch (e) { setError(errorMessage(e)); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSub = (t: SubscriptionType) =>
    setForm((f) => ({
      ...f,
      access: f.access.includes(t) ? f.access.filter((x) => x !== t) : [...f.access, t],
    }));

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setInfo(""); setUploading(true);
    try {
      const { data } = await contentApi.upload(file, form.content_type);
      setForm((f) => ({ ...f, bucket_key: data.bucket_key }));
      setMediaFile(file);
      setInfo(`Média uploadé (${data.size_mo} Mo).`);
    } catch (err) { setError(errorMessage(err)); }
    finally { setUploading(false); }
  };

  // Prévisualise le fichier qui vient d'être sélectionné/uploadé (URL objet locale).
  const previewUploaded = () => {
    if (!mediaFile) return;
    setPreview({ title: form.title || mediaFile.name, type: form.content_type,
                 url: URL.createObjectURL(mediaFile) });
  };

  // Upload de la miniature vers MinIO (servie ensuite en URL signée).
  const onThumb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setThumbUploading(true);
    try {
      const { data } = await contentApi.upload(file, "IMAGE");
      setForm((f) => ({ ...f, thumbnail_key: data.bucket_key }));
      setThumbPreview(URL.createObjectURL(file));
    } catch (err) { setError(errorMessage(err)); }
    finally { setThumbUploading(false); }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setInfo("");
    if (!form.bucket_key) { setError("Veuillez d'abord uploader le fichier média."); return; }
    try {
      await contentApi.create({
        content_type: form.content_type, title: form.title, category: form.category,
        order: Number(form.order), bucket_key: form.bucket_key,
        thumbnail_key: form.thumbnail_key,
        access_subscription_types: form.access,
        quiz_active: form.quiz_active, quiz_threshold: Number(form.quiz_threshold),
        active: true,
      } as Partial<ContentItem>);
      setInfo("Contenu publié.");
      setForm({ ...empty });
      setMediaFile(null);
      setThumbPreview("");
      if (fileRef.current) fileRef.current.value = "";
      if (thumbRef.current) thumbRef.current.value = "";
      await load();
    } catch (e) { setError(errorMessage(e)); }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Supprimer ce contenu (suppression logique) ?")) return;
    try { await contentApi.remove(id); await load(); } catch (e) { setError(errorMessage(e)); }
  };
  const togglePublish = async (c: ContentItem) => {
    try { await contentApi.update(c.id, { active: !c.active }); await load(); }
    catch (e) { setError(errorMessage(e)); }
  };
  const openPreview = async (c: ContentItem) => {
    setError("");
    try {
      const { data } = await contentApi.preview(c.id);
      setPreview({ title: c.title, url: data.url, type: data.content_type });
    } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <div className="fade-up">
      <div className="eyebrow">Bibliothèque</div>
      <h1 style={{ marginBottom: "1.4rem" }}>Contenu</h1>

      <Card style={{ marginBottom: "1.75rem" }}>
        <h2 style={{ fontSize: "1.15rem", marginBottom: "1rem" }}>Ajouter un contenu</h2>
        <Alert>{error}</Alert>
        <Alert kind="success">{info}</Alert>
        <form onSubmit={create}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
            <Select label="Type de média" value={form.content_type}
                    onChange={(e) => setForm({ ...form, content_type: e.target.value as ContentItem["content_type"], bucket_key: "" })}>
              <option value="VIDEO">Vidéo</option>
              <option value="PDF">PDF</option>
              <option value="AUDIO">Audio</option>
            </Select>
            <Input label="Titre" value={form.title} required
                   onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Select label="Catégorie" value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as ContentItem["category"] })}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Input label="Ordre" type="number" value={form.order}
                   onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
          </div>

          {/* Upload miniature MinIO */}
          <div style={{ margin: "0.4rem 0 1rem" }}>
            <span className="field-label">Miniature (image, optionnel)</span>
            <div style={{ display: "flex", gap: "0.7rem", alignItems: "center" }}>
              {thumbPreview && (
                <img src={thumbPreview} alt="" style={{ width: 56, height: 56, borderRadius: 10,
                     objectFit: "cover", border: "1px solid var(--line-soft)" }} />
              )}
              <input ref={thumbRef} type="file" accept="image/*" onChange={onThumb}
                     style={{ fontSize: "0.85rem", color: "var(--muted)" }} />
              {thumbUploading && <span style={{ color: "var(--gold)", fontSize: "0.85rem" }}>Upload…</span>}
              {form.thumbnail_key && !thumbUploading && <Badge color="#5fb98a">✓ miniature</Badge>}
            </div>
          </div>

          {/* Upload média MinIO */}
          <div style={{ margin: "0.4rem 0 1rem" }}>
            <span className="field-label">Fichier média (uploadé sur le stockage sécurisé)</span>
            <div style={{ display: "flex", gap: "0.7rem", alignItems: "center" }}>
              <input ref={fileRef} type="file" onChange={onFile}
                     style={{ fontSize: "0.85rem", color: "var(--muted)" }} />
              {uploading && <span style={{ color: "var(--gold)", fontSize: "0.85rem" }}>Upload…</span>}
              {form.bucket_key && !uploading && (
                <>
                  <Badge color="#5fb98a">✓ média prêt</Badge>
                  {mediaFile && (
                    <Button type="button" variant="ghost" onClick={previewUploaded}>Prévisualiser</Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Multi-select abonnements requis */}
          <div style={{ marginBottom: "1rem" }}>
            <span className="field-label">Abonnements donnant accès (aucun = contenu libre)</span>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {SUB_TYPES.map((s) => (
                <span key={s.value} className={`chip ${form.access.includes(s.value) ? "on" : ""}`}
                      onClick={() => toggleSub(s.value)}>
                  {form.access.includes(s.value) ? "✓ " : ""}{s.label}
                </span>
              ))}
            </div>
          </div>

          {/* Quiz */}
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", marginBottom: "1rem" }}>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.88rem", color: "var(--muted)" }}>
              <input type="checkbox" checked={form.quiz_active}
                     onChange={(e) => setForm({ ...form, quiz_active: e.target.checked })} />
              Quiz de validation
            </label>
            {form.quiz_active && (
              <div style={{ width: 150 }}>
                <Input label="Seuil (/20)" type="number" value={form.quiz_threshold}
                       onChange={(e) => setForm({ ...form, quiz_threshold: Number(e.target.value) })} />
              </div>
            )}
          </div>

          <Button type="submit" disabled={uploading}>Publier le contenu</Button>
        </form>
      </Card>

      <div style={{ display: "grid", gap: "0.6rem" }}>
        {items.map((c) => (
          <Card key={c.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <div style={{ display: "flex", gap: "0.85rem", alignItems: "center", minWidth: 0 }}>
                <Thumb url={c.thumbnail} type={c.content_type} />
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
                  <Badge>{c.content_type}</Badge>
                  <Badge color="#a89b86">{CATEGORY_LABEL[c.category] ?? c.category}</Badge>
                  <strong>{c.title}</strong>
                  {!c.active && <Badge color="#7d7264">brouillon</Badge>}
                  {(c.access_subscription_types ?? []).length === 0
                    ? <Badge color="#5fb98a">libre</Badge>
                    : (c.access_subscription_types ?? []).map((t) => (
                        <Badge key={t}>{SUB_LABEL[t] ?? t}</Badge>
                      ))}
                </div>
              </div>
              <span style={{ display: "inline-flex", gap: 6, flexShrink: 0 }}>
                {c.bucket_key && (
                  <Button variant="ghost" onClick={() => openPreview(c)}>Prévisualiser</Button>
                )}
                <Button variant="ghost" onClick={() => togglePublish(c)}>
                  {c.active ? "Dépublier" : "Publier"}
                </Button>
                <Button variant="danger" onClick={() => remove(c.id)}>Supprimer</Button>
              </span>
            </div>
          </Card>
        ))}
        {items.length === 0 && <Card><p style={{ color: "var(--muted)" }}>Aucun contenu.</p></Card>}
      </div>

      {preview && (
        <MediaModal title={preview.title} url={preview.url} contentType={preview.type}
                    onClose={closePreview} />
      )}
    </div>
  );
}

