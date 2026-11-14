import { Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DataExplorer from './pages/DataExplorer.jsx'
import EarthMapPage from './pages/EarthMapPage.jsx'
import TrendAnalyzer from './pages/TrendAnalyzer.jsx'
import Statistics from './pages/Statistics.jsx'
import Assistant from './pages/Assistant.jsx'
import Correlation from './pages/Correlation.jsx'
import Predictions from './pages/Predictions.jsx'
import Compare from './pages/Compare.jsx'
import Reports from './pages/Reports.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="explorer" element={<DataExplorer />} />
        <Route path="map" element={<EarthMapPage />} />
        <Route path="trend" element={<TrendAnalyzer />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="correlation" element={<Correlation />} />
        <Route path="predictions" element={<Predictions />} />
        <Route path="compare" element={<Compare />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<p className="text-ink-muted">Page not found.</p>} />
      </Route>
    </Routes>
  )
}
