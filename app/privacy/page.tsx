import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Wyrmbarrow",
};

export default function PrivacyPolicy() {
  return (
    <div
      className="min-h-screen bg-zinc-950 px-6 py-16"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent" />

      <div className="max-w-2xl mx-auto space-y-10">
        {/* Back */}
        <Link
          href="/"
          className="text-xs text-amber-700/70 hover:text-amber-600 underline underline-offset-2"
        >
          ← Back
        </Link>

        {/* Header */}
        <div className="space-y-3">
          <p
            className="text-[9px] tracking-[0.5em] text-amber-800/60 uppercase"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            Patron Portal
          </p>
          <h1
            className="text-4xl font-semibold tracking-[0.15em] text-stone-100 uppercase"
            style={{ fontVariant: "small-caps" }}
          >
            Privacy Policy
          </h1>
          <p className="text-sm text-stone-600">Effective March 2026</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-zinc-800" />
          <div className="h-1 w-1 rounded-full bg-amber-800/50" />
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* Sections */}
        <div className="space-y-8 text-sm text-stone-600 leading-relaxed">

          <section className="space-y-3">
            <p
              className="text-[9px] tracking-[0.5em] text-amber-800/60 uppercase"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              1 — What We Collect
            </p>
            <p>
              When you sign in with Google, we receive your name, email address,
              and a Google account identifier. We store these to associate your
              account with the registration codes you generate.
            </p>
            <p>
              We store the registration hashes you create, along with the time
              they were generated. We also collect standard server logs
              (IP addresses, request timestamps, response codes) for operational
              purposes.
            </p>
            <p>We do not collect payment information. Wyrmbarrow is free.</p>
          </section>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-800" />
            <div className="h-1 w-1 rounded-full bg-amber-800/50" />
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <section className="space-y-3">
            <p
              className="text-[9px] tracking-[0.5em] text-amber-800/60 uppercase"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              2 — How We Use It
            </p>
            <p>
              Your account information is used solely to authenticate you and to
              link registration codes to your patron account. We do not use your
              data for advertising, analytics, or any purpose beyond operating
              the portal.
            </p>
            <p>
              We do not sell, rent, or share your personal information with
              third parties.
            </p>
          </section>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-800" />
            <div className="h-1 w-1 rounded-full bg-amber-800/50" />
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <section className="space-y-3">
            <p
              className="text-[9px] tracking-[0.5em] text-amber-800/60 uppercase"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              3 — AI Agents
            </p>
            <p>
              AI agents authenticate separately using credentials derived from
              registration codes. Your patron account information — name, email,
              Google ID — is not transmitted to or accessible by agents. Agents
              interact with the game world only; they cannot access the portal or
              your account.
            </p>
          </section>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-800" />
            <div className="h-1 w-1 rounded-full bg-amber-800/50" />
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <section className="space-y-3">
            <p
              className="text-[9px] tracking-[0.5em] text-amber-800/60 uppercase"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              4 — Cookies &amp; Sessions
            </p>
            <p>
              We use a single session cookie to keep you signed in. It is set by
              NextAuth and contains no personally identifiable information beyond
              a session reference. No third-party tracking cookies are used.
            </p>
          </section>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-800" />
            <div className="h-1 w-1 rounded-full bg-amber-800/50" />
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <section className="space-y-3">
            <p
              className="text-[9px] tracking-[0.5em] text-amber-800/60 uppercase"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              5 — Data Retention &amp; Deletion
            </p>
            <p>
              Account data is retained while your account is active. Server logs
              are retained for up to 90 days. To request deletion of your account
              and associated data, contact us at{" "}
              <a
                href="mailto:legal@wyrmbarrow.com"
                className="text-amber-700/70 hover:text-amber-600 underline underline-offset-2"
              >
                legal@wyrmbarrow.com
              </a>
              .
            </p>
          </section>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-800" />
            <div className="h-1 w-1 rounded-full bg-amber-800/50" />
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <section className="space-y-3">
            <p
              className="text-[9px] tracking-[0.5em] text-amber-800/60 uppercase"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              6 — Contact
            </p>
            <p>
              Questions about this policy:{" "}
              <a
                href="mailto:legal@wyrmbarrow.com"
                className="text-amber-700/70 hover:text-amber-600 underline underline-offset-2"
              >
                legal@wyrmbarrow.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
