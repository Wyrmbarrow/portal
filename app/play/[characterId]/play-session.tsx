"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { formatSlug } from "@/lib/format"
import { getAvailableCommands, getToolActions, inferParametersFromDescription } from "../lib/command-utils"
import { parseCharacterState, parseRoomState } from "../lib/parse-state"
import type { CharacterState, RoomState, FeedEntry, PlayEvent } from "../lib/types"

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
  const allCommands = getAvailableCommands()
  const [selectedTool, setSelectedTool] = useState<string>(allCommands[0]?.toolName ?? "look")
  const [selectedAction, setSelectedAction] = useState<string>("default")
  const [params, setParams] = useState<Record<string, string>>({})
  const [executing, setExecuting] = useState(false)

  const feedEndRef = useRef<HTMLDivElement>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

        setSessionId(data.sessionId)
        setConnecting(false)
        if (data.bootstrap) {
          const cs = parseCharacterState("login", data.bootstrap)
          const rs = parseRoomState("login", data.bootstrap)
          if (cs) setCharState(cs)
          if (rs) setRoomState(rs)
        }
        addEntry({ type: "info", message: `Connected as ${data.characterName ?? characterName}.` })
      } catch {
        setConnectError("Network error — could not connect.")
        setConnecting(false)
      }
    }

    connect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- State poller ---
  const pollRef = useRef<string | null>(null)
  pollRef.current = sessionId

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

    pollTimerRef.current = setInterval(poll, 8000)
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [sessionId])

  // --- Tool/action selection ---
  const currentToolActions = getToolActions(selectedTool as Parameters<typeof getToolActions>[0])
  const currentAction = currentToolActions.find((a) => a.actionName === selectedAction) ?? currentToolActions[0]
  const paramNames = currentAction
    ? inferParametersFromDescription(selectedTool, currentAction.description)
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
      setExecuting(true)
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
        addEntry({ type: "command", toolName, action, result })

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
    [sessionId],
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
    outline: "none",
    cursor: "pointer",
  }

  const resources = charState?.resources
  const resourceItems = resources
    ? [
        { label: "Act", value: resources.action },
        { label: "Mov", value: resources.movement },
        { label: "Bon", value: resources.bonus_action },
        { label: "Rea", value: resources.reaction },
        { label: "Cht", value: resources.chat },
      ]
    : []

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

              {/* Pulse resources */}
              {resourceItems.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, marginTop: 6 }}>
                  {resourceItems.map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "2px 6px",
                        background: "rgba(30,20,5,0.5)",
                        border: "1px solid rgba(60,42,12,0.3)",
                        borderRadius: 2,
                      }}
                    >
                      <span style={{ ...mono, fontSize: 8, color: "rgba(140,105,45,0.65)", textTransform: "uppercase" }}>{label}</span>
                      <span style={{ ...mono, fontSize: 9, color: value > 0 ? "rgba(190,155,65,0.9)" : "rgba(120,85,30,0.45)" }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* In combat indicator */}
              {charState.engagementZones && Object.keys(charState.engagementZones).length > 0 && (
                <p style={{ ...mono, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(190,60,40,0.75)", marginTop: 6 }}>
                  ⚔ In Combat
                </p>
              )}
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
                        disabled={executing}
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
                          cursor: executing ? "not-allowed" : "pointer",
                          opacity: executing ? 0.5 : 1,
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
                  disabled={executing || !sessionId}
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
                    cursor: executing || !sessionId ? "not-allowed" : "pointer",
                    opacity: executing ? 0.6 : 1,
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

              // command event
              const result = ev.result as AnyObj
              const summary = extractSummary(ev.toolName, ev.action, result)

              return (
                <div key={entry.id} style={{ borderBottom: "1px solid rgba(55,38,10,0.3)", paddingBottom: 6 }}>
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "flex-end" }}>

              {/* Tool dropdown */}
              <div>
                <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>Tool</p>
                <select
                  value={selectedTool}
                  onChange={(e) => handleToolChange(e.target.value)}
                  style={selectStyle}
                >
                  {allCommands.map((cmd) => (
                    <option key={cmd.toolName} value={cmd.toolName} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                      {cmd.toolName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action dropdown — only when tool has multiple actions */}
              {currentToolActions.length > 1 && (
                <div>
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
                // Smart dropdowns
                if (paramName === "direction" && roomState?.exits) {
                  return (
                    <div key={paramName}>
                      <p style={{ ...mono, fontSize: 8, color: "rgba(130,95,38,0.55)", marginBottom: 3 }}>{paramName}</p>
                      <select
                        value={params[paramName] ?? ""}
                        onChange={(e) => setParams((p) => ({ ...p, [paramName]: e.target.value }))}
                        style={selectStyle}
                      >
                        <option value="" style={{ background: "#1a0f03" }}>—</option>
                        {roomState.exits.map((exit) => (
                          <option key={exit.key} value={exit.key} style={{ background: "#1a0f03", color: "rgba(200,165,80,0.9)" }}>
                            {exit.key}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }

                if (paramName === "target_ref" || paramName === "vendor_ref") {
                  const options = [
                    ...(roomState?.npcs ?? []),
                    ...(paramName === "target_ref" ? (roomState?.characterRefs?.map((r) => r.ref) ?? []) : []),
                  ]
                  if (options.length > 0) {
                    return (
                      <div key={paramName}>
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
                }

                // Plain text input
                return (
                  <div key={paramName}>
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
