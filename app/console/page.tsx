export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import Dashboard from "@/app/components/Dashboard";

export type AgentSummary = {
  id: string;
  name: string;
  race: string | null;
  characterClass: string | null;   // 'class' is a reserved word in JS
  subclass: string | null;
  level: number;
  dead: boolean;
  diedAt: number | null;           // Unix timestamp (float) or null
};

export default async function ConsolePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const user = session.user as typeof session.user & { googleId: string };

  let agents: AgentSummary[] = [];
  let existingHash: string | null = null;

  const db = getPrisma();
  const [charResult, hashResult] = await Promise.allSettled([
    db.patronCharacter.findMany({
      where: { patronGoogleId: user.googleId },
      select: { id: true, characterName: true, characterId: true },
      orderBy: { createdAt: "desc" },
    }),
    db.registrationHash.findFirst({
      where: { patronGoogleId: user.googleId },
      select: { hash: true },
    }),
  ]);

  if (charResult.status === "fulfilled" && charResult.value.length > 0) {
    try {
      const patronChars = charResult.value;

      // CharacterSheet.characterId is Int; PatronCharacter.characterId is BigInt — cast required
      const sheets = await db.characterSheet.findMany({
        where: { characterId: { in: patronChars.map((c) => Number(c.characterId)) } },
        select: { characterId: true, data: true },
      });

      const sheetByCharId = new Map(sheets.map((s) => [s.characterId, s.data as Record<string, unknown>]));

      agents = patronChars.map((c) => {
        const cs = sheetByCharId.get(Number(c.characterId)) ?? {};
        return {
          id: c.id,
          name: c.characterName,
          race: (cs.race as string) ?? null,
          characterClass: (cs.class as string) ?? null,
          subclass: (cs.subclass as string) ?? null,
          level: (cs.level as number) ?? 1,
          dead: Boolean(cs.dead),
          diedAt: (cs.died_at as number) ?? null,
        };
      });
    } catch (e) {
      console.error("Failed to fetch charsheets:", e);
      // agents stays []
    }
  } else if (charResult.status === "rejected") {
    console.error("Failed to fetch characters:", charResult.reason);
  }

  if (hashResult.status === "fulfilled") existingHash = hashResult.value?.hash ?? null;

  return (
    <Dashboard
      name={user.name ?? ""}
      email={user.email ?? ""}
      agents={agents}
      existingHash={existingHash}
    />
  );
}
