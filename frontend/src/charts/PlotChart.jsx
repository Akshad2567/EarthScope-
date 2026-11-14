import * as PlotlyModule from 'plotly.js-basic-dist-min'
import * as FactoryModule from 'react-plotly.js/factory'

// These packages are CommonJS; depending on the bundler the real export is on `.default`.
const Plotly = PlotlyModule.default ?? PlotlyModule
const factory = FactoryModule.default?.default ?? FactoryModule.default ?? FactoryModule
const Plot = factory(Plotly)

export const COLORS = {
  accent: '#22b8ff',
  teal: '#19d3a2',
  violet: '#8b5cf6',
  amber: '#fbbf24',
  grid: '#15284d',
  text: '#9fb3d9',
}

export const baseLayout = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { color: COLORS.text, family: 'Inter, system-ui, sans-serif', size: 12 },
  margin: { l: 56, r: 16, t: 16, b: 44 },
  xaxis: { gridcolor: COLORS.grid, zerolinecolor: COLORS.grid, linecolor: COLORS.grid },
  yaxis: { gridcolor: COLORS.grid, zerolinecolor: COLORS.grid, linecolor: COLORS.grid },
  legend: { orientation: 'h', y: -0.2 },
  hovermode: 'x unified',
}

export default function PlotChart({ data, layout = {}, height = 360 }) {
  const merged = {
    ...baseLayout,
    ...layout,
    xaxis: { ...baseLayout.xaxis, ...(layout.xaxis || {}) },
    yaxis: { ...baseLayout.yaxis, ...(layout.yaxis || {}) },
    autosize: true,
  }
  return (
    <Plot
      data={data}
      layout={merged}
      config={{ displaylogo: false, responsive: true }}
      useResizeHandler
      style={{ width: '100%', height }}
    />
  )
}
