import { createContext, useContext, useMemo, useState } from 'react'
import { RAIPUR } from '../constants.js'

const AnalysisContext = createContext(null)

/**
 * Holds the currently selected location and the most recent analysis result
 * returned by the backend, so the Statistics, Assistant and Reports pages can
 * work on the same result without re-running it.
 */
export function AnalysisProvider({ children }) {
  const [location, setLocation] = useState(RAIPUR)
  const [result, setResult] = useState(null)

  const value = useMemo(() => ({ location, setLocation, result, setResult }), [location, result])
  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext)
  if (!ctx) throw new Error('useAnalysis must be used inside <AnalysisProvider>')
  return ctx
}
