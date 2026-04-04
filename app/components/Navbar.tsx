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
    ...(!isLoggedIn ? [{ href: "", label: "Log In", login: true }] : []),
    ...(isLoggedIn ? [{ href: "", label: "Sign Out", logout: true }] : []),
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
        style={{
          fontFamily: "var(--font-cinzel)",
          fontSize: "11px",
          letterSpacing: "0.38em",
          textTransform: "uppercase",
          color: "rgba(188,145,58,0.88)",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Wyrmbarrow
      </Link>

      <NavMenu items={items} />
    </nav>
  );
}
