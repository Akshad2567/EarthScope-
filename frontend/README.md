# TerraTrend AI frontend

React + Vite + Tailwind + Plotly + React Leaflet.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (Codespaces will offer to open port 5173)
npm run build      # production build into frontend/dist
```

The dev server proxies `/api` to `http://localhost:8000`. Override with `VITE_PROXY_TARGET=http://host:port npm run dev`.
See `../docs/API_CONTRACT.md` for what the backend must provide.
