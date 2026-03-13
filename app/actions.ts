"use server";

import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db";

export async function generateHash(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const googleId = (session.user as typeof session.user & { googleId: string }).googleId;
  if (!googleId) throw new Error("No Google ID on session");

  const db = getPrisma();
  const patron = await db.patron.findUnique({ where: { googleId } });
  if (!patron) throw new Error("Patron not found");

  const hash = randomBytes(32).toString("hex");

  await db.$transaction([
    db.registrationHash.deleteMany({ where: { patronId: patron.id } }),
    db.registrationHash.create({
      data: { hash, patronId: patron.id, patronGoogleId: googleId },
    }),
  ]);

  return hash;
}

export async function getHash(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;

  const googleId = (session.user as typeof session.user & { googleId: string }).googleId;
  if (!googleId) return null;

  const record = await getPrisma().registrationHash.findFirst({
    where: { patronGoogleId: googleId },
  });

  return record?.hash ?? null;
}
