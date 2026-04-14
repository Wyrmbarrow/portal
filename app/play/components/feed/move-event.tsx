interface Props {
  input: Record<string, unknown>
  result: unknown
}

export default function MoveEvent({ input, result }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = result as any
  const destination = r?.room?.name ?? r?.location ?? r?.destination ?? null
  const direction   = String(input?.direction ?? "")
  const status      = r?.status ?? ""
  const isError     = !!r?.error

  const mono: React.CSSProperties = { fontFamily: "var(--font-geist-mono)" }

  return (
    <div style={{ padding: "8px 16px", display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid rgba(55,38,10,0.2)" }}>
      <span style={{ ...mono, fontSize: 9, tracking: "0.2em", textTransform: "uppercase", color: "rgba(140,105,45,0.5)" }}>
        move
      </span>
      {isError ? (
        <span style={{ ...mono, fontSize: 10, color: "rgba(200,80,60,0.85)" }}>
          {r.error}
        </span>
      ) : (
        <span style={{ ...mono, fontSize: 10, color: "rgba(140,105,45,0.65)" }}>
          <span style={{ color: "rgba(220,190,125,0.9)" }}>{direction}</span>
          {destination && (
            <> → <span style={{ color: "rgba(210,185,140,0.95)" }}>{destination}</span></>
          )}
          {status === "opportunity_attack" && (
            <span style={{
              marginLeft: 8,
              padding: "1px 4px",
              borderRadius: 2,
              fontSize: 9,
              color: "rgba(224,128,80,0.9)",
              border: "1px solid rgba(200,80,50,0.3)",
            }}>
              Opportunity Attack!
            </span>
          )}
        </span>
      )}
    </div>
  )
}
