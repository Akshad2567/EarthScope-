import { AlertTriangle, Info, PlugZap } from 'lucide-react'

const STYLES = {
  info: { cls: 'border-accent/30 bg-accent/10 text-accent-soft', Icon: Info },
  warn: { cls: 'border-amber-400/30 bg-amber-400/10 text-amber-200', Icon: AlertTriangle },
  offline: { cls: 'border-navy-500 bg-navy-900 text-ink-muted', Icon: PlugZap },
}

export default function Notice({ kind = 'info', title, children }) {
  const { cls, Icon } = STYLES[kind]
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm ${cls}`} role={kind === 'warn' ? 'alert' : 'note'}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className="text-ink-muted [&_a]:text-accent [&_a]:underline">{children}</div>
      </div>
    </div>
  )
}

/** Standard presentation of an API failure. */
export function ErrorNotice({ error }) {
  if (!error) return null
  const offline = error.status === 0 || error.status === 404 || error.status === 502 || error.status === 503
  return (
    <Notice kind={offline ? 'offline' : 'warn'} title={offline ? 'Backend not available' : 'Something went wrong'}>
      {error.message}
    </Notice>
  )
}
