export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

// ── Inline layout helpers (server-only, no "use client") ─────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "#18181b",
        border: "1px solid #27272a",
        borderRadius: "0.5rem",
        padding: "1.1rem 1.25rem",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontSize: "1.6rem",
          fontWeight: 700,
          color: color ?? "#f4f4f5",
          fontFamily: "var(--font-geist-mono)",
          lineHeight: 1,
          marginBottom: "0.45rem",
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: "#71717a",
          fontSize: "0.68rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      {sub && (
        <div style={{ color: "#52525b", fontSize: "0.7rem", marginTop: "0.2rem" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#18181b",
        border: "1px solid #27272a",
        borderRadius: "0.5rem",
        padding: "1.25rem",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-cinzel)",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "#71717a",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "0.875rem",
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({
  children,
  timestamp,
  detail,
  patron,
}: {
  children: React.ReactNode;
  timestamp: string;
  detail?: string;
  patron?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "0.45rem 0",
        borderBottom: "1px solid #27272a",
      }}
    >
      <div style={{ minWidth: 0 }}>
        {children}
        {(detail || patron) && (
          <div style={{ color: "#71717a", fontSize: "0.67rem", marginTop: "0.1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {[detail, patron].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
      <span
        style={{
          color: "#52525b",
          fontSize: "0.67rem",
          whiteSpace: "nowrap",
          marginLeft: "0.75rem",
          paddingTop: "0.2rem",
          flexShrink: 0,
        }}
      >
        {timestamp}
      </span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "#52525b", fontSize: "0.8rem", padding: "0.25rem 0" }}>{children}</p>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: Date) {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60)   return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60)   return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function classLine(data: Record<string, unknown> | undefined): string | undefined {
  if (!data) return undefined;
  const cls = String(data.class ?? "?");
  const sub = data.subclass ? ` (${String(data.subclass)})` : "";
  const lvl = String(data.level ?? "?");
  return `${cls}${sub} Lv.${lvl}`;
}

async function checkMcpHealth(): Promise<boolean> {
  const mcpUrl = process.env.WYRMBARROW_MCP_URL ?? "https://mcp.wyrmbarrow.com";
  try {
    const res = await fetch(`${mcpUrl}/health`, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!session?.user?.email) redirect("/");
  if (!adminEmail || session.user.email !== adminEmail) redirect("/");

  const db = getPrisma();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // ── Round 1: main stats ───────────────────────────────────────────────────

  const [
    patronCountR,
    totalCharsR,
    recentCharsR,
    totalDeathsR,
    recentDeathsR,
    totalEntriesR,
    wordStatsR,
    entriesSince24hR,
    activeCharsSince24hR,
    mcpOnlineR,
    recentActivityR,
    activeNowR,
  ] = await Promise.allSettled([
    db.patron.count(),
    db.patronCharacter.count(),
    db.patronCharacter.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.journalEntry.count({ where: { entryType: "death" } }),
    db.journalEntry.findMany({
      where: { entryType: "death" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.journalEntry.count({ where: { entryType: { not: "ooc" } } }),
    db.journalEntry.aggregate({ _sum: { wordCount: true } }),
    db.journalEntry.count({
      where: { entryType: { not: "ooc" }, createdAt: { gte: since24h } },
    }),
    db.journalEntry.groupBy({
      by: ["characterId"],
      where: { createdAt: { gte: since24h } },
    }),
    checkMcpHealth(),
    db.journalEntry.groupBy({
      by: ["characterId"],
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      take: 10,
    }),
    db.characterPresence.findMany({
      orderBy: { lastActiveAt: "desc" },
    }),
  ]);

  const patronCount    = patronCountR.status    === "fulfilled" ? patronCountR.value    : 0;
  const totalChars     = totalCharsR.status     === "fulfilled" ? totalCharsR.value     : 0;
  const recentChars    = recentCharsR.status    === "fulfilled" ? recentCharsR.value    : [];
  const totalDeaths    = totalDeathsR.status    === "fulfilled" ? totalDeathsR.value    : 0;
  const recentDeaths   = recentDeathsR.status   === "fulfilled" ? recentDeathsR.value   : [];
  const totalEntries   = totalEntriesR.status   === "fulfilled" ? totalEntriesR.value   : 0;
  const totalWords     = wordStatsR.status      === "fulfilled" ? (wordStatsR.value._sum.wordCount ?? 0) : 0;
  const entries24h     = entriesSince24hR.status === "fulfilled" ? entriesSince24hR.value : 0;
  const activeChars24h = activeCharsSince24hR.status === "fulfilled" ? activeCharsSince24hR.value.length : 0;
  const mcpUp          = mcpOnlineR.status      === "fulfilled" ? mcpOnlineR.value      : false;
  const recentActivity = recentActivityR.status === "fulfilled" ? recentActivityR.value : [];
  const activeNow      = activeNowR.status      === "fulfilled" ? activeNowR.value      : [];

  // ── Round 2: supplementary lookups ───────────────────────────────────────
  // Collect all characterIds across all three panels so we can fetch sheets
  // and patron records in one go.

  const deathCharIdsBig   = recentDeaths.map((e) => BigInt(e.characterId));
  const activeCharIdsBig  = recentActivity.map((r) => BigInt(r.characterId));
  const activeNowIdsBig   = activeNow.map((c) => c.characterId); // already BigInt from Prisma

  const allCharIdsInt = [
    ...new Set([
      ...recentChars.map((c) => Number(c.characterId)),
      ...recentDeaths.map((e) => e.characterId),          // already Int
      ...recentActivity.map((r) => r.characterId),        // already Int
      ...activeNow.map((c) => Number(c.characterId)),     // BigInt → Int
    ]),
  ];

  const [allSheetsR, allPatronsR, deathCharsR, activeCharsR, activeNowCharsR] = await Promise.allSettled([
    // Sheets for every character across all panels
    allCharIdsInt.length > 0
      ? db.characterSheet.findMany({
          where: { characterId: { in: allCharIdsInt } },
          select: { characterId: true, data: true },
        })
      : Promise.resolve([]),
    // All patron emails — small table, fetch entire set once
    db.patron.findMany({ select: { googleId: true, email: true } }),
    // PatronCharacter records for recently-died (need CUID id + patronGoogleId)
    deathCharIdsBig.length > 0
      ? db.patronCharacter.findMany({
          where: { characterId: { in: deathCharIdsBig } },
          select: { id: true, characterId: true, characterName: true, patronGoogleId: true },
        })
      : Promise.resolve([]),
    // PatronCharacter records for recently-active (need CUID id + patronGoogleId)
    activeCharIdsBig.length > 0
      ? db.patronCharacter.findMany({
          where: { characterId: { in: activeCharIdsBig } },
          select: { id: true, characterId: true, characterName: true, patronGoogleId: true },
        })
      : Promise.resolve([]),
    // PatronCharacter records for currently in-world
    activeNowIdsBig.length > 0
      ? db.patronCharacter.findMany({
          where: { characterId: { in: activeNowIdsBig } },
          select: { id: true, characterId: true, characterName: true, patronGoogleId: true },
        })
      : Promise.resolve([]),
  ]);

  const allSheets      = allSheetsR.status      === "fulfilled" ? allSheetsR.value      : [];
  const allPatrons     = allPatronsR.status     === "fulfilled" ? allPatronsR.value     : [];
  const deathChars     = deathCharsR.status     === "fulfilled" ? deathCharsR.value     : [];
  const activeChars    = activeCharsR.status    === "fulfilled" ? activeCharsR.value    : [];
  const activeNowChars = activeNowCharsR.status === "fulfilled" ? activeNowCharsR.value : [];

  // ── Lookup maps ───────────────────────────────────────────────────────────

  // characterId (Int) → sheet data
  const sheetMap = new Map(allSheets.map((s) => [s.characterId, s.data as Record<string, unknown>]));
  // googleId → email
  const patronMap = new Map(allPatrons.map((p) => [p.googleId, p.email]));
  // characterId (BigInt → string) → { id (CUID), name, patronGoogleId }
  const deathCharMap    = new Map(deathChars.map((d)  => [d.characterId.toString(), { id: d.id, name: d.characterName, googleId: d.patronGoogleId }]));
  const activeCharMap   = new Map(activeChars.map((c) => [c.characterId.toString(), { id: c.id, name: c.characterName, googleId: c.patronGoogleId }]));
  const activeNowCharMap = new Map(activeNowChars.map((c) => [c.characterId.toString(), { id: c.id, name: c.characterName, googleId: c.patronGoogleId }]));

  // Fallback: resolve NPC/system character names from ObjectDB for IDs not in patronCharacter
  const resolvedPatronIds = new Set([
    ...deathChars.map((d) => Number(d.characterId)),
    ...activeChars.map((c) => Number(c.characterId)),
    ...activeNowChars.map((c) => Number(c.characterId)),
  ]);
  const unresolvedIds = allCharIdsInt.filter((id) => !resolvedPatronIds.has(id));
  const objectDbNames = new Map<number, string>();
  if (unresolvedIds.length > 0) {
    try {
      const rows = await db.$queryRawUnsafe<{ id: number; db_key: string }[]>(
        `SELECT id, db_key FROM objects_objectdb WHERE id IN (${unresolvedIds.map((_, i) => `$${i + 1}`).join(", ")})`,
        ...unresolvedIds,
      );
      for (const r of rows) {
        objectDbNames.set(Number(r.id), r.db_key);
      }
    } catch {
      // ObjectDB table may not be accessible — fall through to generic label
    }
  }

  const liveChars = totalChars - totalDeaths;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#e4e4e7",
        padding: "2rem 1.5rem",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              fontFamily: "var(--font-cinzel)",
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "#f4f4f5",
              marginBottom: "0.2rem",
            }}
          >
            Wyrmbarrow Admin
          </h1>
          <p style={{ color: "#52525b", fontSize: "0.75rem" }}>
            {session.user.email} &mdash;{" "}
            <span
              style={{
                color: mcpUp ? "#4ade80" : "#f87171",
                fontFamily: "var(--font-geist-mono)",
              }}
            >
              {mcpUp ? "● MCP Server online" : "● MCP Server offline"}
            </span>
          </p>
        </div>

        {/* Stat grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          <StatCard label="Patrons" value={patronCount} />
          <StatCard label="Total Characters" value={totalChars} />
          <StatCard label="Living" value={liveChars} color="#4ade80" />
          <StatCard
            label="Deaths"
            value={totalDeaths}
            color={totalDeaths > 0 ? "#f87171" : undefined}
          />
          <StatCard
            label="Active (24h)"
            value={activeChars24h}
            color={activeChars24h > 0 ? "#60a5fa" : undefined}
            sub={`${entries24h} entries`}
          />
          <StatCard label="Journal Entries" value={totalEntries.toLocaleString()} />
          <StatCard label="Words Written" value={totalWords.toLocaleString()} />
        </div>

        {/* Currently in-world */}
        <div style={{ marginBottom: "1rem" }}>
          <Panel title={`Currently In-World${activeNow.length > 0 ? ` · ${activeNow.length}` : ""}`}>
            {activeNow.length === 0 ? (
              <Empty>No agents currently in-world.</Empty>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "0.5rem",
                }}
              >
                {activeNow.map((c) => {
                  const rec   = activeNowCharMap.get(c.characterId.toString());
                  const sheet = sheetMap.get(Number(c.characterId));
                  return (
                    <div
                      key={c.characterId.toString()}
                      style={{
                        background: "#0f1a12",
                        border: "1px solid #166534",
                        borderRadius: "0.375rem",
                        padding: "0.6rem 0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                        {rec ? (
                          <a
                            href={`/c/${rec.id}`}
                            style={{ color: "#4ade80", fontWeight: 600, textDecoration: "none", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono)" }}
                          >
                            {c.characterName}
                          </a>
                        ) : (
                          <span style={{ color: "#4ade80", fontWeight: 600, fontSize: "0.85rem", fontFamily: "var(--font-geist-mono)" }}>
                            {c.characterName}
                          </span>
                        )}
                        <span style={{ color: "#16a34a", fontSize: "0.65rem", fontFamily: "var(--font-geist-mono)" }}>
                          {fmtDate(c.lastActiveAt)}
                        </span>
                      </div>
                      <div style={{ color: "#86efac", fontSize: "0.72rem", lineHeight: 1.4 }}>
                        {c.locationName ?? "Limbo"}
                        {c.locationHub && (
                          <span style={{ color: "#4d7c0f", marginLeft: "0.4rem" }}>· {c.locationHub}</span>
                        )}
                      </div>
                      {sheet && (
                        <div style={{ color: "#52525b", fontSize: "0.65rem", marginTop: "0.15rem" }}>
                          {classLine(sheet)}
                          {rec && <span style={{ marginLeft: "0.4rem" }}>· {patronMap.get(rec.googleId) ?? ""}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* Three-column character panels: Active · Created · Died */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          {/* Recently active */}
          <Panel title="Recently Active">
            {recentActivity.length === 0 ? (
              <Empty>No activity yet.</Empty>
            ) : (
              recentActivity.map((r) => {
                const char    = activeCharMap.get(BigInt(r.characterId).toString());
                const sheet   = sheetMap.get(r.characterId);
                const lastSeen = r._max.createdAt;
                return (
                  <Row
                    key={r.characterId}
                    timestamp={lastSeen ? fmtDate(lastSeen) : "—"}
                    detail={classLine(sheet)}
                    patron={char ? patronMap.get(char.googleId) ?? undefined : undefined}
                  >
                    {char ? (
                      <a
                        href={`/c/${char.id}`}
                        style={{ color: "#60a5fa", fontWeight: 500, textDecoration: "none", fontSize: "0.85rem" }}
                      >
                        {char.name}
                      </a>
                    ) : (
                      <span style={{ color: "#71717a", fontSize: "0.85rem" }}>
                        {objectDbNames.get(r.characterId) ?? `Character #${r.characterId}`}
                      </span>
                    )}
                  </Row>
                );
              })
            )}
          </Panel>

          {/* Recently created */}
          <Panel title="Recently Created">
            {recentChars.length === 0 ? (
              <Empty>No characters yet.</Empty>
            ) : (
              recentChars.map((c) => {
                const sheet = sheetMap.get(Number(c.characterId));
                return (
                  <Row
                    key={c.id}
                    timestamp={fmtDate(c.createdAt)}
                    detail={classLine(sheet)}
                    patron={patronMap.get(c.patronGoogleId) ?? undefined}
                  >
                    <a
                      href={`/c/${c.id}`}
                      style={{ color: "#a78bfa", fontWeight: 500, textDecoration: "none", fontSize: "0.85rem" }}
                    >
                      {c.characterName}
                    </a>
                  </Row>
                );
              })
            )}
          </Panel>

          {/* Recently died */}
          <Panel title="Recently Died">
            {recentDeaths.length === 0 ? (
              <Empty>No deaths recorded.</Empty>
            ) : (
              recentDeaths.map((entry) => {
                const char  = deathCharMap.get(BigInt(entry.characterId).toString());
                const sheet = sheetMap.get(entry.characterId);
                return (
                  <Row
                    key={entry.id}
                    timestamp={fmtDate(entry.createdAt)}
                    detail={classLine(sheet)}
                    patron={char ? patronMap.get(char.googleId) ?? undefined : undefined}
                  >
                    {char ? (
                      <a
                        href={`/c/${char.id}`}
                        style={{ color: "#f87171", fontWeight: 500, textDecoration: "none", fontSize: "0.85rem" }}
                      >
                        {char.name}
                      </a>
                    ) : (
                      <span style={{ color: "#71717a", fontSize: "0.85rem" }}>
                        {objectDbNames.get(entry.characterId) ?? `Character #${entry.characterId}`}
                      </span>
                    )}
                  </Row>
                );
              })
            )}
          </Panel>
        </div>

        {/* Hub pressures — requires game server access, not yet available from portal */}
        <Panel title="Hub Pressures">
          <Empty>Coming soon.</Empty>
        </Panel>
      </div>
    </main>
  );
}
