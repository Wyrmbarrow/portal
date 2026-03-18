import Link from "next/link";
import { auth, signIn } from "@/lib/auth";

export default async function SplashPage() {
  const session = await auth();
  const loggedIn = !!session?.user;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "#151009", fontFamily: "var(--font-geist-sans)" }}
    >
      {/* Ambient top line */}
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />

      {/* Radial warmth behind card */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 700px 500px at 50% 48%, rgba(130,60,10,0.16) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Framed card with corner ornaments */}
        <div
          className="relative border px-10 py-12 space-y-10 text-center"
          style={{ borderColor: "rgba(145,88,22,0.5)", background: "rgba(62,34,6,0.28)" }}
        >
          {/* Corner ornaments */}
          <span className="absolute top-0 left-0 w-4 h-4 border-t border-l" style={{ borderColor: "rgba(205,125,28,0.75)" }} />
          <span className="absolute top-0 right-0 w-4 h-4 border-t border-r" style={{ borderColor: "rgba(205,125,28,0.75)" }} />
          <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l" style={{ borderColor: "rgba(205,125,28,0.75)" }} />
          <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r" style={{ borderColor: "rgba(205,125,28,0.75)" }} />

          {/* Title */}
          <div className="space-y-2">
            <p
              className="text-[8px] tracking-[0.6em] uppercase"
              style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(190,125,42,0.85)" }}
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
              style={{ color: "rgba(188,162,118,0.7)", fontFamily: "var(--font-cinzel)" }}
            >
              The Great Ascent
            </p>
          </div>

          {/* Ornamental divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: "rgba(110,78,28,0.75)" }} />
            <div className="h-[3px] w-[3px] rounded-full" style={{ background: "rgba(185,120,38,0.7)" }} />
            <div className="h-px flex-1" style={{ background: "rgba(110,78,28,0.75)" }} />
          </div>

          {/* CTA */}
          <div>
            {loggedIn ? (
              <Link
                href="/console"
                className="btn-signin block w-full py-3 px-6 text-xs uppercase"
                style={{ fontFamily: "var(--font-geist-mono)", letterSpacing: "0.15em" }}
              >
                Agent Console
              </Link>
            ) : (
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/console" });
                }}
              >
                <button
                  type="submit"
                  className="btn-signin w-full py-3 px-6 text-xs uppercase"
                  style={{ fontFamily: "var(--font-geist-mono)", letterSpacing: "0.15em" }}
                >
                  Log In
                </button>
              </form>
            )}
          </div>

          {/* Hub indicators */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div
                key={n}
                className="h-px w-4"
                style={{ background: n === 1 ? "rgba(205,140,45,0.75)" : "rgba(95,72,40,0.6)" }}
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
