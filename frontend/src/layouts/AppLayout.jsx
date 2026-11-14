import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bot,
  Columns,
  Database,
  FileText,
  GitCompareArrows,
  Globe2,
  LayoutDashboard,
  LineChart,
  Menu,
  Search,
  Sigma,
  TrendingUp,
  X,
} from 'lucide-react'
import { NAV } from '../constants.js'
import BackendStatus from '../components/BackendStatus.jsx'

const ICONS = { Bot, Columns, Database, FileText, GitCompareArrows, Globe2, LayoutDashboard, LineChart, Sigma, TrendingUp }

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
        <Globe2 size={22} aria-hidden />
      </div>
      <div className="leading-tight">
        <p className="text-lg font-semibold text-ink">TerraTrend AI</p>
        <p className="text-[11px] text-ink-muted">Earth System Trend Intelligence</p>
      </div>
    </div>
  )
}

function NavList({ onNavigate }) {
  return (
    <nav aria-label="Main" className="mt-8 space-y-1">
      {NAV.map(({ to, label, icon }) => {
        const Icon = ICONS[icon]
        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                isActive ? 'bg-accent/15 text-ink shadow-glow' : 'text-ink-muted hover:bg-navy-700 hover:text-ink'
              }`
            }
          >
            <Icon size={18} aria-hidden />
            {label}
          </NavLink>
        )
      })}
    </nav>
  )
}

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const onSearch = (e) => {
    e.preventDefault()
    navigate(`/explorer${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`)
    setQuery('')
  }

  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-navy-600/70 bg-navy-900/80 p-4 lg:flex">
        <Brand />
        <NavList />
        <div className="mt-auto border-t border-navy-600/70 pt-4">
          <BackendStatus />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-navy-900 p-4">
            <div className="flex items-center justify-between">
              <Brand />
              <button className="text-ink-muted" onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t border-navy-600/70 pt-4">
              <BackendStatus />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-navy-600/70 bg-navy-950/80 px-4 py-3 backdrop-blur lg:px-8">
          <button className="text-ink-muted lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <form onSubmit={onSearch} className="relative ml-auto w-full max-w-md" role="search">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search NASA datasets and variables…"
              aria-label="Search datasets"
              className="field pl-9"
            />
          </form>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="px-4 pb-6 text-center text-[11px] text-ink-faint lg:px-8">
          Built for NASA Space Apps Challenge 2026. Not an official NASA product. Data attribution: NASA LP DAAC, NASA
          AppEEARS and other cited sources.
        </footer>
      </div>
    </div>
  )
}
