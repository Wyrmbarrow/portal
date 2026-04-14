"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  hash: string
}

export default function RegisterForm({ hash }: Props) {
  const router = useRouter()
  const [characterName, setCharacterName] = useState("")
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleRegister() {
    if (!characterName.trim()) return
    setPhase("loading")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/play/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash, characterName: characterName.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? "Registration failed")
        setPhase("error")
        return
      }

      // Store password under patronCharId-based key
      if (data.patronCharId) {
        localStorage.setItem(
          `wyrmbarrow:pwd:${data.patronCharId}`,
          data.permanentPassword,
        )
        
        // Hand off session via sessionStorage and redirect
        sessionStorage.setItem(
          "wyrmbarrow:play",
          JSON.stringify({ 
            sessionId: data.sessionId, 
            characterName: characterName.trim(),
            bootstrap: data.bootstrap
          }),
        )
        router.push(`/play/${data.patronCharId}`)
        return
      }

      setPhase("done")
    } catch {
      setErrorMsg("Network error — try again")
      setPhase("error")
    }
  }

  const mono: React.CSSProperties = { fontFamily: "var(--font-geist-mono)" }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2
          className="text-[8px] tracking-[0.5em] uppercase"
          style={{ fontFamily: "var(--font-cinzel)", color: "rgba(195,138,52,0.9)" }}
        >
          Register a New Character
        </h2>
        <p className="text-xs leading-relaxed" style={{ color: "rgba(168,142,95,0.88)" }}>
          Choose a name for your new character. Your credentials will be stored in your browser automatically.
        </p>
      </div>

      <div className="flex gap-3 items-start">
        <input
          type="text"
          value={characterName}
          onChange={(e) => { setCharacterName(e.target.value); setErrorMsg(null) }}
          onKeyDown={(e) => e.key === "Enter" && handleRegister()}
          placeholder="Character name"
          disabled={phase === "loading"}
          style={{
            ...mono,
            fontSize: 12,
            flex: 1,
            background: "rgba(10,6,1,0.6)",
            border: "1px solid rgba(90,65,18,0.5)",
            borderRadius: 2,
            padding: "8px 12px",
            color: "rgba(210,175,95,0.9)",
            outline: "none",
          }}
        />
        <button
          onClick={handleRegister}
          disabled={phase === "loading" || !characterName.trim()}
          style={{
            ...mono,
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: phase === "loading" ? "rgba(160,120,50,0.4)" : "rgba(200,148,50,0.9)",
            background: "rgba(70,38,5,0.35)",
            border: "1px solid rgba(140,88,18,0.5)",
            borderRadius: 2,
            padding: "8px 20px",
            cursor: phase === "loading" || !characterName.trim() ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
            opacity: !characterName.trim() ? 0.5 : 1,
          }}
        >
          {phase === "loading" ? "Registering…" : "Register"}
        </button>
      </div>

      {errorMsg && (
        <p style={{ ...mono, fontSize: 10, color: "rgba(200,80,60,0.85)" }}>{errorMsg}</p>
      )}
    </div>
  )
}
