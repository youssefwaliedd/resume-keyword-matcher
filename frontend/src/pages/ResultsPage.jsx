import { useEffect, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { getAnalysis, getSuggestions } from '../api/client'
import ScoreGauge from '../components/ScoreGauge'
import SubScoreBar from '../components/SubScoreBar'
import SkillChip from '../components/SkillChip'
import { SparkleIcon, LoaderIcon, ArrowRightIcon, ChevronRightIcon, CheckIcon } from '../components/icons'

// Parse the LLM markdown list into { skill, advice } items
function parseSuggestions(text) {
  if (!text) return []
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-') || line.startsWith('*') || line.startsWith('•'))
    .map((line) => {
      const body = line.replace(/^[-*•]\s*/, '')
      const match = body.match(/^\*\*(.+?)\*\*\s*:?\s*(.*)$/)
      if (match) return { skill: match[1].trim(), advice: match[2].trim() }
      // Fallback: "Skill: advice" without bold markers
      const colon = body.indexOf(':')
      if (colon > 0 && colon < 40) {
        return { skill: body.slice(0, colon).trim(), advice: body.slice(colon + 1).trim() }
      }
      return { skill: '', advice: body }
    })
    .filter((item) => item.advice || item.skill)
}

function SuggestionsList({ text }) {
  const items = parseSuggestions(text)

  // If parsing found nothing structured, fall back to plain text
  if (items.length === 0) {
    return <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{text}</p>
  }

  return (
    <ul className="space-y-3 list-none m-0 p-0">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-accent-light flex items-center justify-center" aria-hidden="true">
            <CheckIcon className="w-2.5 h-2.5 text-accent" />
          </span>
          <p className="text-sm text-ink-2 leading-relaxed">
            {item.skill && <span className="font-semibold text-ink">{item.skill}: </span>}
            {item.advice}
          </p>
        </li>
      ))}
    </ul>
  )
}

function Section({ title, count, children, delay = '' }) {
  return (
    <div className={`card p-5 animate-fade-up ${delay}`}>
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span className="text-xs font-mono text-ink-3 tabular-nums">{count}</span>
      </div>
      {children}
    </div>
  )
}

function SkillGroup({ skills, variant, emptyText }) {
  if (skills.length === 0) {
    return <p className="text-xs text-ink-3 italic">{emptyText}</p>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((s) => <SkillChip key={s} skill={s} variant={variant} />)}
    </div>
  )
}

