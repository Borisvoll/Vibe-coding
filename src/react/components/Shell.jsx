import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useMode } from '../hooks/useMode.jsx';
import { Sidebar } from './Sidebar.jsx';
import { MobileNav } from './MobileNav.jsx';
import { ModePicker } from './ModePicker.jsx';
import { useState } from 'react';

export function Shell() {
  const { mode, meta } = useMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeTab = location.pathname.split('/')[1] || 'today';

  function handleNavigate(tab) {
    navigate(`/${tab}`);
  }

  return (
    <div
      className={`os-shell font-sans ${sidebarCollapsed ? 'os-shell--sidebar-collapsed' : ''}`}
      data-mode={mode}
    >
      {/* Mode wash animation overlay */}
      <div className="os-mode-wash" aria-hidden="true" style={{ '--wash-color': meta.color }} />

      {/* Mode picker dialog */}
      <ModePicker open={modePickerOpen} onClose={() => setModePickerOpen(false)} />

      {/* Desktop sidebar */}
      <Sidebar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onModeClick={() => setModePickerOpen(true)}
      />

      {/* Desktop topbar */}
      <header className="os-shell__topbar">
        <div className="os-shell__topbar-inner">
          <button
            type="button"
            className="os-topbar__hamburger"
            aria-label="Menu"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="os-topbar__spacer" />
        </div>
      </header>

      {/* Mobile topbar */}
      <header className="os-shell__header os-shell__header--mobile">
        <div className="os-shell__header-inner">
          <div className="os-shell__header-left">
            <h1 className="os-shell__title">BORIS</h1>
          </div>
          <div className="os-shell__header-actions">
            <button
              type="button"
              className="os-mode-btn"
              aria-label="Verander modus"
              onClick={() => setModePickerOpen(true)}
              style={{ '--mode-color': meta.color, '--mode-color-light': meta.colorLight }}
            >
              <span className="os-mode-btn__dot" style={{ background: meta.color }} />
              <span className="os-mode-btn__label">{meta.label}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <MobileNav activeTab={activeTab} onNavigate={handleNavigate} />

      {/* Route content */}
      <main className="os-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
