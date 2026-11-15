import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Rectangle, Popup, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const INDIA_BBOX = [
  [5.0, 65.0],
  [37.0, 98.0],
]

// Free NASA GIBS WMTS satellite layers (no API key required)
const GIBS_LAYERS = {
  temperature: {
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default/2024-05-01/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png',
    color: '#f97316',
    label: 'MODIS Land Surface Temperature',
  },
  rain: {
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/2024-08-01/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png',
    color: '#38bdf8',
    label: 'GPM IMERG Precipitation Rate',
  },
  moisture: {
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/SMAP_L4_Analyzed_Root_Zone_Soil_Moisture/default/2024-08-01/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png',
    color: '#10b981',
    label: 'Root Zone Soil Moisture',
  },
  evapo: {
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/2024-08-05/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png',
    color: '#a855f7',
    label: 'Vegetation & Evapotranspiration (NDVI)',
  },
}

function ClickHandler({ onPick, onSelect }) {
  useMapEvents({
    click(e) {
      const coords = {
        lat: Number(e.latlng.lat.toFixed(4)),
        lon: Number(e.latlng.lng.toFixed(4)),
        name: `Selected Point (${e.latlng.lat.toFixed(2)}°N, ${e.latlng.lng.toFixed(2)}°E)`,
      }
      if (onPick) onPick(coords)
      if (onSelect) onSelect(coords)
    },
  })
  return null
}

function Recenter({ lat, lon }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lon) {
      map.setView([lat, lon], map.getZoom(), { animate: true })
    }
  }, [lat, lon, map])
  return null
}

export default function EarthMap({
  lat = 21.2514,
  lon = 81.6296,
  location,
  onPick,
  onSelect,
  satellite = false,
  activeOverlay = null,
  overlayOpacity = 0.65,
  showStudyRegion = true,
  height = 'h-[420px]',
}) {
  const finalLat = Number(location?.lat ?? lat ?? 21.2514)
  const finalLon = Number(location?.lon ?? lon ?? 81.6296)
  const baseUrl = satellite
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'

  const overlayCfg = activeOverlay ? GIBS_LAYERS[activeOverlay] : null

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-slate-800 ${height}`}>
      <MapContainer
        center={[finalLat, finalLon]}
        zoom={5}
        scrollWheelZoom
        className="h-full w-full bg-slate-950"
      >
        <TileLayer
          key={satellite ? 'sat' : 'topo'}
          url={baseUrl}
          attribution="Tiles &copy; Esri &mdash; Source: NASA, USGS, Esri"
        />

        {overlayCfg && (
          <TileLayer
            key={activeOverlay}
            url={overlayCfg.url}
            opacity={overlayOpacity}
            attribution="NASA EOSDIS GIBS"
          />
        )}

        {showStudyRegion && (
          <Rectangle
            bounds={INDIA_BBOX}
            pathOptions={{
              color: overlayCfg ? overlayCfg.color : '#38bdf8',
              weight: 1.5,
              fillOpacity: overlayCfg ? 0.12 : 0.05,
              dashArray: '6 4',
            }}
          >
            <Popup>
              <strong>NASA Giovanni Study Bounding Box</strong>
              <br />
              India &amp; South Asia (65°E–98°E, 5°N–37°N)
            </Popup>
          </Rectangle>
        )}

        <CircleMarker
          center={[finalLat, finalLon]}
          radius={9}
          pathOptions={{
            color: '#38bdf8',
            fillColor: '#0284c7',
            fillOpacity: 0.9,
            weight: 2.5,
          }}
        >
          <Popup>
            <strong>{location?.name || 'Raipur, Chhattisgarh, India'}</strong>
            <br />
            {finalLat.toFixed(4)}°N, {finalLon.toFixed(4)}°E
          </Popup>
        </CircleMarker>

        <ClickHandler onPick={onPick} onSelect={onSelect} />
        <Recenter lat={finalLat} lon={finalLon} />
      </MapContainer>
    </div>
  )
}
