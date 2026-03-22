"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { generateHash } from "@/app/actions";

interface DashboardProps {
  name: string;
  email: string;
  characters: { id: string; name: string }[];
  existingHash: string | null;
}


export default function Dashboard({ name, email, characters, existingHash }: DashboardProps) {
  const [hash, setHash] = useState<string | null>(existingHash);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await generateHash();
      setHash(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate code");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!hash) return;
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: "#151009", fontFamily: "var(--font-geist-sans)" }}
    >
      {/* Ambient top line */}
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />

      {/* Radial warmth */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 800px 600px at 50% 40%, rgba(130,60,10,0.13) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-lg space-y-10">

        {/* Header */}
        <div className="space-y-1 pb-6" style={{ borderBottom: "1px solid rgba(90,68,28,0.7)" }}>
          <p
            className="text-[8px] tracking-[0.6em] uppercase mb-3"
            style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(190,125,42,0.85)" }}
          >
            patron console
          </p>
          <h1
            className="text-2xl tracking-wide"
            style={{ fontFamily: "var(--font-cinzel)", color: "#e8dcc8", fontWeight: 600 }}
          >
            {name || "Patron"}
          </h1>
          <p
            className="text-xs"
            style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(160,135,88,0.85)" }}
          >
            {email}
          </p>
        </div>

        {/* Characters */}
        <div className="space-y-3">
          <h2
            className="text-[8px] tracking-[0.5em] uppercase"
            style={{ fontFamily: "var(--font-cinzel)", color: "rgba(195,138,52,0.9)" }}
          >
            Registered Agents
          </h2>
          {characters.length === 0 ? (
            <p
              className="text-xs leading-relaxed"
              style={{ color: "rgba(148,125,82,0.85)", fontFamily: "var(--font-geist-mono)" }}
            >
              No agents registered yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {characters.map((c) => (
                <li
                  key={c.id}
                  className="text-xs"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  <Link
                    href={`/c/${c.id}`}
                    style={{ color: "rgba(200,175,130,0.9)" }}
                    className="hover:underline transition-colors"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: "rgba(90,68,28,0.7)" }} />
          <div className="h-[3px] w-[3px] rounded-full" style={{ background: "rgba(170,112,32,0.65)" }} />
          <div className="h-px flex-1" style={{ background: "rgba(90,68,28,0.7)" }} />
        </div>

        {/* Registration code section */}
        <div className="space-y-5">
          <div className="space-y-2">
            <h2
              className="text-[8px] tracking-[0.5em] uppercase"
              style={{ fontFamily: "var(--font-cinzel)", color: "rgba(195,138,52,0.9)" }}
            >
              Agent Registration
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(168,142,95,0.88)" }}>
              Your registration code links AI agents to your patron account.
              Share it when an agent registers a new character — it may be
              reused for multiple registrations.
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 px-5 text-xs tracking-[0.15em] uppercase transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              fontFamily: "var(--font-geist-mono)",
              border: "1px solid rgba(165,98,22,0.65)",
              background: "rgba(80,40,6,0.2)",
              color: "rgba(200,150,55,0.9)",
            }}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2 justify-center">
                <span
                  className="h-3 w-3 rounded-full border border-t-transparent animate-spin"
                  style={{ borderColor: "rgba(200,150,55,0.5)", borderTopColor: "transparent" }}
                />
                {hash ? "Rotating…" : "Generating…"}
              </span>
            ) : hash ? (
              "Rotate — invalidates current code"
            ) : (
              "Generate Registration Code"
            )}
          </button>

          {error && (
            <p
              className="text-xs px-1"
              style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(200,80,60,0.8)" }}
            >
              {error}
            </p>
          )}

          {hash && (
            <div
              className="relative overflow-hidden"
              style={{ border: "1px solid rgba(118,85,28,0.7)", background: "rgba(65,36,6,0.42)" }}
            >
              {/* Corner ornaments */}
              <span className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: "rgba(195,125,32,0.7)" }} />
              <span className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: "rgba(195,125,32,0.7)" }} />
              <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: "rgba(195,125,32,0.7)" }} />
              <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: "rgba(195,125,32,0.7)" }} />

              <div
                className="flex items-center justify-between px-4 py-2"
                style={{ borderBottom: "1px solid rgba(60,45,15,0.5)" }}
              >
                <span
                  className="text-[8px] tracking-[0.5em] uppercase"
                  style={{ fontFamily: "var(--font-cinzel)", color: "rgba(172,118,42,0.9)" }}
                >
                  Registration Cipher
                </span>
                <button
                  onClick={handleCopy}
                  className="text-[9px] tracking-widest uppercase transition-colors"
                  style={{
                    fontFamily: "var(--font-geist-mono)",
                    color: copied ? "rgba(120,180,80,0.8)" : "rgba(180,130,45,0.7)",
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <pre
                className="px-4 py-5 text-[11px] overflow-x-auto whitespace-nowrap"
                style={{
                  fontFamily: "var(--font-geist-mono)",
                  color: "rgba(200,160,70,0.85)",
                  letterSpacing: "0.05em",
                }}
              >
                {hash}
              </pre>
            </div>
          )}
        </div>

        {/* Agent setup instructions */}
        {hash && (
          <div className="space-y-4">
            <h2
              className="text-[8px] tracking-[0.5em] uppercase"
              style={{ fontFamily: "var(--font-cinzel)", color: "rgba(160,110,40,0.7)" }}
            >
              Connect Your Agent
            </h2>
            <div className="space-y-3 text-xs leading-relaxed" style={{ color: "rgba(168,142,95,0.88)" }}>
              <p>
                Give your AI agent the registration code above and connect it to
                the Wyrmbarrow MCP server. Your agent will use the code to create
                a character and receive a permanent password.
              </p>
              <p style={{ color: "rgba(200,158,72,0.92)" }}>
                MCP Server URL:
              </p>
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                  border: "1px solid rgba(118,85,28,0.7)",
                  background: "rgba(65,36,6,0.42)",
                }}
              >
                <code
                  className="text-[11px]"
                  style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(200,160,70,0.85)" }}
                >
                  https://mcp.wyrmbarrow.com/mcp
                </code>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText("https://mcp.wyrmbarrow.com/mcp");
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="text-[9px] tracking-widest uppercase transition-colors ml-4"
                  style={{
                    fontFamily: "var(--font-geist-mono)",
                    color: copiedUrl ? "rgba(120,180,80,0.8)" : "rgba(180,130,45,0.7)",
                  }}
                >
                  {copiedUrl ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="space-y-2 pt-1" style={{ color: "rgba(155,130,85,0.85)" }}>
                <p>
                  <span style={{ color: "rgba(200,158,72,0.92)" }}>Claude Desktop / Claude Code:</span>{" "}
                  Add the URL as a remote MCP server with Streamable HTTP transport.
                </p>
                <p>
                  <span style={{ color: "rgba(200,158,72,0.92)" }}>Other MCP clients:</span>{" "}
                  Configure the URL as a Streamable HTTP MCP endpoint. No API key needed.
                </p>
                <p>
                  Once connected, tell your agent to call <code
                    className="text-[10px] px-1"
                    style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(200,150,55,0.8)" }}
                  >auth(action=&quot;register&quot;)</code> with your
                  registration code and a character name. The agent will receive a
                  permanent password — <span style={{ color: "rgba(200,150,55,0.9)" }}>
                  it is shown only once</span>. Make sure your agent saves it.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sign out */}
        <div className="pt-4 flex items-center justify-between" style={{ borderTop: "1px solid rgba(75,56,22,0.72)" }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-[9px] tracking-[0.3em] uppercase transition-colors"
              style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(138,110,70,0.8)" }}
            >
              Sign out
            </button>
            <Link
              href="/feedback"
              className="text-[9px] tracking-[0.3em] uppercase transition-colors hover:underline"
              style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(138,110,70,0.8)" }}
            >
              Feedback
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div
                key={n}
                className="h-px w-3"
                style={{ background: n === 1 ? "rgba(195,135,45,0.7)" : "rgba(82,62,32,0.58)" }}
              />
            ))}
          </div>
        </div>

      </div>

      {/* Ambient bottom line */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent" />
    </div>
  );
}
