import { useState, useCallback } from 'react';
import { useMode } from '../hooks/useMode.jsx';

const STORAGE_PREFIX = 'boris_collapse_';

function readState(id, mode, defaultOpen) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}_${mode}`);
    if (raw === null) return defaultOpen;
    return raw === '1';
  } catch { return defaultOpen; }
}

function writeState(id, mode, open) {
  try { localStorage.setItem(`${STORAGE_PREFIX}${id}_${mode}`, open ? '1' : '0'); }
  catch { /* private browsing */ }
}

/**
 * React collapsible section — mirrors the vanilla createCollapsibleSection.
 * Persists open/closed state per mode in localStorage.
 */
export function CollapsibleSection({ id, title, defaultOpen = true, children }) {
  const { mode } = useMode();
  const [isOpen, setIsOpen] = useState(() => readState(id, mode, defaultOpen));

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      writeState(id, mode, next);
      return next;
    });
  }, [id, mode]);

  return (
    <div className="collapsible-section" data-collapse-id={id}>
      <button
        type="button"
        className="collapsible-section__header"
        aria-expanded={isOpen}
        onClick={toggle}
      >
        <span className="collapsible-section__title">{title}</span>
        <span className="collapsible-section__chevron">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="collapsible-section__content os-host-stack">
          {children}
        </div>
      )}
    </div>
  );
}
