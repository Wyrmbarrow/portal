export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import PlaySession from "./play-session"

export default async function PlayCharacterPage({
  params,
}: {
  params: Promise<{ characterId: string }>
}) {
  const { characterId } = await params

  const session = await auth()
  if (!session?.user) redirect("/")

  const user = session.user as typeof session.user & { googleId: string }
  const db = getPrisma()

  const patronChar = await db.patronCharacter.findUnique({
    where: { id: characterId },
    select: { id: true, characterName: true, characterId: true, patronGoogleId: true },
  })

  if (!patronChar) redirect("/play")
  if (patronChar.patronGoogleId !== user.googleId) redirect("/play")

  const sheet = await db.characterSheet.findUnique({
    where: { characterId: Number(patronChar.characterId) },
    select: { data: true },
  }).catch(() => null)

  const characterDetails = (sheet?.data as Record<string, unknown>) ?? {}

  return (
    <PlaySession
      patronCharId={patronChar.id}
      characterName={patronChar.characterName}
      characterDetails={characterDetails}
    />
  )
}
