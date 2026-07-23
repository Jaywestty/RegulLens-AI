// src/pages/Query.jsx

import { useState } from "react"
import { queryDocuments } from "../services/api"
import Navbar from "../components/Navbar"
import CitationCard from "../components/CitationCard"

export default function Query() {
  const [question, setQuestion] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await queryDocuments(question)
      setResult(res.data)
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-12">

        <div className="mb-10">
          <h1 className="text-white text-2xl font-semibold">Ask a compliance question</h1>
          <p className="text-slate-400 text-sm mt-1">
            Answers are sourced strictly from company documents and include citations.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. How many days of annual leave do I get?"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {loading ? "Searching..." : "Ask"}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-lg mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="h-4 bg-slate-800 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-slate-800 rounded animate-pulse w-full"></div>
            <div className="h-4 bg-slate-800 rounded animate-pulse w-5/6"></div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span className="text-slate-400 text-xs uppercase tracking-wider">Answer</span>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {result.answer}
              </p>
            </div>

            {result.sources?.length > 0 && (
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-3">
                  Sources
                </p>
                <div className="space-y-2">
                  {result.sources.map((source, i) => (
                    <CitationCard key={i} source={source} index={i + 1} />
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 text-xs text-slate-600">
              <span>Total: {result.latency_ms}ms</span>
              <span>Retrieval: {result.retrieval_ms}ms</span>
              <span>Generation: {result.generation_ms}ms</span>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}