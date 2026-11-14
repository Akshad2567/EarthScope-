import { useEffect, useState } from 'react'
import { api } from '../services/api.js'

/** Polls GET /api/health and shows a small status indicator. */
export default function BackendStatus() {
  const [state, setState] = useState('checking')

  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        await api.health()
        if (alive) setState('online')
      } catch {
        if (alive) setState('offline')
      }
    }
    check()
    const id = setInterval(check, 15000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const map = {
    checking: { dot: 'bg-amber-400', text: 'Checking backend…' },
    online: { dot: 'bg-teal', text: 'Backend online' },
    offline: { dot: 'bg-red-500', text: 'Backend offline' },
  }[state]

  return (
    <div className="flex items-center gap-2 text-xs text-ink-muted" role="status">
      <span className={`h-2 w-2 rounded-full ${map.dot}`} aria-hidden />
      {map.text}
    </div>
  )
}
