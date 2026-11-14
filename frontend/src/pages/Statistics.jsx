import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Panel from '../components/Panel.jsx'
import Notice from '../components/Notice.jsx'
import { useAnalysis } from '../context/AnalysisContext.jsx'
import { interpret, num, pval, signed } from '../lib/format.js'

const EXPLAIN = [
  ['Mann-Kendall test', 'A rank-based test that asks whether values tend to rise or fall over time. It does not assume the data follow a bell curve, so it is widely used for environmental records.'],
  ["Sen's slope", 'The median of all pairwise slopes. It estimates how fast the variable changes and is less affected by outliers than a straight-line fit.'],
  ['Linear regression / t-test', 'Fits a straight line and tests whether its slope differs from zero. It is simple and familiar but assumes roughly independent, evenly spread errors.'],
  ['p-value', 'If there were truly no trend, the chance of seeing a pattern at least this strong. A small p-value (below alpha, often 0.05) is treated as evidence of a trend.'],
  ['Confidence interval', 'A range that likely contains the true rate of change. If it excludes zero, the direction of change is well supported.'],
  ['Autocorrelation', 'Consecutive observations are often similar, which can make a trend look more convincing than it is. Modified tests correct for this.'],
]

export default function Statistics() {
  const { result } = useAnalysis()
  const summary = interpret(result)
  const t = result?.tests || {}

  const rows = result
    ? [
        ['Mann-Kendall', [['Kendall tau', num(t.mann_kendall?.tau, 4)], ['Z statistic', num(t.mann_kendall?.z, 3)], ['p-value', pval(t.mann_kendall?.p_value)], ['Trend', t.mann_kendall?.trend ?? '—'], ['Autocorrelation-corrected', t.mann_kendall?.modified == null ? '—' : t.mann_kendall.modified ? 'Yes (modified test)' : 'No']]],
        ["Sen's slope", [['Per year', signed(t.sen_slope?.per_year, 4)], ['Per decade', signed(t.sen_slope?.per_decade, 3)], ['95% CI low (per year)', signed(t.sen_slope?.ci_low, 4)], ['95% CI high (per year)', signed(t.sen_slope?.ci_high, 4)]]],
        ['Linear regression', [['Slope per year', signed(result.trend?.slope_per_year, 4)], ['R squared', num(result.trend?.r2, 4)], ['t statistic', num(t.ttest?.t, 3)], ['p-value', pval(t.ttest?.p_value)]]],
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader title="Statistical Analysis" subtitle="Detailed test results for the most recent analysis, with plain-language explanations." />

      {!result ? (
        <Notice kind="offline" title="No analysis yet">
          Run an analysis in the <Link to="/trend">Trend Analyzer</Link> and its full statistics will appear here.
        </Notice>
      ) : (
        <>
          {summary && (
            <Panel title="Summary">
              <p className="text-sm text-ink">{summary.text}</p>
            </Panel>
          )}
          <div className="grid gap-6 lg:grid-cols-3">
            {rows.map(([title, items]) => (
              <Panel key={title} title={title}>
                <dl className="space-y-2 text-sm">
                  {items.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-navy-600/50 pb-1.5 last:border-0">
                      <dt className="text-ink-muted">{k}</dt>
                      <dd className="font-mono text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            ))}
          </div>
          {result.meta?.notes?.length > 0 && (
            <Panel title="Methodology notes from the backend">
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
                {result.meta.notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </Panel>
          )}
        </>
      )}

      <Panel title="How to read these tests">
        <dl className="grid gap-4 md:grid-cols-2">
          {EXPLAIN.map(([k, v]) => (
            <div key={k}>
              <dt className="text-sm font-semibold text-ink">{k}</dt>
              <dd className="text-sm text-ink-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  )
}
