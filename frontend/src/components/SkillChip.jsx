const VARIANTS = {
  matched: {
    className: 'bg-matched-bg text-matched border border-matched-border',
    dot: '#1A5C38',
  },
  missing: {
    className: 'bg-missing-bg text-missing border border-missing-border',
    dot: '#C13515',
  },
  preferred: {
    className: 'bg-preferred-bg text-preferred border border-preferred-border',
    dot: '#8B6914',
  },
  extra: {
    className: 'bg-surface-2 text-ink-2 border border-border',
    dot: '#A09D96',
  },
}

export default function SkillChip({ skill, variant = 'extra' }) {
  const v = VARIANTS[variant]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium ${v.className}`}>
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: v.dot }}
        aria-hidden="true"
      />
      {skill}
    </span>
  )
}
