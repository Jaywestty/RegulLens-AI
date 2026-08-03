// src/components/Sidebar.jsx

import { Link, useLocation } from "react-router-dom"
import BrandMark from "./BrandMark"

const ICONS = {
  query: (
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </>
  ),
  documents: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  dashboard: (
    <>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </>
  ),
  audit: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
}

const navLinks = [
  { to: "/query", label: "Ask a question", icon: "query", roles: null },
  { to: "/history", label: "History", icon: "history", roles: null },
  { to: "/documents", label: "Documents", icon: "documents", roles: ["hr", "admin"] },
  { to: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ["admin"] },
  { to: "/audit", label: "Audit log", icon: "audit", roles: ["admin"] },
  { to: "/users", label: "Manage users", icon: "users", roles: ["hr", "admin"] },
]

const getInitials = (fullName) => {
  if (!fullName) return "?"
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}

export default function Sidebar({ user, collapsed, onToggleCollapse, mobileOpen, onCloseMobile, onLogout }) {
  const location = useLocation()
  const visibleLinks = navLinks.filter((link) => !link.roles || link.roles.includes(user?.role))
  const isActive = (path) => location.pathname === path

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-200 lg:relative lg:translate-x-0 w-64 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      } ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      style={{ backgroundColor: "#FFFFFF", borderRight: "1px solid var(--color-border)" }}
    >
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2">
          <BrandMark className="w-7 h-7 flex-shrink-0" />
          {!collapsed && (
            <span className="font-display font-bold text-sm tracking-wide whitespace-nowrap" style={{ color: "var(--color-ink)" }}>
              Regulens AI
            </span>
          )}
          <button
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="ml-auto lg:hidden w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ color: "var(--color-muted)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="hidden lg:flex ml-auto w-7 h-7 rounded-full items-center justify-center flex-shrink-0 transition-colors"
              style={{ color: "var(--color-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="hidden lg:flex mt-2 w-full items-center justify-center rounded-lg py-1.5 transition-colors"
            style={{ color: "var(--color-muted)", backgroundColor: "var(--color-surface)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {visibleLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={onCloseMobile}
            title={collapsed ? link.label : undefined}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: isActive(link.to) ? "var(--color-primary)" : "transparent",
              color: isActive(link.to) ? "#FFFFFF" : "var(--color-muted)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              {ICONS[link.icon]}
            </svg>
            {!collapsed && <span className="truncate">{link.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2 px-1 mb-2 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                style={{ backgroundColor: "var(--color-primary)", color: "#FFFFFF" }}
              >
                {getInitials(user?.full_name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "var(--color-ink)" }}>
                  {user?.full_name}
                </p>
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
                  {user?.role}
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ color: "var(--color-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{ backgroundColor: "var(--color-primary)", color: "#FFFFFF" }}
              title={user?.full_name}
            >
              {getInitials(user?.full_name)}
            </div>
            <button onClick={onLogout} aria-label="Sign out" style={{ color: "var(--color-muted)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}