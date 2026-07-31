// src/pages/Query.jsx

import { useState } from "react"
import { queryDocuments } from "../services/api"
import Navbar from "../components/Navbar"
import CitationCard from "../components/CitationCard"

const SUGGESTED_QUESTIONS = [
  "How many days of annual leave do I get?",
  "What is the process for raising a grievance?",
  "What is the company's remote work policy?",
]

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

  const handleSuggestionClick = (text) => {
    setQuestion(text)
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-10 lg:py-16">

        <div className="text-center mb-8">
          <h1 className="font-display text-2xl lg:text-3xl font-bold" style={{ color: "var(--color-ink)" }}>
            Ask a compliance question
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--color-muted)" }}>
            Answers are sourced strictly from your company's documents, with citations.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-4">
          <div
            className="flex items-center gap-2 p-2 rounded-2xl"
            style={{ backgroundColor: "var(--color-surface)", border: "1.5px solid var(--color-border)" }}
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. How many days of annual leave do I get?"
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
              style={{ color: "var(--color-ink)" }}
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              aria-label="Ask"
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors disabled:cursor-not-allowed"
              style={{
                backgroundColor: loading || !question.trim() ? "var(--color-primary-light)" : "var(--color-primary)",
              }}
            >
              {loading ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              )}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 mb-10">
          {SUGGESTED_QUESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => handleSuggestionClick(text)}
              className="text-xs px-3 py-1.5 rounded-full transition-colors"
              style={{
                color: "var(--color-primary)",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              {text}
            </button>
          ))}
        </div>

        {error && <div className="error-banner mb-6">{error}</div>}

        {loading && (
          <div className="space-y-3">
            <div className="h-4 rounded animate-pulse w-3/4" style={{ backgroundColor: "var(--color-surface)" }}></div>
            <div className="h-4 rounded animate-pulse w-full" style={{ backgroundColor: "var(--color-surface)" }}></div>
            <div className="h-4 rounded animate-pulse w-5/6" style={{ backgroundColor: "var(--color-surface)" }}></div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--color-border)", borderLeft: "4px solid var(--color-primary)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-primary)" }}></div>
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
                  Answer
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-ink)" }}>
                {result.answer}
              </p>
            </div>

            {result.sources?.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "var(--color-muted)" }}>
                  Sources
                </p>
                <div className="space-y-2">
                  {result.sources.map((source, i) => (
                    <CitationCard key={i} source={source} index={i + 1} />
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <span
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ color: "var(--color-muted)", backgroundColor: "var(--color-surface)" }}
              >
                Total {result.latency_ms}ms
              </span>
              <span
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ color: "var(--color-muted)", backgroundColor: "var(--color-surface)" }}
              >
                Retrieval {result.retrieval_ms}ms
              </span>
              <span
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ color: "var(--color-muted)", backgroundColor: "var(--color-surface)" }}
              >
                Generation {result.generation_ms}ms
              </span>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}