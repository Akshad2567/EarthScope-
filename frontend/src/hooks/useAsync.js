import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs an async function (that accepts an AbortSignal) on mount and whenever
 * `deps` change. Returns { data, error, loading, reload }.
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback(() => {
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    fnRef
      .current(controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name === 'AbortError') return
        setState({ data: null, error, loading: false })
      })
    return () => controller.abort()
  }, [])

  useEffect(() => run(), [run, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, reload: run }
}
