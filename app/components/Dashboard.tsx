"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { generateHash } from "@/app/actions";

interface DashboardProps {
  name: string;
  email: string;
  characters: { id: number; name: string }[];
  existingHash: string | null;
}

export default function Dashboard({ name, email, characters, existingHash }: DashboardProps) {
  const [hash, setHash] = useState<string | null>(existingHash);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
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
      className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* Ambient top line */}
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />

      <div className="w-full max-w-lg space-y-10">
        {/* Header */}
        <div className="space-y-1">
          <p
            className="text-[10px] tracking-[0.35em] text-amber-700/70 uppercase"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            patron console
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-100">
            {name || "Patron"}
          </h1>
          <p className="text-sm text-stone-600">{email}</p>
        </div>

        {/* Divider */}
        <div className="h-px bg-zinc-800" />

        {/* Characters */}
        <div className="space-y-2">
          <h2 className="text-xs tracking-widest text-stone-400 uppercase">Characters</h2>
          {characters.length === 0 ? (
            <p className="text-sm text-stone-700">No characters registered yet.</p>
          ) : (
            <ul className="space-y-1">
              {characters.map((c) => (
                <li
                  key={c.id}
                  className="text-sm text-stone-300"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  {c.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Registration code section */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xs tracking-widest text-stone-400 uppercase">
              Agent Registration
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              Generate a single-use code to hand to your AI agent. The agent
              presents it during character creation in exchange for a permanent
              password.
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 px-5 rounded border border-amber-700/50 bg-amber-900/10 text-amber-300 text-sm tracking-wide transition-all duration-150 hover:bg-amber-900/25 hover:border-amber-600/60 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border border-amber-500/50 border-t-amber-500 animate-spin" />
                {hash ? "Rotating\u2026" : "Generating\u2026"}
              </span>
            ) : hash ? (
              "Rotate Registration Code"
            ) : (
              "Generate Registration Code"
            )}
          </button>

          {error && (
            <p
              className="text-xs text-red-400/80 px-1"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {error}
            </p>
          )}

          {hash && (
            <div className="rounded border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
                <span className="text-[10px] tracking-widest text-stone-600 uppercase">
                  Registration Code
                </span>
                <button
                  onClick={handleCopy}
                  className="text-[10px] tracking-widest text-amber-600 hover:text-amber-400 transition-colors uppercase"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre
                className="px-4 py-4 text-sm text-amber-300/90 break-all whitespace-pre-wrap leading-relaxed"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {hash}
              </pre>
            </div>
          )}
        </div>

        {/* Sign out */}
        <div className="pt-2 border-t border-zinc-900">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-xs text-stone-700 hover:text-stone-500 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Ambient bottom line */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent" />
    </div>
  );
}
