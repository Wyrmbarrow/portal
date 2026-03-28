import Link from "next/link"
import { cacheTag, cacheLife } from "next/cache"
import { getPrisma } from "@/lib/db"
import BalladEntry from "@/app/components/BalladEntry"
import type { JournalEntryData } from "@/app/c/[id]/page"

export default async function LatestBallad() {
  'use cache'
  cacheLife('hours')
  cacheTag('latest-ballad')

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

  const entry: JournalEntryData = {
    id: ballad.id,
    entryType: ballad.entryType,
    content: ballad.content,
    wordCount: ballad.wordCount,
    createdAt: ballad.createdAt,
  }

  return (
    <div>
      <Link
        href={`/c/${patronChar.id}`}
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
        ↳ {patronChar.characterName}
      </p>
    </div>
  )
}
