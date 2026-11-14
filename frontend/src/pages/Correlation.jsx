import PageHeader from '../components/PageHeader.jsx'
import ModulePage from '../components/ModulePage.jsx'

export default function Correlation() {
  return (
    <div>
      <PageHeader title="Correlation Lab" subtitle="See how environmental variables move together." />
      <ModulePage
        title="Multi-variable correlation"
        intro="Compare two or more variables for the same place and period."
        capabilities={[
          'Temperature versus rainfall',
          'Vegetation versus precipitation',
          'Humidity versus temperature',
          'Soil moisture versus temperature',
          'Correlation matrices',
          'Lagged correlation',
        ]}
        endpoint="POST /api/correlation/analyze"
        requestExample={`{
  "variables": ["MOD11A2.LST_Day_1km", "<second variable>"],
  "lat": 21.2514, "lon": 81.6296,
  "start": "2015-01-01", "end": "2025-12-31",
  "max_lag_months": 6
}`}
        caution="Correlation does not show causation. Two variables can move together because of a shared driver, the seasonal cycle, or chance. Results will be presented with that warning."
      />
    </div>
  )
}
