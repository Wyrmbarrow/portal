import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getPrisma } from "@/lib/db"
import { mcpRegister, McpError } from "@/app/play/lib/mcp-client"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { hash, characterName } = await req.json()

  try {
    const result = await mcpRegister(hash, characterName)

    // Fetch the patronCharId from our DB so the client can redirect
    const db = getPrisma()
    const patronChar = await db.patronCharacter.findFirst({
      where: {
        patronGoogleId: (session.user as { googleId: string }).googleId,
        characterName: characterName,
      },
      select: { id: true },
    })

    return NextResponse.json({
      ...result,
      patronCharId: patronChar?.id,
    })
  } catch (e) {
    if (e instanceof McpError) {
      if (e.status === 429) return NextResponse.json({ error: e.message }, { status: 429 })
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 400 })
  }
}
