import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import Notice from '../components/Notice.jsx'
import PlotChart from '../charts/PlotChart.jsx'
import EarthMap from '../maps/EarthMap.jsx'
import { useAnalysis } from '../context/AnalysisContext.jsx'
import { interpret, num, pval, signed } from '../lib/format.js'

const GIOVANNI_VARIABLES = [
  {
    id: 'temperature',
    product: 'temperature',
    layer: 'LST_Day_1km',
    label: 'Surface Temperature (temperature.csv — Terra MODIS / AIRS)',
    subtitle: 'NASA Giovanni · Terra MODIS / AIRS · Monthly (2015–2025) · °C',
    caveatTitle: 'Land surface temperature is not air temperature',
    caveatText:
      'LST is the radiometric skin temperature of the ground and vegetation canopy seen by satellite thermal sensors. It can be warmer than 2-meter weather station air temperature during daytime.',
  },
  {
    id: 'moisture',
    product: 'moisture',
    layer: 'Soil_Moisture',
    label: 'Root Zone Soil Moisture (moisture.csv — NASA GLDAS Noah)',
    subtitle: 'NASA Giovanni · GLDAS Noah 0.25° · Monthly (2015–2025) · kg m-2',
    caveatTitle: 'Root zone soil moisture reflects upper-profile water storage',
    caveatText:
      'GLDAS Root Zone Soil Moisture estimates water content (kg m-2) available to plant roots and is strongly coupled to monsoon recharge, evapotranspiration, and agricultural drought.',
  },
  {
    id: 'rain',
    product: 'rain',
    layer: 'Precipitation',
    label: 'Precipitation Rate (rain.csv — NASA GPM IMERG)',
    subtitle: 'NASA Giovanni · GPM IMERG 0.1° · Monthly (2015–2025) · mm/hr',
    caveatTitle: 'Monsoon variability and multi-decadal rainfall trends',
    caveatText:
      'GPM IMERG merges satellite microwave and infrared estimates with surface rain gauges. Strong seasonal monsoon cycles can mask long-term trends unless deseasonalized.',
  },
  {
    id: 'evapo',
    product: 'evapo',
    layer: 'Evapotranspiration',
    label: 'Evapotranspiration (evapo.csv — NASA GLDAS / MODIS)',
    subtitle: 'NASA Giovanni · GLDAS Model 0.25° · Monthly (2015–2025) · kg m-2 s-1',
    caveatTitle: 'Evapotranspiration links the water and surface energy balances',
    caveatText:
      'Evapotranspiration (kg m-2 s-1) measures total water vapor flux from soil evaporation and plant transpiration. Rising evapotranspiration often tracks vegetation greening and irrigation.',
  },
]

