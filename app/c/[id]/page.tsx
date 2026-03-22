import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPrisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import CharacterStatblock from "@/app/components/CharacterStatblock"
import JournalFeed from "@/app/components/JournalFeed"
import DeathEntry from "@/app/components/DeathEntry"
import ResetPasswordButton from "@/app/components/ResetPasswordButton"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const db = getPrisma()
  const patronChar = await db.patronCharacter.findUnique({
    where: { id },
    select: { characterName: true },
  })
  return {
    title: patronChar ? `${patronChar.characterName} — Wyrmbarrow` : "Wyrmbarrow",
  }
}

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
  cantrips?: string[]
  spellbook?: string[]
  prepared_spells?: string[]
  domain_spells?: string[]
  inventory: unknown[]
  equipped: Record<string, unknown>
  features: { name: string; description: string }[]
  reputation: Record<string, number>
  finalized: boolean
  conditions?: string[]
  dead?: boolean
}

export interface JournalEntryData {
  id: number
  entryType: string
  content: string
  wordCount: number
  createdAt: Date
}

export default async function CharacterProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const db = getPrisma()

  // Look up by PatronCharacter CUID (not Evennia integer ID)
  const [patronChar, session] = await Promise.all([
    db.patronCharacter.findUnique({ where: { id } }),
    auth(),
  ])
  if (!patronChar) notFound()

  const sessionGoogleId = (session?.user as (typeof session.user & { googleId?: string }) | undefined)?.googleId
  const isOwner = sessionGoogleId != null && sessionGoogleId === patronChar.patronGoogleId

  const characterId = Number(patronChar.characterId)

  // Parallel fetch: charsheet mirror + journal entries (all IC entries are public; OOC excluded)
  // Journal fetch uses .catch(() => null) so a DB error shows "Journal unavailable."
  // instead of a full 500 page
  const [charSheetRow, entriesResult] = await Promise.all([
    db.characterSheet.findUnique({ where: { characterId } }).catch(() => null),
    db.journalEntry.findMany({
      where: {
        characterId,
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
  const journalFailed = entriesResult === null
  const entries = entriesResult ?? []

  const deathEntry = entries.find((e) => e.entryType === "death") ?? null
  const isDead = charsheet?.dead === true || deathEntry !== null

  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 py-16"
      style={{ background: "#151009", fontFamily: "var(--font-geist-sans)" }}
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

        {/* Tombstone — shown when dead, above the statblock */}
        {isDead && (
          deathEntry ? (
            <DeathEntry entry={deathEntry as JournalEntryData} />
          ) : (
            // Fallback: no journal entry (pre-fix death or write failure)
            <div className="flex justify-center py-2">
              <div style={{ width: 300 }}>
                <div
                  style={{
                    height: 68,
                    background: "linear-gradient(to bottom, #1e2124, #252829)",
                    border: "1px solid rgba(75,85,95,0.5)",
                    borderBottom: "none",
                    borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: 18,
                  }}
                >
                  <span style={{ color: "rgba(130,142,155,0.45)", fontSize: 18, lineHeight: 1 }}>✝</span>
                </div>
                <div
                  style={{
                    background: "linear-gradient(to bottom, #252829, #1e2124)",
                    border: "1px solid rgba(75,85,95,0.5)",
                    borderTop: "none",
                    padding: "18px 32px 26px",
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontFamily: "var(--font-geist-mono)", fontSize: 7, letterSpacing: "0.55em", textTransform: "uppercase", color: "rgba(120,132,145,0.55)", marginBottom: 8 }}>
                    here lies
                  </p>
                  <h2 style={{ fontFamily: "var(--font-cinzel)", fontSize: patronChar.characterName.length > 12 ? 18 : 22, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(210,215,220,0.9)", fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 -1px 0 rgba(255,255,255,0.04)", marginBottom: 0, lineHeight: 1.2 }}>
                    {patronChar.characterName}
                  </h2>
                </div>
                <div style={{ height: 6, background: "linear-gradient(to bottom, rgba(10,12,14,0.7), transparent)" }} />
              </div>
            </div>
          )
        )}

        {/* Statblock */}
        <CharacterStatblock
          characterName={patronChar.characterName}
          charsheet={charsheet}
        />

        {/* Patron-only controls */}
        {isOwner && !isDead && (
          <div className="flex justify-end">
            <ResetPasswordButton patronCharId={id} />
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: "rgba(60,45,20,0.5)" }} />
          <div className="h-[3px] w-[3px] rounded-full" style={{ background: "rgba(140,90,25,0.4)" }} />
          <div className="h-px flex-1" style={{ background: "rgba(60,45,20,0.5)" }} />
        </div>

        {/* Journal — death entry is shown as the tombstone above, exclude it here */}
        <JournalFeed
          entries={(entries as JournalEntryData[]).filter((e) => e.entryType !== "death")}
          failed={journalFailed}
        />

      </div>

      {/* Ambient bottom line */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent" />
    </div>
  )
}
