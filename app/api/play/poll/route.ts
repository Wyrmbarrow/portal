import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mcpCall, McpError } from "@/app/play/lib/mcp-client"
import { parseCharacterState, parseRoomState } from "@/app/play/lib/parse-state"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { sessionId, tool } = await req.json()

  try {
    const result = await mcpCall(tool, { session_id: sessionId })
    const charState = parseCharacterState(tool, result) ?? undefined
    const roomState = parseRoomState(tool, result) ?? undefined
    return NextResponse.json({ charState, roomState })
  } catch (e) {
    if (e instanceof McpError) {
      return NextResponse.json({ error: e.message }, { status: e.status ?? 500 })
    }
    return NextResponse.json({ error: "Poll failed" }, { status: 500 })
  }
}
