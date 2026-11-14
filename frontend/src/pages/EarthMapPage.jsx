import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Satellite } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import Notice from '../components/Notice.jsx'
import EarthMap from '../maps/EarthMap.jsx'
import { useAnalysis } from '../context/AnalysisContext.jsx'

const OVERLAYS = ['Temperature heatmap', 'Rainfall distribution', 'Vegetation change', 'Soil moisture', 'Drought indicator', 'Spatial trend']

export default function EarthMapPage() {
  const { location, setLocation } = useAnalysis()
  const [satellite, setSatellite] = useState(false)
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        title="Interactive Earth Map"
        subtitle="Click the map to choose a location, then analyze a variable there."
        action={
          <button className="btn-ghost" onClick={() => setSatellite((s) => !s)}>
            <Satellite size={16} aria-hidden /> {satellite ? 'Dark map' : 'Satellite imagery'}
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <EarthMap
            lat={location.lat}
            lon={location.lon}
            zoom={5}
            satellite={satellite}
            height={520}
            onSelect={({ lat, lon }) => setLocation({ name: `Custom point (${lat}, ${lon})`, lat, lon })}
          />
        </Panel>

        <div className="space-y-6">
          <Panel title="Selected location">
            <p className="text-sm text-ink">{location.name}</p>
            <p className="mt-1 font-mono text-xs text-ink-muted">
              {location.lat}°, {location.lon}°
            </p>
            <button className="btn-primary mt-4 w-full" onClick={() => navigate('/trend')}>
              Analyze this location
            </button>
          </Panel>

          <Panel title="Data overlays" subtitle="Planned map layers">
            <ul className="space-y-1.5 text-sm text-ink-muted">
              {OVERLAYS.map((o) => (
                <li key={o} className="flex justify-between">
                  <span>{o}</span>
                  <span className="text-xs text-ink-faint">needs backend</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Notice kind="offline">
                Overlays need raster or tile endpoints from the backend. Only the base map is shown now, so nothing
                on this map represents a measurement.
              </Notice>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
