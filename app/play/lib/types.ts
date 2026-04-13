/**
 * Shared types for the /play manual session feature.
 */

export interface CharacterState {
  name: string
  class?: string
  level?: number
  hpCurrent: number
  hpMax: number
  hpTemp?: number
  ac?: number
  conditions?: string[]
  resources?: PulseResources
  isDying?: boolean
  engagementZones?: Record<string, string>
  isDead?: boolean
  spiritVision?: boolean
  minutesUntilRevival?: number
  revivalAvailableAt?: string
}

export interface PulseResources {
  action: number
  movement: number
  bonus_action: number
  reaction: number
  chat: number
}

export interface ExitInfo {
  key: string
  aliases: string[]
  destination: string | null
}

export interface RoomMessage {
  type: string
  from: string
  text: string
  timestamp: string
}

export interface RoomState {
  name: string
  hub?: number | string
  isSanctuary: boolean
  description?: string
  exits?: ExitInfo[]
  npcs?: string[]
  characters?: string[]
  characterRefs?: { name: string; ref: string }[]
  objects?: string[]
  messages?: RoomMessage[]
}

export type PlayEvent =
  | { type: "command"; toolName: string; action: string; result: unknown }
  | { type: "message"; message: RoomMessage }
  | { type: "combat_log"; message: string }
  | { type: "error"; message: string }
  | { type: "info"; message: string }

export interface FeedEntry {
  id: string
  timestamp: number
  event: PlayEvent
}
