const NAV_ITEMS = [
  { tab: 'dashboard', label: 'Dashboard' },
  { tab: 'today', label: 'Vandaag' },
  { tab: 'inbox', label: 'Inbox' },
  { tab: 'lijsten', label: 'Lijsten' },
  { tab: 'planning', label: 'Planning' },
  { tab: 'projects', label: 'Projecten' },
  { tab: 'settings', label: 'Instellingen' },
];

export function MobileNav({ activeTab, onNavigate }) {
  return (
    <nav className="os-nav os-nav--mobile" aria-label="BORIS navigatie">
      <div className="os-nav__inner">
        {NAV_ITEMS.map(({ tab, label }) => (
          <button
            key={tab}
            className={`os-nav__button ${activeTab === tab ? 'os-nav__button--active' : ''}`}
            type="button"
            onClick={() => onNavigate(tab)}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
