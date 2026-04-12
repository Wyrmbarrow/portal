"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatSlug } from "@/lib/format"
import type { PlayAgent } from "../page"

interface Props {
  agents: PlayAgent[]
}

interface AgentState {
  hasPassword: boolean
  showPasswordForm: boolean
  passwordInput: string
  loginError: string | null
  loggingIn: boolean
}

function storageKey(patronCharId: string) {
  return `wyrmbarrow:pwd:${patronCharId}`
}

function nameFallbackKey(name: string) {
  return `wyrmbarrow:pwd:name:${name.toLowerCase()}`
}

export default function PlayCharacterList({ agents }: Props) {
  const router = useRouter()
  const [states, setStates] = useState<Record<string, AgentState>>(() =>
    Object.fromEntries(
      agents.map((a) => [
        a.patronCharId,
        { hasPassword: false, showPasswordForm: false, passwordInput: "", loginError: null, loggingIn: false },
      ]),
    ),
  )

  // On mount: check localStorage for stored passwords
  useEffect(() => {
    setStates((prev) => {
      const next = { ...prev }
      for (const agent of agents) {
        const primary = localStorage.getItem(storageKey(agent.patronCharId))
        if (primary) {
          next[agent.patronCharId] = { ...next[agent.patronCharId], hasPassword: true }
          continue
        }
        // Migrate from name-based fallback key
        const fallback = localStorage.getItem(nameFallbackKey(agent.name))
        if (fallback) {
          localStorage.setItem(storageKey(agent.patronCharId), fallback)
          localStorage.removeItem(nameFallbackKey(agent.name))
          next[agent.patronCharId] = { ...next[agent.patronCharId], hasPassword: true }
        }
      }
      return next
    })
  }, [agents])

  function updateState(patronCharId: string, patch: Partial<AgentState>) {
    setStates((prev) => ({
      ...prev,
      [patronCharId]: { ...prev[patronCharId], ...patch },
    }))
  }

  async function handlePlay(agent: PlayAgent) {
    const password = localStorage.getItem(storageKey(agent.patronCharId))
    if (!password) {
      updateState(agent.patronCharId, { showPasswordForm: true })
      return
    }
    await doLogin(agent, password)
  }

  async function handleManualLogin(agent: PlayAgent) {
    const { passwordInput } = states[agent.patronCharId]
    if (!passwordInput.trim()) return
    await doLogin(agent, passwordInput.trim())
  }

  async function doLogin(agent: PlayAgent, password: string) {
    updateState(agent.patronCharId, { loggingIn: true, loginError: null })
    try {
      const res = await fetch("/api/play/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterName: agent.name, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          // Bad password — clear stored value
          localStorage.removeItem(storageKey(agent.patronCharId))
          updateState(agent.patronCharId, {
            loggingIn: false,
            loginError: data.error ?? "Invalid password",
            hasPassword: false,
            showPasswordForm: true,
          })
        } else {
          updateState(agent.patronCharId, {
            loggingIn: false,
            loginError: data.error ?? "Login failed",
          })
        }
        return
      }

      // Store the working password under primary key
      localStorage.setItem(storageKey(agent.patronCharId), password)

      // Hand off session to the play page via sessionStorage
      sessionStorage.setItem(
        "wyrmbarrow:play",
        JSON.stringify({ sessionId: data.sessionId, characterName: data.characterName, bootstrap: data.bootstrap }),
      )

      router.push(`/play/${agent.patronCharId}`)
    } catch {
      updateState(agent.patronCharId, { loggingIn: false, loginError: "Network error — try again" })
    }
  }

  const mono: React.CSSProperties = { fontFamily: "var(--font-geist-mono)" }

  if (agents.length === 0) {
    return (
      <p className="text-xs leading-relaxed" style={{ ...mono, color: "rgba(148,125,82,0.85)" }}>
        No characters registered yet. Use the registration form below to create one.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <h2
        className="text-[8px] tracking-[0.5em] uppercase"
        style={{ fontFamily: "var(--font-cinzel)", color: "rgba(195,138,52,0.9)" }}
      >
        Your Characters
      </h2>
      <div className="space-y-3">
        {agents.map((agent) => {
          const state = states[agent.patronCharId]
          if (!state) return null

          const recentlyDead =
            agent.dead && agent.diedAt !== null && Date.now() / 1000 - agent.diedAt < agent.level * 3600

          return (
            <div
              key={agent.patronCharId}
              className="relative overflow-hidden"
              style={{ border: "1px solid rgba(90,68,28,0.6)", background: "rgba(30,22,8,0.5)" }}
            >
              {/* Corner ornaments */}
              <span className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: "rgba(170,110,28,0.55)" }} />
              <span className="absolute top-0 right-0 w-2 h-2 border-t border-r" style={{ borderColor: "rgba(170,110,28,0.55)" }} />
              <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l" style={{ borderColor: "rgba(170,110,28,0.55)" }} />
              <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: "rgba(170,110,28,0.55)" }} />

              <div className="flex items-center justify-between px-4 py-3">
                {/* Character info */}
                <div>
                  <div className="flex items-center gap-2">
                    {recentlyDead && <span className="text-sm leading-none">🪦</span>}
                    <span
                      className="text-sm tracking-wide"
                      style={{ fontFamily: "var(--font-cinzel)", color: "rgba(220,190,130,0.95)" }}
                    >
                      {agent.name}
                    </span>
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ ...mono, color: "rgba(160,125,72,0.75)" }}>
                    Lvl {agent.level}
                    {agent.race && ` · ${formatSlug(agent.race)}`}
                    {agent.characterClass && ` · ${formatSlug(agent.characterClass)}`}
                    {agent.subclass && (
                      <span style={{ color: "rgba(140,105,55,0.6)" }}> · {formatSlug(agent.subclass)}</span>
                    )}
                  </p>
                </div>

                {/* Play button */}
                {!state.showPasswordForm && (
                  <button
                    onClick={() => handlePlay(agent)}
                    disabled={state.loggingIn}
                    style={{
                      ...mono,
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: state.loggingIn ? "rgba(160,120,50,0.4)" : "rgba(200,148,50,0.9)",
                      background: "rgba(70,38,5,0.35)",
                      border: "1px solid rgba(140,88,18,0.5)",
                      borderRadius: 2,
                      padding: "5px 16px",
                      cursor: state.loggingIn ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {state.loggingIn ? "Connecting…" : "Play"}
                  </button>
                )}
              </div>

              {/* Error message */}
              {state.loginError && (
                <div className="px-4 pb-2">
                  <p style={{ ...mono, fontSize: 10, color: "rgba(200,80,60,0.85)" }}>{state.loginError}</p>
                </div>
              )}

              {/* Inline password form */}
              {state.showPasswordForm && (
                <div
                  className="px-4 py-3"
                  style={{ borderTop: "1px solid rgba(70,50,15,0.4)", background: "rgba(20,12,3,0.4)" }}
                >
                  <p style={{ ...mono, fontSize: 10, color: "rgba(160,125,72,0.75)", marginBottom: 8 }}>
                    Enter permanent password for {agent.name}:
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="password"
                      value={state.passwordInput}
                      onChange={(e) =>
                        updateState(agent.patronCharId, { passwordInput: e.target.value, loginError: null })
                      }
                      onKeyDown={(e) => e.key === "Enter" && handleManualLogin(agent)}
                      placeholder="permanent password"
                      style={{
                        ...mono,
                        fontSize: 11,
                        flex: 1,
                        background: "rgba(10,6,1,0.6)",
                        border: "1px solid rgba(90,65,18,0.5)",
                        borderRadius: 2,
                        padding: "5px 10px",
                        color: "rgba(200,160,70,0.9)",
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={() => handleManualLogin(agent)}
                      disabled={state.loggingIn}
                      style={{
                        ...mono,
                        fontSize: 10,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: "rgba(200,148,50,0.9)",
                        background: "rgba(70,38,5,0.35)",
                        border: "1px solid rgba(140,88,18,0.5)",
                        borderRadius: 2,
                        padding: "5px 14px",
                        cursor: state.loggingIn ? "not-allowed" : "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {state.loggingIn ? "…" : "Go"}
                    </button>
                    <button
                      onClick={() =>
                        updateState(agent.patronCharId, {
                          showPasswordForm: false,
                          passwordInput: "",
                          loginError: null,
                        })
                      }
                      style={{
                        ...mono,
                        fontSize: 11,
                        color: "rgba(140,105,50,0.6)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "5px 4px",
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
