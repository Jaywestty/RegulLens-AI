// src/components/BrandMark.jsx

export default function BrandMark({ className = "w-10 h-10" }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 3L34 8V19C34 27.5 28 33.8 20 37C12 33.8 6 27.5 6 19V8L20 3Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 19.5L18 24L27 13.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}