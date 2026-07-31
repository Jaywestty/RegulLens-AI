// src/pages/Dashboard.jsx

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getMetrics, getRecentQueries } from "../services/api"
import Navbar from "../components/Navbar"

const ICONS = {
  volume: (
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  ),
  latency: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </>
  ),
  score: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  document: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  ready: (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </>
  ),
  warning: (
    <>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
}

function MetricCard({ label, value, unit, icon, warn }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--color-border)" }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{
          backgroundColor: warn ? "#FEF3C7" : "var(--color-surface)",
          color: warn ? "#B45309" : "var(--color-primary)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {ICONS[icon]}
        </svg>
      </div>
      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--color-muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold font-display" style={{ color: warn ? "#B45309" : "var(--color-ink)" }}>
        {value}
        {unit && (
          <span className="text-sm font-medium ml-1" style={{ color: "var(--color-muted)" }}>
            {unit}
          </span>
        )}
      </p>
    </div>
  )
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getMetrics(), getRecentQueries()])
      .then(([metricsRes, queriesRes]) => {
        setMetrics(metricsRes.data)
        setQueries(queriesRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Loading metrics...
          </p>
        </div>
      </div>
    )
  }

  const hallucinationRate = metrics?.hallucination_rate_percent ?? 0

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-10 lg:py-14">

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
            System dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            Live performance metrics and query monitoring.
          </p>
        </div>

        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            <MetricCard label="Total queries" value={metrics.query_volume} icon="volume" />
            <MetricCard label="Avg latency" value={metrics.average_latency_ms} unit="ms" icon="latency" />
            <MetricCard label="Retrieval score" value={metrics.average_retrieval_score} icon="score" />
            <MetricCard label="Total documents" value={metrics.total_documents} icon="document" />
            <MetricCard label="Ready documents" value={metrics.ready_documents} icon="ready" />
            <MetricCard
              label="Hallucination rate"
              value={hallucinationRate}
              unit="%"
              icon="warning"
              warn={hallucinationRate > 0}
            />
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-ink)" }}>
            Recent queries
          </h2>

          {queries.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              No queries yet.
            </p>
          ) : (
            <div className="space-y-2">
              {queries.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--color-border)" }}
                >
                  <p className="text-sm" style={{ color: "var(--color-ink)" }}>
                    {q.query}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ color: "var(--color-muted)", backgroundColor: "var(--color-surface)" }}
                    >
                      {q.latency_ms}ms
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ color: "var(--color-muted)", backgroundColor: "var(--color-surface)" }}
                    >
                      Score {q.retrieval_score}
                    </span>
                    {q.hallucination_flagged && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: "#92400E", backgroundColor: "#FEF3C7" }}
                      >
                        Hallucination flagged
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}