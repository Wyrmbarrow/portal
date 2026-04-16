"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { formatSlug } from "@/lib/format"
import { getAvailableCommands, getToolActions, inferParametersFromDescription } from "../lib/command-utils"
import { parseCharacterState, parseRoomState, buildRoomMessage } from "../lib/parse-state"
import type { CharacterState, RoomState, FeedEntry, PlayEvent, RoomMessage } from "../lib/types"

import LookEvent from "../components/feed/look-event"
import MoveEvent from "../components/feed/move-event"
import CombatEvent from "../components/feed/combat-event"
import SpeakEvent from "../components/feed/speak-event"

interface Props {
  patronCharId: string
  characterName: string
  characterDetails: Record<string, unknown>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>

function generateId() {
  return Math.random().toString(36).slice(2)
}

function extractSummary(toolName: string, action: string, result: AnyObj): string {
  if (toolName === "look" || toolName === "move") {
    const roomName = result.room?.name ?? result.name
    const desc = result.room?.description ?? result.description ?? ""
    if (roomName) return `${roomName}${desc ? " — " + String(desc).slice(0, 80) + (desc.length > 80 ? "…" : "") : ""}`
  }
  if (toolName === "speak") {
    const resp = result.response ?? result.npc_response ?? result.text
    if (resp) return String(resp).slice(0, 120) + (String(resp).length > 120 ? "…" : "")
  }
  if (toolName === "combat") {
    const narrative = result.narrative ?? result.description ?? result.message
    if (narrative) return String(narrative).slice(0, 120) + (String(narrative).length > 120 ? "…" : "")
  }
  if (toolName === "journal" && action === "write") {
    return result.message ?? "Journal entry written."
  }
  return result.message ?? result.error ?? ""
}

export default function PlaySession({ patronCharId, characterName, characterDetails }: Props) {
  const router = useRouter()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(true)

  const [charState, setCharState] = useState<CharacterState | null>(null)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Command form state
  const allCommands = useMemo(() => [...getAvailableCommands()].sort((a, b) => a.toolName.localeCompare(b.toolName)), [])
  
  const creationSteps = useMemo(() => {
    if (!charState) return []
    const cs = charState
    const steps = [
      { label: "Set Class", done: !!cs.class, tool: "create_character", action: "set_class" },
      { label: "Set Race", done: !!cs.race, tool: "create_character", action: "set_race" },
      { label: "Ability Scores", done: (cs.hpMax ?? 0) > 0, tool: "create_character", action: "set_ability_scores" },
      { label: "Set Background", done: !!cs.background, tool: "create_character", action: "set_background" },
      { label: "Select Skills", done: (cs.skillProficiencies?.length ?? 0) > 0, tool: "create_character", action: "set_skills" },
    ]

    if (cs.class === "rogue") {
      steps.push({ label: "Expertise", done: (cs.expertiseSkills?.length ?? 0) > 0, tool: "create_character", action: "set_expertise" })
    }
    if (cs.class === "fighter") {
      steps.push({ label: "Fighting Style", done: !!cs.fightingStyle, tool: "create_character", action: "set_fighting_style" })
    }
    if (cs.class === "cleric") {
      steps.push({ label: "Divine Domain", done: !!cs.subclass, tool: "create_character", action: "set_subclass" })
    }
    if (["wizard", "cleric"].includes(cs.class || "")) {
      steps.push({ label: "Choose Spells", done: (cs.cantrips?.length ?? 0) > 0, tool: "create_character", action: "set_spells" })
    }

    steps.push({ label: "Start Equipment", done: (cs.inventory?.length ?? 0) > 0, tool: "create_character", action: "set_equipment" })
    steps.push({ label: "Finalize", done: false, tool: "create_character", action: "finalize" })
    
    return steps
  }, [charState])

  const nextCreationStep = useMemo(() => {
    return creationSteps.find(s => !s.done)
  }, [creationSteps])

  const filteredCommands = useMemo(() => {
    if (!charState) return allCommands
    if (!charState.isFinalized) {
      // Only creation and look allowed during setup
      return allCommands.filter(c => c.toolName === "create_character" || c.toolName === "look")
    }
    // Creation tool hidden for finalized characters
    return allCommands.filter(c => c.toolName !== "create_character")
  }, [charState, allCommands])

  const [selectedTool, setSelectedTool] = useState<string>("look")
  const [selectedAction, setSelectedAction] = useState<string>("default")
  const [params, setParams] = useState<Record<string, string>>({})
  const [executing, setExecuting] = useState(false)

  // Pin tool/action during creation
  useEffect(() => {
    if (charState && !charState.isFinalized && nextCreationStep) {
      setSelectedTool(nextCreationStep.tool)
      setSelectedAction(nextCreationStep.action)
    }
  }, [charState?.isFinalized, nextCreationStep])

  // Reset selected tool if it disappears from filtered list
  useEffect(() => {
    if (!filteredCommands.find(c => c.toolName === selectedTool)) {
      setSelectedTool(filteredCommands[0]?.toolName ?? "look")
    }
  }, [filteredCommands, selectedTool])

  const [pulseTime, setPulseTime] = useState(0)

  const feedEndRef = useRef<HTMLDivElement>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastManualCommandRef = useRef<number>(Date.now())

  // --- Pulse Timer ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const seconds = (now / 1000) % 6
      setPulseTime(seconds)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const addEntry = useCallback((event: PlayEvent) => {
    const entry: FeedEntry = { id: generateId(), timestamp: Date.now(), event }
    setFeed((prev) => [...prev, entry])
    return entry.id
  }, [])

  // Auto-scroll feed to bottom on new entries
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [feed.length])

