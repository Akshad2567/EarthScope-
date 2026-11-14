import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExternalLink, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import Notice, { ErrorNotice } from '../components/Notice.jsx'
import { api } from '../services/api.js'
import { useAsync } from '../hooks/useAsync.js'
import { CASE_STUDY } from '../constants.js'

export default function DataExplorer() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [mission, setMission] = useState('')

  useEffect(() => setQ(params.get('q') || ''), [params])

  const query = params.get('q') || ''
  const { data, error, loading } = useAsync((signal) => api.datasets({ q: query, mission }, signal), [query, mission])
  const datasets = Array.isArray(data) ? data : data?.items || []

  const submit = (e) => {
    e.preventDefault()
    setParams(q.trim() ? { q: q.trim() } : {})
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Earth Data Explorer"
        subtitle="Search NASA mission and model variables, read plain-language definitions, then send a variable to the Trend Analyzer."
      />

      <Panel>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
          <div>
            <label className="label" htmlFor="q">Search variables</label>
            <input id="q" className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. land surface temperature, precipitation, soil moisture" />
          </div>
          <div>
            <label className="label" htmlFor="mission">Mission / model</label>
            <select id="mission" className="field" value={mission} onChange={(e) => setMission(e.target.value)}>
              <option value="">All</option>
              {['MODIS', 'GPM', 'MERRA-2', 'GLDAS', 'AIRS', 'OMI'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary self-end" type="submit">
            <Search size={16} aria-hidden /> Search
          </button>
        </form>
      </Panel>

      {loading && <p className="text-sm text-ink-muted">Searching…</p>}
      <ErrorNotice error={error} />

      {datasets.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {datasets.map((d) => (
            <Panel key={d.id || d.short_name} title={d.title || d.short_name} subtitle={[d.mission, d.resolution, d.coverage].filter(Boolean).join(' · ')}>
              <p className="text-sm text-ink-muted">{d.description || d.definition || 'No description provided.'}</p>
              {d.url && (
                <a className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline" href={d.url} target="_blank" rel="noreferrer">
                  Dataset page <ExternalLink size={14} aria-hidden />
                </a>
              )}
            </Panel>
          ))}
        </div>
      )}

      {!loading && !error && datasets.length === 0 && (
        <Notice>No datasets matched. Try a broader search.</Notice>
      )}

      <Panel title="Featured case study" subtitle="From the project brief. Availability is confirmed by the backend before data is retrieved.">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Product', CASE_STUDY.product],
            ['Satellite', CASE_STUDY.satellite],
            ['Resolution', `${CASE_STUDY.spatial}, ${CASE_STUDY.temporal}`],
            ['Layers', CASE_STUDY.layers.map((l) => l.id).join(', ')],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs uppercase tracking-wide text-ink-faint">{k}</dt>
              <dd className="text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <Link to="/trend" className="btn-primary mt-4">Analyze this variable</Link>
      </Panel>
    </div>
  )
}
