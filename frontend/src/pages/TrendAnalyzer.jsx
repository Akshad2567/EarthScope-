import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Play, TrendingDown, TrendingUp } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import StatCard from '../components/StatCard.jsx'
import Notice, { ErrorNotice } from '../components/Notice.jsx'
import PlotChart, { COLORS } from '../charts/PlotChart.jsx'
import EarthMap from '../maps/EarthMap.jsx'
import { api } from '../services/api.js'
import { useAnalysis } from '../context/AnalysisContext.jsx'
import { CASE_STUDY } from '../constants.js'
import { interpret, num, pval, signed } from '../lib/format.js'

export default function TrendAnalyzer() {
  const { location, setLocation, result, setResult } = useAnalysis()
  const [layer, setLayer] = useState(CASE_STUDY.layers[0].id)
  const [start, setStart] = useState(CASE_STUDY.start)
  const [end, setEnd] = useState(CASE_STUDY.end)
  const [aggregation, setAggregation] = useState('monthly')
  const [deseasonalize, setDeseasonalize] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const invalid = !(location.lat >= -90 && location.lat <= 90 && location.lon >= -180 && location.lon <= 180) || start >= end

  const run = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await api.analyzeTrend({
        product: CASE_STUDY.product,
        layer,
        lat: Number(location.lat),
        lon: Number(location.lon),
        start,
        end,
        aggregation,
        deseasonalize,
      })
      setResult(res)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const summary = interpret(result)
  const series = result?.series || []
  const traces = []
  if (series.length) {
    traces.push({
      x: series.map((p) => p.date),
      y: series.map((p) => p.value),
      type: 'scatter',
      mode: 'lines',
      name: result.meta?.layer || layer,
      line: { color: COLORS.accent, width: 2 },
      connectgaps: false,
    })
  }
  if (result?.trend_line?.length) {
    traces.push({
      x: result.trend_line.map((p) => p.date),
      y: result.trend_line.map((p) => p.value),
      type: 'scatter',
      mode: 'lines',
      name: 'Linear trend',
      line: { color: COLORS.amber, width: 2, dash: 'dash' },
    })
  }

  const decade = result?.trend?.slope_per_decade
  const DirIcon = decade < 0 ? TrendingDown : TrendingUp

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trend Analyzer"
        subtitle="Pick a place and a variable. The backend retrieves NASA data, builds a time series and tests whether it is trending."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Analysis setup" className="xl:col-span-1">
          <form onSubmit={run} className="space-y-4">
            <div>
              <label className="label" htmlFor="layer">Variable</label>
              <select id="layer" className="field" value={layer} onChange={(e) => setLayer(e.target.value)}>
                {CASE_STUDY.layers.map((l) => (
                  <option key={l.id} value={l.id}>{l.label} ({l.id})</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-faint">{CASE_STUDY.satellite} {CASE_STUDY.product}, {CASE_STUDY.spatial}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="lat">Latitude</label>
                <input id="lat" type="number" step="0.0001" className="field" value={location.lat}
                  onChange={(e) => setLocation({ ...location, name: 'Custom point', lat: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="lon">Longitude</label>
                <input id="lon" type="number" step="0.0001" className="field" value={location.lon}
                  onChange={(e) => setLocation({ ...location, name: 'Custom point', lon: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="start">Start</label>
                <input id="start" type="date" className="field" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="end">End</label>
                <input id="end" type="date" className="field" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="agg">Aggregation</label>
              <select id="agg" className="field" value={aggregation} onChange={(e) => setAggregation(e.target.value)}>
                <option value="8day">8-day composite (native)</option>
                <option value="monthly">Monthly mean</option>
                <option value="annual">Annual mean</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input type="checkbox" checked={deseasonalize} onChange={(e) => setDeseasonalize(e.target.checked)} />
              Remove the seasonal cycle before testing
            </label>

            <button className="btn-primary w-full" disabled={loading || invalid} type="submit">
              <Play size={16} aria-hidden /> {loading ? 'Retrieving and analyzing…' : 'Run analysis'}
            </button>
            {invalid && <p className="text-xs text-amber-300">Check the coordinates and make sure the start date is before the end date.</p>}
          </form>
        </Panel>

        <Panel title="Location" subtitle="Click the map to move the point" className="xl:col-span-2">
          <EarthMap
            lat={Number(location.lat) || 0}
            lon={Number(location.lon) || 0}
            zoom={6}
            height={330}
            onSelect={({ lat, lon }) => setLocation({ name: `Custom point (${lat}, ${lon})`, lat, lon })}
          />
        </Panel>
      </div>

      <ErrorNotice error={error} />

      {loading && <Notice>Data extraction from NASA services can take a while. Please keep this tab open.</Notice>}

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={DirIcon} label="Change per decade" value={`${signed(decade, 2)} ${result.meta?.units || ''}`} sub={`${signed(result.trend?.slope_per_year, 3)} per year (OLS)`} tone="accent" />
            <StatCard icon={Activity} label="Sen's slope / year" value={signed(result.tests?.sen_slope?.per_year, 3)} sub={`95% CI ${num(result.tests?.sen_slope?.ci_low, 3)} to ${num(result.tests?.sen_slope?.ci_high, 3)}`} tone="teal" />
            <StatCard icon={Activity} label="Mann-Kendall p-value" value={pval(result.tests?.mann_kendall?.p_value)} sub={`tau = ${num(result.tests?.mann_kendall?.tau, 3)}`} tone="violet" />
            <StatCard icon={Activity} label="Significance" value={summary ? (summary.significant ? 'Significant' : 'Not significant') : '—'} sub={`alpha = ${result.significance?.alpha ?? 0.05}`} tone="amber" />
          </div>

          <Panel
            title={`${result.meta?.layer || layer} time series`}
            subtitle={`${result.meta?.n_obs ?? series.length} observations · ${result.meta?.aggregation || aggregation}${result.meta?.units ? ` · ${result.meta.units}` : ''}`}
            action={<Link to="/statistics" className="btn-ghost">Full statistics</Link>}
          >
            <PlotChart
              data={traces}
              layout={{ yaxis: { title: { text: result.meta?.units || '' } } }}
              height={380}
            />
          </Panel>

          {summary && (
            <Panel title="What this means">
              <p className="text-sm text-ink">{summary.text}</p>
              <p className="mt-3 text-xs text-ink-faint">
                Measured evidence only. This text is generated from the statistics above; it does not explain why the
                change is happening.
              </p>
            </Panel>
          )}
        </>
      )}

      <Notice kind="warn" title="Land surface temperature is not air temperature">
        LST is the radiometric temperature of the ground and vegetation surface seen by the satellite. It can be much
        warmer than air temperature on a sunny afternoon. Satellite values are also missing under cloud, so
        quality-flagged observations are excluded by the backend.
      </Notice>
    </div>
  )
}
