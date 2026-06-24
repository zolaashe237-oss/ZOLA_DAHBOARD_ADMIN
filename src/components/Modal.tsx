"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui";

// ── Overlay générique ─────────────────────────────────────────────────────────

export function Modal({
  children,
  onClose,
  title,
  maxWidth = 580,
}: {
  children: ReactNode;
  onClose: () => void;
  title?: string;
  maxWidth?: number;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scrolled,   setScrolled]   = useState(false); // header shadow
  const [hasMore,    setHasMore]    = useState(false); // bottom gradient

  // Keyboard close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Scroll indicators
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const update = () => {
      setScrolled(el.scrollTop > 4);
      setHasMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(10,7,4,.72)",
        display: "grid", placeItems: "center",
        padding: "1rem",
        backdropFilter: "blur(3px)",
        overflowY: "auto",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--line-med)",
          borderRadius: "var(--radius)",
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 28px 72px rgba(0,0,0,.6)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ── Header sticky ────────────────────────────────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.15rem 1.5rem 1rem",
            borderBottom: "1px solid var(--line-soft)",
            background: "var(--bg-1)",
            // Shadow quand le corps a été scrollé
            boxShadow: scrolled
              ? "0 4px 12px rgba(0,0,0,0.15)"
              : "none",
            transition: "box-shadow .2s",
            zIndex: 2,
          }}
        >
          {title ? (
            <h2 style={{ fontSize: "1.05rem", margin: 0, color: "var(--cream)", fontWeight: 600 }}>
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--muted)", fontSize: "1.1rem", lineHeight: 1,
              padding: "0.25rem .45rem", borderRadius: 6,
              transition: "color .15s, background .15s",
              marginLeft: "auto",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--cream)";
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--muted)";
              e.currentTarget.style.background = "none";
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Corps scrollable ─────────────────────────────────────────────── */}
        <div
          ref={bodyRef}
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "1.35rem 1.5rem 1.5rem",
          }}
        >
          {children}
        </div>

        {/* ── Gradient de bas : indique qu'il y a du contenu en dessous ────── */}
        {hasMore && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 52,
              background: "linear-gradient(to top, var(--bg-1) 20%, transparent)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Boîte de confirmation ─────────────────────────────────────────────────────

export function ConfirmModal({
  title,
  message,
  onConfirm,
  onClose,
  withReason = false,
  reasonLabel = "Motif",
  confirmLabel = "Confirmer",
  variant = "danger",
}: {
  title: string;
  message: string | ReactNode;
  onConfirm: (reason: string) => Promise<void> | void;
  onClose: () => void;
  withReason?: boolean;
  reasonLabel?: string;
  confirmLabel?: string;
  variant?: "primary" | "danger";
}) {
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (withReason) ref.current?.focus();
  }, [withReason]);

  const submit = async () => {
    setLoading(true);
    try {
      await onConfirm(reason);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={420}>
      <div style={{ marginBottom: withReason ? "1rem" : "1.5rem" }}>
        <strong style={{ fontSize: "1rem", display: "block", marginBottom: ".5rem", color: "var(--cream)" }}>
          {title}
        </strong>
        <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: 0, lineHeight: 1.55 }}>
          {message}
        </p>
      </div>

      {withReason && (
        <label style={{ display: "block", marginBottom: "1.25rem" }}>
          <span style={{
            display: "block", fontSize: ".78rem", color: "var(--muted-2)", marginBottom: ".35rem",
            fontWeight: 600, textTransform: "uppercase", letterSpacing: ".07em",
          }}>
            {reasonLabel}
          </span>
          <textarea
            ref={ref}
            value={reason}
            rows={3}
            className="input"
            style={{ resize: "vertical", fontFamily: "var(--sans)", width: "100%", boxSizing: "border-box" }}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Saisissez un motif…"
          />
        </label>
      )}

      <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          variant={variant}
          loading={loading}
          disabled={withReason && !reason.trim()}
          onClick={submit}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
