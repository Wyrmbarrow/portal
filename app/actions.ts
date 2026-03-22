"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

export async function generateHash(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const googleId = (session.user as typeof session.user & { googleId: string }).googleId;
  if (!googleId) throw new Error("No Google ID on session");

  const db = getPrisma();
  let patron = await db.patron.findUnique({ where: { googleId } });
  if (!patron) {
    patron = await db.patron.findUnique({ where: { email: session.user.email! } });
  }
  if (!patron) throw new Error("Patron not found — please sign out and sign back in");

  const hash = randomBytes(32).toString("hex");

  await db.$transaction([
    db.registrationHash.deleteMany({ where: { patronId: patron.id } }),
    db.registrationHash.create({
      data: { hash, patronId: patron.id, patronGoogleId: googleId },
    }),
  ]);

  return hash;
}

export async function upsertFeedbackNote(formData: FormData): Promise<never> {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || !adminEmail || session.user.email !== adminEmail) {
    redirect("/feedback");
  }

  const entryId = Number(formData.get("journal_entry_id"));
  const status = String(formData.get("status") ?? "new");
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  const tab = String(formData.get("tab") ?? "");

  if (!Number.isInteger(entryId) || entryId <= 0) redirect("/feedback");
  if (!["new", "seen", "addressed"].includes(status)) redirect("/feedback");

  const db = getPrisma();
  await db.feedbackNote.upsert({
    where: { journalEntryId: entryId },
    update: { status, note, updatedBy: session.user.email },
    create: {
      journalEntryId: entryId,
      status,
      note,
      updatedBy: session.user.email,
    },
  });

  const dest = tab && tab !== "all" ? `/feedback?tab=${tab}` : "/feedback";
  redirect(dest);
}

