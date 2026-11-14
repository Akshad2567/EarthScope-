import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useEffect } from 'react'

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const SAT_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

function ClickToSelect({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect?.({ lat: +e.latlng.lat.toFixed(4), lon: +e.latlng.lng.toFixed(4) })
    },
  })
  return null
}

function Recenter({ lat, lon }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lon], map.getZoom())
  }, [lat, lon, map])
  return null
}

/**
 * Interactive base map. Click anywhere to choose a point of interest.
 * Data overlays (heatmaps, trend rasters) require backend tile endpoints and are not drawn here.
 */
export default function EarthMap({ lat, lon, zoom = 5, onSelect, satellite = false, height = 420, interactive = true }) {
  return (
    <MapContainer
      center={[lat, lon]}
      zoom={zoom}
      scrollWheelZoom={interactive}
      dragging={interactive}
      zoomControl={interactive}
      style={{ height, width: '100%', borderRadius: '0.75rem' }}
    >
      <TileLayer
        key={satellite ? 'sat' : 'dark'}
        url={satellite ? SAT_TILES : DARK_TILES}
        attribution={
          satellite
            ? 'Tiles &copy; Esri, Maxar, Earthstar Geographics'
            : '&copy; OpenStreetMap contributors &copy; CARTO'
        }
      />
      <CircleMarker center={[lat, lon]} radius={9} pathOptions={{ color: '#22b8ff', fillColor: '#22b8ff', fillOpacity: 0.35 }} />
      {interactive && <ClickToSelect onSelect={onSelect} />}
      <Recenter lat={lat} lon={lon} />
    </MapContainer>
  )
}
