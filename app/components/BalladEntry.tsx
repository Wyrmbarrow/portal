import type { JournalEntryData } from "@/app/c/[id]/page"

function relativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function parseBalladContent(content: string): { preamble: string; stanzas: string[][] } {
  const blocks = content.split(/\n\n+/)
  const preamble = blocks[0]?.trim() ?? ""
  const stanzas: string[][] = []
  for (let i = 1; i < blocks.length; i++) {
    const lines = blocks[i].split("\n").map(l => l.trim()).filter(Boolean)
    if (lines.length) stanzas.push(lines)
  }
  // If no double-newline structure, treat everything as one stanza
  if (!stanzas.length && !preamble.includes("Minstrel")) {
    const lines = content.split("\n").map(l => l.trim()).filter(Boolean)
    stanzas.push(lines)
    return { preamble: "", stanzas }
  }
  return { preamble, stanzas }
}

// Thin musical staff ornament — 4 lines like blank sheet music
function StaffLines() {
  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        padding: "14px 20px 0",
        marginBottom: 14,
      }}
    >
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            height: 1,
            background: `linear-gradient(to right, transparent, rgba(190,130,25,${0.12 + i * 0.04}), rgba(190,130,25,${0.18 + i * 0.04}), rgba(190,130,25,${0.12 + i * 0.04}), transparent)`,
          }}
        />
      ))}
    </div>
  )
}

export default function BalladEntry({ entry }: { entry: JournalEntryData }) {
  const { preamble, stanzas } = parseBalladContent(entry.content)
  const timeAgo = relativeTime(entry.createdAt)

  return (
    <div
      className="relative overflow-hidden"
      style={{
        border: "1px solid rgba(195,130,22,0.55)",
        background:
          "linear-gradient(160deg, rgba(52,30,4,0.72) 0%, rgba(38,20,3,0.80) 60%, rgba(48,26,4,0.68) 100%)",
        boxShadow:
          "0 0 18px rgba(180,110,15,0.08), inset 0 1px 0 rgba(210,155,35,0.1)",
      }}
    >
      {/* Corner ornaments — slightly more elaborate than regular entries */}
      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: "rgba(195,130,22,0.55)" }} />
      <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: "rgba(195,130,22,0.55)" }} />
      <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: "rgba(195,130,22,0.55)" }} />
      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: "rgba(195,130,22,0.55)" }} />

      {/* Decorative staff lines at top */}
      <StaffLines />

      <div className="px-6 pb-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span
            style={{
              fontFamily: "var(--font-geist-mono)",
              fontSize: 7,
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              color: "rgba(210,150,30,0.75)",
            }}
          >
            ♪ Ballad
          </span>
          <span style={{ color: "rgba(150,100,20,0.45)", fontSize: 8 }}>·</span>
          <span
            style={{
              fontFamily: "var(--font-geist-mono)",
              fontSize: 7,
              letterSpacing: "0.2em",
              color: "rgba(168,120,35,0.6)",
            }}
          >
            The Minstrel
          </span>
          <span style={{ color: "rgba(150,100,20,0.45)", fontSize: 8 }}>·</span>
          <span
            style={{
              fontFamily: "var(--font-geist-mono)",
              fontSize: 7,
              letterSpacing: "0.15em",
              color: "rgba(140,100,30,0.55)",
            }}
          >
            {timeAgo}
          </span>
        </div>

        {/* Preamble — stage direction, italic, muted */}
        {preamble && (
          <p
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 10.5,
              fontStyle: "italic",
              color: "rgba(168,132,72,0.72)",
              lineHeight: 1.65,
              marginBottom: 18,
              paddingBottom: 16,
              borderBottom: "1px solid rgba(155,100,18,0.2)",
            }}
          >
            {preamble}
          </p>
        )}

        {/* Verse stanzas */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {stanzas.map((lines, si) => (
            <div key={si} style={{ textAlign: "center" }}>
              {lines.map((line, li) => {
                const isVerse = line.startsWith("♪")
                const text = isVerse ? line.slice(1).trim() : line
                return (
                  <p
                    key={li}
                    style={{
                      fontFamily: "var(--font-cinzel)",
                      fontSize: 12,
                      lineHeight: 1.85,
                      letterSpacing: "0.04em",
                      color: isVerse
                        ? "rgba(228,192,122,0.95)"
                        : "rgba(190,155,90,0.8)",
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {isVerse && (
                      <span style={{ color: "rgba(205,140,28,0.6)", fontSize: 10, flexShrink: 0 }}>
                        ♪
                      </span>
                    )}
                    {text}
                  </p>
                )
              })}
            </div>
          ))}
        </div>

        {/* Coda mark */}
        <div
          style={{
            marginTop: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              height: 1,
              width: 40,
              background: "linear-gradient(to right, transparent, rgba(180,120,22,0.35))",
            }}
          />
          <span style={{ color: "rgba(195,130,25,0.45)", fontSize: 11 }}>♪</span>
          <div
            style={{
              height: 1,
              width: 40,
              background: "linear-gradient(to left, transparent, rgba(180,120,22,0.35))",
            }}
          />
        </div>
      </div>
    </div>
  )
}
