"use client";

/**
 * Reusable character card component for both admin dashboard and console.
 * Shows live/last-known state with ghostly styling for dead characters.
 */

// XP thresholds (cumulative) from D&D 5e SRD
// Levels 1-7 currently implemented; 8-20 ready for future expansion
const XP_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
  11: 85000,
  12: 100000,
  13: 120000,
  14: 140000,
  15: 165000,
  16: 195000,
  17: 225000,
  18: 265000,
  19: 305000,
  20: 355000,
};

function getHpPercent(sheet: Record<string, unknown> | undefined): number {
  if (!sheet) return 0;
  const current = Number(sheet.hp_current ?? 0);
  const max = Number(sheet.hp_max ?? 1);
  return Math.round((current / max) * 100);
}

function getHpColor(percent: number, isDead: boolean): string {
  if (isDead) return "#6b5b95"; // muted purple for dead
  if (percent > 75) return "#10b981";
  if (percent > 50) return "#84cc16";
  if (percent > 25) return "#f59e0b";
  if (percent > 0) return "#ef4444";
  return "#6b7280";
}

function getXpPercent(sheet: Record<string, unknown> | undefined): number {
  if (!sheet) return 0;
  const level = Number(sheet.level ?? 1);
  const xp = Number(sheet.xp ?? 0);

  const currentThreshold = XP_THRESHOLDS[level] ?? 0;
  const nextThreshold = XP_THRESHOLDS[level + 1];

  if (!nextThreshold) return 100;

  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const percent = Math.round((xpInLevel / xpNeeded) * 100);
  return Math.min(percent, 100);
}

function formatDate(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export interface CharacterCardProps {
  characterName: string;
  characterLink?: string; // href if character has a detail page
  sheet: Record<string, unknown> | undefined;
  location?: string;
  locationHub?: string;
  lastActiveAt: Date;
  patronEmail?: string; // shown on admin, omitted on console
  isDead: boolean;
}

export default function CharacterCard({
  characterName,
  characterLink,
  sheet,
  location,
  locationHub,
  lastActiveAt,
  patronEmail,
  isDead,
}: CharacterCardProps) {
  const hpPct = getHpPercent(sheet);
  const xpPct = getXpPercent(sheet);
  const hpCurrent = Number(sheet?.hp_current ?? 0);
  const hpMax = Number(sheet?.hp_max ?? 0);

  // Ghostly styling for dead characters
  const borderColor = isDead ? "#6b21a8" : "#166534";
  const boxShadow = isDead ? "inset 0 0 8px rgba(139, 92, 246, 0.2)" : "none";
  const nameColor = isDead ? "rgba(168, 162, 200, 0.7)" : "#4ade80";
  const locationColor = isDead ? "#9ca3af" : "#86efac";
  const locationHubColor = isDead ? "#6b7280" : "#4d7c0f";
  const textOpacity = isDead ? 0.7 : 1;
  const barOpacity = isDead ? 0.6 : 1;

  return (
    <div
      style={{
        background: "#0f1a12",
        border: `1px solid ${borderColor}`,
        borderRadius: "0.375rem",
        padding: "0.6rem 0.75rem",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxShadow,
      }}
    >
      {/* Name + timestamp */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.2rem",
        }}
      >
        {characterLink ? (
          <a
            href={characterLink}
            style={{
              color: nameColor,
              fontWeight: 600,
              textDecoration: "none",
              fontSize: "0.85rem",
              fontFamily: "var(--font-geist-mono)",
              opacity: textOpacity,
            }}
          >
            {characterName}
          </a>
        ) : (
          <span
            style={{
              color: nameColor,
              fontWeight: 600,
              fontSize: "0.85rem",
              fontFamily: "var(--font-geist-mono)",
              opacity: textOpacity,
            }}
          >
            {characterName}
          </span>
        )}
        <span
          style={{
            color: isDead ? "#9ca3af" : "#16a34a",
            fontSize: "0.65rem",
            fontFamily: "var(--font-geist-mono)",
            opacity: textOpacity,
          }}
        >
          {formatDate(lastActiveAt)}
        </span>
      </div>

      {/* Location */}
      {location && (
        <div
          style={{
            color: locationColor,
            fontSize: "0.72rem",
            lineHeight: 1.4,
            opacity: textOpacity,
          }}
        >
          {location}
          {locationHub && (
            <span style={{ color: locationHubColor, marginLeft: "0.4rem" }}>
              · {locationHub}
            </span>
          )}
        </div>
      )}

      {/* Class/level + patron email */}
      {sheet && (
        <div
          style={{
            color: "#52525b",
            fontSize: "0.65rem",
            marginTop: "0.15rem",
            opacity: textOpacity,
          }}
        >
          <span>
            {String(sheet.class ?? "?")}
            {sheet.subclass ? ` (${String(sheet.subclass)})` : ""} Lv.
            {String(sheet.level ?? "?")}
          </span>
          {patronEmail && (
            <span style={{ marginLeft: "0.4rem" }}>· {patronEmail}</span>
          )}
        </div>
      )}

      {/* HP/XP bars (pinned to bottom) */}
      {sheet && (
        <div
          style={{
            marginTop: "auto",
            paddingTop: "0.4rem",
            borderTop: `1px solid ${isDead ? "rgba(139, 92, 246, 0.3)" : "rgba(22, 101, 52, 0.5)"}`,
            opacity: barOpacity,
          }}
        >
          {/* HP bar */}
          <div style={{ marginBottom: "0.3rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.1rem",
              }}
            >
              <span
                style={{
                  color: "#a1a1aa",
                  fontSize: "0.6rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                HP
              </span>
              <span style={{ color: "#71717a", fontSize: "0.6rem" }}>
                {hpCurrent}/{hpMax}
              </span>
            </div>
            <div
              style={{
                height: "4px",
                background: "#27272a",
                borderRadius: "1px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${hpPct}%`,
                  background: getHpColor(hpPct, isDead),
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          </div>

          {/* XP bar */}
          <div style={{ marginBottom: "0.25rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.1rem",
              }}
            >
              <span
                style={{
                  color: "#a1a1aa",
                  fontSize: "0.6rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                XP
              </span>
              <span style={{ color: "#71717a", fontSize: "0.6rem" }}>
                {xpPct}%
              </span>
            </div>
            <div
              style={{
                height: "3px",
                background: "#27272a",
                borderRadius: "1px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${xpPct}%`,
                  background: isDead ? "#8b7ab8" : "#8b5cf6",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
