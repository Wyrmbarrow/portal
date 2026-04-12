import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mcpCall, McpError } from "@/app/play/lib/mcp-client"

const ALLOWED_TOOLS = new Set([
  "look", "move", "search", "study", "influence", "utilize", "hide",
  "character", "combat", "journal", "quest", "rest", "level_up",
  "speak", "social", "shop",
])

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { sessionId, toolName, action, params } = await req.json()

  if (!ALLOWED_TOOLS.has(toolName)) {
    return NextResponse.json({ error: `Tool not allowed: ${toolName}` }, { status: 403 })
  }

  const toolArgs: Record<string, unknown> = { session_id: sessionId }

  if (action && action !== "default") {
    toolArgs.action = action
  }

  if (params && typeof params === "object") {
    for (const [key, value] of Object.entries(params)) {
      if (value !== "" && value !== null && value !== undefined) {
        toolArgs[key] = value
      }
    }
  }

  try {
    const result = await mcpCall(toolName, toolArgs)
    return NextResponse.json({ result })
  } catch (e) {
    if (e instanceof McpError) {
      if (e.status === 429) return NextResponse.json({ error: e.message }, { status: 429 })
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
    return NextResponse.json({ error: "Command failed" }, { status: 500 })
  }
}
