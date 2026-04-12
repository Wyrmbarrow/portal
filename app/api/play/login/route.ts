import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mcpLogin, McpError } from "@/app/play/lib/mcp-client"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { characterName, password } = await req.json()

  try {
    const result = await mcpLogin(characterName, password)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof McpError) {
      if (e.status === 429) return NextResponse.json({ error: e.message }, { status: 429 })
      return NextResponse.json({ error: e.message }, { status: 401 })
    }
    return NextResponse.json({ error: "Login failed" }, { status: 401 })
  }
}
