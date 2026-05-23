"use client";

import { useState } from "react";

import type { ContentItem } from "@/lib/types";
import { IconPlay, IconLock, IconDoc, IconAudio } from "@/components/icons";

const TYPE_LABEL: Record<string, string> = { VIDEO: "Vidéo", PDF: "PDF", AUDIO: "Audio" };
const CATEGORY_LABEL: Record<string, string> = { LIVRE: "Livre", FORMATION: "Formation", LIBRE: "Libre" };
const TINT: Record<string, string> = {
  VIDEO: "linear-gradient(150deg, rgba(181,83,42,.5), rgba(110,31,31,.35))",
  PDF: "linear-gradient(150deg, rgba(201,162,39,.45), rgba(181,83,42,.3))",
  AUDIO: "linear-gradient(150deg, rgba(110,31,31,.4), rgba(201,162,39,.3))",
};

function TypeIcon({ type }: { type: string }) {
  if (type === "VIDEO") return <IconPlay className="" />;
  if (type === "AUDIO") return <IconAudio className="" />;
  return <IconDoc className="" />;
}

export function ContentCard({ item, onOpen, opening }: {
  item: ContentItem; onOpen: (i: ContentItem) => void; opening: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const locked = item.access.locked;
  const hasImg = item.thumbnail && !broken;

  return (
    <article className="card card-hover media-card press"
             onClick={() => { if (!locked) onOpen(item); }}
             role="button" tabIndex={0}
             onKeyDown={(e) => { if (!locked && (e.key === "Enter" || e.key === " ")) onOpen(item); }}>
      <div className="media-card__cover">
        {hasImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnail} alt="" onError={() => setBroken(true)}
               style={{ filter: locked ? "grayscale(.45) brightness(.65)" : "none" }} />
        ) : (
          <div className="ph" style={{ background: TINT[item.content_type] ?? "var(--bg-2)" }}>
            <TypeIcon type={item.content_type} />
          </div>
        )}

        <div className="media-card__top">
          <span className="chip-mini">{CATEGORY_LABEL[item.category] ?? item.category}</span>
          <span className="chip-mini">{TYPE_LABEL[item.content_type] ?? item.content_type}</span>
        </div>

        {locked ? (
          <div className="media-card__lock">
            <IconLock className="" />
            <span style={{ fontSize: ".82rem", fontWeight: 600 }}>
              {item.access.lock_reason === "quiz" ? "Quiz requis" : "Réservé aux membres"}
            </span>
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center",
                        opacity: opening ? 1 : 0, transition: "opacity .25s ease" }}
               className="media-card__playwrap">
            <span className="play-fab">{opening ? "…" : <IconPlay className="" />}</span>
          </div>
        )}
      </div>

      <div className="media-card__body">
        <h3 style={{ fontSize: "1.05rem", lineHeight: 1.25 }}>{item.title}</h3>
        {item.description && (
          <p className="line-clamp-2" style={{ fontSize: ".86rem", color: "var(--muted)" }}>{item.description}</p>
        )}
      </div>
    </article>
  );
}
