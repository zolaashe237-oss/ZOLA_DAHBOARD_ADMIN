"use client";

import { useEffect, useMemo, useState } from "react";

import { contentApi } from "@/lib/endpoints";
import type { ContentItem } from "@/lib/types";
import { Card, errorMessage } from "@/components/ui";
import { MediaModal } from "@/components/MediaModal";
import { ContentCard } from "@/components/ContentCard";
import { BrandLoader } from "@/components/BrandLoader";

const FILTERS = [
  { value: "ALL", label: "Tout" },
  { value: "FORMATION", label: "Formations" },
  { value: "LIVRE", label: "Bibliothèque" },
  { value: "LIBRE", label: "Accès libre" },
];

export default function ContenuPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [opening, setOpening] = useState<number | null>(null);
  const [player, setPlayer] = useState<{ item: ContentItem; url: string } | null>(null);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    contentApi.list()
      .then((r) => setItems(r.data.results))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const open = async (item: ContentItem) => {
    setMessage("");
    setOpening(item.id);
    try {
      const { data } = await contentApi.stream(item.id);
      setPlayer({ item, url: data.url });
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setOpening(null);
    }
  };

  // Filtres réellement présents dans le catalogue.
  const available = useMemo(() => {
    const cats = new Set<string>(items.map((i) => i.category));
    return FILTERS.filter((f) => f.value === "ALL" || cats.has(f.value));
  }, [items]);

  const shown = filter === "ALL" ? items : items.filter((i) => i.category === filter);

  if (loading) return <BrandLoader full={false} />;

  return (
    <div className="fade-up">
      <div className="eyebrow" style={{ marginBottom: ".3rem" }}>Bibliothèque & formations</div>
      <h1 style={{ marginBottom: "1.1rem", fontSize: "clamp(1.8rem, 5vw, 2.4rem)" }}>Contenus</h1>

      {message && <div className="alert alert-error">{message}</div>}

      {available.length > 1 && (
        <div className="chip-row">
          {available.map((f) => (
            <button key={f.value} className={`chip-f ${filter === f.value ? "on" : ""}`}
                    onClick={() => setFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <Card><p style={{ color: "var(--muted)" }}>Aucun contenu dans cette catégorie.</p></Card>
      ) : (
        <div className="media-grid">
          {shown.map((c) => (
            <ContentCard key={c.id} item={c} onOpen={open} opening={opening === c.id} />
          ))}
        </div>
      )}

      {player && <MediaModal item={player.item} url={player.url} onClose={() => setPlayer(null)} />}
    </div>
  );
}
