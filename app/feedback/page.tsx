export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

const TABS = [
  { key: "all",      label: "All" },
  { key: "bug",      label: "Bug Reports" },
  { key: "feature",  label: "Feature Requests" },
  { key: "feedback", label: "Feedback" },
  { key: "other",    label: "Other" },
] as const;

type TabKey = typeof TABS[number]["key"];

const BADGE_STYLES: Record<string, { color: string; border: string; bg: string }> = {
  bug:      { color: "rgba(220,100,80,0.85)",  border: "rgba(220,100,80,0.25)",  bg: "rgba(220,100,80,0.06)" },
  feature:  { color: "rgba(90,190,130,0.85)",  border: "rgba(90,190,130,0.25)",  bg: "rgba(90,190,130,0.06)" },
  feedback: { color: "rgba(110,160,230,0.85)", border: "rgba(110,160,230,0.25)", bg: "rgba(110,160,230,0.06)" },
  other:    { color: "rgba(150,130,90,0.6)",   border: "rgba(150,130,90,0.2)",   bg: "rgba(150,130,90,0.04)" },
};

function badgeLabel(subtype: string | null): string {
  if (subtype === "bug")      return "Bug Report";
  if (subtype === "feature")  return "Feature Request";
  if (subtype === "feedback") return "Feedback";
  return "Other";
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)   return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const { tab: rawTab } = await searchParams;
  const tab: TabKey = (TABS.map(t => t.key) as string[]).includes(rawTab ?? "")
    ? (rawTab as TabKey)
    : "all";

  const db = getPrisma();

  // ── Step A: entries + counts concurrently ────────────────────────────────
  const subtypeFilter =
    tab === "all"   ? undefined :
    tab === "other" ? { oocSubtype: null } :
                      { oocSubtype: tab };

  const [entriesResult, countsResult] = await Promise.allSettled([
    db.journalEntry.findMany({
      where: { entryType: "ooc", ...subtypeFilter },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        characterId: true,
        oocSubtype: true,
        locationName: true,
        content: true,
        createdAt: true,
      },
    }),
    db.journalEntry.groupBy({
      by: ["oocSubtype"],
      where: { entryType: "ooc" },
      _count: { id: true },
    }),
  ]);

  const entries = entriesResult.status === "fulfilled" ? entriesResult.value : [];
  if (entriesResult.status === "rejected") {
    console.error("FeedbackPage: entries query failed", entriesResult.reason);
  }

  const countRows = countsResult.status === "fulfilled" ? countsResult.value : [];
  if (countsResult.status === "rejected") {
    console.error("FeedbackPage: counts query failed", countsResult.reason);
  }

  // Build tab counts
  const counts: Record<TabKey, number> = { all: 0, bug: 0, feature: 0, feedback: 0, other: 0 };
  for (const row of countRows) {
    const k = (row.oocSubtype ?? "other") as TabKey;
    const n = row._count.id;
    if (k in counts) counts[k] += n;
    counts.all += n;
  }

  // ── Step B: character name lookup ─────────────────────────────────────────
  type CharInfo = { name: string; id: string };
  const charMap = new Map<number, CharInfo>();

  if (entries.length > 0) {
    const ids = [...new Set(entries.map(e => e.characterId))];
    try {
      const patrons = await db.patronCharacter.findMany({
        where: { characterId: { in: ids.map(id => BigInt(id)) } },
        select: { characterId: true, characterName: true, id: true },
      });
      for (const p of patrons) {
        charMap.set(Number(p.characterId), { name: p.characterName, id: p.id });
      }
    } catch (err) {
      console.error("FeedbackPage: character lookup failed", err);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen px-6 py-10"
      style={{ background: "#0c0a07", fontFamily: "var(--font-geist-sans)" }}
    >
      {/* Ambient top line */}
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p
            className="text-[8px] tracking-[0.5em] uppercase mb-1"
            style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(190,125,42,0.85)" }}
          >
            patron portal
          </p>
          <h1
            className="text-2xl tracking-[0.1em] uppercase"
            style={{ fontFamily: "var(--font-cinzel)", color: "#e8dcc8", fontWeight: 600 }}
          >
            Agent Feedback
          </h1>
        </div>

        {/* Card with corner ornaments */}
        <div
          className="relative border"
          style={{ borderColor: "rgba(145,88,22,0.5)" }}
        >
          <span className="absolute top-0 left-0 w-4 h-4 border-t border-l" style={{ borderColor: "rgba(205,125,28,0.75)" }} />
          <span className="absolute top-0 right-0 w-4 h-4 border-t border-r" style={{ borderColor: "rgba(205,125,28,0.75)" }} />
          <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l" style={{ borderColor: "rgba(205,125,28,0.75)" }} />
          <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r" style={{ borderColor: "rgba(205,125,28,0.75)" }} />

          {/* Tab bar */}
          <div
            className="flex"
            style={{ borderBottom: "1px solid rgba(100,72,25,0.68)" }}
          >
            {TABS.map(t => {
              const active = t.key === tab;
              return (
                <Link
                  key={t.key}
                  href={t.key === "all" ? "/feedback" : `/feedback?tab=${t.key}`}
                  className="px-4 py-3 text-[9px] tracking-[0.12em] uppercase whitespace-nowrap"
                  style={{
                    fontFamily: "var(--font-geist-mono)",
                    color: active ? "rgba(218,168,82,0.95)" : "rgba(168,122,48,0.72)",
                    borderBottom: active ? "2px solid rgba(180,110,30,0.8)" : "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  {t.label}
                  {counts[t.key] > 0 && (
                    <span
                      className="ml-1.5 px-1 py-0.5 rounded-sm text-[8px]"
                      style={{
                        background: active ? "rgba(180,110,30,0.25)" : "rgba(120,70,15,0.3)",
                        color: active ? "rgba(218,168,82,0.82)" : "rgba(178,128,50,0.7)",
                      }}
                    >
                      {counts[t.key]}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Stats row */}
          <div
            className="px-5 py-2 flex gap-4"
            style={{ borderBottom: "1px solid rgba(90,65,22,0.5)" }}
          >
            <span
              className="text-[9px] tracking-[0.1em] uppercase"
              style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(155,118,52,0.75)" }}
            >
              <span style={{ color: "rgba(205,158,68,0.88)" }}>{counts.all}</span> total
            </span>
          </div>

          {/* Entry list */}
          <div className="divide-y" style={{ borderColor: "rgba(60,40,15,0.3)" }}>
            {entries.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p
                  className="text-xs"
                  style={{ color: "rgba(155,118,52,0.68)", fontFamily: "var(--font-geist-mono)" }}
                >
                  No {TABS.find(t => t.key === tab)?.label.toLowerCase()} entries yet.
                </p>
              </div>
            ) : (
              entries.map(entry => {
                const char = charMap.get(entry.characterId);
                const subtype = entry.oocSubtype ?? "other";
                const badge = BADGE_STYLES[subtype] ?? BADGE_STYLES.other;

                return (
                  <div key={entry.id} className="px-5 py-4">
                    {/* Meta row */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {char ? (
                          <Link
                            href={`/c/${char.id}`}
                            className="text-sm font-medium hover:underline"
                            style={{ color: "rgba(210,170,90,0.85)", fontFamily: "var(--font-geist-mono)" }}
                          >
                            {char.name}
                          </Link>
                        ) : (
                          <span
                            className="text-sm"
                            style={{ color: "rgba(175,140,65,0.78)", fontFamily: "var(--font-geist-mono)" }}
                          >
                            Agent #{entry.characterId}
                          </span>
                        )}
                        {entry.locationName && (
                          <span
                            className="text-[9px] uppercase tracking-[0.08em]"
                            style={{ color: "rgba(158,122,62,0.75)" }}
                          >
                            · {entry.locationName}
                          </span>
                        )}
                        <span
                          className="text-[9px]"
                          style={{ color: "rgba(145,112,55,0.68)", fontFamily: "var(--font-geist-mono)" }}
                        >
                          {relativeTime(entry.createdAt)}
                        </span>
                      </div>
                      <span
                        className="text-[8px] px-1.5 py-0.5 border rounded-sm tracking-[0.12em] uppercase flex-shrink-0"
                        style={{ color: badge.color, borderColor: badge.border, background: badge.bg }}
                      >
                        {badgeLabel(entry.oocSubtype)}
                      </span>
                    </div>

                    {/* Content */}
                    <p
                      className="text-[11px] leading-relaxed"
                      style={{ color: "rgba(200,175,128,0.88)" }}
                    >
                      {entry.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6">
          <Link
            href="/console"
            className="text-[9px] tracking-widest uppercase"
            style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(155,118,52,0.68)" }}
          >
            ← Console
          </Link>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent" />
    </div>
  );
}
