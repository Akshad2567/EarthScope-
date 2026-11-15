import { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import Notice from '../components/Notice.jsx'
import { num, pval, signed } from '../lib/format.js'

const VARS = [
  { id: 'temperature', label: 'Surface Temperature (temperature.csv · °C)' },
  { id: 'moisture', label: 'Root Zone Soil Moisture (moisture.csv · kg m-2)' },
  { id: 'rain', label: 'Precipitation Rate (rain.csv · mm/hr)' },
  { id: 'evapo', label: 'Evapotranspiration (evapo.csv · kg m-2 s-1)' },
]

export default function Predictions() {
  const [variable, setVariable] = useState('temperature')
  const [horizon, setHorizon] = useState(5)
  const [deseasonalize, setDeseasonalize] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/predictions/forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variable,
            horizon_years: Number(horizon),
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
  }, [variable, horizon, deseasonalize])

  const hist = data?.historical || []
  const fc = data?.forecast || []
  const units = data?.meta?.units || ''

  return (
    <div className="space-y-6">
      <PageHeader
        title="Future Predictions & Uncertainty"
        subtitle="Project observed 2015–2025 linear trends forward by 5 or 10 years with 95% statistical prediction intervals."
      />

      <Panel>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400">
              Variable
            </label>
            <select
              className="field mt-1 w-full"
              value={variable}
              onChange={(e) => setVariable(e.target.value)}
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
              Projection Horizon
            </label>
            <select
              className="field mt-1 w-full"
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
            >
              <option value={5}>5-Year Projection (to 2030)</option>
              <option value={10}>10-Year Projection (to 2035)</option>
            </select>
          </div>

          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={deseasonalize}
                onChange={(e) => setDeseasonalize(e.target.checked)}
                className="rounded border-slate-700 accent-sky-400"
              />
              Deseasonalize before projecting
            </label>
          </div>
        </div>
      </Panel>

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Panel>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Historical Rate of Change
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {signed(data.meta?.slope_per_decade, 3)} {units}/decade
              </p>
              <p className="mt-1 text-xs text-slate-400">
                OLS p = {pval(data.meta?.p_value)} · R² = {num(data.meta?.r2, 3)}
              </p>
            </Panel>

            <Panel>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Projected Value ({data.summary?.projected_end_date})
              </p>
              <p className="mt-2 text-2xl font-bold text-sky-400">
                {num(data.summary?.projected_value, 3)} {units}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Expected shift: {signed(data.summary?.projected_change, 3)} {units} over {horizon} yrs
              </p>
            </Panel>

            <Panel>
              <p className="text-xs font-semibold uppercase text-slate-400">
                95% Prediction Interval
              </p>
              <p className="mt-2 text-xl font-bold text-amber-300">
                {num(data.summary?.projected_ci_low, 2)} to {num(data.summary?.projected_ci_high, 2)} {units}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Widens with horizon due to residual &amp; slope uncertainty
              </p>
            </Panel>
          </div>

          <Panel>
            <h3 className="text-base font-semibold text-white">
              Historical Record (2015–2025) &amp; {horizon}-Year Statistical Forecast
            </h3>
            <p className="mb-3 text-xs text-slate-400">
              Shaded band shows the 95% prediction interval around the extrapolated trend line
            </p>
            <Plot
              data={[
                {
                  x: hist.map((h) => h.date),
                  y: hist.map((h) => h.value),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Observed NASA Data',
                  line: { color: '#22d3ee', width: 2 },
                },
                {
                  x: hist.map((h) => h.date),
                  y: hist.map((h) => h.fit),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Historical OLS Fit',
                  line: { color: '#facc15', width: 2, dash: 'dash' },
                },
                {
                  x: [...fc.map((f) => f.date), ...[...fc].reverse().map((f) => f.date)],
                  y: [...fc.map((f) => f.ci_high), ...[...fc].reverse().map((f) => f.ci_low)],
                  fill: 'toself',
                  fillcolor: 'rgba(249, 115, 22, 0.18)',
                  line: { color: 'transparent' },
                  name: '95% Uncertainty Interval',
                  hoverinfo: 'skip',
                },
                {
                  x: fc.map((f) => f.date),
                  y: fc.map((f) => f.value),
                  type: 'scatter',
                  mode: 'lines',
                  name: `${horizon}-Year Projected Trend`,
                  line: { color: '#f97316', width: 2.5, dash: 'dot' },
                },
              ]}
              layout={{
                autosize: true,
                height: 380,
                margin: { l: 56, r: 20, t: 16, b: 48 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { color: '#94a3b8', size: 12 },
                xaxis: { gridcolor: 'rgba(148,163,184,0.12)' },
                yaxis: { title: units, gridcolor: 'rgba(148,163,184,0.12)', exponentformat: 'e' },
                legend: { orientation: 'h', y: -0.18 },
              }}
              config={{ responsive: true, displaylogo: false }}
              useResizeHandler
              style={{ width: '100%', height: '380px' }}
            />
          </Panel>
        </>
      )}

      <Notice>
        <p className="font-semibold text-amber-300">
          ⚠️ Scientific limitation: Statistical extrapolation is not a physical climate model projection
        </p>
        <p className="mt-1 text-xs text-slate-300">
          This forecast projects the 2015–2025 linear trend forward under the assumption of stationarity. It cannot capture non-linear tipping points, ENSO cycles, or greenhouse forcing feedbacks simulated by CMIP6 Earth System Models.
        </p>
      </Notice>
    </div>
  )
}
