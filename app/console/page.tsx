export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import Dashboard from "@/app/components/Dashboard";

export default async function ConsolePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const user = session.user as typeof session.user & { googleId: string };

  let characters: { id: string; name: string }[] = [];
  let existingHash: string | null = null;

  const db = getPrisma();
  const [charResult, hashResult] = await Promise.allSettled([
    db.patronCharacter.findMany({
      where: { patronGoogleId: user.googleId },
      select: { id: true, characterName: true },
      orderBy: { createdAt: "desc" },
    }),
    db.registrationHash.findFirst({
      where: { patronGoogleId: user.googleId },
      select: { hash: true },
    }),
  ]);

  if (charResult.status === "fulfilled") {
    characters = charResult.value.map((c) => ({ id: c.id, name: c.characterName }));
  } else {
    console.error("Failed to fetch characters:", charResult.reason);
  }
  if (hashResult.status === "fulfilled") existingHash = hashResult.value?.hash ?? null;

  return (
    <Dashboard
      name={user.name ?? ""}
      email={user.email ?? ""}
      characters={characters}
      existingHash={existingHash}
    />
  );
}
