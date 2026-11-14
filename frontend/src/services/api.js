// Thin client for the TerraTrend FastAPI backend. See docs/API_CONTRACT.md.
// All paths are relative to /api (proxied to FastAPI by vite.config.js in development).

const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

async function request(path, { method = 'GET', body, signal, raw = false } = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Cannot reach the TerraTrend backend. Is it running on port 8000?', 0)
  }

  if (!res.ok) {
    let detail = null
    try {
      detail = await res.json()
    } catch {
      /* body was not JSON */
    }
    // The Vite dev proxy answers with an empty 5xx body when FastAPI is not running.
    if (detail === null && [500, 502, 503, 504].includes(res.status)) {
      throw new ApiError('Cannot reach the TerraTrend backend. Is it running on port 8000?', 502)
    }
    const message =
      res.status === 404
        ? 'This backend endpoint is not implemented yet.'
        : (typeof detail?.detail === 'string' && detail.detail) || `Request failed (${res.status})`
    throw new ApiError(message, res.status, detail)
  }
  return raw ? res : res.json()
}

export const api = {
  health: (signal) => request('/health', { signal }),
  dashboardSummary: (signal) => request('/dashboard/summary', { signal }),
  datasets: (params = {}, signal) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
    return request(`/datasets${qs ? `?${qs}` : ''}`, { signal })
  },
  analyzeTrend: (payload, signal) => request('/trends/analyze', { method: 'POST', body: payload, signal }),
  assistantChat: (payload, signal) => request('/assistant/chat', { method: 'POST', body: payload, signal }),
  correlation: (payload, signal) => request('/correlation/analyze', { method: 'POST', body: payload, signal }),
  forecast: (payload, signal) => request('/predictions/forecast', { method: 'POST', body: payload, signal }),
  compareRegions: (payload, signal) => request('/regions/compare', { method: 'POST', body: payload, signal }),
  reportPdf: async (payload, signal) => {
    const res = await request('/reports/pdf', { method: 'POST', body: payload, signal, raw: true })
    return res.blob()
  },
}
