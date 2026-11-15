import { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import { num, pval, signed } from '../lib/format.js'

const VARS = [
  { id: 'temperature', label: 'Surface Temperature (°C)', color: '#f97316' },
  { id: 'moisture', label: 'Root Zone Soil Moisture (kg m-2)', color: '#10b981' },
  { id: 'rain', label: 'Precipitation Rate (mm/hr)', color: '#38bdf8' },
  { id: 'evapo', label: 'Evapotranspiration (kg m-2 s-1)', color: '#a855f7' },
]

export default function Compare() {
  const [focusVar, setFocusVar] = useState('temperature')
  const [deseasonalize, setDeseasonalize] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/regions/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variable: focusVar,
            deseasonalize,
          }),
        })
        if (res.ok) {
          const json = await res.json()
          if (!cancelled) setData(json)
        }
      } catch (e) {
        // ignore
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [focusVar, deseasonalize])

  const norm = data?.normalized_series || {}

  return (
    <div className="space-y-6">
      <PageHeader
        title="Region & Regime Comparison"
        subtitle="Compare standardized trends across all 4 NASA variables and test how Early Decade (2015–2019) vs Recent Decade (2020–2025) regimes diverge."
      />

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="w-full max-w-md">
            <label className="block text-xs font-semibold uppercase text-slate-400">
              Focus Variable for Early vs. Recent Regime Split
            </label>
            <select
              className="field mt-1 w-full"
              value={focusVar}
              onChange={(e) => setFocusVar(e.target.value)}
            >
              {VARS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={deseasonalize}
              onChange={(e) => setDeseasonalize(e.target.checked)}
              className="rounded border-slate-700 accent-sky-400"
            />
            Deseasonalized anomalies
          </label>
        </div>
      </Panel>

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {(data.regimes || []).map((reg) => {
              const r = reg.result
              const mk = r?.tests?.mann_kendall || {}
              const sen = r?.tests?.sen_slope || {}
              const units = r?.meta?.units || ''
              return (
                <Panel key={reg.period}>
                  <p className="text-xs font-semibold uppercase text-sky-400">{reg.period}</p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {signed(sen.per_decade, 3)} {units}/dec
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Direction: <strong className="capitalize">{mk.trend}</strong> (p = {pval(mk.p_value)})
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    n = {r?.meta?.n_obs} months · tau = {num(mk.tau, 3)}
                  </p>
                </Panel>
              )
            })}
          </div>

          <Panel>
            <h3 className="text-base font-semibold text-white">
              Multi-Variable Standardized Anomaly Comparison (Z-Scores, 2015–2025)
            </h3>
            <p className="mb-3 text-xs text-slate-400">
              All 4 variables scaled to zero mean and unit variance (σ) so opposing trends can be compared side-by-side
            </p>
            <Plot
              data={VARS.map((v) => {
                const pts = norm[v.id] || []
                return {
                  x: pts.map((p) => p.date),
                  y: pts.map((p) => p.z),
                  type: 'scatter',
                  mode: 'lines',
                  name: v.label,
                  line: { color: v.color, width: 2 },
                }
              })}
              layout={{
                autosize: true,
                height: 360,
                margin: { l: 50, r: 20, t: 16, b: 48 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { color: '#94a3b8', size: 12 },
                xaxis: { gridcolor: 'rgba(148,163,184,0.12)' },
                yaxis: { title: 'Standardized Z-Score (σ)', gridcolor: 'rgba(148,163,184,0.12)' },
                legend: { orientation: 'h', y: -0.2 },
              }}
              config={{ responsive: true, displaylogo: false }}
              useResizeHandler
              style={{ width: '100%', height: '360px' }}
            />
          </Panel>

          <Panel>
            <h3 className="text-base font-semibold text-white">
              Side-by-Side Statistical Comparison Table (Raipur &amp; South Asia)
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">Variable</th>
                    <th className="px-3 py-2">Sen&apos;s Slope / Decade</th>
                    <th className="px-3 py-2">Mann-Kendall tau</th>
                    <th className="px-3 py-2">p-value</th>
                    <th className="px-3 py-2">Direction</th>
                    <th className="px-3 py-2">Significance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(data.variables_summary || []).map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 pr-4 font-semibold text-white">{row.name}</td>
                      <td className="px-3 py-2.5 font-mono">
                        {signed(row.sen_per_decade, 3)} {row.units}
                      </td>
                      <td className="px-3 py-2.5 font-mono">{num(row.tau, 3)}</td>
                      <td className="px-3 py-2.5 font-mono">{pval(row.p_value)}</td>
                      <td className="px-3 py-2.5 capitalize">{row.trend}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            row.significant
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {row.significant ? 'Significant' : 'Not significant'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}
