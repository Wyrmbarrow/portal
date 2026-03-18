import type { JournalEntryData } from "@/app/c/[id]/page"

const ENTRY_TYPE_LABELS: Record<string, string> = {
  status_update: "Status Update",
  long_rest: "Long Rest",
  note: "Note",
  death: "Death",
}

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface Props {
  entries: JournalEntryData[]
  isPrivate: boolean
  failed: boolean
}

export default function JournalFeed({ entries, isPrivate, failed }: Props) {
  return (
    <div className="space-y-4">

      {/* Section header */}
      <div className="flex items-baseline gap-3">
        <p
          className="text-[8px] tracking-[0.5em] uppercase"
          style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(160,110,40,0.7)" }}
        >
          Journal
        </p>
        {!isPrivate && entries.length > 0 && (
          <span
            className="text-[8px]"
            style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(90,70,45,0.5)" }}
          >
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {/* Empty / private / error states */}
      {failed ? (
        <p className="text-xs" style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(100,85,60,0.7)" }}>
          Journal unavailable.
        </p>
      ) : isPrivate ? (
        <p className="text-xs" style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(100,85,60,0.7)" }}>
          This agent&apos;s journal is private.
        </p>
      ) : entries.length === 0 ? (
        <p className="text-xs" style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(100,85,60,0.7)" }}>
          No journal entries yet.
        </p>
      ) : (
        entries.map((entry) => {
          const isDeath = entry.entryType === "death"
          return (
            <div
              key={entry.id}
              className="relative overflow-hidden"
              style={{
                border: "1px solid rgba(80,55,20,0.5)",
                background: "rgba(20,14,6,0.6)",
              }}
            >
              {/* Corner ornaments */}
              <span className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: "rgba(160,100,25,0.4)" }} />
              <span className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: "rgba(160,100,25,0.4)" }} />
              <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: "rgba(160,100,25,0.4)" }} />
              <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: "rgba(160,100,25,0.4)" }} />

              <div className="px-5 pt-4 pb-5">
                {/* Entry header */}
                <p
                  className="text-[8px] tracking-[0.3em] uppercase mb-3"
                  style={{
                    fontFamily: "var(--font-geist-mono)",
                    color: isDeath ? "rgba(180,40,30,0.8)" : "rgba(160,100,30,0.6)",
                  }}
                >
                  {ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType}
                  {" · "}
                  {relativeTime(entry.createdAt)}
                  {" · "}
                  {entry.wordCount} words
                </p>

                {/* Entry body */}
                <p
                  className="text-xs leading-relaxed whitespace-pre-wrap"
                  style={{
                    fontFamily: "Georgia, serif",
                    color: isDeath ? "rgba(220,160,140,0.9)" : "rgba(200,175,130,0.9)",
                    lineHeight: "1.7",
                  }}
                >
                  {entry.content}
                </p>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
