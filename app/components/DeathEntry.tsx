import type { JournalEntryData } from "@/app/c/[id]/page"

function relativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function parseDeathContent(content: string) {
  // Extract character name and location from "Name died in Location."
  const diedMatch = content.match(/^(\S+)\s+died\s+in\s+(.+?)\./m)
  const characterName = diedMatch?.[1] ?? null
  const location = diedMatch?.[2] ?? null

  // Extract killer
  const killerMatch = content.match(/Killed by:\s*(.+)/m)
  const killedBy = killerMatch?.[1]?.trim() ?? null

  // Extract msg from Python dict notation: 'msg': 'value'
  const msgMatch = content.match(/'msg':\s*'([^']+)'/)
  const finalMsg = msgMatch?.[1] ?? null

  // Narrative: everything before "Final moments:" (or the whole thing if no dict)
  const narrative = content.replace(/\n*Final moments:[\s\S]*$/, "").trim()

  return { characterName, location, killedBy, finalMsg, narrative }
}

const STONE = "rgba(75,85,95,0.5)"
const STONE_BG_TOP = "#1e2124"
const STONE_BG_BTM = "#252829"

export default function DeathEntry({ entry }: { entry: JournalEntryData }) {
  const { characterName, location, killedBy, finalMsg, narrative } = parseDeathContent(entry.content)
  const timeAgo = relativeTime(entry.createdAt)

  return (
    <div className="flex justify-center py-2">
      <div style={{ width: 300 }}>

        {/* ── Arch ── */}
        <div
          style={{
            height: 68,
            background: `linear-gradient(to bottom, ${STONE_BG_TOP}, ${STONE_BG_BTM})`,
            border: `1px solid ${STONE}`,
            borderBottom: "none",
            borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 18,
          }}
        >
          <span
            style={{
              color: "rgba(130,142,155,0.45)",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ✝
          </span>
        </div>

        {/* ── Body ── */}
        <div
          style={{
            background: `linear-gradient(to bottom, ${STONE_BG_BTM}, ${STONE_BG_TOP})`,
            border: `1px solid ${STONE}`,
            borderTop: "none",
            padding: "18px 32px 26px",
            textAlign: "center",
          }}
        >
          {/* HERE LIES */}
          <p
            style={{
              fontFamily: "var(--font-geist-mono)",
              fontSize: 7,
              letterSpacing: "0.55em",
              textTransform: "uppercase",
              color: "rgba(120,132,145,0.55)",
              marginBottom: 8,
            }}
          >
            here lies
          </p>

          {/* Name */}
          <h2
            style={{
              fontFamily: "var(--font-cinzel)",
              fontSize: characterName && characterName.length > 12 ? 18 : 22,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(210,215,220,0.9)",
              fontWeight: 600,
              textShadow:
                "0 1px 3px rgba(0,0,0,0.9), 0 -1px 0 rgba(255,255,255,0.04)",
              marginBottom: 14,
              lineHeight: 1.2,
            }}
          >
            {characterName ?? "Unknown"}
          </h2>

          {/* Rule */}
          <div
            style={{
              height: 1,
              background:
                "linear-gradient(to right, transparent, rgba(75,85,95,0.5), transparent)",
              margin: "0 auto 14px",
            }}
          />

          {/* Location */}
          {location && (
            <p
              style={{
                fontFamily: "var(--font-cinzel)",
                fontSize: 10,
                color: "rgba(168,178,188,0.72)",
                marginBottom: 5,
                letterSpacing: "0.05em",
              }}
            >
              Fell in {location}
            </p>
          )}

          {/* Killer */}
          {killedBy && (
            <p
              style={{
                fontFamily: "var(--font-geist-mono)",
                fontSize: 8,
                color: "rgba(130,140,152,0.6)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 0,
              }}
            >
              Slain by {killedBy}
            </p>
          )}

          {/* Final words */}
          {finalMsg && (
            <>
              <div
                style={{
                  height: 1,
                  background:
                    "linear-gradient(to right, transparent, rgba(65,75,85,0.38), transparent)",
                  margin: "16px auto",
                }}
              />
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 11,
                  fontStyle: "italic",
                  color: "rgba(155,165,175,0.68)",
                  lineHeight: 1.65,
                  letterSpacing: "0.01em",
                }}
              >
                &ldquo;{finalMsg}&rdquo;
              </p>
            </>
          )}

          {/* Fallback: if no structured data, show raw narrative */}
          {!characterName && narrative && (
            <>
              <div
                style={{
                  height: 1,
                  background:
                    "linear-gradient(to right, transparent, rgba(65,75,85,0.38), transparent)",
                  margin: "14px auto",
                }}
              />
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 11,
                  color: "rgba(155,165,175,0.7)",
                  lineHeight: 1.65,
                  textAlign: "left",
                }}
              >
                {narrative}
              </p>
            </>
          )}

          {/* Time */}
          <p
            style={{
              fontFamily: "var(--font-geist-mono)",
              fontSize: 7,
              color: "rgba(90,100,112,0.55)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              marginTop: 18,
            }}
          >
            {timeAgo}
          </p>
        </div>

        {/* ── Base slab shadow ── */}
        <div
          style={{
            height: 6,
            background:
              "linear-gradient(to bottom, rgba(10,12,14,0.7), transparent)",
            marginTop: 0,
          }}
        />
      </div>
    </div>
  )
}
