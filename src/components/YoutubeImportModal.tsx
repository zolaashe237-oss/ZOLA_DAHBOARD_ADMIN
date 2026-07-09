"use client";

import { useState } from "react";

import { youtubeImportApi } from "@/lib/endpoints";
import type { YoutubeImportPreview } from "@/lib/types";
import { Alert, Badge, Button, Input, errorMessage } from "@/components/ui";
import { Modal } from "@/components/Modal";

function duration(sec: number | null) {
  if (sec === null) return "durée inconnue";
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function validPlaylist(url: string) {
  return (url.includes("youtube.com") || url.includes("youtu.be")) && url.includes("list=");
}

export function YoutubeImportModal({ onClose, onImported }: { onClose: () => void; onImported: (message: string) => void }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<YoutubeImportPreview | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    setError(""); setPreview(null);
    if (!validPlaylist(url)) { setError("Veuillez saisir une URL de playlist YouTube valide (youtube.com ou youtu.be avec list=)."); return; }
    setLoading(true);
    try {
      const res = await youtubeImportApi.preview(url.trim());
      setPreview(res.preview); setSimulated(res.simulated);
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  };

  const confirm = async () => {
    setError(""); setConfirming(true);
    try {
      const res = await youtubeImportApi.confirm(url.trim());
      onImported(`Formation « ${res.formation.title} » importée (${res.modules_created} module(s), ${res.courses_created} cours).`);
    } catch (e) { setError(errorMessage(e)); }
    finally { setConfirming(false); }
  };

  return (
    <Modal title="Importer depuis YouTube" onClose={onClose} maxWidth={720}>
      <Alert>{error}</Alert>
      <Input label="URL de playlist YouTube" value={url} placeholder="https://www.youtube.com/playlist?list=..." onChange={(e) => setUrl(e.target.value)} />
      <div style={{ display: "flex", gap: "0.55rem", marginBottom: "1rem" }}>
        <Button type="button" loading={loading} onClick={analyze}>Analyser la playlist</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
      </div>
      {preview && (
        <div style={{ border: "1px solid var(--line-soft)", borderRadius: "var(--radius)", padding: "1rem", background: "var(--bg-2)", marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem" }}>
            <div>
              <div className="field-label">Formation proposée</div>
              <strong style={{ color: "var(--cream)" }}>{preview.formation_title}</strong>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>{preview.total_videos} vidéo{preview.total_videos !== 1 ? "s" : ""}</div>
            </div>
            {simulated && <Badge color="#d9a441">Aperçu simulé</Badge>}
          </div>
          {preview.modules.map((m, i) => (
            <div key={`${m.title}-${i}`} style={{ marginTop: "0.8rem" }}>
              <div style={{ fontWeight: 700, color: "var(--gold-2)", marginBottom: "0.35rem" }}>Module {i + 1} — {m.title}</div>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--muted)", fontSize: "0.84rem" }}>
                {m.courses.map((c, j) => <li key={`${c.title}-${j}`}>{c.title} · {duration(c.duration_sec)}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {preview && <Button type="button" loading={confirming} onClick={confirm}>Confirmer l&apos;import</Button>}
    </Modal>
  );
}