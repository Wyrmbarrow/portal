interface Props {
  input: Record<string, unknown>
  result: unknown
}

export default function CombatEvent({ input, result }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = result as any
  const action  = String(input?.action ?? "")
  const isError = !!r?.error
  const isHit   = r?.hit === true
  const isMiss  = r?.hit === false

  const mono: React.CSSProperties = { fontFamily: "var(--font-geist-mono)" }

  return (
    <div
      style={{
        borderRadius: 4,
        borderLeft: "3px solid rgba(180,60,50,0.8)",
        border: `1px solid ${isError ? "rgba(180,60,50,0.3)" : "rgba(140,80,30,0.4)"}`,
        borderLeftWidth: 3,
        borderLeftColor: "rgba(180,60,50,0.8)",
        background: isError ? "rgba(60,15,10,0.3)" : "rgba(25,18,8,0.4)",
        marginBottom: 8
      }}
    >
      <div style={{ padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ ...mono, fontSize: 9, tracking: "0.2em", textTransform: "uppercase", color: "rgba(140,105,45,0.5)" }}>
            combat
          </span>
          <span style={{ ...mono, fontSize: 10, color: "rgba(220,190,125,0.9)" }}>{action}</span>
          {!isError && (isMiss || isHit) && (
            <span
              style={{
                ...mono,
                fontSize: 9,
                marginLeft: "auto",
                padding: "2px 6px",
                borderRadius: 2,
                background: isHit ? "rgba(40,80,40,0.4)" : "rgba(60,40,40,0.4)",
                border: `1px solid ${isHit ? "rgba(80,140,80,0.3)" : "rgba(120,60,60,0.3)"}`,
                color: isHit ? "rgba(120,200,120,0.9)" : "rgba(180,100,100,0.9)",
              }}
            >
              {isHit ? "HIT" : "MISS"}
            </span>
          )}
        </div>

        {isError ? (
          <p style={{ ...mono, fontSize: 10, color: "rgba(200,80,60,0.85)" }}>{r.error}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {r?.damage != null && (
              <div style={{ ...mono, fontSize: 10, display: "flex", gap: 8, color: "rgba(140,105,45,0.65)" }}>
                <span>Damage</span>
                <span style={{ fontWeight: 600, color: "rgba(224,128,80,0.9)" }}>
                  {typeof r.damage === "object" && r.damage?.total != null ? r.damage.total : r.damage}
                </span>
                {r?.damage_type && <span style={{ color: "rgba(140,105,45,0.5)" }}>{r.damage_type}</span>}
              </div>
            )}
            {r?.target_hp_remaining != null && (
              <div style={{ ...mono, fontSize: 10, color: "rgba(140,105,45,0.65)" }}>
                Target HP: {r.target_hp_remaining}
              </div>
            )}
            {r?.description && (
              <p style={{ 
                fontFamily: "var(--font-geist-sans)", 
                fontSize: 12, 
                lineHeight: 1.5, 
                color: "rgba(210,185,140,0.8)",
                marginTop: 4
              }}>
                {r.description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
