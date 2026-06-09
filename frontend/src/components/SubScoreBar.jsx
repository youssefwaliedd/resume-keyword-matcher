import { useEffect, useState, useRef } from 'react'

function barColor(pct) {
  if (pct >= 75) return '#1A5C38'
  if (pct >= 50) return '#8B6914'
  return '#C13515'
}

export default function SubScoreBar({ label, value, description }) {
  const [width, setWidth] = useState(0)
  const pct = Math.round(value * 100)
  const color = barColor(pct)

  // Priority 7 — reduced-motion
  const prefersReduced = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    if (prefersReduced.current) { setWidth(pct); return }
    const t = setTimeout(() => setWidth(pct), 120)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {/* Priority 6 — number-tabular: monospace for data numbers */}
        {/* Priority 1 — color-not-only: percentage text alongside color bar */}
        <span className="text-sm font-mono font-medium tabular-nums" style={{ color }}>
          {pct}%
        </span>
      </div>
      {/* Priority 2 — progress bar with accessible role */}
      <div
        className="h-1.5 bg-surface-2 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct}%`}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: color,
            transition: prefersReduced.current ? 'none' : 'width 0.9s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        />
      </div>
      {description && (
        <p className="mt-1.5 text-xs text-ink-3 leading-relaxed">{description}</p>
      )}
    </div>
  )
}
