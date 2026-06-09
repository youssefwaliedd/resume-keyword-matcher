import { Outlet, NavLink } from 'react-router-dom'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Priority 9 — navigation-consistency: sticky header, same on all pages */}
      <header className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2.5" aria-label="FitCheck home">
            {/* Priority 4 — no emoji icons: monogram in a shape */}
            <div className="w-7 h-7 bg-ink rounded-md flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <span className="text-[10px] font-mono font-medium text-bg tracking-tight">FC</span>
            </div>
            <span className="font-display text-[17px] font-semibold text-ink tracking-tight">FitCheck</span>
          </NavLink>

          {/* Priority 9 — nav-label-icon + nav-state-active */}
          <nav aria-label="Main navigation">
            <ul className="flex items-center gap-1 list-none m-0 p-0">
              <li>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150 min-h-touch inline-flex items-center ${
                      isActive ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                    }`
                  }
                  aria-current={({ isActive }) => isActive ? 'page' : undefined}
                >
                  Analyze
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/history"
                  className={({ isActive }) =>
                    `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150 min-h-touch inline-flex items-center ${
                      isActive ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                    }`
                  }
                  aria-current={({ isActive }) => isActive ? 'page' : undefined}
                >
                  History
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Priority 1 — skip-links target */}
      <main id="main-content" className="flex-1 max-w-6xl mx-auto w-full px-6 py-10" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="border-t border-border py-5">
        <div className="max-w-5xl mx-auto px-5 flex items-center justify-between">
          <span className="text-xs text-ink-3 font-mono">FitCheck — explainable job matching</span>
          <span className="text-xs text-ink-3">All processing is local</span>
        </div>
      </footer>

    </div>
  )
}
