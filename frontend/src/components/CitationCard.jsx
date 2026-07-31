// src/components/CitationCard.jsx

export default function CitationCard({ source, index }) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl transition-colors"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <span
        className="flex-shrink-0 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-semibold"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        {index}
      </span>
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
          {source.filename}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
          Page {source.page_number} · Relevance {(source.relevance_score * 100).toFixed(0)}%
        </p>
      </div>
    </div>
  )
}