export default function ResultsPage() {
  const { analysisId } = useParams()
  const location = useLocation()
  const [analysis, setAnalysis] = useState(location.state || null)
  const [fetching, setFetching] = useState(!location.state)
  const [suggestions, setSuggestions] = useState(analysis?.suggestions || null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestError, setSuggestError] = useState('')

  useEffect(() => {
    if (!analysis) {
      getAnalysis(analysisId).then(setAnalysis).finally(() => setFetching(false))
    }
  }, [analysisId])

  async function fetchSuggestions() {
    setLoadingSuggestions(true)
    setSuggestError('')
    try {
      const data = await getSuggestions(analysisId)
      setSuggestions(data.suggestions)
    } catch (err) {
      setSuggestError(
        err.response?.data?.detail ||
        'Could not generate suggestions. Make sure the backend and Ollama are running.'
      )
    } finally {
      setLoadingSuggestions(false)
    }
  }

  if (fetching) return <LoadingState />

  if (!analysis) {
    return (
      <div className="text-center py-24">
        <p className="text-ink-2 mb-4">Analysis not found.</p>
        <Link to="/" className="text-sm text-accent hover:underline">Start a new analysis</Link>
      </div>
    )
  }

  const { fit_score, breakdown, matched_skills, missing_required, missing_preferred, jd_title, jd_company, resume_filename } = analysis

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-3">
        <Link to="/" className="hover:text-ink transition-colors">Analyze</Link>
        <ChevronRightIcon className="w-3 h-3" />
        <span className="text-ink truncate max-w-xs">
          {jd_title || 'Fit Analysis'}
          {jd_company && <span className="text-ink-3"> at {jd_company}</span>}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-accent uppercase tracking-widest mb-1">Results</p>
          <h1 className="font-display text-3xl font-semibold text-ink leading-tight tracking-tight">
            {jd_title || 'Fit Analysis'}
          </h1>
          {(jd_company || resume_filename) && (
            <p className="text-sm text-ink-2 mt-1">
              {jd_company && <span>{jd_company}</span>}
              {jd_company && resume_filename && <span className="mx-1.5 text-ink-3">·</span>}
              {resume_filename && <span>{resume_filename}</span>}
            </p>
          )}
        </div>
        <Link
          to="/"
          className="flex-shrink-0 text-sm font-medium text-ink-2 hover:text-ink border border-border bg-surface rounded-xl px-3.5 py-2 transition-colors duration-150"
        >
          New Analysis
        </Link>
      </div>

      {/* Score card */}
      <div className="card p-6 animate-fade-up">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
          {/* Gauge */}
          <div className="flex flex-col items-center">
            <p className="text-xs font-mono text-ink-3 uppercase tracking-widest mb-3">Overall Fit Score</p>
            <ScoreGauge score={fit_score} />
          </div>

          {/* Breakdown */}
          <div>
            <p className="text-xs font-mono text-ink-3 uppercase tracking-widest mb-4">Score Breakdown</p>
            <div className="space-y-5">
              <SubScoreBar
                label="Skill Coverage"
                value={breakdown.skill_coverage}
                description="Required skills matched (weighted 2×) plus preferred skills matched"
              />
              <SubScoreBar
                label="Semantic Alignment"
                value={breakdown.semantic_align}
                description="Embedding similarity between your resume and the full job description"
              />
              <SubScoreBar
                label="Section Alignment"
                value={breakdown.section_align}
                description="How well your experience section matches the role's responsibilities"
              />
            </div>

            {/* Weight legend */}
            <div className="mt-5 pt-4 border-t border-border flex gap-5 text-xs text-ink-3">
              <span><span className="font-mono text-ink-2">60%</span> skills</span>
              <span><span className="font-mono text-ink-2">25%</span> semantic</span>
              <span><span className="font-mono text-ink-2">15%</span> section</span>
            </div>
          </div>
        </div>
      </div>

      {/* Skills grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up delay-100">
        <Section title="Matched Skills" count={`${matched_skills.length} found`}>
          <SkillGroup
            skills={matched_skills}
            variant="matched"
            emptyText="No skills detected from the taxonomy."
          />
        </Section>

        <Section title="Missing — Required" count={`${missing_required.length} gaps`}>
          {missing_required.length === 0 ? (
            <p className="text-xs font-semibold text-matched">All required skills are covered.</p>
          ) : (
            <SkillGroup skills={missing_required} variant="missing" emptyText="" />
          )}
        </Section>
      </div>

      {missing_preferred.length > 0 && (
        <Section title="Missing — Preferred / Nice-to-have" count={`${missing_preferred.length}`} delay="delay-200">
          <SkillGroup skills={missing_preferred} variant="preferred" emptyText="" />
        </Section>
      )}

      {/* AI suggestions */}
      <div className="card p-5 animate-fade-up delay-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SparkleIcon className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-ink">AI Suggestions</h3>
          </div>
          {!suggestions && !suggestError && (
            <button
              onClick={fetchSuggestions}
              disabled={loadingSuggestions}
              className="flex items-center gap-1.5 text-xs font-semibold bg-accent text-bg px-3 py-1.5 rounded-lg
                         hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed
                         transition-colors duration-150"
            >
              {loadingSuggestions ? <><LoaderIcon className="w-3 h-3" /> Generating…</> : <>Get Suggestions <ArrowRightIcon className="w-3 h-3" /></>}
            </button>
          )}
        </div>

        {suggestions ? (
          <SuggestionsList text={suggestions} />
        ) : suggestError ? (
          <div className="flex items-start gap-2.5 bg-missing-bg border border-missing-border rounded-xl px-4 py-3">
            <span className="mt-0.5 flex-shrink-0 font-bold text-missing" aria-hidden="true">!</span>
            <div>
              <p className="text-xs text-missing leading-relaxed mb-2">{suggestError}</p>
              <button
                onClick={fetchSuggestions}
                disabled={loadingSuggestions}
                className="text-xs font-semibold text-missing underline hover:no-underline disabled:opacity-60"
              >
                {loadingSuggestions ? 'Retrying…' : 'Try again'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-ink-3 leading-relaxed">
            Generate specific, actionable advice for surfacing missing skills in your resume without keyword-stuffing. Runs locally on your machine via Ollama — free and private.
          </p>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2 text-sm animate-fade-up delay-400">
        <Link to="/history" className="text-accent hover:underline flex items-center gap-1">
          View all analyses <ArrowRightIcon className="w-3 h-3" />
        </Link>
        <Link to="/" className="text-ink-2 hover:text-ink">
          Analyze another role →
        </Link>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-4 bg-surface-2 rounded animate-pulse" />
            <div className="w-44 h-28 bg-surface-2 rounded-2xl animate-pulse" />
          </div>
          <div className="space-y-5 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="w-24 h-3 bg-surface-2 rounded animate-pulse" />
                <div className="w-full h-2 bg-surface-2 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="w-20 h-3 bg-surface-2 rounded animate-pulse" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((j) => <div key={j} className="w-16 h-6 bg-surface-2 rounded animate-pulse" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
