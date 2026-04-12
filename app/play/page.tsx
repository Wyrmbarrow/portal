export const dynamic = "force-dynamic"

import { randomBytes } from "crypto"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import PlayCharacterList from "./components/play-character-list"
import RegisterForm from "./components/register-form"

export type PlayAgent = {
  patronCharId: string
  characterId: number
  name: string
  race: string | null
  characterClass: string | null
  subclass: string | null
  level: number
  dead: boolean
  diedAt: number | null
}

export default async function PlayPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const user = session.user as typeof session.user & { googleId: string }
  const db = getPrisma()

  // Ensure patron exists and get their ID
  let patron = await db.patron.findUnique({ where: { googleId: user.googleId } })
  if (!patron) {
    patron = await db.patron.findUnique({ where: { email: user.email! } })
  }
  if (!patron) redirect("/")

  // Auto-generate a registration hash if the patron doesn't have one
  let hash = (
    await db.registrationHash.findFirst({
      where: { patronId: patron.id },
      select: { hash: true },
    })
  )?.hash ?? null

  if (!hash) {
    hash = randomBytes(32).toString("hex")
    await db.$transaction([
      db.registrationHash.deleteMany({ where: { patronId: patron.id } }),
      db.registrationHash.create({
        data: { hash, patronId: patron.id, patronGoogleId: user.googleId },
      }),
    ])
  }

  // Fetch patron's characters
  let agents: PlayAgent[] = []
  try {
    const patronChars = await db.patronCharacter.findMany({
      where: { patronGoogleId: user.googleId },
      select: { id: true, characterName: true, characterId: true },
      orderBy: { createdAt: "desc" },
    })

    if (patronChars.length > 0) {
      const sheets = await db.characterSheet.findMany({
        where: { characterId: { in: patronChars.map((c) => Number(c.characterId)) } },
        select: { characterId: true, data: true },
      })
      const sheetByCharId = new Map(sheets.map((s) => [s.characterId, s.data as Record<string, unknown>]))

      agents = patronChars.map((c) => {
        const cs = sheetByCharId.get(Number(c.characterId)) ?? {}
        return {
          patronCharId: c.id,
          characterId: Number(c.characterId),
          name: c.characterName,
          race: (cs.race as string) ?? null,
          characterClass: (cs.class as string) ?? null,
          subclass: (cs.subclass as string) ?? null,
          level: (cs.level as number) ?? 1,
          dead: Boolean(cs.dead),
          diedAt: (cs.died_at as number) ?? null,
        }
      })
    }
  } catch (e) {
    console.error("Failed to fetch characters for play page:", e)
  }

  return (
    <div
      className="min-h-screen px-6 py-12"
      style={{ background: "#151009", fontFamily: "var(--font-geist-sans)" }}
    >
      {/* Ambient top line */}
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />

      {/* Radial warmth */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 800px 600px at 50% 30%, rgba(130,60,10,0.10) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-2xl mx-auto space-y-10">

        {/* Header */}
        <div className="space-y-1 pb-6" style={{ borderBottom: "1px solid rgba(90,68,28,0.7)" }}>
          <p
            className="text-[8px] tracking-[0.6em] uppercase mb-3"
            style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(190,125,42,0.85)" }}
          >
            manual play
          </p>
          <h1
            className="text-2xl tracking-wide"
            style={{ fontFamily: "var(--font-cinzel)", color: "#e8dcc8", fontWeight: 600 }}
          >
            Choose Your Character
          </h1>
        </div>

        {/* Character cards */}
        <PlayCharacterList agents={agents} />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: "rgba(90,68,28,0.7)" }} />
          <div className="h-[3px] w-[3px] rounded-full" style={{ background: "rgba(170,112,32,0.65)" }} />
          <div className="h-px flex-1" style={{ background: "rgba(90,68,28,0.7)" }} />
        </div>

        {/* Registration form */}
        <RegisterForm hash={hash} />

      </div>

      {/* Ambient bottom line */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent" />
    </div>
  )
}
