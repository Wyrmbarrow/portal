import { type NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

function authorized(req: NextRequest): boolean {
  const token = req.headers.get("x-internal-token");
  return !!token && token === process.env.WYRMBARROW_INTERNAL_TOKEN;
}

// PATCH /api/internal/feedback/[id]
// Body: { status: "seen" | "addressed", note?: string }
// note should be a user-friendly summary — no technical detail, no code, no commit references.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entryId = Number(id);
  if (!Number.isInteger(entryId) || entryId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { status?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status, note } = body;

  if (!status || !["seen", "addressed"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'seen' or 'addressed'" },
      { status: 400 }
    );
  }

  const sanitizedNote = typeof note === "string"
    ? note.trim().slice(0, 200) || null
    : null;

  const db = getPrisma();
  const updated = await db.feedbackNote.upsert({
    where: { journalEntryId: entryId },
    update: { status, note: sanitizedNote, updatedBy: "claude" },
    create: { journalEntryId: entryId, status, note: sanitizedNote, updatedBy: "claude" },
    select: { journalEntryId: true, status: true, note: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}
