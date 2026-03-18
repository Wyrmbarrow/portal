import { notFound } from "next/navigation"
import { getPrisma } from "@/lib/db"
import CharacterStatblock from "@/app/components/CharacterStatblock"
import JournalFeed from "@/app/components/JournalFeed"

// Charsheet shape (subset used by the portal — extend as needed)
export interface Charsheet {
  name: string
  class: string | null
  subclass: string | null
  race: string | null
  level: number
  proficiency_bonus: number
  str: number; dex: number; con: number
  int: number; wis: number; cha: number
  ac: number
  hp_current: number
  hp_max: number
  hp_temp: number
  initiative: number
  speed: number
  hit_die: string | null
  hit_dice_total: number
  hit_dice_used: number
  saving_throw_proficiencies: string[]
  skill_proficiencies: string[]
  expertise_skills: string[]
  spell_slots: Record<string, { total: number; used: number }>
  inventory: unknown[]
  equipped: Record<string, unknown>
  features: { name: string; description: string }[]
  reputation: Record<string, number>
  journal_visibility: "public" | "private"
  finalized: boolean
  conditions?: string[]
}

export interface JournalEntryData {
  id: number
  entryType: string
  content: string
  wordCount: number
  visibility: string
  createdAt: Date
}

export default async function CharacterProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) notFound()

  const db = getPrisma()

  // Guard: must be a player character (typeclass contains "characters.")
  const character = await db.character.findFirst({
    where: {
      id: BigInt(numericId),
      dbTypeclass: { contains: "characters." },
    },
  })
  if (!character) notFound()

  // Parallel fetch: charsheet mirror + public journal entries
  // Journal fetch uses .catch(() => null) so a DB error shows "Journal unavailable."
  // instead of a full 500 page
  const [charSheetRow, entriesResult] = await Promise.all([
    db.characterSheet.findUnique({ where: { characterId: numericId } }),
    db.journalEntry.findMany({
      where: {
        characterId: numericId,
        visibility: "public",
        entryType: { not: "ooc" },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }).catch(() => null),
  ])

  const rawData = charSheetRow?.data
  const charsheet: Charsheet | null =
    rawData !== null && rawData !== undefined && typeof rawData === "object" && !Array.isArray(rawData)
      ? (rawData as unknown as Charsheet)
      : null
  const isPrivate = charsheet?.journal_visibility === "private"
  const journalFailed = entriesResult === null
  const entries = entriesResult ?? []

  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 py-16"
      style={{ background: "#0c0a07", fontFamily: "var(--font-geist-sans)" }}
    >
      {/* Ambient top line */}
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />

      {/* Radial warmth */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 800px 600px at 50% 40%, rgba(120,55,8,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-2xl space-y-8">

        {/* Page header */}
        <p
          className="text-[8px] tracking-[0.6em] uppercase"
          style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(160,100,30,0.6)" }}
        >
          character profile
        </p>

        {/* Statblock */}
        <CharacterStatblock
          characterName={character.key}
          charsheet={charsheet}
        />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: "rgba(60,45,20,0.5)" }} />
          <div className="h-[3px] w-[3px] rounded-full" style={{ background: "rgba(140,90,25,0.4)" }} />
          <div className="h-px flex-1" style={{ background: "rgba(60,45,20,0.5)" }} />
        </div>

        {/* Journal */}
        <JournalFeed entries={entries as JournalEntryData[]} isPrivate={isPrivate} failed={journalFailed} />

      </div>

      {/* Ambient bottom line */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent" />
    </div>
  )
}
