/**
 * Direct HTTP MCP client for /play API routes.
 * Server-side only — never import from client components.
 *
 * Sends JSON-RPC 2.0 requests to the MCP endpoint.
 * No AI SDK dependency.
 */

const MCP_URL = process.env.WYRMBARROW_MCP_URL ?? "https://mcp.wyrmbarrow.com/mcp"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type McpResult = Record<string, any>

export class McpError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = "McpError"
  }
}

export async function mcpCall(toolName: string, args: Record<string, unknown>): Promise<McpResult> {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  })

  if (res.status === 429) {
    throw new McpError("Rate limit exceeded — please wait a moment and try again.", 429)
  }
  if (!res.ok) {
    throw new McpError(`MCP server returned ${res.status}`, res.status)
  }

  // The MCP Streamable HTTP transport responds with SSE by default.
  // Parse SSE to find the JSON-RPC response event; fall back to res.json() if
  // the server is configured with json_response=True.
  const contentType = res.headers.get("content-type") ?? ""
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any

  if (contentType.includes("text/event-stream")) {
    const text = await res.text()
    // SSE lines: "data: <json>\n". Find the line carrying the JSON-RPC response.
    let rpcResponse = null
    for (const line of text.split("\n")) {
      if (!line.startsWith("data: ")) continue
      try {
        const parsed = JSON.parse(line.slice(6))
        if (parsed.result !== undefined || parsed.error !== undefined) {
          rpcResponse = parsed
          break
        }
      } catch { /* skip non-JSON data lines */ }
    }
    if (!rpcResponse) throw new McpError("Empty or unparseable SSE response from MCP server")
    json = rpcResponse
  } else {
    json = await res.json()
  }

  if (json.error) {
    throw new McpError(json.error.message ?? String(json.error))
  }

  // Extract text content from the MCP result envelope
  const content = json.result?.content
  if (Array.isArray(content)) {
    const textBlock = content.find((b: { type: string }) => b.type === "text")
    if (textBlock?.text) {
      if (typeof textBlock.text === "string") {
        try { return JSON.parse(textBlock.text) } catch { return { error: textBlock.text } }
      }
      if (typeof textBlock.text === "object") return textBlock.text
    }
  }

  return json.result ?? {}
}

export async function mcpLogin(
  characterName: string,
  password: string,
): Promise<{ sessionId: string; characterName: string; bootstrap: McpResult; status?: string }> {
  const result = await mcpCall("auth", {
    action: "login",
    character_name: characterName,
    password,
  })

  const sessionId = result.session_id ?? result.sessionId
  if (!sessionId) throw new McpError("Login failed: no session_id in response")

  const name =
    result.bootstrap?.character?.name ??
    result.character?.name ??
    characterName

  return { 
    sessionId: String(sessionId), 
    characterName: name, 
    bootstrap: result.bootstrap ?? result, 
    status: result.status 
  }
}

export async function mcpRegister(
  hash: string,
  characterName: string,
): Promise<{ sessionId: string; permanentPassword: string; message?: string }> {
  const result = await mcpCall("auth", {
    action: "register",
    hash,
    character_name: characterName,
  })

  const permanentPassword = result.permanent_password
  if (!permanentPassword) throw new McpError(result.error ?? "Registration failed: no permanent_password in response")

  const sessionId = result.session_id ?? result.sessionId ?? ""

  return {
    sessionId: String(sessionId),
    permanentPassword: String(permanentPassword),
    message: result.message,
  }
}
