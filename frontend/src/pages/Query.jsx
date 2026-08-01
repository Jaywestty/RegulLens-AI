// src/pages/Query.jsx

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { queryDocuments, getConversationDetail } from "../services/api"
import Navbar from "../components/Navbar"
import CitationCard from "../components/CitationCard"

const SUGGESTED_QUESTIONS = [
  "How many days of annual leave do I get?",
  "What is the process for raising a grievance?",
  "What is the company's remote work policy?",
]

export default function Query() {
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  const [error, setError] = useState("")
  const [searchParams] = useSearchParams()
  const bottomRef = useRef(null)

  useEffect(() => {
    const existingId = searchParams.get("conversation")
    if (!existingId) return

    setLoadingThread(true)
    getConversationDetail(existingId)
      .then((res) => {
        setConversationId(res.data.id)
        const loaded = res.data.turns.flatMap((turn) => [
          { type: "user", text: turn.query_text },
          { type: "assistant", text: turn.answer_text, sources: [] },
        ])
        setMessages(loaded)
      })
      .catch(() => setError("Could not load that conversation."))
      .finally(() => setLoadingThread(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!question.trim() || loading) return

    const askedText = question
    setMessages((prev) => [...prev, { type: "user", text: askedText }])
    setQuestion("")
    setLoading(true)
    setError("")

    try {
      const res = await queryDocuments(askedText, conversationId)
      setConversationId(res.data.conversation_id)
      setMessages((prev) => [
        ...prev,
        {
          type: "assistant",
          text: res.data.answer,
          sources: res.data.sources,
          latency_ms: res.data.latency_ms,
          retrieval_ms: res.data.retrieval_ms,
          generation_ms: res.data.generation_ms,
        },
      ])
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (text) => {
    setQuestion(text)
  }

  const startNewConversation = () => {
    setMessages([])
    setConversationId(null)
    setQuestion("")
    setError("")
  }

  const hasThread = messages.length > 0

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-10 lg:py-16">

        <div className="flex items-start justify-between gap-4 mb-8">
          <div className={hasThread ? "" : "text-center w-full"}>
            <h1 className="font-display text-2xl lg:text-3xl font-bold" style={{ color: "var(--color-ink)" }}>
              Ask a compliance question
            </h1>
            <p className="text-sm mt-2" style={{ color: "var(--color-muted)" }}>
              Answers are sourced strictly from your company's documents, with citations.
            </p>
          </div>

          {hasThread && (
            <button
              onClick={startNewConversation}
              className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
              style={{ color: "var(--color-primary)", backgroundColor: "var(--color-surface)" }}
            >
              New conversation
            </button>
          )}
        </div>

        {loadingThread && (
          <div className="space-y-3 mb-8">
            <div className="h-4 rounded animate-pulse w-3/4" style={{ backgroundColor: "var(--color-surface)" }}></div>
            <div className="h-4 rounded animate-pulse w-full" style={{ backgroundColor: "var(--color-surface)" }}></div>
          </div>
        )}

        {hasThread && (
          <div className="space-y-4 mb-8">
            {messages.map((msg, i) =>
              msg.type === "user" ? (
                <div key={i} className="flex justify-end">
                  <div
                    className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm"
                    style={{ backgroundColor: "var(--color-surface)", color: "var(--color-ink)" }}
                  >
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--color-border)", borderLeft: "4px solid var(--color-primary)" }}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-ink)" }}>
                    {msg.text}
                  </p>

                  {msg.sources?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {msg.sources.map((source, si) => (
                        <CitationCard key={si} source={source} index={si + 1} />
                      ))}
                    </div>
                  )}

                  {msg.latency_ms !== undefined && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{ color: "var(--color-muted)", backgroundColor: "var(--color-surface)" }}
                      >
                        Total {msg.latency_ms}ms
                      </span>
                      <span
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{ color: "var(--color-muted)", backgroundColor: "var(--color-surface)" }}
                      >
                        Retrieval {msg.retrieval_ms}ms
                      </span>
                      <span
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{ color: "var(--color-muted)", backgroundColor: "var(--color-surface)" }}
                      >
                        Generation {msg.generation_ms}ms
                      </span>
                    </div>
                  )}
                </div>
              )
            )}

            {loading && (
              <div
                className="rounded-2xl p-5 space-y-3"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--color-border)", borderLeft: "4px solid var(--color-primary)" }}
              >
                <div className="h-4 rounded animate-pulse w-3/4" style={{ backgroundColor: "var(--color-surface)" }}></div>
                <div className="h-4 rounded animate-pulse w-full" style={{ backgroundColor: "var(--color-surface)" }}></div>
                <div className="h-4 rounded animate-pulse w-5/6" style={{ backgroundColor: "var(--color-surface)" }}></div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-4">
          <div
            className="flex items-center gap-2 p-2 rounded-2xl"
            style={{ backgroundColor: "var(--color-surface)", border: "1.5px solid var(--color-border)" }}
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={hasThread ? "Ask a follow-up question" : "e.g. How many days of annual leave do I get?"}
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

        {!hasThread && (
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
        )}

        {error && <div className="error-banner mb-6">{error}</div>}

      </main>
    </div>
  )
}