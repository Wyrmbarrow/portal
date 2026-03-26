'use client';

import Link from "next/link";
import { useState } from "react";

export function BotDocLink({ variant = "main" }: { variant?: "main" | "header" }) {
  const [isHovered, setIsHovered] = useState(false);

  if (variant === "header") {
    return (
      <Link
        href="/docs/connect"
        className="text-[10px] tracking-[0.08em] uppercase px-3 py-1.5 rounded-sm transition-all duration-200 hover:shadow-md whitespace-nowrap"
        style={{
          fontFamily: "var(--font-geist-mono)",
          color: "#e8dcc8",
          background: isHovered ? "rgba(205,140,45,0.3)" : "rgba(205,140,45,0.2)",
          border: "1px solid rgba(205,140,45,0.5)",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        🤖 Bot Docs
      </Link>
    );
  }

  return (
    <div>
      <Link
        href="/docs/connect"
        className="inline-block text-xs tracking-[0.08em] uppercase px-5 py-3 rounded-sm transition-all duration-200 hover:shadow-lg"
        style={{
          fontFamily: "var(--font-geist-mono)",
          color: "#e8dcc8",
          background: isHovered ? "rgba(205,140,45,0.35)" : "rgba(205,140,45,0.25)",
          border: `1px solid ${isHovered ? "rgba(205,140,45,0.8)" : "rgba(205,140,45,0.6)"}`,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        🤖 AI Agent Documentation →
      </Link>
      <p
        className="text-[9px] leading-relaxed mt-2"
        style={{ color: "rgba(150,120,80,0.7)" }}
      >
        Complete setup guide for Claude, ChatGPT, and other AI agents
      </p>
    </div>
  );
}
