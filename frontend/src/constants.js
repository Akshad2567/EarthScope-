// Facts below come from the project brief (first case study). Nothing here is a measurement.

export const RAIPUR = { name: 'Raipur, Chhattisgarh, India', lat: 21.2514, lon: 81.6296 }

export const CASE_STUDY = {
  id: 'raipur-lst',
  title: 'Raipur land surface temperature',
  satellite: 'Terra MODIS',
  product: 'MOD11A2.061',
  spatial: '1 km',
  temporal: '8-day composite',
  start: '2015-01-01',
  end: '2025-12-31',
  scaleFactor: 0.02,
  celsiusFormula: '(DN x 0.02) - 273.15',
  layers: [
    { id: 'LST_Day_1km', label: 'Daytime land surface temperature' },
    { id: 'LST_Night_1km', label: 'Nighttime land surface temperature' },
  ],
  qcLayers: ['QC_Day', 'QC_Night'],
  links: {
    appeears: 'https://appeears.earthdatacloud.nasa.gov/',
    login: 'https://urs.earthdata.nasa.gov/',
    search: 'https://search.earthdata.nasa.gov/',
    modis: 'https://modis.gsfc.nasa.gov/',
  },
}

export const NAV = [
  { to: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { to: '/explorer', label: 'Earth Data Explorer', icon: 'Database' },
  { to: '/map', label: 'Interactive Earth Map', icon: 'Globe2' },
  { to: '/trend', label: 'Trend Analyzer', icon: 'LineChart' },
  { to: '/statistics', label: 'Statistical Analysis', icon: 'Sigma' },
  { to: '/assistant', label: 'AI Science Assistant', icon: 'Bot' },
  { to: '/correlation', label: 'Correlation Lab', icon: 'GitCompareArrows' },
  { to: '/predictions', label: 'Future Predictions', icon: 'TrendingUp' },
  { to: '/compare', label: 'Region Comparison', icon: 'Columns' },
  { to: '/reports', label: 'Reports and Downloads', icon: 'FileText' },
]