export default function TrendAnalyzer() {
  const [searchParams] = useSearchParams()
  const initialVar = searchParams.get('var') || 'temperature'

  const ctx = useAnalysis() || {}
  const savedLoc = ctx.location || ctx.selectedLocation || {}

  const [selectedVarId, setSelectedVarId] = useState(
    GIOVANNI_VARIABLES.some((v) => v.id === initialVar) ? initialVar : 'temperature'
  )
  const [lat, setLat] = useState(Number(savedLoc.lat ?? 21.2514))
  const [lon, setLon] = useState(Number(savedLoc.lon ?? 81.6296))
  const [start, setStart] = useState('2015-01-01')
  const [end, setEnd] = useState('2025-09-30')
  const [aggregation, setAggregation] = useState('monthly')
  const [deseasonalize, setDeseasonalize] = useState(true)

  const [result, setLocalResult] = useState(ctx.result || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const activeVar =
    GIOVANNI_VARIABLES.find((v) => v.id === selectedVarId) || GIOVANNI_VARIABLES[0]

  const runAnalysis = async (varOverride) => {
    const chosen =
      GIOVANNI_VARIABLES.find((v) => v.id === (varOverride || selectedVarId)) ||
      activeVar
    setLoading(true)
    setError('')
    try {
      const resp = await fetch('/api/trends/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: chosen.product,
          layer: chosen.layer,
          lat: Number(lat),
          lon: Number(lon),
          start,
          end,
          aggregation,
          deseasonalize,
        }),
      })
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}))
        throw new Error(errData.detail || `HTTP ${resp.status}`)
      }
      const data = await resp.json()
      setLocalResult(data)
      if (ctx.setResult) ctx.setResult(data)
      if (ctx.setAnalysis) ctx.setAnalysis(data)
    } catch (err) {
      setError(err.message || 'Failed to run analysis')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runAnalysis(selectedVarId)
  }, [selectedVarId])

  const mk = result?.tests?.mann_kendall || {}
  const sen = result?.tests?.sen_slope || {}
  const trend = result?.trend || {}
  const units = result?.meta?.units || ''
  const isSig =
    mk.p_value !== undefined
      ? Number(mk.p_value) < Number(result?.significance?.alpha ?? 0.05)
      : false

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trend Analyzer"
        subtitle="Pick a place and a NASA Giovanni variable. The backend cleans the 2015–2025 time series and tests whether the trend is statistically significant."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <h3 className="text-base font-semibold text-white">Analysis setup</h3>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Variable (4 NASA Giovanni Datasets)
              </label>
              <select
                className="field mt-1 w-full"
                value={selectedVarId}
                onChange={(e) => setSelectedVarId(e.target.value)}
              >
                {GIOVANNI_VARIABLES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">{activeVar.subtitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  className="field mt-1 w-full"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  className="field mt-1 w-full"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Start
                </label>
                <input
                  type="date"
                  className="field mt-1 w-full"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  End
                </label>
                <input
                  type="date"
                  className="field mt-1 w-full"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Aggregation
              </label>
              <select
                className="field mt-1 w-full"
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value)}
              >
                <option value="monthly">Monthly mean</option>
                <option value="annual">Annual mean</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={deseasonalize}
                onChange={(e) => setDeseasonalize(e.target.checked)}
                className="rounded border-slate-700 accent-sky-400"
              />
              Remove the seasonal cycle before testing
            </label>

            <button
              type="button"
              onClick={() => runAnalysis()}
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? 'Running NASA trend analysis…' : '▷ Run analysis'}
            </button>

            {error && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
                {error}
              </p>
            )}
          </div>
        </Panel>

        <Panel>
          <h3 className="text-base font-semibold text-white">Location</h3>
          <p className="mb-3 text-xs text-slate-400">Click the map to move the study point</p>
          <EarthMap
            lat={Number(lat)}
            lon={Number(lon)}
            activeOverlay={selectedVarId}
            onPick={(c) => {
              setLat(c.lat)
              setLon(c.lon)
            }}
            onSelect={(c) => {
              setLat(c.lat)
              setLon(c.lon)
            }}
            height="h-[360px]"
          />
        </Panel>
      </div>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Change per decade
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {signed(trend.slope_per_decade, 2)} {units}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {signed(trend.slope_per_year, 3)} per year (OLS, R² = {num(trend.r2, 3)})
              </p>
            </Panel>

            <Panel>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Sen&apos;s slope / year
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {signed(sen.per_year, 3)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                95% CI {signed(sen.ci_low, 3)} to {signed(sen.ci_high, 3)}
              </p>
            </Panel>

            <Panel>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Mann-Kendall p-value
              </p>
              <p className="mt-2 text-2xl font-bold text-white">{pval(mk.p_value)}</p>
              <p className="mt-1 text-xs text-slate-400">
                tau = {num(mk.tau, 3)} · trend = {mk.trend}
              </p>
            </Panel>

            <Panel>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Significance
              </p>
              <p
                className={`mt-2 text-2xl font-bold ${
                  isSig ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {isSig ? 'Significant' : 'Not significant'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                alpha = {result.significance?.alpha ?? 0.05} ({mk.trend})
              </p>
            </Panel>
          </div>

          <Panel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {result.meta?.layer} time series
                </h3>
                <p className="text-xs text-slate-400">
                  {result.meta?.n_obs} observations · {result.meta?.aggregation} · {units}
                </p>
              </div>
              <Link to="/statistics" className="btn-ghost border border-slate-700 px-3 py-1.5 text-xs">
                Full statistics
              </Link>
            </div>

            <PlotChart
              result={result}
              data={result}
              series={result.series}
              trendLine={result.trend_line}
              trend_line={result.trend_line}
              label={result.meta?.layer}
              name={result.meta?.layer}
              units={units}
            />
          </Panel>

          <Panel>
            <h3 className="text-base font-semibold text-white">What this means</h3>
            <p className="mt-1 text-xs text-slate-400">
              Measured evidence only. This text is generated directly from the statistical tests above.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              {interpret(result)}
            </p>
            {result.meta?.notes?.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-400">
                {result.meta.notes.map((n, idx) => (
                  <li key={idx}>{n}</li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}

      <Notice>
        <p className="font-semibold text-amber-300">⚠️ {activeVar.caveatTitle}</p>
        <p className="mt-1 text-xs text-slate-300">{activeVar.caveatText}</p>
      </Notice>
    </div>
  )
}