  // --- Connection ---
  useEffect(() => {
    async function connect() {
      // Check for sessionStorage handoff from character selector
      const handoffRaw = sessionStorage.getItem("wyrmbarrow:play")
      if (handoffRaw) {
        sessionStorage.removeItem("wyrmbarrow:play")
        try {
          const handoff = JSON.parse(handoffRaw)
          if (handoff.sessionId) {
            setSessionId(handoff.sessionId)
            setConnecting(false)
            if (handoff.bootstrap) {
              const cs = parseCharacterState("login", handoff.bootstrap)
              const rs = parseRoomState("login", handoff.bootstrap)
              if (cs) setCharState(cs)
              if (rs) setRoomState(rs)
            }
            addEntry({ type: "info", message: `Connected as ${handoff.characterName ?? characterName}.` })
            return
          }
        } catch {
          // Fall through to password login
        }
      }

      // Fall back to password from localStorage
      const password = localStorage.getItem(`wyrmbarrow:pwd:${patronCharId}`)
      if (!password) {
        setConnectError("No stored password found. Return to character selection.")
        setConnecting(false)
        return
      }

      try {
        const res = await fetch("/api/play/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ characterName, password }),
        })
        const data = await res.json()

        if (!res.ok) {
          setConnectError(data.error ?? "Login failed")
          setConnecting(false)
          return
        }

        if (data.status === "creation_session") {
          setCharState({
            name: characterName,
            hpCurrent: 0,
            hpMax: 0,
            isFinalized: false,
          })
        } else if (data.bootstrap) {
          const cs = parseCharacterState("login", data.bootstrap)
          const rs = parseRoomState("login", data.bootstrap)
          if (cs) setCharState(cs)
          if (rs) setRoomState(rs)
        }

        setSessionId(data.sessionId)
        setConnecting(false)
        addEntry({ type: "info", message: `Connected as ${data.characterName ?? characterName}.` })
      } catch {
        setConnectError("Network error — could not connect.")
        setConnecting(false)
      }
    }

    connect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- State poller with 2-minute inactivity timeout ---
  const pollRef = useRef<string | null>(null)
  pollRef.current = sessionId

  const resetPollTimeout = useCallback(() => {
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    if (!sessionId) return
    // Set timeout to stop polling after 2 minutes (120 seconds) of inactivity
    pollTimeoutRef.current = setTimeout(() => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      addEntry({ type: "info", message: "Polling stopped (2 minutes of inactivity)" })
    }, 120 * 1000)
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return

    async function poll() {
      if (!pollRef.current) return
      try {
        const res = await fetch("/api/play/poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: pollRef.current, tool: "look" }),
        })
        if (res.status === 429) return
        if (!res.ok) return
        const data = await res.json()
        if (data.charState) setCharState(data.charState)
        if (data.roomState) setRoomState(data.roomState)
      } catch {
        // Silently ignore poll failures
      }
    }

    resetPollTimeout()
    poll() // Initial poll
    pollTimerRef.current = setInterval(poll, 8000)
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    }
  }, [sessionId, resetPollTimeout])

  // --- Tool/action selection ---
  const currentToolActions = getToolActions(selectedTool as Parameters<typeof getToolActions>[0])
  const currentAction = currentToolActions.find((a) => a.actionName === selectedAction) ?? currentToolActions[0]
  const paramNames = currentAction
    ? inferParametersFromDescription(selectedTool, currentAction.description, selectedAction)
    : []

  function handleToolChange(tool: string) {
    setSelectedTool(tool)
    const actions = getToolActions(tool as Parameters<typeof getToolActions>[0])
    setSelectedAction(actions[0]?.actionName ?? "default")
    setParams({})
  }

  function handleActionChange(action: string) {
    setSelectedAction(action)
    setParams({})
  }

  // --- Execute command ---
  const executeCommand = useCallback(
    async (toolName: string, action: string, cmdParams?: Record<string, string>) => {
      if (!sessionId) return

      // Guard: only creation and look allowed during setup
      if (charState && !charState.isFinalized && toolName !== "create_character" && toolName !== "look") {
        addEntry({ type: "error", message: `Tool not allowed: ${toolName}. Finish character creation first.` })
        return
      }

      setExecuting(true)
      lastManualCommandRef.current = Date.now()
      resetPollTimeout()
      try {
        const res = await fetch("/api/play/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, toolName, action, params: cmdParams ?? {} }),
        })
        const data = await res.json()

        if (!res.ok) {
          addEntry({ type: "error", message: data.error ?? "Command failed" })
          return
        }

        const result = data.result ?? {}
        addEntry({ type: "command", toolName, action, result, input: cmdParams })

        // Extract and surface messages from result
        if (Array.isArray(result.messages)) {
          for (const msg of result.messages) {
            if (msg && typeof msg === "object") {
              const roomMsg = buildRoomMessage(msg as AnyObj)
              addEntry({ type: "message", message: roomMsg })
            }
          }
        }

        // Extract and surface combat log
        if (typeof result.combat_log === "string") {
          addEntry({ type: "combat_log", message: result.combat_log })
        }

        // Update state from result
        const cs = parseCharacterState(toolName, result)
        const rs = parseRoomState(toolName, result)
        if (cs) setCharState(cs)
        if (rs) setRoomState(rs)
      } catch {
        addEntry({ type: "error", message: "Network error — command failed" })
      } finally {
        setExecuting(false)
      }
    },
    [sessionId, resetPollTimeout],
  )

  function handleSubmit() {
    executeCommand(selectedTool, selectedAction, params)
  }

  function quickCommand(toolName: string, action: string, cmdParams?: Record<string, string>) {
    executeCommand(toolName, action, cmdParams ?? {})
  }

  // --- Connecting / error states ---
  if (connecting) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: "calc(100dvh - 48px)", background: "#151009" }}
      >
        <div style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(180,140,55,0.7)", fontSize: 12, letterSpacing: "0.3em" }}>
          CONNECTING…
        </div>
      </div>
    )
  }

  if (connectError) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-6"
        style={{ height: "calc(100dvh - 48px)", background: "#151009" }}
      >
        <p style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(200,80,60,0.85)", fontSize: 12 }}>
          {connectError}
        </p>
        <button
          onClick={() => router.push("/play")}
          style={{
            fontFamily: "var(--font-geist-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(190,140,45,0.85)",
            background: "rgba(60,35,5,0.3)",
            border: "1px solid rgba(120,80,15,0.45)",
            borderRadius: 2,
            padding: "7px 18px",
            cursor: "pointer",
          }}
        >
          Back to Characters
        </button>
      </div>
    )
  }

  // --- HP bar helpers ---
  const hpPct = charState ? Math.max(0, Math.min(100, (charState.hpCurrent / (charState.hpMax || 1)) * 100)) : 0
  const hpColor =
    hpPct > 60 ? "rgba(74,158,107,0.85)" : hpPct > 30 ? "rgba(196,154,42,0.85)" : "rgba(192,64,64,0.85)"

  const mono: React.CSSProperties = { fontFamily: "var(--font-geist-mono)" }
  const cinzel: React.CSSProperties = { fontFamily: "var(--font-cinzel)" }

  const selectStyle: React.CSSProperties = {
    ...mono,
    fontSize: 11,
    background: "rgba(15,9,2,0.7)",
    border: "1px solid rgba(80,58,18,0.55)",
    borderRadius: 2,
    padding: "5px 8px",
    color: "rgba(200,165,80,0.9)",
    maxWidth: 200,
    outline: "none",
    cursor: "pointer",
  }

  const hasHostiles = roomState?.hostileNpcs && roomState.hostileNpcs.length > 0
  const isInCombat = (charState?.engagementZones && Object.keys(charState.engagementZones).length > 0) || hasHostiles

  return (
    <div
      style={{
        height: "calc(100dvh - 48px)",
        display: "flex",
        flexDirection: "column",
        background: "#151009",
        overflow: "hidden",
      }}
    >
      {/* Pulse Progress Bar */}
      <div style={{ height: 2, background: "rgba(40,30,10,0.3)", width: "100%", flexShrink: 0 }}>
        <div 
          style={{ 
            height: "100%", 
            width: `${(pulseTime / 6) * 100}%`, 
            background: "rgba(180,130,45,0.4)",
            transition: pulseTime < 0.2 ? "none" : "width 0.1s linear"
          }} 
        />
      </div>

      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: "1px solid rgba(70,50,15,0.5)",
          background: "rgba(18,11,3,0.8)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ ...cinzel, fontSize: 14, color: "rgba(220,190,125,0.95)", fontWeight: 600 }}>
            {characterName}
          </span>
          {charState && (
            <span style={{ ...mono, fontSize: 10, color: "rgba(150,115,55,0.7)" }}>
              {formatSlug(charState.class)} {charState.level ? `· Lvl ${charState.level}` : ""}
            </span>
          )}
        </div>
        <button
          onClick={() => router.push("/play")}
          style={{
            ...mono,
            fontSize: 9,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(140,105,45,0.65)",
            background: "transparent",
            border: "1px solid rgba(80,58,18,0.35)",
            borderRadius: 2,
            padding: "4px 12px",
            cursor: "pointer",
          }}
        >
          Exit
        </button>
      </div>

      {/* Main area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left sidebar */}
        <div
          style={{
            width: 224,
            flexShrink: 0,
            borderRight: "1px solid rgba(60,42,12,0.4)",
            overflowY: "auto",
            padding: "10px 0",
            background: "rgba(16,10,2,0.5)",
          }}
        >
          {/* Character panel */}
          {charState && (
            <div style={{ padding: "0 12px 12px", borderBottom: "1px solid rgba(55,38,10,0.45)" }}>
              <p style={{ ...mono, fontSize: 8, letterSpacing: "0.45em", textTransform: "uppercase", color: "rgba(160,110,35,0.6)", marginBottom: 8 }}>
                Character
              </p>

              {/* HP bar */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ ...mono, fontSize: 9, color: "rgba(160,125,65,0.7)" }}>HP</span>
                  <span style={{ ...mono, fontSize: 9, color: hpColor }}>
                    {charState.hpCurrent}{charState.hpTemp ? `+${charState.hpTemp}` : ""} / {charState.hpMax}
                  </span>
                </div>
                <div style={{ height: 4, background: "rgba(40,28,8,0.7)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${hpPct}%`, background: hpColor, borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              </div>

              {/* AC */}
              {charState.ac !== undefined && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ ...mono, fontSize: 9, color: "rgba(160,125,65,0.7)" }}>AC</span>
                  <span style={{ ...mono, fontSize: 9, color: "rgba(200,165,80,0.85)" }}>{charState.ac}</span>
                </div>
              )}

              {/* Conditions */}
              {charState.conditions && charState.conditions.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>
                  {charState.conditions.map((c) => (
                    <span
                      key={c}
                      style={{
                        ...mono,
                        fontSize: 8,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(200,100,50,0.85)",
                        background: "rgba(120,40,10,0.25)",
                        border: "1px solid rgba(160,60,20,0.3)",
                        borderRadius: 2,
                        padding: "1px 5px",
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {/* Death/dying indicators */}
              {charState.isDying && (
                <p style={{ ...mono, fontSize: 9, color: "rgba(200,80,60,0.9)", marginBottom: 4 }}>
                  ⚠ Dying — making death saves
                </p>
              )}
              {charState.isDead && (
                <p style={{ ...mono, fontSize: 9, color: "rgba(180,60,60,0.9)", marginBottom: 4 }}>
                  💀 Spirit state
                  {charState.minutesUntilRevival !== undefined && (
                    <span> — {Math.ceil(charState.minutesUntilRevival)}m until revival</span>
                  )}
                </p>
              )}

              {/* In combat indicator */}
              {isInCombat && (
                <p style={{ ...mono, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(190,60,40,0.75)", marginTop: 6 }}>
                  ⚔ In Combat
                </p>
              )}
            </div>
          )}

          {/* Creation Checklist */}
          {charState && !charState.isFinalized && (
            <div style={{ padding: "10px 12px 12px", borderBottom: "1px solid rgba(55,38,10,0.45)", background: "rgba(40,30,10,0.2)" }}>
              <p style={{ ...mono, fontSize: 8, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(190,140,50,0.8)", marginBottom: 8 }}>
                Creation Progress
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {creationSteps.map((step) => (
                  <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div 
                      style={{ 
                        width: 10, 
                        height: 10, 
                        border: "1px solid rgba(160,110,35,0.4)", 
                        borderRadius: 1,
                        background: step.done ? "rgba(100,160,50,0.3)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 7,
                        color: "rgba(150,220,100,0.9)"
                      }}
                    >
                      {step.done ? "✓" : ""}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTool(step.tool)
                        setSelectedAction(step.action)
                      }}
                      style={{
                        ...mono,
                        fontSize: 9,
                        color: step.done ? "rgba(160,125,65,0.5)" : "rgba(210,180,120,0.9)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        textAlign: "left"
                      }}
                    >
                      {step.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Room panel */}
          {roomState && (
            <div style={{ padding: "10px 12px 12px", borderBottom: "1px solid rgba(55,38,10,0.45)" }}>
              <p style={{ ...mono, fontSize: 8, letterSpacing: "0.45em", textTransform: "uppercase", color: "rgba(160,110,35,0.6)", marginBottom: 6 }}>
                Location
              </p>
              <p style={{ ...cinzel, fontSize: 11, color: "rgba(210,175,105,0.9)", marginBottom: 4, lineHeight: 1.3 }}>
                {roomState.name}
              </p>
              {roomState.hub !== undefined && (
                <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 2 }}>
                  Hub {roomState.hub}{roomState.isSanctuary ? " · Sanctuary" : ""}
                </p>
              )}

              {/* Exits */}
              {roomState.exits && roomState.exits.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 4 }}>Exits:</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {roomState.exits.map((exit) => (
                      <button
                        key={exit.key}
                        onClick={() => quickCommand("move", "default", { direction: exit.key })}
                        disabled={executing || !charState?.isFinalized}
                        style={{
                          ...mono,
                          fontSize: 9,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "rgba(180,140,55,0.85)",
                          background: "rgba(50,30,5,0.4)",
                          border: "1px solid rgba(90,62,15,0.45)",
                          borderRadius: 2,
                          padding: "2px 7px",
                          cursor: executing || !charState?.isFinalized ? "not-allowed" : "pointer",
                          opacity: executing || !charState?.isFinalized ? 0.5 : 1,
                        }}
                      >
                        {exit.key}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* NPCs */}
              {roomState.npcs && roomState.npcs.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>NPCs:</p>
                  {roomState.npcs.map((npc) => (
                    <p key={npc} style={{ ...mono, fontSize: 9, color: "rgba(185,148,70,0.75)", marginBottom: 1 }}>{npc}</p>
                  ))}
                </div>
              )}

              {/* Other characters */}
              {roomState.characters && roomState.characters.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>Characters:</p>
                  {roomState.characters.map((char) => (
                    <p key={char} style={{ ...mono, fontSize: 9, color: "rgba(170,135,65,0.7)", marginBottom: 1 }}>{char}</p>
                  ))}
                </div>
              )}

              {/* Objects */}
              {roomState.objects && roomState.objects.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>Objects:</p>
                  {roomState.objects.map((obj) => (
                    <p key={obj} style={{ ...mono, fontSize: 9, color: "rgba(160,125,58,0.65)", marginBottom: 1 }}>{obj}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div style={{ padding: "10px 12px" }}>
            <p style={{ ...mono, fontSize: 8, letterSpacing: "0.45em", textTransform: "uppercase", color: "rgba(160,110,35,0.6)", marginBottom: 8 }}>
              Quick
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {[
                { label: "Look", tool: "look", action: "default" },
                { label: "Status", tool: "character", action: "status" },
                { label: "Quests", tool: "quest", action: "list" },
                { label: "Skills", tool: "character", action: "skills" },
              ].map(({ label, tool, action }) => (
                <button
                  key={label}
                  onClick={() => quickCommand(tool, action)}
                  disabled={executing || !sessionId || (!charState?.isFinalized && tool !== "look")}
                  style={{
                    ...mono,
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(180,140,55,0.85)",
                    background: "rgba(40,25,5,0.45)",
                    border: "1px solid rgba(75,52,12,0.45)",
                    borderRadius: 2,
                    padding: "6px 4px",
                    cursor: executing || !sessionId || (!charState?.isFinalized && tool !== "look") ? "not-allowed" : "pointer",
                    opacity: (executing || (!charState?.isFinalized && tool !== "look")) ? 0.6 : 1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center — feed + command input */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Activity feed */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {feed.length === 0 && (
              <p style={{ ...mono, fontSize: 10, color: "rgba(120,90,35,0.5)" }}>
                No activity yet. Use a command below to start.
              </p>
            )}

            {feed.map((entry) => {
              const ev = entry.event
              const expanded = expandedIds.has(entry.id)

              if (ev.type === "info") {
                return (
                  <p key={entry.id} style={{ ...mono, fontSize: 10, color: "rgba(140,110,50,0.55)" }}>
                    {ev.message}
                  </p>
                )
              }

              if (ev.type === "error") {
                return (
                  <p key={entry.id} style={{ ...mono, fontSize: 10, color: "rgba(200,80,60,0.85)" }}>
                    ✗ {ev.message}
                  </p>
                )
              }

              if (ev.type === "message") {
                const msg = ev.message as RoomMessage
                return (
                  <p key={entry.id} style={{ ...mono, fontSize: 10, color: "rgba(185,148,70,0.85)", lineHeight: 1.4 }}>
                    {msg.text}
                  </p>
                )
              }

              if (ev.type === "combat_log") {
                return (
                  <p key={entry.id} style={{ ...mono, fontSize: 10, color: "rgba(200,120,80,0.85)", lineHeight: 1.4 }}>
                    ⚔ {ev.message}
                  </p>
                )
              }

              // command event
              const result = ev.result as AnyObj
              const summary = extractSummary(ev.toolName, ev.action, result)

              if (ev.toolName === "look") {
                return <LookEvent key={entry.id} result={result} roomState={roomState} />
              }
              if (ev.toolName === "move") {
                return <MoveEvent key={entry.id} result={result} input={ev.input ?? { direction: ev.action === "default" ? "" : ev.action }} />
              }
              if (ev.toolName === "combat") {
                return <CombatEvent key={entry.id} result={result} input={ev.input ?? { action: ev.action }} />
              }
              if (ev.toolName === "speak") {
                return <SpeakEvent key={entry.id} result={result} input={ev.input ?? { target_ref: "", message: "" }} />
              }

              return (
                <div key={entry.id} style={{ borderBottom: "1px solid rgba(55,38,10,0.3)", paddingBottom: 6, marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                    <span
                      style={{
                        ...mono,
                        fontSize: 8,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "rgba(180,130,45,0.75)",
                      }}
                    >
                      {ev.toolName}
                    </span>
                    {ev.action !== "default" && (
                      <span style={{ ...mono, fontSize: 8, color: "rgba(140,100,35,0.55)" }}>
                        {ev.action}
                      </span>
                    )}
                  </div>

                  {summary && (
                    <p style={{ ...mono, fontSize: 11, color: "rgba(210,180,120,0.9)", lineHeight: 1.5 }}>
                      {summary}
                    </p>
                  )}

                  <button
                    onClick={() =>
                      setExpandedIds((prev) => {
                        const next = new Set(prev)
                        next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id)
                        return next
                      })
                    }
                    style={{
                      ...mono,
                      fontSize: 8,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "rgba(120,88,28,0.5)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 0",
                      marginTop: 2,
                    }}
                  >
                    {expanded ? "▲ collapse" : "▼ expand"}
                  </button>

                  {expanded && (
                    <pre
                      style={{
                        ...mono,
                        fontSize: 9,
                        color: "rgba(160,130,60,0.7)",
                        background: "rgba(12,7,1,0.5)",
                        border: "1px solid rgba(55,38,10,0.3)",
                        borderRadius: 2,
                        padding: "8px 10px",
                        marginTop: 4,
                        overflowX: "auto",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                </div>
              )
            })}
            <div ref={feedEndRef} />
          </div>

          {/* Command input */}
          <div
            style={{
              flexShrink: 0,
              borderTop: "1px solid rgba(65,45,12,0.5)",
              padding: "10px 16px",
              background: "rgba(14,9,2,0.6)",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 12px", alignItems: "flex-end" }}>

              {/* Tool dropdown */}
              <div style={{ flexShrink: 0 }}>
                <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>Tool</p>
                <select
                  value={selectedTool}
                  onChange={(e) => handleToolChange(e.target.value)}
                  style={selectStyle}
                >
                  {filteredCommands.map((cmd) => (
                    <option key={cmd.toolName} value={cmd.toolName} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                      {cmd.toolName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action dropdown — only when tool has multiple actions */}
              {currentToolActions.length > 1 && (
                <div style={{ flexShrink: 0 }}>
                  <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>Action</p>
                  <select
                    value={selectedAction}
                    onChange={(e) => handleActionChange(e.target.value)}
                    style={selectStyle}
                  >
                    {currentToolActions.map((a) => (
                      <option key={a.actionName} value={a.actionName} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                        {a.actionName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Parameter inputs */}
              {paramNames.map((paramName) => {
                // Deduplicate action/Action
                if (paramName === "Action" && paramNames.includes("action")) return null;

                // Smart dropdowns
                if (paramName === "direction" && roomState?.exits) {
                  const zoneExits = [
                    { key: "closer", display: "closer (zone)" },
                    { key: "farther", display: "farther (zone)" },
                  ]
                  return (
                    <div key={paramName} style={{ flexShrink: 0 }}>
                      <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                      <select
                        value={params[paramName] ?? ""}
                        onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                        style={selectStyle}
                      >
                        <option value="" style={{ background: "#1a0f03" }}>—</option>
                        {zoneExits.map((exit) => (
                          <option key={exit.key} value={exit.key} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                            {exit.display}
                          </option>
                        ))}
                        {roomState.exits.map((exit) => (
                          <option key={exit.key} value={exit.key} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                            {exit.key}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }

                if (paramName === "target" && selectedTool === "look" && roomState) {
                  const options = [
                    ...(roomState.npcs || []).map(n => ({ name: n, ref: n })),
                    ...(roomState.characters || []).map(n => ({ name: n, ref: n })),
                    ...(roomState.objects || []).map(n => ({ name: n, ref: n })),
                    ...(roomState.bodies || []).map(n => ({ name: n.name, ref: n.ref })),
                    ...(roomState.items || []).map(n => ({ name: n.name, ref: n.ref })),
                  ]
                  return (
                    <div key={paramName} style={{ flexShrink: 0 }}>
                      <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                      <select
                        value={params[paramName] ?? ""}
                        onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                        style={selectStyle}
                      >
                        <option value="" style={{ background: "#1a0f03" }}>room</option>
                        {options.map((opt) => (
                          <option key={`${opt.ref}-${opt.name}`} value={opt.ref} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }

                if (paramName === "skill" && ["search", "study", "influence"].includes(selectedTool)) {
                  let options: string[] = []
                  if (selectedTool === "search") options = ["perception", "insight", "survival", "investigation"]
                  if (selectedTool === "study") options = ["arcana", "history", "nature", "religion", "medicine"]
                  if (selectedTool === "influence") options = ["persuasion", "deception", "intimidation", "insight"]
                  
                  return (
                    <div key={paramName} style={{ flexShrink: 0 }}>
                      <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                      <select
                        value={params[paramName] ?? ""}
                        onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                        style={selectStyle}
                      >
                        <option value="" style={{ background: "#1a0f03" }}>—</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }

                if (paramName === "target_ref" || paramName === "vendor_ref") {
                  const npcOptions = (roomState?.npcs ?? []).map((npc) => ({ name: npc, ref: npc }))
                  const charOptions = (roomState?.characterRefs ?? [])
                  const bodyOptions = (roomState?.bodies ?? []).map(b => ({ name: b.name, ref: b.ref }))
                  const allOptions = [...npcOptions, ...charOptions, ...bodyOptions]

                  if (allOptions.length > 0) {
                    return (
                      <div key={paramName} style={{ flexShrink: 0 }}>
                        <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                        <select
                          value={params[paramName] ?? ""}
                          onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                          style={selectStyle}
                        >
                          <option value="" style={{ background: "#1a0f03" }}>—</option>
                          {allOptions.map((opt) => (
                            <option key={`${opt.ref}-${opt.name}`} value={opt.ref} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  }
                }

                if (paramName === "action") {
                  let options: { label: string, val: string }[] = []
                  if (selectedTool === "combat") options = [
                    { label: "Attack", val: "attack" },
                    { label: "Cast Spell", val: "cast_spell" },
                    { label: "Dash", val: "dash" },
                    { label: "Disengage", val: "disengage" },
                    { label: "Dodge", val: "dodge" },
                    { label: "Help", val: "help" },
                    { label: "Grapple", val: "grapple" },
                    { label: "Escape", val: "escape" },
                    { label: "Shove", val: "shove" },
                    { label: "Stand Up", val: "stand_up" },
                    { label: "Rouse", val: "rouse" },
                    { label: "Use Item", val: "use_item" },
                  ]
                  if (selectedTool === "quest") options = [
                    { label: "List Active", val: "list" },
                    { label: "List Available", val: "available" },
                    { label: "Accept", val: "accept" },
                    { label: "Abandon", val: "abandon" },
                    { label: "Reputation", val: "reputation" },
                  ]
                  if (selectedTool === "shop") options = [
                    { label: "Browse", val: "browse" },
                    { label: "Buy", val: "buy" },
                    { label: "Sell", val: "sell" },
                    { label: "Inspect", val: "inspect" },
                  ]
                  if (selectedTool === "character") options = [
                    { label: "Status", val: "status" },
                    { label: "Skills", val: "skills" },
                    { label: "Equip", val: "equip" },
                    { label: "Unequip", val: "unequip" },
                    { label: "Level Up", val: "level_up" },
                    { label: "Prepare Spells", val: "prepare_spells" },
                    { label: "Set Intent", val: "set_intent" },
                    { label: "Clear Intent", val: "clear_intent" },
                  ]
                  if (selectedTool === "journal") options = [
                    { label: "Write", val: "write" },
                    { label: "Read", val: "read" },
                    { label: "Search", val: "search" },
                    { label: "Read Other", val: "read_other" },
                    { label: "Context", val: "context" },
                    { label: "Set Voice", val: "set_voice" },
                  ]
                  if (selectedTool === "rest") options = [
                    { label: "Short Rest", val: "short" },
                    { label: "Long Rest", val: "long" },
                  ]
                  if (selectedTool === "create_character") options = [
                    { label: "Set Class", val: "set_class" },
                    { label: "Set Race", val: "set_race" },
                    { label: "Ability Scores", val: "set_ability_scores" },
                    { label: "Set Background", val: "set_background" },
                    { label: "Select Skills", val: "set_skills" },
                    { label: "Start Equipment", val: "set_equipment" },
                    { label: "Finalize", val: "finalize" },
                  ]

                  if (options.length > 0) {
                    return (
                      <div key={paramName} style={{ flexShrink: 0 }}>
                        <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                        <select
                          value={params[paramName] ?? ""}
                          onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                          style={selectStyle}
                        >
                          <option value="" style={{ background: "#1a0f03" }}>—</option>
                          {options.map((opt) => (
                            <option key={opt.val} value={opt.val} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  }
                }

                if (paramName === "item_id" || paramName === "item_ref") {
                   const options = (roomState?.items ?? []).map(n => ({ name: n.name, ref: n.ref }))
                   if (options.length > 0) {
                    return (
                      <div key={paramName} style={{ flexShrink: 0 }}>
                        <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                        <select
                          value={params[paramName] ?? ""}
                          onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                          style={selectStyle}
                        >
                          <option value="" style={{ background: "#1a0f03" }}>—</option>
                          {options.map((opt) => (
                            <option key={`${opt.ref}-${opt.name}`} value={opt.ref} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  }
                }

                if (paramName === "class_name" && selectedTool === "create_character") {
                  const options = ["fighter", "rogue", "wizard", "cleric"]
                  return (
                    <div key={paramName} style={{ flexShrink: 0 }}>
                      <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                      <select
                        value={params[paramName] ?? ""}
                        onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                        style={selectStyle}
                      >
                        <option value="" style={{ background: "#1a0f03" }}>—</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }

                if (paramName === "method" && selectedTool === "create_character") {
                  const options = ["standard_array", "point_buy"]
                  return (
                    <div key={paramName} style={{ flexShrink: 0 }}>
                      <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                      <select
                        value={params[paramName] ?? ""}
                        onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                        style={selectStyle}
                      >
                        <option value="" style={{ background: "#1a0f03" }}>—</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                            {opt.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }

                if (paramName === "background" && selectedTool === "create_character") {
                  const options = ["acolyte", "criminal", "folk_hero", "noble", "outlander", "sage", "soldier"]
                  return (
                    <div key={paramName} style={{ flexShrink: 0 }}>
                      <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                      <select
                        value={params[paramName] ?? ""}
                        onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                        style={selectStyle}
                      >
                        <option value="" style={{ background: "#1a0f03" }}>—</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                            {opt.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }

                if (paramName === "race" && selectedTool === "create_character") {
                  const options = ["human", "elf", "dwarf", "halfling"]
                  return (
                    <div key={paramName} style={{ flexShrink: 0 }}>
                      <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                      <select
                        value={params[paramName] ?? ""}
                        onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                        style={selectStyle}
                      >
                        <option value="" style={{ background: "#1a0f03" }}>—</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }

                if (paramName === "entry_type" && selectedTool === "journal") {
                  const options = ["status_update", "long_rest", "note", "notice", "ooc"]
                  return (
                    <div key={paramName} style={{ flexShrink: 0 }}>
                      <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                      <select
                        value={params[paramName] ?? ""}
                        onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                        style={selectStyle}
                      >
                        <option value="" style={{ background: "#1a0f03" }}>—</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }

                if (paramName === "choices" || paramName === "choice") {
                   return (
                    <div key={paramName} style={{ flexShrink: 0 }}>
                      <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                      <input
                        type="text"
                        value={params[paramName] ?? ""}
                        onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                        placeholder="e.g. str=1, dex=1"
                        style={{
                          ...mono,
                          fontSize: 11,
                          width: 160,
                          background: "rgba(10,6,1,0.6)",
                          border: "1px solid rgba(70,50,14,0.5)",
                          borderRadius: 2,
                          padding: "5px 8px",
                          color: "rgba(200,165,80,0.9)",
                          outline: "none",
                        }}
                      />
                    </div>
                  )
                }

                if (paramName === "title" && selectedTool === "journal") {
                  return (
                    <div key={paramName} style={{ flexShrink: 0 }}>
                      <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                      <input
                        type="text"
                        value={params[paramName] ?? ""}
                        onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                        placeholder="Notice title..."
                        style={{
                          ...mono,
                          fontSize: 11,
                          width: 200,
                          background: "rgba(10,6,1,0.6)",
                          border: "1px solid rgba(70,50,14,0.5)",
                          borderRadius: 2,
                          padding: "5px 8px",
                          color: "rgba(200,165,80,0.9)",
                          outline: "none",
                        }}
                      />
                    </div>
                  )
                }
                
                if (paramName === "content" && selectedTool === "journal") {
                  return (
                    <div key={paramName} style={{ width: "100%", marginTop: 4 }}>
                      <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                      <textarea
                        value={params[paramName] ?? ""}
                        onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                        placeholder="Your journal entry..."
                        rows={4}
                        style={{
                          ...mono,
                          fontSize: 11,
                          width: "100%",
                          background: "rgba(10,6,1,0.6)",
                          border: "1px solid rgba(70,50,14,0.5)",
                          borderRadius: 2,
                          padding: "8px 10px",
                          color: "rgba(200,165,80,0.9)",
                          outline: "none",
                          resize: "vertical"
                        }}
                      />
                    </div>
                  )
                }

                // Plain text input
                return (
                  <div key={paramName} style={{ flexShrink: 0 }}>
                    <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                    <input
                      type="text"
                      value={params[paramName] ?? ""}
                      onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                      placeholder={paramName}
                      style={{
                        ...mono,
                        fontSize: 11,
                        width: paramName === "message" ? 200 : 120,
                        background: "rgba(10,6,1,0.6)",
                        border: "1px solid rgba(70,50,14,0.5)",
                        borderRadius: 2,
                        padding: "5px 8px",
                        color: "rgba(200,165,80,0.9)",
                        outline: "none",
                      }}
                    />
                  </div>
                )
              })}

              {/* Execute button */}
              <button
                onClick={handleSubmit}
                disabled={executing || !sessionId}
                style={{
                  ...mono,
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: executing ? "rgba(160,120,50,0.4)" : "rgba(200,155,50,0.92)",
                  background: "rgba(65,35,5,0.4)",
                  border: "1px solid rgba(130,85,15,0.5)",
                  borderRadius: 2,
                  padding: "7px 18px",
                  cursor: executing || !sessionId ? "not-allowed" : "pointer",
                  alignSelf: "flex-end",
                }}
              >
                {executing ? "…" : "Execute"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
