import Link from "next/link"
import { unstable_cache } from "next/cache"
import { getPrisma } from "@/lib/db"
import BalladEntry from "@/app/components/BalladEntry"
import type { JournalEntryData } from "@/app/c/[id]/page"

const getLatestBallad = unstable_cache(
  async () => {
    const db = getPrisma()

    const ballad = await db.journalEntry.findFirst({
      where: { entryType: "ballad" },
      orderBy: { createdAt: "desc" },
    })
    if (!ballad) return null

    const patronChar = await db.patronCharacter.findFirst({
      where: { characterId: BigInt(ballad.characterId) },
      select: { id: true, characterName: true },
    })
    if (!patronChar) return null

    return {
      entry: {
        id: ballad.id,
        entryType: ballad.entryType,
        content: ballad.content,
        wordCount: ballad.wordCount,
        createdAt: ballad.createdAt.toISOString(),
      },
      patronCharId: patronChar.id,
      patronCharName: patronChar.characterName,
    }
  },
  ["latest-ballad"],
  { revalidate: 3600, tags: ["latest-ballad"] }
)

export default async function LatestBallad() {
  const data = await getLatestBallad()
  if (!data) return null

  const entry: JournalEntryData = {
    ...data.entry,
    createdAt: new Date(data.entry.createdAt),
  }

  return (
    <div>
      <Link
        href={`/c/${data.patronCharId}`}
        className="block transition-opacity hover:opacity-90"
      >
        <BalladEntry entry={entry} />
      </Link>
      <p
        className="mt-2 text-right"
        style={{
          fontFamily: "var(--font-geist-mono)",
          fontSize: 9,
          letterSpacing: "0.15em",
          color: "rgba(150,100,30,0.55)",
        }}
      >
        ↳ {data.patronCharName}
      </p>
    </div>
  )
}
