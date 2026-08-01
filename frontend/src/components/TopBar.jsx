// src/components/TopBar.jsx

export default function TopBar({ user, onLogout, onOpenMobileSidebar }) {
  return (
    <header
      className="flex items-center justify-between px-4 lg:px-6 py-3"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <button
        onClick={onOpenMobileSidebar}
        aria-label="Open menu"
        className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className="flex items-center gap-4 ml-auto">
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          {user?.full_name}
          <span
            className="ml-2 px-2 py-0.5 rounded-full text-xs uppercase tracking-wider font-medium"
            style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}
          >
            {user?.role}
          </span>
        </span>
        <button onClick={onLogout} className="text-xs font-medium transition-colors" style={{ color: "var(--color-muted)" }}>
          Sign out
        </button>
      </div>
    </header>
  )
}