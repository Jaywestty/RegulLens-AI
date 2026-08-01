// src/pages/AuditLog.jsx

import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { getAuditLogs, listUsers } from "../services/api"

const TARGET_ICONS = {
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  document: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  department: (
    <>
      <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-8l-2-2H5a2 2 0 0 0-2 2z" />
    </>
  ),
  organization: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="9" x2="9" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </>
  ),
  default: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </>
  ),
}

const humanize = (str) => {
  if (!str) return ""
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

const actionTone = (action) => {
  const a = (action || "").toLowerCase()
  if (a.includes("delete")) return { color: "#991B1B", backgroundColor: "#FEE2E2" }
  if (a.includes("creat") || a.includes("signup") || a.includes("login")) {
    return { color: "#146666", backgroundColor: "#E3F5F5" }
  }
  return { color: "#92400E", backgroundColor: "#FEF3C7" }
}

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [userMap, setUserMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [limit, setLimit] = useState(50)
  const [actionFilter, setActionFilter] = useState("all")
  const navigate = useNavigate()

  const fetchData = async (currentLimit) => {
    setLoading(true)
    setError("")
    try {
      const [logsRes, usersRes] = await Promise.all([getAuditLogs(currentLimit), listUsers()])
      setLogs(logsRes.data)

      const map = {}
      usersRes.data.forEach((u) => {
        map[u.id] = u
      })
      setUserMap(map)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load audit log.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(limit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoadMore = () => {
    const nextLimit = limit + 50
    setLimit(nextLimit)
    fetchData(nextLimit)
  }

  const actionOptions = useMemo(() => {
    const unique = new Set(logs.map((log) => log.action))
    return ["all", ...Array.from(unique)]
  }, [logs])

  const filteredLogs = useMemo(() => {
    if (actionFilter === "all") return logs
    return logs.filter((log) => log.action === actionFilter)
  }, [logs, actionFilter])

  const describeActor = (actorId) => {
    if (!actorId) return "System"
    const user = userMap[actorId]
    if (!user) return `User #${actorId} (account removed)`
    return user.full_name || user.email
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 lg:py-14">

        <button
          onClick={() => navigate("/query")}
          aria-label="Back to ask a question"
          className="back-btn mb-6"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
            Audit log
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            A record of account, department, and document actions taken in your organization.
          </p>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
            Filter
          </label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="field-input"
            style={{ width: "auto" }}
          >
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action === "all" ? "All actions" : humanize(action)}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="error-banner mb-6">{error}</p>}

        {loading ? (
          <div className="space-y-3">
            <div className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface)" }}></div>
            <div className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface)" }}></div>
            <div className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface)" }}></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            No audit events found.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const tone = actionTone(log.action)
              const icon = TARGET_ICONS[log.target_type] || TARGET_ICONS.default
              const detailEntries = log.details ? Object.entries(log.details) : []

              return (
                <div
                  key={log.id}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--color-border)" }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {icon}
                      </svg>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={tone}
                        >
                          {humanize(log.action)}
                        </span>
                        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                          {humanize(log.target_type)}
                          {log.target_id ? ` #${log.target_id}` : ""}
                        </span>
                      </div>

                      <p className="text-sm" style={{ color: "var(--color-ink)" }}>
                        <span className="font-medium">{describeActor(log.actor_user_id)}</span>
                      </p>

                      {detailEntries.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                          {detailEntries.map(([key, value]) => (
                            <span key={key} className="text-xs" style={{ color: "var(--color-muted)" }}>
                              <span className="font-medium">{humanize(key)}:</span> {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <span
                      className="flex-shrink-0 text-xs text-right"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && logs.length >= limit && (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleLoadMore}
              className="text-sm font-medium px-5 py-2 rounded-full transition-colors"
              style={{ color: "var(--color-primary)", backgroundColor: "var(--color-surface)" }}
            >
              Load more
            </button>
          </div>
        )}

    </main>
  )
}