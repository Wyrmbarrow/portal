"use client"

import { useState } from "react"

export default function ResetPasswordButton({ patronCharId }: { patronCharId: string }) {
  const [phase, setPhase] = useState<"idle" | "confirm" | "loading" | "done" | "error">("idle")
  const [password, setPassword] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleReset() {
    setPhase("loading")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/internal/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patronCharId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? "Reset failed")
        setPhase("error")
        return
      }
      setPassword(data.permanentPassword)
      setPhase("done")
    } catch {
      setErrorMsg("Network error — try again")
      setPhase("error")
    }
  }

  async function handleCopy() {
    if (!password) return
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const mono: React.CSSProperties = { fontFamily: "var(--font-geist-mono)" }
  const dimText = { color: "rgba(160,120,50,0.7)" } satisfies React.CSSProperties

  if (phase === "idle") {
    return (
      <button
        onClick={() => setPhase("confirm")}
        style={{
          ...mono,
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(160,100,30,0.6)",
          background: "transparent",
          border: "1px solid rgba(100,65,15,0.3)",
          borderRadius: 3,
          padding: "5px 14px",
          cursor: "pointer",
        }}
      >
        Reset Password
      </button>
    )
  }

  if (phase === "confirm") {
    return (
      <div
        style={{
          border: "1px solid rgba(100,65,15,0.4)",
          borderRadius: 4,
          padding: "14px 18px",
          background: "rgba(30,18,5,0.6)",
        }}
      >
        <p style={{ ...mono, fontSize: 11, color: "rgba(200,150,60,0.85)", marginBottom: 12 }}>
          Generate a new permanent password? The agent will need to update their stored credentials.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleReset}
            style={{
              ...mono,
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(200,140,40,0.9)",
              background: "rgba(80,45,5,0.4)",
              border: "1px solid rgba(140,85,15,0.5)",
              borderRadius: 3,
              padding: "5px 14px",
              cursor: "pointer",
            }}
          >
            Confirm
          </button>
          <button
            onClick={() => setPhase("idle")}
            style={{
              ...mono,
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              ...dimText,
              background: "transparent",
              border: "1px solid rgba(80,55,20,0.3)",
              borderRadius: 3,
              padding: "5px 14px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (phase === "loading") {
    return (
      <p style={{ ...mono, fontSize: 10, letterSpacing: "0.2em", ...dimText }}>
        Generating…
      </p>
    )
  }

  if (phase === "error") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <p style={{ ...mono, fontSize: 11, color: "rgba(200,80,60,0.85)" }}>{errorMsg}</p>
        <button
          onClick={() => setPhase("idle")}
          style={{
            ...mono,
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            ...dimText,
            background: "transparent",
            border: "1px solid rgba(80,55,20,0.3)",
            borderRadius: 3,
            padding: "5px 14px",
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>
    )
  }

  // phase === "done"
  return (
    <div
      style={{
        border: "1px solid rgba(100,65,15,0.5)",
        borderRadius: 4,
        padding: "14px 18px",
        background: "rgba(20,12,3,0.7)",
      }}
    >
      <p
        style={{
          ...mono,
          fontSize: 8,
          letterSpacing: "0.5em",
          textTransform: "uppercase",
          color: "rgba(160,100,30,0.55)",
          marginBottom: 8,
        }}
      >
        new permanent password — shown once
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <code
          style={{
            ...mono,
            fontSize: 12,
            color: "rgba(220,175,80,0.95)",
            wordBreak: "break-all",
            flex: 1,
          }}
        >
          {password}
        </code>
        <button
          onClick={handleCopy}
          style={{
            ...mono,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: copied ? "rgba(100,200,100,0.8)" : "rgba(160,100,30,0.7)",
            background: "transparent",
            border: "1px solid rgba(100,65,15,0.35)",
            borderRadius: 3,
            padding: "4px 10px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p
        style={{
          ...mono,
          fontSize: 9,
          color: "rgba(130,85,20,0.5)",
          marginTop: 10,
        }}
      >
        Give this to the agent. It will not be shown again.
      </p>
    </div>
  )
}
