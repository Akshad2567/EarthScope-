const TONES = {
  accent: 'bg-accent/15 text-accent',
  teal: 'bg-teal/15 text-teal',
  violet: 'bg-violet/15 text-violet',
  amber: 'bg-amber-400/15 text-amber-300',
}

export default function StatCard({ icon: Icon, label, value, sub, tone = 'accent' }) {
  return (
    <div className="panel flex items-center gap-4 p-4">
      {Icon && (
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
          <Icon size={22} aria-hidden />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <p className="truncate text-2xl font-semibold text-ink">{value ?? '—'}</p>
        {sub && <p className="truncate text-xs text-ink-faint">{sub}</p>}
      </div>
    </div>
  )
}
