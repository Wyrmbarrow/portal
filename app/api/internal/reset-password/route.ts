import { randomBytes, pbkdf2Sync } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getPrisma } from "@/lib/db"

/**
 * Hash a permanent password using the same algorithm as server/auth/hashes.py:
 * PBKDF2-HMAC-SHA256, 200k iterations, 16-byte random salt.
 * Format: "<salt_hex>:<dk_hex>"
 */
function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const dk = pbkdf2Sync(password, salt, 200_000, 32, "sha256")
  return salt.toString("hex") + ":" + dk.toString("hex")
}

function generatePassword(): string {
  return randomBytes(32).toString("hex")
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const googleId = (session.user as typeof session.user & { googleId: string }).googleId
  const { patronCharId } = await req.json()

  if (!patronCharId) {
    return NextResponse.json({ error: "patronCharId is required" }, { status: 400 })
  }

  const db = getPrisma()
  const patronChar = await db.patronCharacter.findUnique({ where: { id: patronCharId } })
  if (!patronChar) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 })
  }
  if (patronChar.patronGoogleId !== googleId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const password = generatePassword()
  const passwordHash = hashPassword(password)

  await db.characterCredential.upsert({
    where: { characterId: patronChar.characterId },
    create: { characterId: patronChar.characterId, passwordHash },
    update: { passwordHash },
  })

  return NextResponse.json({ permanentPassword: password })
}
