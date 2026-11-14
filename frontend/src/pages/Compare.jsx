import PageHeader from '../components/PageHeader.jsx'
import ModulePage from '../components/ModulePage.jsx'

export default function Compare() {
  return (
    <div>
      <PageHeader title="Region Comparison" subtitle="Find places where the same variable trends differently." />
      <ModulePage
        title="Side-by-side regional trends"
        intro="Run the same analysis for several regions and compare the results."
        capabilities={[
          'Countries, states, cities and custom regions',
          'Side-by-side time series',
          'Identification of opposing trends',
          'Statistical comparison of slopes',
        ]}
        endpoint="POST /api/regions/compare"
        requestExample={`{
  "product": "MOD11A2.061",
  "layer": "LST_Day_1km",
  "start": "2015-01-01", "end": "2025-12-31",
  "regions": [
    { "name": "Raipur", "lat": 21.2514, "lon": 81.6296 },
    { "name": "<second region>", "lat": 0, "lon": 0 }
  ]
}`}
      />
    </div>
  )
}
