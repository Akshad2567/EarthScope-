import { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import Notice from '../components/Notice.jsx'
import { num, pval } from '../lib/format.js'

const VARS = [
  { id: 'temperature', label: 'Surface Temperature (°C)' },
  { id: 'moisture', label: 'Root Zone Soil Moisture (kg m-2)' },
  { id: 'rain', label: 'Precipitation Rate (mm/hr)' },
  { id: 'evapo', label: 'Evapotranspiration (kg m-2 s-1)' },
]

export default function Correlation() {
  const [varX, setVarX] = useState('rain')
  const [varY, setVarY] = useState('moisture')
  const [maxLag, setMaxLag] = useState(6)
  const [deseasonalize, setDeseasonalize] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      try {
        const res = await fetch('/api/correlation/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            var_x: varX,
            var_y: varY,
            max_lag_months: Number(maxLag),
            deseasonalize,
          }),
        })
        if (res.ok) {
          const json = await res.json()
          if (!cancelled) setData(json)
        }
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [varX, varY, maxLag, deseasonalize])

  const paired = data?.paired_series || []
  const lags = data?.lags || []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Correlation Lab"
        subtitle="Test simultaneous and lagged relationships across your 4 NASA Giovanni Earth system variables (2015–2025)."
      />

      <Panel>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400">
              Driver Variable (X)
            </label>
            <select
              className="field mt-1 w-full"
              value={varX}
              onChange={(e) => setVarX(e.target.value)}
            >
              {VARS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400">
              Response Variable (Y)
            </label>
            <select
              className="field mt-1 w-full"
              value={varY}
              onChange={(e) => setVarY(e.target.value)}
            >
              {VARS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400">
              Max Lag Window (Months)
            </label>
            <input
              type="number"
              min="1"
              max="12"
              className="field mt-1 w-full"
              value={maxLag}
              onChange={(e) => setMaxLag(e.target.value)}
            />
          </div>

          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={deseasonalize}
                onChange={(e) => setDeseasonalize(e.target.checked)}
                className="rounded border-slate-700 accent-sky-400"
              />
              Remove seasonal cycle (anomalies)
            </label>
          </div>
        </div>
      </Panel>

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Panel>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Pearson Linear r (Lag 0)
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {num(data.pearson?.r, 3)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                p-value = {pval(data.pearson?.p_value)} ({data.n_obs} months)
              </p>
            </Panel>

            <Panel>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Spearman Rank rho
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {num(data.spearman?.r, 3)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                p-value = {pval(data.spearman?.p_value)} (non-parametric)
              </p>
            </Panel>

            <Panel>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Peak Cross-Correlation Lag
              </p>
              <p className="mt-2 text-2xl font-bold text-sky-400">
                Lag {data.best_lag?.lag_months > 0 ? `+${data.best_lag.lag_months}` : data.best_lag?.lag_months} mo (r = {num(data.best_lag?.r, 3)})
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Positive lag means {data.var_x?.name} leads {data.var_y?.name}
              </p>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <h3 className="text-base font-semibold text-white">
                Standardized Co-movement (Z-Score Overlay)
              </h3>
              <p className="mb-2 text-xs text-slate-400">
                {data.var_x?.name} vs {data.var_y?.name} (2015–2025)
              </p>
              <Plot
                data={[
                  {
                    x: paired.map((p) => p.date),
                    y: paired.map((p) => p.x_z),
                    type: 'scatter',
                    mode: 'lines',
                    name: `${data.var_x?.name} (Z)`,
                    line: { color: '#38bdf8', width: 2 },
                  },
                  {
                    x: paired.map((p) => p.date),
                    y: paired.map((p) => p.y_z),
                    type: 'scatter',
                    mode: 'lines',
                    name: `${data.var_y?.name} (Z)`,
                    line: { color: '#10b981', width: 2 },
                  },
                ]}
                layout={{
                  autosize: true,
                  height: 320,
                  margin: { l: 48, r: 16, t: 16, b: 40 },
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)',
                  font: { color: '#94a3b8', size: 11 },
                  xaxis: { gridcolor: 'rgba(148,163,184,0.12)' },
                  yaxis: { title: 'Standardized Anomaly (σ)', gridcolor: 'rgba(148,163,184,0.12)' },
                  legend: { orientation: 'h', y: -0.2 },
                }}
                config={{ responsive: true, displaylogo: false }}
                useResizeHandler
                style={{ width: '100%', height: '320px' }}
              />
            </Panel>

            <Panel>
              <h3 className="text-base font-semibold text-white">
                Lagged Cross-Correlation Function (CCF)
              </h3>
              <p className="mb-2 text-xs text-slate-400">
                Correlation across month shifts (-{maxLag} to +{maxLag} months)
              </p>
              <Plot
                data={[
                  {
                    x: lags.map((l) => l.lag),
                    y: lags.map((l) => l.r),
                    type: 'bar',
                    marker: {
                      color: lags.map((l) => (l.r >= 0 ? '#38bdf8' : '#f97316')),
                    },
                    name: 'Pearson r',
                  },
                ]}
                layout={{
                  autosize: true,
                  height: 320,
                  margin: { l: 48, r: 16, t: 16, b: 40 },
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)',
                  font: { color: '#94a3b8', size: 11 },
                  xaxis: { title: 'Lag (Months)', gridcolor: 'rgba(148,163,184,0.12)' },
                  yaxis: { title: 'Correlation (r)', range: [-1, 1], gridcolor: 'rgba(148,163,184,0.12)' },
                }}
                config={{ responsive: true, displaylogo: false }}
                useResizeHandler
                style={{ width: '100%', height: '320px' }}
              />
            </Panel>
          </div>

          <Panel>
            <h3 className="text-base font-semibold text-white">
              4x4 Multi-Variable Correlation Matrix (2015–2025)
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">Variable</th>
                    <th className="px-3 py-2">Surface Temp</th>
                    <th className="px-3 py-2">Soil Moisture</th>
                    <th className="px-3 py-2">Precipitation</th>
                    <th className="px-3 py-2">Evapotranspiration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(data.matrix || []).map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 pr-4 font-semibold text-white">{row.variable}</td>
                      {['temperature', 'moisture', 'rain', 'evapo'].map((col) => {
                        const val = row[col]
                        return (
                          <td key={col} className="px-3 py-2.5 font-mono">
                            <span
                              className={`inline-block rounded px-2 py-0.5 ${
                                Math.abs(val) > 0.5
                                  ? 'bg-sky-500/20 font-bold text-sky-300'
                                  : 'text-slate-300'
                              }`}
                            >
                              {Number(val).toFixed(3)}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      <Notice>
        <p className="font-semibold text-amber-300">⚠️ Scientific caution: Correlation does not imply causation</p>
        <p className="mt-1 text-xs text-slate-300">
          Two Earth system variables can correlate strongly due to shared seasonal monsoon forcing or synoptic circulation without one directly causing the other.
        </p>
      </Notice>
    </div>
  )
}
