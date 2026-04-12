/**
 * Command metadata and parameter inference for the /play command dropdowns.
 */

import { GAMEPLAY_TOOLS, TOOLS, type ToolName } from "./tools"

export interface CommandAction {
  toolName: ToolName
  actionName: string
  description: string
}

export interface CommandMetadata {
  toolName: ToolName
  actions: CommandAction[]
}

const TOOL_PARAM_MAP: Record<string, string[]> = {
  move:     ["direction"],
  speak:    ["target_ref", "message"],
  social:   ["target_ref", "message"],
  shop:     ["vendor_ref", "action"],
  combat:   ["action"],
  character: ["action"],
  journal:  ["action"],
  quest:    ["action"],
  rest:     ["action"],
  look:     ["target"],
  search:   ["skill", "target_ref"],
  study:    ["skill", "target_ref"],
  influence: ["skill", "target_ref"],
  utilize:  ["target_ref", "action", "item_id"],
}

export function getAvailableCommands(): CommandMetadata[] {
  return GAMEPLAY_TOOLS.map((toolName) => {
    const toolDef = TOOLS[toolName]
    const actions: CommandAction[] = []

    if (toolDef.actions) {
      for (const [actionName, actionDef] of Object.entries(toolDef.actions)) {
        actions.push({ toolName, actionName, description: actionDef.description })
      }
    } else {
      actions.push({ toolName, actionName: "default", description: toolDef.description })
    }

    return { toolName, actions }
  })
}

export function getToolActions(toolName: ToolName): CommandAction[] {
  return getAvailableCommands().find((m) => m.toolName === toolName)?.actions ?? []
}

export function inferParametersFromDescription(toolName: string, description: string): string[] {
  const params = new Set<string>()

  const patterns = [
    /Required:\s*([^.]+)/g,
    /Optional:\s*([^.]+)/g,
    /\(([a-z_]+)\)/g,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(description)) !== null) {
      const items = match[1].split(",").map((s) => s.trim())
      for (const item of items) {
        const paramMatch = item.match(/(\b[a-z_][a-z_0-9]*\b)/i)
        if (paramMatch) params.add(paramMatch[1])
      }
    }
  }

  if (params.size === 0 && toolName in TOOL_PARAM_MAP) {
    return TOOL_PARAM_MAP[toolName]
  }

  return Array.from(params)
}
