// src/pages/History.jsx

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getConversations, getConversationDetail, deleteConversation } from "../services/api"

const formatRelativeTime = (isoString) => {
  const date = new Date(isoString)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function History() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedId, setExpandedId] = useState(null)
  const [detailCache, setDetailCache] = useState({})
  const [loadingDetailFor, setLoadingDetailFor] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getConversations()
      .then((res) => setConversations(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load history."))
      .finally(() => setLoading(false))
  }, [])

  const toggleExpand = async (conversationId) => {
    if (expandedId === conversationId) {
      setExpandedId(null)
      return
    }

    setExpandedId(conversationId)

    if (detailCache[conversationId]) return

    setLoadingDetailFor(conversationId)
    try {
      const res = await getConversationDetail(conversationId)
      setDetailCache((prev) => ({ ...prev, [conversationId]: res.data }))
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load conversation.")
    } finally {
      setLoadingDetailFor(null)
    }
  }

  const handleDelete = async (e, conversationId) => {
    e.stopPropagation()
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return

    setDeletingId(conversationId)
    try {
      await deleteConversation(conversationId)
      setConversations((prev) => prev.filter((c) => c.id !== conversationId))
      setDetailCache((prev) => {
        const next = { ...prev }
        delete next[conversationId]
        return next
      })
      if (expandedId === conversationId) setExpandedId(null)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete conversation.")
    } finally {
      setDeletingId(null)
    }
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
          Your history
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
          Questions you've asked and the answers you received.
        </p>
      </div>

      {error && <p className="error-banner mb-6">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface)" }}></div>
          <div className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface)" }}></div>
        </div>
      ) : conversations.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          No questions asked yet. Head to the Ask a Question page to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const isExpanded = expandedId === conv.id
            const detail = detailCache[conv.id]

            return (
              <div
                key={conv.id}
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--color-border)" }}
              >
                <button
                  onClick={() => toggleExpand(conv.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--color-ink)" }}>
                      {conv.title || "Untitled conversation"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                      {conv.turn_count} {conv.turn_count === 1 ? "message" : "messages"} · {formatRelativeTime(conv.last_activity_at)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/query?conversation=${conv.id}`)
                      }}
                      className="text-xs font-medium px-2.5 py-1 rounded-full transition-colors"
                      style={{ color: "var(--color-primary)", backgroundColor: "var(--color-surface)" }}
                    >
                      Continue
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      disabled={deletingId === conv.id}
                      aria-label="Delete conversation"
                      className="disabled:opacity-50 transition-colors"
                      style={{ color: "var(--color-muted)" }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-transform"
                      style={{
                        color: "var(--color-muted)",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4" style={{ borderTop: "1px solid var(--color-border)" }}>
                    {loadingDetailFor === conv.id ? (
                      <p className="text-xs pt-4" style={{ color: "var(--color-muted)" }}>
                        Loading...
                      </p>
                    ) : (
                      detail?.turns.map((turn) => (
                        <div key={turn.id} className="pt-4">
                          <p className="text-sm font-medium mb-2" style={{ color: "var(--color-ink)" }}>
                            {turn.query_text}
                          </p>
                          <p
                            className="text-sm rounded-xl p-3"
                            style={{ backgroundColor: "var(--color-surface)", color: "var(--color-ink)", borderLeft: "3px solid var(--color-primary)" }}
                          >
                            {turn.answer_text}
                          </p>
                          {turn.hallucination_flagged && (
                            <span
                              className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ color: "#92400E", backgroundColor: "#FEF3C7" }}
                            >
                              Hallucination flagged
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

    </main>
  )
}