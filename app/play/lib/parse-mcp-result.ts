/**
 * Normalises MCP tool results from three possible shapes into a plain object:
 *   1. Plain JS object → return as-is
 *   2. JSON string → JSON.parse
 *   3. MCP CallToolResult { content: [{ type: "text", text: "...json..." }] } → extract and parse
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMcpResult(result: unknown): Record<string, any> {
  if (typeof result === "string") {
    try { return JSON.parse(result) } catch { return { error: result } }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = result as any
  if (r?.content?.[0]?.text) {
    const text = r.content[0].text
    if (typeof text === "string") {
      try { return JSON.parse(text) } catch { return { error: text } }
    }
    if (typeof text === "object" && text !== null) return text
  }

  if (result && typeof result === "object") return result as Record<string, unknown>
  return {}
}
