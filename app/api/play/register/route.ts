import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mcpRegister, McpError } from "@/app/play/lib/mcp-client"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { hash, characterName } = await req.json()

  try {
    const result = await mcpRegister(hash, characterName)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof McpError) {
      if (e.status === 429) return NextResponse.json({ error: e.message }, { status: 429 })
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 400 })
  }
}
