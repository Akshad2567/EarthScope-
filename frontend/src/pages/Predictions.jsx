import PageHeader from '../components/PageHeader.jsx'
import ModulePage from '../components/ModulePage.jsx'

export default function Predictions() {
  return (
    <div>
      <PageHeader title="Future Predictions" subtitle="Statistical projections with uncertainty." />
      <ModulePage
        title="Forecasting"
        intro="Project a time series forward and compare it with history."
        capabilities={[
          'Five-year and ten-year projections',
          'Uncertainty intervals',
          'Historical versus projected comparison',
          'Stated limitations for every forecast',
        ]}
        endpoint="POST /api/predictions/forecast"
        requestExample={`{
  "analysis_id": "<id returned by /api/trends/analyze>",
  "horizon_years": 5
}`}
        caution="A statistical projection of a short record is not a climate prediction. It cannot capture changes in the underlying drivers, so every forecast will be shown with its uncertainty and limitations."
      />
    </div>
  )
}
