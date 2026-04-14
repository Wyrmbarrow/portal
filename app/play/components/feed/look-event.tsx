import type { RoomState } from "../../lib/types"

interface Props {
  result: unknown
  roomState?: RoomState | null
}

export default function LookEvent({ result, roomState }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = result as any
  const room = r?.room ?? r

  const name        = room?.name ?? room?.key ?? roomState?.name ?? "Unknown"
  const hub         = room?.hub ?? roomState?.hub
  const sanctuary   = room?.is_sanctuary ?? roomState?.isSanctuary ?? false
  const desc        = room?.description ?? room?.desc ?? roomState?.description ?? ""
  const spiritVision = r?.spirit_vision === true
  const minutesUntilRevival: number | undefined = r?.minutes_until_revival
  
  const exits: string[] = room?.exits
    ? room.exits.map((e: unknown) => typeof e === "string" ? e : (e as Record<string, string>)?.key ?? (e as Record<string, string>)?.direction ?? (e as Record<string, string>)?.name ?? String(e))
    : roomState?.exits?.map(e => e.key) ?? []
    
  const npcs: string[]  = extractNames(room?.contents?.npcs ?? room?.npcs)
  const chars: string[] = extractNames(room?.contents?.characters ?? room?.contents?.agents ?? room?.characters ?? room?.agents)
  const objs: string[]  = extractNames(room?.contents?.objects ?? room?.objects)

  const mono: React.CSSProperties = { fontFamily: "var(--font-geist-mono)" }
  const cinzel: React.CSSProperties = { fontFamily: "var(--font-cinzel)" }

  return (
    <div style={{ 
      borderRadius: 4, 
      border: "1px solid rgba(80,58,18,0.4)", 
      background: "rgba(25,18,8,0.4)",
      marginBottom: 8
    }}>
      <div style={{ padding: "12px 16px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ ...mono, fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(140,105,45,0.65)" }}>look</span>
          <span style={{ ...cinzel, fontSize: 14, fontWeight: 500, color: "rgba(220,190,125,0.95)" }}>{name}</span>
          {hub && (
            <span style={{ ...mono, fontSize: 9, color: "rgba(140,105,45,0.65)" }}>Hub {hub}</span>
          )}
          {sanctuary && (
            <span style={{
                ...mono,
                fontSize: 9,
                padding: "2px 6px",
                borderRadius: 2,
                background: "rgba(40,90,50,0.2)",
                border: "1px solid rgba(60,120,70,0.3)",
                color: "rgba(100,180,110,0.8)",
              }}>
              Sanctuary
            </span>
          )}
          {spiritVision && (
            <span style={{
                ...mono,
                fontSize: 9,
                padding: "2px 6px",
                borderRadius: 2,
                background: "rgba(160,135,88,0.1)",
                border: "1px solid rgba(160,135,88,0.25)",
                color: "rgba(160,135,88,0.8)",
              }}>
              Spirit Vision
              {minutesUntilRevival != null && ` — ${minutesUntilRevival}m to revival`}
            </span>
          )}
        </div>

        {/* Description */}
        {desc && (
          <p style={{ 
            fontFamily: "var(--font-geist-sans)", 
            fontSize: 12, 
            lineHeight: 1.6, 
            color: "rgba(210,185,140,0.9)",
            marginBottom: 8
          }}>
            {desc}
          </p>
        )}

        {/* Exits / NPCs / Characters / Objects */}
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: 16, rowGap: 4, paddingTop: 4 }}>
          {exits.length > 0 && (
            <RoomList label="Exits" items={exits} color="rgba(160,130,70,0.8)" />
          )}
          {npcs.length > 0 && (
            <RoomList label="NPCs" items={npcs} color="rgba(140,160,130,0.8)" />
          )}
          {chars.length > 0 && (
            <RoomList label="Agents" items={chars} color="rgba(100,140,180,0.8)" />
          )}
          {objs.length > 0 && (
            <RoomList label="Objects" items={objs} color="rgba(140,105,45,0.65)" />
          )}
        </div>

      </div>
    </div>
  )
}

function RoomList({ label, items, color }: { label: string; items: string[]; color: string }) {
  const mono: React.CSSProperties = { fontFamily: "var(--font-geist-mono)" }
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
      <span style={{ ...mono, fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(140,105,45,0.5)" }}>{label}</span>
      <span style={{ ...mono, fontSize: 10, color }}>{items.join(" · ")}</span>
    </div>
  )
}

function extractNames(arr: unknown): string[] {
  if (!Array.isArray(arr)) return []
  return arr.map((item) => {
    if (typeof item === "string") return item
    if (item && typeof item === "object") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const o = item as any
      return o.name ?? o.key ?? o.npc ?? String(item)
    }
    return String(item)
  })
}
