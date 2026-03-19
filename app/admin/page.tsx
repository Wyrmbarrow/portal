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
      }}
    >
      <div
        style={{
          color: "#71717a",
          fontSize: "0.68rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "0.45rem",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "1.6rem",
          fontWeight: 700,
          color: color ?? "#f4f4f5",
          fontFamily: "var(--font-geist-mono)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ color: "#52525b", fontSize: "0.7rem", marginTop: "0.3rem" }}>
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
  sub,
}: {
  children: React.ReactNode;
  timestamp: string;
  sub?: string;
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
      <div>
        {children}
        {sub && (
          <div style={{ color: "#71717a", fontSize: "0.68rem", marginTop: "0.1rem" }}>{sub}</div>
        )}
      </div>
      <span
        style={{
          color: "#52525b",
          fontSize: "0.68rem",
          whiteSpace: "nowrap",
          marginLeft: "1rem",
          paddingTop: "0.2rem",
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
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
    mcpOnline,
  ] = await Promise.allSettled([
    db.patron.count(),
    db.patronCharacter.count(),
    db.patronCharacter.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
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
  ]);

  const patronCount = patronCountR.status === "fulfilled" ? patronCountR.value : 0;
  const totalChars = totalCharsR.status === "fulfilled" ? totalCharsR.value : 0;
  const recentChars = recentCharsR.status === "fulfilled" ? recentCharsR.value : [];
  const totalDeaths = totalDeathsR.status === "fulfilled" ? totalDeathsR.value : 0;
  const recentDeaths = recentDeathsR.status === "fulfilled" ? recentDeathsR.value : [];
  const totalEntries = totalEntriesR.status === "fulfilled" ? totalEntriesR.value : 0;
  const totalWords =
    wordStatsR.status === "fulfilled" ? (wordStatsR.value._sum.wordCount ?? 0) : 0;
  const entries24h =
    entriesSince24hR.status === "fulfilled" ? entriesSince24hR.value : 0;
  const activeChars24h =
    activeCharsSince24hR.status === "fulfilled" ? activeCharsSince24hR.value.length : 0;
  const mcpUp = mcpOnline.status === "fulfilled" ? mcpOnline.value : false;

  // Supplementary lookups
  const charIds = recentChars.map((c) => Number(c.characterId));
  const deathCharIds = recentDeaths.map((e) => BigInt(e.characterId));
  const patronGoogleIds = [...new Set(recentChars.map((c) => c.patronGoogleId))];

  const [sheetsR, patronEmailsR, deathCharsR] = await Promise.allSettled([
    charIds.length > 0
      ? db.characterSheet.findMany({
          where: { characterId: { in: charIds } },
          select: { characterId: true, data: true },
        })
      : Promise.resolve([]),
    patronGoogleIds.length > 0
      ? db.patron.findMany({
          where: { googleId: { in: patronGoogleIds } },
          select: { googleId: true, email: true },
        })
      : Promise.resolve([]),
    // Select CUID id (for link) + characterId (for lookup key) + characterName
    deathCharIds.length > 0
      ? db.patronCharacter.findMany({
          where: { characterId: { in: deathCharIds } },
          select: { id: true, characterId: true, characterName: true },
        })
      : Promise.resolve([]),
  ]);

  const sheets = sheetsR.status === "fulfilled" ? sheetsR.value : [];
  const patronEmails = patronEmailsR.status === "fulfilled" ? patronEmailsR.value : [];
  const deathChars = deathCharsR.status === "fulfilled" ? deathCharsR.value : [];

  const sheetMap = new Map(sheets.map((s) => [s.characterId, s.data as Record<string, unknown>]));
  const patronMap = new Map(patronEmails.map((p) => [p.googleId, p.email]));
  // Key by characterId (BigInt → string) → { id (CUID), name }
  const deathCharMap = new Map(
    deathChars.map((d) => [d.characterId.toString(), { id: d.id, name: d.characterName }])
  );

  const liveChars = totalChars - totalDeaths;

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
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
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
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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

        {/* Two-column character lists */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          {/* Recently created */}
          <Panel title="Recently Created Characters">
            {recentChars.length === 0 ? (
              <Empty>No characters yet.</Empty>
            ) : (
              recentChars.map((c) => {
                const sheet = sheetMap.get(Number(c.characterId));
                const email = patronMap.get(c.patronGoogleId);
                const classLine = sheet
                  ? `${String(sheet.class ?? "?")}${sheet.subclass ? ` (${String(sheet.subclass)})` : ""} Lv.${String(sheet.level ?? "?")}`
                  : undefined;
                const sub = [classLine, email].filter(Boolean).join(" · ");
                return (
                  // c.id is the CUID used by the /c/[id] route
                  <Row key={c.id} timestamp={fmtDate(c.createdAt)} sub={sub || undefined}>
                    <a
                      href={`/c/${c.id}`}
                      style={{
                        color: "#a78bfa",
                        fontWeight: 500,
                        textDecoration: "none",
                        fontSize: "0.875rem",
                      }}
                    >
                      {c.characterName}
                    </a>
                  </Row>
                );
              })
            )}
          </Panel>

          {/* Recently died */}
          <Panel title="Recently Died Characters">
            {recentDeaths.length === 0 ? (
              <Empty>No deaths recorded.</Empty>
            ) : (
              recentDeaths.map((entry) => {
                const char = deathCharMap.get(BigInt(entry.characterId).toString());
                return (
                  <Row
                    key={entry.id}
                    timestamp={fmtDate(entry.createdAt)}
                    sub={entry.locationName || undefined}
                  >
                    {char ? (
                      // Use the CUID id for the link, same as /c/[id] expects
                      <a
                        href={`/c/${char.id}`}
                        style={{
                          color: "#f87171",
                          fontWeight: 500,
                          textDecoration: "none",
                          fontSize: "0.875rem",
                        }}
                      >
                        {char.name}
                      </a>
                    ) : (
                      <span style={{ color: "#71717a", fontSize: "0.875rem" }}>
                        Character #{entry.characterId}
                      </span>
                    )}
                  </Row>
                );
              })
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}
