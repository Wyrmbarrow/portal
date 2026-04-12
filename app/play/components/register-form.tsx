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
  const [password, setPassword] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

      // Store password under name-based key so character list can find it
      localStorage.setItem(
        `wyrmbarrow:pwd:name:${characterName.trim().toLowerCase()}`,
        data.permanentPassword,
      )
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
          Create a new character using your registration code. The permanent password will be
          stored in your browser automatically.
        </p>
      </div>

      {/* Registration code display */}
      <div
        className="relative overflow-hidden"
        style={{ border: "1px solid rgba(90,68,28,0.6)", background: "rgba(30,20,5,0.4)" }}
      >
        <span className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: "rgba(160,105,25,0.55)" }} />
        <span className="absolute top-0 right-0 w-2 h-2 border-t border-r" style={{ borderColor: "rgba(160,105,25,0.55)" }} />
        <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l" style={{ borderColor: "rgba(160,105,25,0.55)" }} />
        <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: "rgba(160,105,25,0.55)" }} />
        <div
          className="px-4 py-2"
          style={{ borderBottom: "1px solid rgba(60,42,12,0.45)" }}
        >
          <span style={{ ...mono, fontSize: 8, letterSpacing: "0.5em", textTransform: "uppercase", color: "rgba(160,110,35,0.7)" }}>
            Registration Cipher
          </span>
        </div>
        <pre
          className="px-4 py-3 text-[11px] overflow-x-auto whitespace-nowrap"
          style={{ ...mono, color: "rgba(190,150,62,0.82)", letterSpacing: "0.04em" }}
        >
          {hash}
        </pre>
      </div>

      {phase === "done" && password ? (
        <div
          className="relative overflow-hidden space-y-3"
          style={{ border: "1px solid rgba(80,120,60,0.4)", background: "rgba(20,30,12,0.5)", padding: "16px 18px" }}
        >
          <p style={{ ...mono, fontSize: 8, letterSpacing: "0.5em", textTransform: "uppercase", color: "rgba(100,170,70,0.7)" }}>
            Character registered — password shown once
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <code style={{ ...mono, fontSize: 11, color: "rgba(210,180,80,0.95)", wordBreak: "break-all", flex: 1 }}>
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
                borderRadius: 2,
                padding: "4px 10px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p style={{ ...mono, fontSize: 9, color: "rgba(120,90,30,0.55)" }}>
            Password stored in browser. Returning to character list will show your new character.
          </p>
          <button
            onClick={() => router.refresh()}
            style={{
              ...mono,
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(190,140,45,0.85)",
              background: "rgba(60,35,5,0.3)",
              border: "1px solid rgba(120,80,15,0.45)",
              borderRadius: 2,
              padding: "6px 16px",
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            Back to Characters
          </button>
        </div>
      ) : (
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
      )}

      {errorMsg && (
        <p style={{ ...mono, fontSize: 10, color: "rgba(200,80,60,0.85)" }}>{errorMsg}</p>
      )}
    </div>
  )
}
