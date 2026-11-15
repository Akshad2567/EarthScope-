import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Globe, TrendingUp, Sparkles, ArrowRight } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import StatCard from '../components/StatCard.jsx'
import PlotChart from '../charts/PlotChart.jsx'
import { useAnalysis } from '../context/AnalysisContext.jsx'
import { interpret, num, pval, signed } from '../lib/format.js'

const DASHBOARD_VARS = [
  {
    id: 'temperature',
    label: 'Surface Temperature',
    file: 'temperature.csv',
    subtitle: 'Terra MODIS / AIRS · Monthly (2015–2025) · °C',
  },
  {
    id: 'moisture',
    label: 'Root Zone Soil Moisture',
    file: 'moisture.csv',
    subtitle: 'NASA GLDAS Noah · Monthly (2015–2025) · kg m-2',
  },
  {
    id: 'rain',
    label: 'Precipitation Rate',
    file: 'rain.csv',
    subtitle: 'NASA GPM IMERG · Monthly (2015–2025) · mm/hr',
  },
  {
    id: 'evapo',
    label: 'Evapotranspiration',
    file: 'evapo.csv',
    subtitle: 'NASA GLDAS / MODIS · Monthly (2015–2025) · kg m-2 s-1',
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const ctx = useAnalysis() || {}

  const [summary, setSummary] = useState(null)
  const [selectedVar, setSelectedVar] = useState('temperature')
  const [previewResult, setPreviewResult] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/summary')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSummary(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadCaseStudy() {
      setLoadingPreview(true)
      try {
        const res = await fetch('/api/trends/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: selectedVar,
            layer: selectedVar,
            lat: 21.2514,
            lon: 81.6296,
            start: '2015-01-01',
            end: '2025-09-30',
            aggregation: 'monthly',
            deseasonalize: true,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setPreviewResult(data)
            if (ctx.setResult) ctx.setResult(data)
          }
        }
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setLoadingPreview(false)
      }
    }
    loadCaseStudy()
    return () => {
      cancelled = true
    }
  }, [selectedVar])

  const activeVarMeta =
    DASHBOARD_VARS.find((v) => v.id === selectedVar) || DASHBOARD_VARS[0]
  const mk = previewResult?.tests?.mann_kendall || {}
  const sen = previewResult?.tests?.sen_slope || {}
  const units = previewResult?.meta?.units || ''
  const isSig =
    mk.p_value !== undefined ? Number(mk.p_value) < 0.05 : false

  return (
    <div className="space-y-6">
      <PageHeader
        title="Earth System Trend Dashboard"
        subtitle="Discover what is changing, where, by how much, and whether the change is statistically significant, using NASA Earth science data."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Database}
          label="DATASETS AVAILABLE"
          value={summary?.datasets_available ?? 4}
        />
        <StatCard
          icon={Globe}
          label="REGIONS ANALYZED"
          value={summary?.regions_analyzed ?? 1}
        />
        <StatCard
          icon={TrendingUp}
          label="TRENDS FOUND"
          value={summary?.trends_found ?? 4}
        />
        <StatCard
          icon={Sparkles}
          label="SIGNIFICANT TRENDS"
          value={summary?.significant_trends ?? '—'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Case study: Raipur &amp; South Asia — {activeVarMeta.label}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {activeVarMeta.subtitle} (Deseasonalized anomaly trend)
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/trend?var=${selectedVar}`)}
                className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs"
              >
                <span>Open in Trend Analyzer</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {DASHBOARD_VARS.map((v) => {
                const active = v.id === selectedVar
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVar(v.id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'border-sky-400 bg-sky-500/20 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {v.label} ({v.file})
                  </button>
                )
              })}
            </div>

            <p className="mt-3 text-xs text-slate-300">
              Land surface temperature (LST) is how hot the ground itself is as seen from space. It is not the same as the air temperature reported in weather forecasts. Click any of the 4 variable buttons above to switch datasets.
            </p>

            {previewResult ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-800/90 bg-slate-950/60 p-3">
                  <div>
                    <p className="text-[11px] uppercase text-slate-400">Sen&apos;s Slope / Decade</p>
                    <p className="mt-0.5 text-sm font-bold text-white">
                      {signed(sen.per_decade, 3)} {units}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-slate-400">Mann-Kendall p-value</p>
                    <p className="mt-0.5 text-sm font-bold text-white">
                      {pval(mk.p_value)} (tau = {num(mk.tau, 3)})
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-slate-400">Significance</p>
                    <p
                      className={`mt-0.5 text-sm font-bold ${
                        isSig ? 'text-emerald-400' : 'text-amber-300'
                      }`}
                    >
                      {isSig ? `Significant (${mk.trend})` : `Not significant (${mk.trend})`}
                    </p>
                  </div>
                </div>

                <PlotChart
                  result={previewResult}
                  series={previewResult.series}
                  trend_line={previewResult.trend_line}
                  label={previewResult.meta?.layer}
                  units={units}
                  height={290}
                />

                <p className="text-xs leading-relaxed text-slate-300">
                  {interpret(previewResult)}
                </p>
              </div>
            ) : (
              <div className="mt-6 flex h-[280px] items-center justify-center rounded-xl border border-slate-800/60 bg-slate-950/40 text-sm text-slate-400">
                {loadingPreview ? 'Loading NASA time-series chart…' : 'Select a variable above to view chart'}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <h3 className="text-base font-semibold text-white">Recent trend discoveries</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Click any variable below to preview its 2015–2025 chart
            </p>
            <div className="mt-4 space-y-3">
              {(summary?.recent_trends || []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedVar(item.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedVar === item.id
                      ? 'border-sky-400/80 bg-sky-500/10'
                      : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.summary}</p>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <h3 className="text-base font-semibold text-white">Data sources</h3>
            <p className="mt-0.5 text-xs text-slate-400">Where the case-study data comes from</p>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <a
                  href="https://giovanni.gsfc.nasa.gov/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline"
                >
                  NASA Giovanni EarthData Portal
                </a>
              </li>
              <li>
                <a
                  href="https://appeears.earthdatacloud.nasa.gov/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline"
                >
                  NASA AppEEARS
                </a>
              </li>
              <li>
                <a
                  href="https://search.earthdata.nasa.gov/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline"
                >
                  NASA Earthdata Search
                </a>
              </li>
              <li>
                <a
                  href="https://modis.gsfc.nasa.gov/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline"
                >
                  MODIS Mission
                </a>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}