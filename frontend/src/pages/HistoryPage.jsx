import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAnalyses, deleteAnalysis } from '../api/client'
import { SortIcon, ChevronRightIcon, ClockIcon, PlusCircleIcon, TrashIcon, LoaderIcon } from '../components/icons'

function scoreStyle(score) {
  if (score >= 75) return { color: '#1A5C38', bg: '#E8F5EE', border: '#B6DEC7' }
  if (score >= 50) return { color: '#8B6914', bg: '#FEF9E6', border: '#E8D48A' }
  return { color: '#C13515', bg: '#FEF0EC', border: '#F4B8A5' }
}

function MiniBar({ value, color }) {
  const [width, setWidth] = useState(0)
  const pct = Math.round(value * 100)
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 60); return () => clearTimeout(t) }, [pct])
  return (
    <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color, transition: 'width 0.8s cubic-bezier(0.25,1,0.5,1)' }} />
    </div>
  )
}

function MiniScoreRing({ score }) {
  const cfg = scoreStyle(score)
  const R = 16, C = Math.PI * 2 * R
  const filled = (score / 100) * C
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r={R} fill="none" stroke="#E5E2DA" strokeWidth="4" />
        <circle
          cx="24" cy="24" r={R} fill="none"
          stroke={cfg.color} strokeWidth="4"
          strokeDasharray={`${filled} ${C}`} strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono font-semibold tabular-nums" style={{ color: cfg.color }}>
        {score}
      </span>
    </div>
  )
}

function AnalysisCard({ a, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const subColors = {
    skill_coverage: scoreStyle(Math.round(a.breakdown.skill_coverage * 100)),
    semantic_align: scoreStyle(Math.round(a.breakdown.semantic_align * 100)),
    section_align: scoreStyle(Math.round(a.breakdown.section_align * 100)),
  }

  function stop(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  async function handleDelete(e) {
    stop(e)
    setDeleting(true)
    try {
      await deleteAnalysis(a.id)
      onDelete(a.id)
    } catch {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <Link
      to={`/results/${a.id}`}
      className="card flex items-start gap-4 p-4 hover:shadow-card-hover hover:border-border-2 transition-all duration-200 group relative"
    >
      <MiniScoreRing score={a.fit_score} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink group-hover:text-accent transition-colors duration-150 truncate">
              {a.jd_title || 'Untitled Role'}
              {a.jd_company && (
                <span className="text-ink-3 font-normal"> at {a.jd_company}</span>
              )}
            </p>
            <p className="text-xs text-ink-3 font-mono mt-0.5 flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {a.resume_filename && <><span className="mx-1">·</span>{a.resume_filename}</>}
            </p>
          </div>
          {/* Delete control with inline confirmation */}
          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={stop}>
            {confirming ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  aria-label="Confirm delete analysis"
                  className="text-xs font-semibold text-missing bg-missing-bg border border-missing-border rounded-lg px-2 py-1 hover:bg-missing/10 transition-colors duration-150 disabled:opacity-60 inline-flex items-center gap-1"
                >
                  {deleting ? <LoaderIcon className="w-3 h-3" /> : null}
                  {deleting ? 'Deleting' : 'Delete'}
                </button>
                <button
                  onClick={(e) => { stop(e); setConfirming(false) }}
                  disabled={deleting}
                  aria-label="Cancel delete"
                  className="text-xs font-medium text-ink-2 hover:text-ink px-1.5 py-1 transition-colors duration-150"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={(e) => { stop(e); setConfirming(true) }}
                aria-label={`Delete analysis for ${a.jd_title || 'this role'}`}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-missing hover:bg-missing-bg transition-colors duration-150 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sub-scores */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[
            { key: 'skill_coverage', label: 'Skills' },
            { key: 'semantic_align', label: 'Semantic' },
            { key: 'section_align', label: 'Section' },
          ].map(({ key, label }) => {
            const pct = Math.round(a.breakdown[key] * 100)
            const c = subColors[key]
            return (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-ink-3">{label}</span>
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: c.color }}>{pct}%</span>
                </div>
                <MiniBar value={a.breakdown[key]} color={c.color} />
              </div>
            )
          })}
        </div>
      </div>
    </Link>
  )
}

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('date')

  useEffect(() => {
    listAnalyses().then(setAnalyses).finally(() => setLoading(false))
  }, [])

  function handleDelete(id) {
    setAnalyses((prev) => prev.filter((a) => a.id !== id))
  }

  const sorted = [...analyses].sort((a, b) =>
    sort === 'score'
      ? b.fit_score - a.fit_score
      : new Date(b.created_at) - new Date(a.created_at)
  )

  return (
    <div className="max-w-3xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <p className="text-xs font-mono text-accent uppercase tracking-widest mb-2">Application Tracker</p>
          <h1 className="font-display text-3xl font-semibold text-ink tracking-tight">Analysis History</h1>
          <p className="text-sm text-ink-2 mt-1">Compare your fit across every role you've analyzed.</p>
        </div>
        <Link
          to="/"
          className="flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold bg-ink text-bg px-3.5 py-2 rounded-xl hover:bg-ink/90 transition-colors duration-150"
        >
          <PlusCircleIcon className="w-4 h-4" />
          New Analysis
        </Link>
      </div>

      {/* Sort controls */}
      {analyses.length > 1 && (
        <div className="flex items-center gap-2 mb-4">
          <SortIcon className="w-3.5 h-3.5 text-ink-3" />
          <span className="text-xs text-ink-3">Sort by</span>
          {['date', 'score'].map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors duration-150 ${
                sort === s
                  ? 'bg-ink text-bg border-ink'
                  : 'border-border text-ink-2 hover:border-border-2 hover:text-ink bg-surface'
              }`}
            >
              {s === 'date' ? 'Most recent' : 'Best fit'}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 flex items-start gap-4">
              <div className="w-12 h-12 bg-surface-2 rounded-full animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="w-48 h-3.5 bg-surface-2 rounded animate-pulse" />
                <div className="w-32 h-2.5 bg-surface-2 rounded animate-pulse" />
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {[1,2,3].map(j => <div key={j} className="h-1.5 bg-surface-2 rounded animate-pulse" />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-surface-2 rounded-2xl flex items-center justify-center mb-4">
            <ClockIcon className="w-5 h-5 text-ink-3" />
          </div>
          <p className="text-sm font-semibold text-ink mb-1">No analyses yet</p>
          <p className="text-xs text-ink-3 mb-5">Run your first analysis to start tracking fit across roles.</p>
          <Link to="/" className="text-sm font-semibold text-accent hover:underline">
            Analyze a role →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((a, i) => (
            <div key={a.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
              <AnalysisCard a={a} onDelete={handleDelete} />
            </div>
          ))}
          <p className="text-xs text-ink-3 text-center pt-4 font-mono">{sorted.length} {sorted.length === 1 ? 'analysis' : 'analyses'} total</p>
        </div>
      )}
    </div>
  )
}
