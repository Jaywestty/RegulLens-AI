// src/pages/Dashboard.jsx

import { useState, useEffect } from "react"
import { getMetrics, getRecentQueries } from "../services/api"
import Navbar from "../components/Navbar"

function MetricCard({ label, value, unit }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className="text-white text-2xl font-semibold">
        {value}
        {unit && <span className="text-slate-500 text-sm font-normal ml-1">{unit}</span>}
      </p>
    </div>
  )
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)

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
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500 text-sm">Loading metrics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-white text-2xl font-semibold">System Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Live performance metrics and query monitoring.
          </p>
        </div>

        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            <MetricCard label="Total Queries" value={metrics.query_volume} />
            <MetricCard label="Avg Latency" value={metrics.average_latency_ms} unit="ms" />
            <MetricCard label="Retrieval Score" value={metrics.average_retrieval_score} />
            <MetricCard label="Total Documents" value={metrics.total_documents} />
            <MetricCard label="Ready Documents" value={metrics.ready_documents} />
            <MetricCard
              label="Hallucination Rate"
              value={metrics.hallucination_rate_percent}
              unit="%"
            />
          </div>
        )}

        <div>
          <h2 className="text-white text-sm font-medium mb-4">Recent queries</h2>

          {queries.length === 0 ? (
            <p className="text-slate-600 text-sm">No queries yet.</p>
          ) : (
            <div className="space-y-2">
              {queries.map((q) => (
                <div
                  key={q.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-lg"
                >
                  <p className="text-slate-200 text-sm">{q.query}</p>
                  <div className="flex gap-4 mt-2 text-xs text-slate-600">
                    <span>{q.latency_ms}ms</span>
                    <span>Score: {q.retrieval_score}</span>
                    {q.hallucination_flagged && (
                      <span className="text-yellow-500">Hallucination flagged</span>
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