"use client";

import { useEffect } from "react";

import type { ContentItem } from "@/lib/types";

/** Lecteur média en modale (vidéo / audio / PDF) servi par URL signée. */
export function MediaModal({
  item,
  url,
  onClose,
}: {
  item: ContentItem;
  url: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(8, 6, 5, 0.78)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem",
        animation: "fadeUp .25s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: "100%", maxWidth: 880, padding: "1.1rem", borderColor: "var(--line)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.9rem" }}>
          <h3 style={{ fontSize: "1.3rem", margin: 0 }}>{item.title}</h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "transparent", border: "1px solid var(--line)", color: "var(--cream)",
              width: 34, height: 34, borderRadius: 999, cursor: "pointer", fontSize: "1rem", lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {item.content_type === "VIDEO" && (
          <video src={url} controls autoPlay style={{ width: "100%", borderRadius: 10, background: "#000", maxHeight: "70vh" }} />
        )}

        {item.content_type === "AUDIO" && (
          <div style={{ padding: "1.5rem 0" }}>
            <audio src={url} controls autoPlay style={{ width: "100%" }} />
          </div>
        )}

        {item.content_type === "PDF" && (
          <iframe src={url} title={item.title} style={{ width: "100%", height: "70vh", border: "none", borderRadius: 10, background: "#fff" }} />
        )}

        {item.description && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.9rem" }}>{item.description}</p>
        )}
      </div>
    </div>
  );
}
