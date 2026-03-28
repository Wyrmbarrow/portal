import type { JournalEntryData } from "@/app/c/[id]/page"
import BalladEntry from "@/app/components/BalladEntry"
import DeathEntry from "@/app/components/DeathEntry"

const ENTRY_TYPE_LABELS: Record<string, string> = {
  status_update: "Status Update",
  long_rest: "Long Rest",
  note: "Note",
  death: "Death",
  ballad: "Ballad",
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
  failed: boolean
}

export default function JournalFeed({ entries, failed }: Props) {
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
        {entries.length > 0 && (
          <span
            className="text-[8px]"
            style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(140,112,62,0.72)" }}
          >
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {/* Empty / error states */}
      {failed ? (
        <p className="text-xs" style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(152,128,82,0.84)" }}>
          Journal unavailable.
        </p>
      ) : entries.length === 0 ? (
        <p className="text-xs" style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(152,128,82,0.84)" }}>
          No journal entries yet.
        </p>
      ) : (
        entries.map((entry) => {
          if (entry.entryType === "death") {
            return <DeathEntry key={entry.id} entry={entry} />
          }
          if (entry.entryType === "ballad") {
            return <BalladEntry key={entry.id} entry={entry} />
          }

          return (
            <div
              key={entry.id}
              className="relative overflow-hidden"
              style={{
                border: "1px solid rgba(118,82,24,0.68)",
                background: "rgba(68,38,7,0.38)",
              }}
            >
              {/* Corner ornaments */}
              <span className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: "rgba(195,125,32,0.68)" }} />
              <span className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: "rgba(195,125,32,0.68)" }} />
              <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: "rgba(195,125,32,0.68)" }} />
              <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: "rgba(195,125,32,0.68)" }} />

              <div className="px-5 pt-4 pb-5">
                {/* Entry header */}
                <p
                  className="text-[8px] tracking-[0.3em] uppercase mb-3"
                  style={{
                    fontFamily: "var(--font-geist-mono)",
                    color: "rgba(192,128,42,0.85)",
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
                    color: "rgba(200,175,130,0.9)",
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
