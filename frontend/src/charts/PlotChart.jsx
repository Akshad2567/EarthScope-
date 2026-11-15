import Plot from 'react-plotly.js'

export default function PlotChart({
  data,
  traces,
  result,
  series,
  trendLine,
  trend_line,
  label,
  name,
  units = '',
  yLabel,
  height = 360,
}) {
  // Support both direct Plotly trace arrays AND backend result objects
  const rawSeries = series || result?.series || (!Array.isArray(data) ? data?.series : null) || []
  const rawTrend =
    trendLine ||
    trend_line ||
    result?.trend_line ||
    (!Array.isArray(data) ? data?.trend_line : null) ||
    []

  const seriesName = label || name || result?.meta?.layer || (!Array.isArray(data) ? data?.meta?.layer : null) || 'Observation'
  const axisUnits = yLabel || units || result?.meta?.units || (!Array.isArray(data) ? data?.meta?.units : '') || ''

  let plotTraces = []

  if (Array.isArray(traces) && traces.length > 0) {
    plotTraces = traces
  } else if (Array.isArray(data) && data.length > 0 && (data[0].x || data[0].y)) {
    plotTraces = data
  } else if (Array.isArray(rawSeries) && rawSeries.length > 0) {
    plotTraces.push({
      x: rawSeries.map((pt) => pt.date),
      y: rawSeries.map((pt) => pt.value),
      type: 'scatter',
      mode: 'lines',
      name: seriesName,
      line: { color: '#22d3ee', width: 2 },
      hovertemplate: `%{x}<br>${seriesName}: %{y} ${axisUnits}<extra></extra>`,
    })

    if (Array.isArray(rawTrend) && rawTrend.length > 0) {
      plotTraces.push({
        x: rawTrend.map((pt) => pt.date),
        y: rawTrend.map((pt) => pt.value),
        type: 'scatter',
        mode: 'lines',
        name: 'Linear trend (OLS)',
        line: { color: '#facc15', width: 2, dash: 'dash' },
        hovertemplate: `%{x}<br>Trend: %{y} ${axisUnits}<extra></extra>`,
      })
    }
  }

  return (
    <div className="w-full overflow-hidden">
      <Plot
        data={plotTraces}
        layout={{
          autosize: true,
          height,
          margin: { l: 56, r: 20, t: 16, b: 48 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: '#94a3b8', family: 'Inter, system-ui, sans-serif', size: 12 },
          xaxis: {
            gridcolor: 'rgba(148, 163, 184, 0.12)',
            zerolinecolor: 'rgba(148, 163, 184, 0.15)',
            tickfont: { color: '#94a3b8' },
          },
          yaxis: {
            title: { text: axisUnits, font: { color: '#94a3b8', size: 12 } },
            gridcolor: 'rgba(148, 163, 184, 0.12)',
            zerolinecolor: 'rgba(148, 163, 184, 0.15)',
            tickfont: { color: '#94a3b8' },
            exponentformat: 'e',
          },
          legend: {
            orientation: 'h',
            x: 0,
            y: -0.18,
            font: { color: '#cbd5e1', size: 12 },
          },
          hovermode: 'x unified',
        }}
        config={{
          responsive: true,
          displaylogo: false,
        }}
        useResizeHandler
        style={{ width: '100%', height: `${height}px` }}
      />
    </div>
  )
}
