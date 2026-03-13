export const dynamic = "force-dynamic";

import { auth, signIn } from "@/lib/auth";
import { getPatronCharacters } from "@/lib/server-api";
import { getHash } from "@/app/actions";
import Dashboard from "@/app/components/Dashboard";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    const user = session.user as typeof session.user & { googleId: string };

    let characters: { id: number; name: string }[] = [];
    let existingHash: string | null = null;

    const [charResult, hashResult] = await Promise.allSettled([
      getPatronCharacters(user.googleId),
      getHash(),
    ]);
    if (charResult.status === "fulfilled") characters = charResult.value.characters ?? [];
    if (hashResult.status === "fulfilled") existingHash = hashResult.value;

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
      className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* Ambient top line */}
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />

      <div className="w-full max-w-sm space-y-12 text-center">
        {/* Title */}
        <div className="space-y-3">
          <p
            className="text-[9px] tracking-[0.5em] text-amber-800/60 uppercase"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            patron portal
          </p>
          <h1
            className="text-4xl font-semibold tracking-[0.15em] text-stone-100 uppercase"
            style={{ fontVariant: "small-caps" }}
          >
            Wyrmbarrow
          </h1>
          <p className="text-sm tracking-wide text-stone-600">
            The Great Ascent
          </p>
        </div>

        {/* Ornamental divider */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-zinc-800" />
          <div className="h-1 w-1 rounded-full bg-amber-800/50" />
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* Sign in */}
        <div className="space-y-4">
          <p className="text-xs text-stone-600 leading-relaxed">
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
              className="w-full py-3 px-6 rounded border border-amber-700/40 bg-amber-900/10 text-amber-300 text-sm tracking-wide transition-all duration-150 hover:bg-amber-900/20 hover:border-amber-600/50 active:scale-[0.99]"
            >
              Sign in with Google
            </button>
          </form>
        </div>
      </div>

      {/* Ambient bottom line */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent" />
    </div>
  );
}
