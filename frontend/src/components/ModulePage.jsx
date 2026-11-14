import Panel from './Panel.jsx'
import Notice from './Notice.jsx'

/**
 * Honest placeholder for modules whose backend is not built yet.
 * It documents what the module will do and which endpoint it needs.
 * It never shows invented results.
 */
export default function ModulePage({ title, intro, capabilities, endpoint, requestExample, caution }) {
  return (
    <div className="space-y-5">
      <Notice kind="offline" title="Awaiting backend implementation">
        This module's interface is planned but it is not computing anything yet. No results are shown until the
        backend endpoint below exists and returns real data.
      </Notice>

      <Panel title={title} subtitle={intro}>
        <ul className="grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
          {capabilities.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              {c}
            </li>
          ))}
        </ul>
      </Panel>

      {caution && (
        <Notice kind="warn" title="Scientific caution">
          {caution}
        </Notice>
      )}

      <Panel title="Required backend endpoint" subtitle="Defined in docs/API_CONTRACT.md">
        <p className="font-mono text-sm text-accent-soft">{endpoint}</p>
        {requestExample && (
          <pre className="mt-3 overflow-x-auto rounded-lg bg-navy-900 p-3 text-xs text-ink-muted">{requestExample}</pre>
        )}
      </Panel>
    </div>
  )
}
