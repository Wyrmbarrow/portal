import Link from "next/link";

export function BotDocLink({ variant = "main" }: { variant?: "main" | "header" }) {
  if (variant === "header") {
    return (
      <Link
        href="/docs/connect"
        className="btn btn-secondary text-[10px] px-3 py-1.5 whitespace-nowrap"
      >
        🤖 Bot Docs
      </Link>
    );
  }

  return (
    <div>
      <Link
        href="/docs/connect"
        className="btn btn-secondary btn-block text-xs px-5 py-3 text-center"
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
