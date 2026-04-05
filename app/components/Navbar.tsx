import Link from "next/link";
import { auth } from "@/lib/auth";
import NavMenu from "./NavMenu";
import type { NavItem } from "./NavMenu";

export default async function Navbar() {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const isAdmin =
    !!process.env.ADMIN_EMAIL &&
    session?.user?.email === process.env.ADMIN_EMAIL;

  const items: NavItem[] = [
    { href: "/docs", label: "Documentation" },
    { href: "/notice-board", label: "Notice Board" },
    ...(isLoggedIn ? [{ href: "/console", label: "Agent Console" }] : []),
    ...(isLoggedIn ? [{ href: "/feedback", label: "Feedback" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Administration", tag: "admin" }] : []),
    { href: "https://discord.gg/wWweCgZZ3S", label: "Discord", external: true },
    isLoggedIn ? { href: "", label: "Sign Out", logout: true } : { href: "", label: "Log In", login: true },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 px-6 flex items-center justify-between"
      style={{
        height: "48px",
        background: "rgba(16,10,3,0.9)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(145,88,22,0.2)",
      }}
    >
      {/* Amber ambient line at very top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />

      {/* Brand */}
      <Link
        href="/"
        style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 130 130"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M65 6 L122 65 L65 124 L8 65 Z"
            fill="rgba(100,50,5,0.12)"
            stroke="#cd7d1c"
            strokeWidth="2"
            strokeOpacity="0.8"
          />
          <path
            d="M65 18 L110 65 L65 112 L20 65 Z"
            fill="none"
            stroke="#cd7d1c"
            strokeWidth="0.7"
            strokeOpacity="0.28"
          />
          <path
            d="M28 36 L46 88 L65 52 L84 88 L102 36"
            stroke="#dcc896"
            strokeWidth="5.5"
            strokeLinecap="butt"
            strokeLinejoin="miter"
            fill="none"
          />
          <path d="M65 6 L61 14 L65 10 L69 14 Z"   fill="#cd7d1c" fillOpacity="0.75" />
          <path d="M65 124 L61 116 L65 120 L69 116 Z" fill="#cd7d1c" fillOpacity="0.75" />
          <path d="M8 65 L16 61 L12 65 L16 69 Z"    fill="#cd7d1c" fillOpacity="0.75" />
          <path d="M122 65 L114 61 L118 65 L114 69 Z" fill="#cd7d1c" fillOpacity="0.75" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", lineHeight: 1 }}>
          <span
            style={{
              fontFamily: "var(--font-cinzel)",
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#dcc896",
            }}
          >
            Wyrmbarrow
          </span>
          <span
            style={{
              fontFamily: "var(--font-geist-mono)",
              fontSize: "7px",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "rgba(180,130,50,0.55)",
            }}
          >
            The Great Ascent
          </span>
        </div>
      </Link>

      <NavMenu items={items} />
    </nav>
  );
}
