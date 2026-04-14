interface Props {
  input: Record<string, unknown>
  result: unknown
}

export default function SpeakEvent({ input, result }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = result as any
  const npc         = r?.npc ?? String(input?.target_ref ?? "Someone")
  const yourMsg     = r?.your_message ?? String(input?.message ?? "")
  const response    = r?.npc_response ?? r?.response ?? ""
  const disposition = r?.disposition ?? ""
  const skillCheck  = r?.skill_check ?? null

  const mono: React.CSSProperties = { fontFamily: "var(--font-geist-mono)" }
  const heading: React.CSSProperties = { fontFamily: "var(--font-cinzel)" }

  return (
    <div style={{ 
      borderRadius: 4, 
      border: "1px solid rgba(80,58,18,0.4)", 
      background: "rgba(25,18,8,0.4)",
      marginBottom: 8
    }}>
      <div style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ ...mono, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(140,105,45,0.5)" }}>speak</span>
          <span style={{ ...heading, fontSize: 13, fontWeight: 500, color: "rgba(220,190,125,0.95)" }}>{npc}</span>
          {disposition && (
            <span style={{ 
              marginLeft: "auto", 
              ...mono, 
              fontSize: 8, 
              textTransform: "uppercase", 
              color: dispositionColor(disposition),
              border: `1px solid ${dispositionColor(disposition)}`,
              padding: "1px 4px",
              borderRadius: 2,
              opacity: 0.8
            }}>
              {disposition}
            </span>
          )}
        </div>

        {/* Player message */}
        {yourMsg && (
          <p
            style={{ 
              fontFamily: "var(--font-geist-sans)", 
              fontSize: 12, 
              fontStyle: "italic", 
              color: "rgba(140,105,45,0.75)",
              paddingLeft: 8, 
              borderLeft: "2px solid rgba(118,82,24,0.3)",
              marginBottom: 8
            }}
          >
            &ldquo;{yourMsg}&rdquo;
          </p>
        )}

        {/* NPC response */}
        {response && (
          <p style={{ 
            fontFamily: "var(--font-geist-sans)", 
            fontSize: 12, 
            lineHeight: 1.6, 
            color: "rgba(210,185,140,0.95)" 
          }}>
            {response}
          </p>
        )}

        {/* Skill check result */}
        {skillCheck && typeof skillCheck === "object" && (
          <div style={{ ...mono, fontSize: 9, display: "flex", gap: 8, color: "rgba(140,105,45,0.65)", marginTop: 8 }}>
            <span>{String(skillCheck.skill ?? "")}</span>
            <span style={{ color: skillCheck.success ? "rgba(100,180,110,0.8)" : "rgba(200,80,60,0.85)" }}>
              {String(skillCheck.total).startsWith("-") ? "" : (skillCheck.total >= 0 ? "+" : "")}{skillCheck.total} · {skillCheck.success ? "success" : "failure"}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function dispositionColor(d: string): string {
  switch (d) {
    case "friendly":  return "rgba(100,180,110,0.8)"
    case "hostile":   return "rgba(200,80,60,0.85)"
    case "neutral":   return "rgba(140,105,45,0.65)"
    case "wary":      return "rgba(224,128,80,0.9)"
    default:          return "rgba(140,105,45,0.65)"
  }
}
