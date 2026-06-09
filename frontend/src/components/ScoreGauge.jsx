import { useEffect, useState, useRef } from 'react'

const R = 80
const CX = 100
const CY = 100
const TOTAL = Math.PI * R

function scoreConfig(score) {
  if (score >= 75) return { color: '#1A5C38', label: 'Strong Fit',  bg: '#E8F5EE' }
  if (score >= 50) return { color: '#8B6914', label: 'Partial Fit', bg: '#FEF9E6' }
  return               { color: '#C13515', label: 'Weak Fit',    bg: '#FEF0EC' }
}

export default function ScoreGauge({ score }) {
  const [animated, setAnimated] = useState(false)
  const cfg = scoreConfig(score)

  // Priority 7 — reduced-motion: skip animation if user prefers it
  const prefersReduced = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    if (prefersReduced.current) {
      setAnimated(true)
      return
    }
    const t = setTimeout(() => setAnimated(true), 80)
    return () => clearTimeout(t)
  }, [score])

  const filled = animated ? (score / 100) * TOTAL : 0
  const d = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`

  const ticks = [0, 25, 50, 75, 100].map((pct) => {
    const angle = Math.PI * (1 - pct / 100)
    return {
      x1: CX + (R - 8) * Math.cos(angle),  y1: CY - (R - 8) * Math.sin(angle),
      x2: CX + (R + 6) * Math.cos(angle),  y2: CY - (R + 6) * Math.sin(angle),
      lx: CX + (R + 18) * Math.cos(angle), ly: CY - (R + 18) * Math.sin(angle),
      label: String(pct),
    }
  })

  return (
    <div className="flex flex-col items-center select-none">
      {/* Priority 10 — screen-reader-summary: full text description */}
      {/* Priority 1 — color-not-only: label text accompanies color */}
      <svg
        width="220" height="116" viewBox="-10 10 220 100"
        role="img"
        aria-label={`Fit score: ${score} out of 100 — ${cfg.label}`}
      >
        <title>{cfg.label}: {score}/100</title>

        {/* Background track */}
        <path d={d} fill="none" stroke="#E5E2DA" strokeWidth={14} strokeLinecap="round" />

        {/* Animated fill */}
        <path
          d={d}
          fill="none"
          stroke={cfg.color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={TOTAL}
          strokeDashoffset={TOTAL - filled}
          style={{
            transition: prefersReduced.current
              ? 'none'
              : 'stroke-dashoffset 1s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        />

        {/* Tick marks */}
        {ticks.map((t) => (
          <line key={t.label} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="#CCC9C0" strokeWidth={1.5} strokeLinecap="round" />
        ))}

        {/* 0 / 100 labels — Priority 6: number-tabular */}
        <text x={ticks[0].lx} y={ticks[0].ly + 4} textAnchor="middle"
          fontSize="9" fill="#696560" fontFamily="JetBrains Mono, monospace">0</text>
        <text x={ticks[4].lx} y={ticks[4].ly + 4} textAnchor="middle"
          fontSize="9" fill="#696560" fontFamily="JetBrains Mono, monospace">100</text>
      </svg>

      <div className="flex flex-col items-center -mt-2" aria-hidden="true">
        <span
          className="font-display text-6xl font-semibold leading-none tabular-nums"
          style={{ color: cfg.color }}
        >
          {score}
        </span>
        {/* Priority 1 — color-not-only: badge text + color together */}
        <span
          className="mt-2 text-xs font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full"
          style={{ color: cfg.color, backgroundColor: cfg.bg }}
        >
          {cfg.label}
        </span>
      </div>
    </div>
  )
}
