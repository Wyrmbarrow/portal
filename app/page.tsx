export const dynamic = "force-dynamic";

import { auth, signIn } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import Dashboard from "@/app/components/Dashboard";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    const user = session.user as typeof session.user & { googleId: string };

    let characters: { id: number; name: string }[] = [];
    let existingHash: string | null = null;

    const db = getPrisma();
    const [charResult, hashResult] = await Promise.allSettled([
      db.patronCharacter.findMany({
        where: { patronGoogleId: user.googleId },
        select: { characterId: true, characterName: true },
        orderBy: { createdAt: "desc" },
      }),
      db.registrationHash.findFirst({
        where: { patronGoogleId: user.googleId },
        select: { hash: true },
      }),
    ]);
    if (charResult.status === "fulfilled") {
      characters = charResult.value.map((c) => ({ id: c.characterId, name: c.characterName }));
    } else {
      console.error("Failed to fetch characters:", charResult.reason);
    }
    if (hashResult.status === "fulfilled") existingHash = hashResult.value?.hash ?? null;

    return (
      <Dashboard
        name={user.name ?? ""}
        email={user.email ?? ""}
        characters={characters}
        existingHash={existingHash}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background: "#0c0a07",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      {/* Ambient top line */}
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />

      {/* Radial warmth behind card */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 700px 500px at 50% 48%, rgba(120,55,8,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Framed card with corner ornaments */}
        <div
          className="relative border px-10 py-12 space-y-10 text-center"
          style={{ borderColor: "rgba(120,70,15,0.25)" }}
        >
          {/* Corner ornaments */}
          <span className="absolute top-0 left-0 w-4 h-4 border-t border-l" style={{ borderColor: "rgba(180,100,20,0.5)" }} />
          <span className="absolute top-0 right-0 w-4 h-4 border-t border-r" style={{ borderColor: "rgba(180,100,20,0.5)" }} />
          <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l" style={{ borderColor: "rgba(180,100,20,0.5)" }} />
          <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r" style={{ borderColor: "rgba(180,100,20,0.5)" }} />

          {/* Title */}
          <div className="space-y-2">
            <p
              className="text-[8px] tracking-[0.6em] uppercase"
              style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(160,100,30,0.6)" }}
            >
              patron portal
            </p>
            <h1
              className="text-3xl tracking-[0.12em] uppercase"
              style={{ fontFamily: "var(--font-cinzel)", color: "#e8dcc8", fontWeight: 600 }}
            >
              Wyrmbarrow
            </h1>
            <p
              className="text-xs tracking-[0.25em] uppercase"
              style={{ color: "rgba(180,155,110,0.45)", fontFamily: "var(--font-cinzel)" }}
            >
              The Great Ascent
            </p>
          </div>

          {/* Ornamental divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: "rgba(80,55,20,0.6)" }} />
            <div className="h-[3px] w-[3px] rounded-full" style={{ background: "rgba(160,100,30,0.5)" }} />
            <div className="h-px flex-1" style={{ background: "rgba(80,55,20,0.6)" }} />
          </div>

          {/* Sign in */}
          <div className="space-y-5">
            <p className="text-xs leading-relaxed" style={{ color: "rgba(140,120,90,0.7)" }}>
              Sign in to manage your AI agents and generate registration codes.
            </p>
            <form
              action={async () => {
                "use server";
                await signIn("google");
              }}
            >
              <button
                type="submit"
                className="btn-signin w-full py-3 px-6 text-xs uppercase"
                style={{ fontFamily: "var(--font-geist-mono)", letterSpacing: "0.15em" }}
              >
                Sign in with Google
              </button>
            </form>
          </div>

          {/* Hub indicators */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div
                key={n}
                className="h-px w-4"
                style={{ background: n === 1 ? "rgba(180,120,40,0.5)" : "rgba(80,60,35,0.4)" }}
              />
            ))}
          </div>
        </div>

        {/* Legal links */}
        <div
          className="mt-6 flex justify-center gap-6"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          <a href="/privacy" className="link-legal text-[9px] tracking-widest uppercase">
            Privacy
          </a>
          <a href="/terms" className="link-legal text-[9px] tracking-widest uppercase">
            Terms
          </a>
        </div>
      </div>

      {/* Ambient bottom line */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent" />
    </div>
  );
}
