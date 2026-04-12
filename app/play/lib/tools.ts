/**
 * Gameplay tool catalog for the /play manual session feature.
 * Excludes auth and create_character — gameplay tools only.
 */

export const GAMEPLAY_TOOLS = [
  "look",
  "move",
  "search",
  "study",
  "influence",
  "utilize",
  "hide",
  "character",
  "combat",
  "journal",
  "quest",
  "rest",
  "level_up",
  "speak",
  "social",
  "shop",
] as const

export type ToolName = typeof GAMEPLAY_TOOLS[number]

export interface ToolAction {
  description: string
}

export interface ToolDef {
  description: string
  actions?: Record<string, ToolAction>
}

export const TOOLS: Record<ToolName, ToolDef> = {
  look: {
    description: "Examine your current location or a target. FREE — no resource cost.",
  },
  move: {
    description: "Move through an exit or change combat zone. Costs 1 Movement.",
  },
  search: {
    description: "Make a Wisdom-based skill check. Costs 1 Action.",
  },
  study: {
    description: "Make an Intelligence-based skill check. Costs 1 Action.",
  },
  influence: {
    description: "Make a Charisma or Wisdom skill check to alter a creature's attitude. Costs 1 Action.",
  },
  utilize: {
    description: "Use a nonmagical object. Costs 1 Action.",
  },
  hide: {
    description: "Make a Dexterity (Stealth) check to hide. Costs 1 Action.",
  },
  character: {
    description: "Character sheet, equipment, and reactions.",
    actions: {
      status:         { description: "Full character sheet: stats, HP, conditions, spell slots, inventory." },
      skills:         { description: "All 18 skill modifiers with proficiency/Expertise flags." },
      equip:          { description: "Equip an item from inventory." },
      unequip:        { description: "Remove item from an equipment slot." },
      level_up:       { description: "Apply level-up choices after Long Rest." },
      prepare_spells: { description: "Choose prepared spell loadout after Long Rest." },
      set_intent:     { description: "Pre-declare a Reaction Intent." },
      clear_intent:   { description: "Disarm active Reaction Intent." },
    },
  },
  combat: {
    description: "Combat actions. Pulse: 1 Action, 1 Movement, 1 Bonus, 1 Reaction.",
    actions: {
      attack:    { description: "Weapon attack. Costs 1 Action." },
      cast_spell: { description: "Cast a spell. Costs 1 Action (or Bonus Action for some spells)." },
      dash:      { description: "Double movement speed this Pulse. Costs 1 Action." },
      disengage: { description: "Leave Melee without triggering Opportunity Attacks. Costs 1 Action." },
      dodge:     { description: "Impose disadvantage on attacks against you. Costs 1 Action." },
      help:      { description: "Grant advantage to an ally's next attack. Costs 1 Action." },
      grapple:   { description: "Attempt to grapple a target. Costs 1 Action." },
      escape:    { description: "Attempt to break free from a grapple. Costs 1 Action." },
      shove:     { description: "Push a target away or knock prone. Costs 1 Action." },
      stand_up:  { description: "Stand up from prone. Costs half movement." },
      rouse:     { description: "Stabilise a dying ally. Costs 1 Action." },
      use_item:  { description: "Use a consumable item. Costs 1 Action." },
    },
  },
  journal: {
    description: "Write and read journal entries.",
    actions: {
      write:      { description: "Write a journal entry (status_update, long_rest, note, notice, ooc)." },
      read:       { description: "Read your recent journal entries." },
      search:     { description: "Search journal entries by keyword." },
      read_other: { description: "Read another character's public journal entries." },
      context:    { description: "Get your current journal context summary." },
      set_voice:  { description: "Set your character's narrative voice." },
    },
  },
  quest: {
    description: "Quest management and faction reputation.",
    actions: {
      list:       { description: "List your active quests and objectives." },
      available:  { description: "List quests available in your current location." },
      accept:     { description: "Accept an available quest." },
      abandon:    { description: "Abandon an active quest." },
      reputation: { description: "Check your faction reputation standings." },
    },
  },
  rest: {
    description: "Rest to recover resources. Requires a Sanctuary room.",
    actions: {
      short: { description: "Short Rest: spend Hit Dice to recover HP. Requires a 100+ word journal entry." },
      long:  { description: "Long Rest: full recovery. Requires a 250+ word journal entry." },
    },
  },
  level_up: {
    description: "Character advancement.",
    actions: {
      preview:  { description: "Preview available level-up choices." },
      finalize: { description: "Apply chosen level-up options." },
    },
  },
  speak: {
    description: "Speak to an NPC or character. Costs 1 Chat.",
  },
  social: {
    description: "Social and party interactions.",
    actions: {
      whisper:       { description: "Send a private message to a nearby character." },
      send:          { description: "Send a message via Sending Stone." },
      trade_offer:   { description: "Offer a trade to another character." },
      trade_accept:  { description: "Accept an incoming trade offer." },
      trade_decline: { description: "Decline an incoming trade offer." },
      party_invite:  { description: "Invite a character to your party." },
      party_accept:  { description: "Accept a party invitation." },
      party_decline: { description: "Decline a party invitation." },
      follow:        { description: "Follow another character." },
      party_leave:   { description: "Leave your current party." },
    },
  },
  shop: {
    description: "Buy and sell at vendors.",
    actions: {
      browse:  { description: "Browse a vendor's wares." },
      buy:     { description: "Purchase an item from a vendor." },
      sell:    { description: "Sell an item to a vendor." },
      inspect: { description: "Inspect an item's details." },
    },
  },
}
