import { Badge } from "@/components/ui";
import type { AIDifficulty, QROVerdict } from "@/lib/types";

// ── Niveau suggéré par l'IA (G-04) ────────────────────────────────────────────

export const NIVEAU_COLOR: Record<AIDifficulty, string> = {
  FACILE: "#2e9460",
  INTERMEDIAIRE: "#9a6e10",
  DIFFICILE: "#c0402c",
};

export const NIVEAU_LABEL: Record<AIDifficulty, string> = {
  FACILE: "Facile",
  INTERMEDIAIRE: "Intermédiaire",
  DIFFICILE: "Difficile",
};

export function NiveauBadge({ niveau }: { niveau: AIDifficulty | null | undefined }) {
  if (!niveau) return <span style={{ color: "var(--muted-2)", fontSize: ".8rem" }}>-</span>;
  return <Badge color={NIVEAU_COLOR[niveau]}>{NIVEAU_LABEL[niveau]}</Badge>;
}

// ── Verdict IA d'une réponse QRO (G-06 / G-07) ────────────────────────────────

export const VERDICT_COLOR: Record<QROVerdict, string> = {
  VALIDE: "#2e9460",
  NON_VALIDE: "#c0402c",
  A_REVOIR: "#9a6e10",
};

export const VERDICT_LABEL: Record<QROVerdict, string> = {
  VALIDE: "Validé",
  NON_VALIDE: "Non validé",
  A_REVOIR: "À revoir manuellement",
};

export function VerdictBadge({ verdict }: { verdict: QROVerdict }) {
  return <Badge color={VERDICT_COLOR[verdict]}>{VERDICT_LABEL[verdict]}</Badge>;
}

// ── Icône source d'extraction (G-02 / G-07) ───────────────────────────────────

export function SourceIcon({ source }: { source: "SCRIPT" | "PDF" | "MULTI_YOUTUBE" | null | undefined }) {
  if (!source) return <span style={{ color: "var(--muted-2)" }}>-</span>;
  if (source === "MULTI_YOUTUBE") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", fontSize: ".8rem", color: "var(--muted)" }}>
        ▶▶ Tous chapitres
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", fontSize: ".8rem", color: "var(--muted)" }}>
      {source === "SCRIPT" ? "▶" : "▤"} {source === "SCRIPT" ? "Script vidéo" : "PDF"}
    </span>
  );
}
