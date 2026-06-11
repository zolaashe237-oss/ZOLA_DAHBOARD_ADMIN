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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent scroll on body
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(10,7,4,.70)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(3px)",
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
          overflowY: "auto",
          padding: "1.5rem 1.75rem",
          boxShadow: "0 28px 72px rgba(0,0,0,.6)",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: title ? "1.3rem" : 0,
        }}>
          {title && (
            <h2 style={{ fontSize: "1.05rem", margin: 0, color: "var(--cream)" }}>
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--muted)", fontSize: "1.15rem", lineHeight: 1,
              padding: "0.2rem .4rem", marginLeft: "auto", borderRadius: 6,
              transition: "color .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cream)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
          >
            ✕
          </button>
        </div>

        {children}
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
