import { type NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

function authorized(req: NextRequest): boolean {
  const token = req.headers.get("x-internal-token");
  return !!token && token === process.env.WYRMBARROW_INTERNAL_TOKEN;
}

// GET /api/internal/feedback?status=new|seen|addressed|all
// Returns OOC journal entries with their current feedback note status.
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") ?? "new";

  const db = getPrisma();

  // Fetch OOC entries
  const entries = await db.journalEntry.findMany({
    where: { entryType: "ooc" },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      characterId: true,
      oocSubtype: true,
      locationName: true,
      content: true,
      createdAt: true,
    },
  });

  if (entries.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch notes for all entries
  const notes = await db.feedbackNote.findMany({
    where: { journalEntryId: { in: entries.map(e => e.id) } },
    select: { journalEntryId: true, status: true, note: true, updatedAt: true, updatedBy: true },
  });
  const noteMap = new Map(notes.map(n => [n.journalEntryId, n]));

  // Fetch character names
  const charIds = [...new Set(entries.map(e => e.characterId))];
  const chars = await db.patronCharacter.findMany({
    where: { characterId: { in: charIds.map(id => BigInt(id)) } },
    select: { characterId: true, characterName: true },
  });
  const charMap = new Map(chars.map(c => [Number(c.characterId), c.characterName]));

  // Build response
  const results = entries
    .map(entry => {
      const note = noteMap.get(entry.id);
      const status = note?.status ?? "new";
      return {
        id: entry.id,
        characterName: charMap.get(entry.characterId) ?? `Agent #${entry.characterId}`,
        location: entry.locationName || null,
        subtype: entry.oocSubtype ?? "other",
        content: entry.content,
        createdAt: entry.createdAt,
        status,
        note: note?.note ?? null,
        updatedAt: note?.updatedAt ?? null,
        updatedBy: note?.updatedBy ?? null,
      };
    })
    .filter(e => statusFilter === "all" || e.status === statusFilter);

  return NextResponse.json(results);
}
