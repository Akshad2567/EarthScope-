import { Link } from 'react-router-dom'
import { ArrowRight, Database, Globe2, MapPinned, TrendingUp } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import StatCard from '../components/StatCard.jsx'
import Notice, { ErrorNotice } from '../components/Notice.jsx'
import EarthMap from '../maps/EarthMap.jsx'
import { api } from '../services/api.js'
import { useAsync } from '../hooks/useAsync.js'
import { CASE_STUDY, RAIPUR } from '../constants.js'

export default function Dashboard() {
  const { data, error, loading } = useAsync((signal) => api.dashboardSummary(signal), [])

  return (
    <div>
      <PageHeader
        title="Earth System Trend Dashboard"
        subtitle="Discover what is changing, where, by how much, and whether the change is statistically significant, using NASA Earth science data."
      />

      {/* KPI row: values come only from the backend */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Database} label="Datasets available" value={loading ? '…' : data?.datasets_available} tone="accent" />
        <StatCard icon={MapPinned} label="Regions analyzed" value={loading ? '…' : data?.regions_analyzed} tone="teal" />
        <StatCard icon={TrendingUp} label="Trends found" value={loading ? '…' : data?.trends_found} tone="violet" />
        <StatCard icon={Globe2} label="Significant trends" value={loading ? '…' : data?.significant_trends} tone="amber" />
      </div>

      {error && (
        <div className="mt-4">
          <ErrorNotice error={error} />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="First case study: Raipur land surface temperature"
          subtitle={`${CASE_STUDY.satellite} ${CASE_STUDY.product}, ${CASE_STUDY.spatial}, ${CASE_STUDY.temporal}, 2015 to 2025`}
          action={
            <Link to="/trend" className="btn-primary">
              Run analysis <ArrowRight size={16} aria-hidden />
            </Link>
          }
        >
          <EarthMap lat={RAIPUR.lat} lon={RAIPUR.lon} zoom={6} satellite interactive={false} height={340} />
          <p className="mt-3 text-sm text-ink-muted">
            Land surface temperature (LST) is how hot the ground itself is as seen from space. It is not the same as
            the air temperature reported in weather forecasts.
          </p>
        </Panel>

        <div className="space-y-6">
          <Panel title="Recent trend discoveries">
            {data?.recent_trends?.length ? (
              <ul className="space-y-3 text-sm">
                {data.recent_trends.map((t) => (
                  <li key={t.id} className="flex justify-between gap-3">
                    <span className="text-ink">{t.title}</span>
                    <span className="text-ink-muted">{t.summary}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">No analyses have been run yet. Results will appear here.</p>
            )}
          </Panel>

          <Panel title="Data sources" subtitle="Where the case-study data comes from">
            <ul className="space-y-2 text-sm">
              {[
                ['NASA AppEEARS', CASE_STUDY.links.appeears],
                ['NASA Earthdata Search', CASE_STUDY.links.search],
                ['MODIS mission', CASE_STUDY.links.modis],
              ].map(([label, href]) => (
                <li key={href}>
                  <a className="text-accent hover:underline" href={href} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="mt-6">
        <Notice title="Data integrity">
          Every number on this platform comes from the backend's analysis of real NASA data. If the backend cannot
          provide a value, the interface shows a dash or an explanation instead of an estimate.
        </Notice>
      </div>
    </div>
  )
}
