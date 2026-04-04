"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export interface NavItem {
  href: string;
  label: string;
  tag?: string;
  login?: boolean;
}

export default function NavMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Close on navigation
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="nav-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>Navigate</span>
        <span className="nav-caret" style={{ transform: open ? "rotate(180deg)" : "none" }}>
          ▾
        </span>
      </button>

      {open && (
        <div className="nav-dropdown" role="menu">
          <span className="nav-corner tl" />
          <span className="nav-corner tr" />
          <span className="nav-corner bl" />
          <span className="nav-corner br" />

          <div className="nav-dropdown-header">Navigate</div>

          <div className="nav-dropdown-body">
            {items.map((item) => {
              if (item.login) {
                return (
                  <button
                    key="login"
                    role="menuitem"
                    className="nav-link"
                    style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                    onClick={() => signIn("google", { callbackUrl: "/console" })}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className={`nav-link${pathname === item.href ? " active" : ""}`}
                >
                  <span>{item.label}</span>
                  {item.tag && <span className="nav-tag">{item.tag}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
