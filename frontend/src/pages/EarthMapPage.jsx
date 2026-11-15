import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import Notice from '../components/Notice.jsx'
import EarthMap from '../maps/EarthMap.jsx'
import { useAnalysis } from '../context/AnalysisContext.jsx'
import { pval, signed } from '../lib/format.js'

const OVERLAY_OPTIONS = [
  {
    id: 'temperature',
    title: 'Surface Temperature Heatmap',
    source: 'temperature.csv · NASA MODIS / AIRS',
    units: '°C',
  },
  {
    id: 'rain',
    title: 'Precipitation Distribution',
    source: 'rain.csv · NASA GPM IMERG',
    units: 'mm/hr',
  },
  {
    id: 'moisture',
    title: 'Root Zone Soil Moisture',
    source: 'moisture.csv · NASA GLDAS Noah',
    units: 'kg m-2',
  },
  {
    id: 'evapo',
    title: 'Evapotranspiration & Canopy Flux',
    source: 'evapo.csv · NASA GLDAS / MODIS',
    units: 'kg m-2 s-1',
  },
]

export default function EarthMapPage() {
  const navigate = useNavigate()
  const ctx = useAnalysis() || {}
  const loc = ctx.location || ctx.selectedLocation || {
    lat: 21.2514,
    lon: 81.6296,
    name: 'Raipur, Chhattisgarh, India',
  }

  const [coords, setCoords] = useState({
    lat: Number(loc.lat ?? 21.2514),
    lon: Number(loc.lon ?? 81.6296),
    name: loc.name || 'Raipur, Chhattisgarh, India',
  })
  const [satellite, setSatellite] = useState(false)
  const [activeOverlay, setActiveOverlay] = useState('temperature')
  const [opacity, setOpacity] = useState(0.65)
  const [layerStats, setLayerStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const handleSelectLocation = (next) => {
    setCoords(next)
    if (ctx.setLocation) ctx.setLocation(next)
    if (ctx.setSelectedLocation) ctx.setSelectedLocation(next)
  }

  useEffect(() => {
    let cancelled = false
    async function loadOverlayTrend() {
      setLoadingStats(true)
      try {
        const res = await fetch('/api/trends/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: activeOverlay,
            layer: activeOverlay,
            lat: coords.lat,
            lon: coords.lon,
            start: '2015-01-01',
            end: '2025-09-30',
            aggregation: 'monthly',
            deseasonalize: false,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setLayerStats(data)
            if (ctx.setResult) ctx.setResult(data)
          }
        }
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setLoadingStats(false)
      }
    }
    loadOverlayTrend()
    return () => {
      cancelled = true
    }
  }, [activeOverlay, coords.lat, coords.lon])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Interactive Earth Map"
          subtitle="Click the map to choose a location, toggle NASA satellite overlays, and inspect regional trends."
        />
        <button
          type="button"
          onClick={() => setSatellite((s) => !s)}
          className="btn-ghost border border-slate-700 px-4 py-2 text-sm"
        >
          {satellite ? '🗺️ Standard Topo Map' : '🛰️ Satellite Imagery'}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel>
            <EarthMap
              lat={coords.lat}
              lon={coords.lon}
              location={coords}
              onPick={handleSelectLocation}
              onSelect={handleSelectLocation}
              satellite={satellite}
              activeOverlay={activeOverlay}
              overlayOpacity={opacity}
              height="h-[520px]"
            />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <h3 className="text-base font-semibold text-white">Selected location</h3>
            <p className="mt-2 text-sm text-slate-300">{coords.name}</p>
            <p className="text-xs text-slate-400">
              {coords.lat.toFixed(4)}°N, {coords.lon.toFixed(4)}°E
            </p>
            <button
              type="button"
              onClick={() => navigate(`/trend?var=${activeOverlay}`)}
              className="btn-primary mt-4 w-full justify-center"
            >
              Analyze this location &amp; variable
            </button>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Data overlays</h3>
                <p className="text-xs text-slate-400">Connected to NASA GIBS &amp; Local Giovanni CSVs</p>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                Backend Active
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {OVERLAY_OPTIONS.map((item) => {
                const isSelected = activeOverlay === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveOverlay(item.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? 'border-sky-400 bg-sky-500/15 text-white'
                        : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.title}</span>
                      <span className="text-xs font-semibold text-teal-300">
                        {isSelected ? '● Showing' : 'Select'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{item.source}</p>
                  </button>
                )
              })}
            </div>

            <div className="mt-4">
              <label className="flex items-center justify-between text-xs text-slate-400">
                <span>Overlay Opacity</span>
                <span>{Math.round(opacity * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="mt-1 w-full accent-sky-400"
              />
            </div>

            {layerStats && !loadingStats && (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs">
                <p className="font-semibold text-sky-300">
                  2015–2025 Backend Trend ({layerStats.meta?.layer})
                </p>
                <p className="mt-1 text-slate-300">
                  Direction:{' '}
                  <strong className="capitalize text-white">
                    {layerStats.tests?.mann_kendall?.trend}
                  </strong>{' '}
                  ({layerStats.tests?.mann_kendall?.p_value < 0.05 ? 'Significant' : 'Not significant'}, p ={' '}
                  {pval(layerStats.tests?.mann_kendall?.p_value)})
                </p>
                <p className="mt-0.5 text-slate-300">
                  Sen&apos;s Slope:{' '}
                  <strong className="text-white">
                    {signed(layerStats.tests?.sen_slope?.per_decade, 3)} {layerStats.meta?.units}/decade
                  </strong>
                </p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
