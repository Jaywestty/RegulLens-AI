// src/components/CitationCard.jsx

export default function CitationCard({ source, index }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-medium">
        {index}
      </span>
      <div>
        <p className="text-slate-300 text-sm font-medium">{source.filename}</p>
        <p className="text-slate-500 text-xs mt-0.5">
          Page {source.page_number} · Relevance {(source.relevance_score * 100).toFixed(0)}%
        </p>
      </div>
    </div>
  )
}