// src/components/Navbar.jsx

import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import BrandMark from "./BrandMark"

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const closeMenu = () => setMenuOpen(false)

  const isActive = (path) => location.pathname === path

  const linkClass = (path) =>
    `text-sm px-3 py-2 rounded-lg transition-colors block lg:inline`

  const linkStyle = (path) => ({
    backgroundColor: isActive(path) ? "var(--color-primary)" : "transparent",
    color: isActive(path) ? "#FFFFFF" : "var(--color-muted)",
  })

  const navLinks = [
    { to: "/query", label: "Ask a question", roles: null },
    { to: "/documents", label: "Documents", roles: ["hr", "admin"] },
    { to: "/dashboard", label: "Dashboard", roles: ["admin"] },
    { to: "/audit", label: "Audit log", roles: ["admin"] },
    { to: "/users", label: "Manage users", roles: ["hr", "admin"] },
  ]

  const visibleLinks = navLinks.filter(
    (link) => !link.roles || link.roles.includes(user?.role)
  )

  return (
    <nav style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--color-border)" }}>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-3 lg:py-4">
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2">
            <BrandMark className="w-7 h-7" />
            <span className="font-display font-bold text-sm tracking-wide" style={{ color: "var(--color-ink)" }}>
              Compliance Platform
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {visibleLinks.map((link) => (
              <Link key={link.to} to={link.to} className={linkClass(link.to)} style={linkStyle(link.to)}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>
              {user?.full_name}
              <span
                className="ml-2 px-2 py-0.5 rounded-full text-xs uppercase tracking-wider font-medium"
                style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}
              >
                {user?.role}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="text-xs font-medium transition-colors"
              style={{ color: "var(--color-muted)" }}
            >
              Sign out
            </button>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>

        </div>

        {menuOpen && (
          <div className="lg:hidden mt-3 pb-2 space-y-1" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "12px" }}>
            {visibleLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={closeMenu}
                className={linkClass(link.to)}
                style={linkStyle(link.to)}
              >
                {link.label}
              </Link>
            ))}

            <div className="flex items-center justify-between px-3 pt-3 mt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
              <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                {user?.full_name}
                <span
                  className="ml-2 px-2 py-0.5 rounded-full text-xs uppercase tracking-wider font-medium"
                  style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}
                >
                  {user?.role}
                </span>
              </span>
              <button
                onClick={handleLogout}
                className="text-xs font-medium"
                style={{ color: "var(--color-muted)" }}
              >
                Sign out
              </button>
            </div>
          </div>
        )}

      </div>
    </nav>
  )
}