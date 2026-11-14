# TerraTrend AI: Frontend/Backend API contract

The frontend calls `/api/*` (proxied to FastAPI on port 8000 by `frontend/vite.config.js`).
Any endpoint that returns 404 is shown in the UI as "not implemented yet". The frontend never fabricates results.

## GET /api/health
`{ "status": "ok" }`

## GET /api/dashboard/summary
```json
{
  "datasets_available": 0,
  "regions_analyzed": 0,
  "trends_found": 0,
  "significant_trends": 0,
  "recent_trends": [{ "id": "1", "title": "...", "summary": "..." }]
}
```

## GET /api/datasets?q=&mission=
Array (or `{ "items": [...] }`) of
`{ id, title, mission, resolution, coverage, description, url }`.
Must only list datasets that actually exist (for example, confirmed via NASA CMR).

## POST /api/trends/analyze
Request:
```json
{
  "product": "MOD11A2.061",
  "layer": "LST_Day_1km",
  "lat": 21.2514, "lon": 81.6296,
  "start": "2015-01-01", "end": "2025-12-31",
  "aggregation": "monthly",
  "deseasonalize": true
}
```
Response:
```json
{
  "meta": { "layer": "LST_Day_1km", "units": "°C", "n_obs": 132, "aggregation": "monthly", "notes": ["QC-flagged pixels excluded"] },
  "series": [{ "date": "2015-01-01", "value": 24.1 }],
  "trend_line": [{ "date": "2015-01-01", "value": 30.0 }],
  "trend": { "slope_per_year": 0.0, "slope_per_decade": 0.0, "r2": 0.0 },
  "tests": {
    "mann_kendall": { "tau": 0.0, "z": 0.0, "p_value": 0.0, "trend": "increasing", "modified": false },
    "sen_slope": { "per_year": 0.0, "per_decade": 0.0, "ci_low": 0.0, "ci_high": 0.0 },
    "ttest": { "t": 0.0, "p_value": 0.0 }
  },
  "significance": { "alpha": 0.05, "level": "significant" }
}
```
`trend_line` is optional; the chart draws it only if present. Values shown above are placeholders for the shape only.

## POST /api/assistant/chat
Request: `{ "message": "...", "analysis": <result of /trends/analyze or null> }`
Response: `{ "answer": "...", "evidence": ["..."], "possible_explanations": ["..."] }`

## Planned
`POST /api/correlation/analyze`, `POST /api/predictions/forecast`, `POST /api/regions/compare`, `POST /api/reports/pdf` (returns `application/pdf`).
