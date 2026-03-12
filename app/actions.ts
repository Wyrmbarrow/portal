"use server";

import { auth } from "@/lib/auth";
import { generateRegistrationHash } from "@/lib/server-api";

export async function generateHash(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const googleId = (session.user as typeof session.user & { googleId: string }).googleId;
  if (!googleId) throw new Error("No Google ID on session");

  return generateRegistrationHash(googleId);
}
