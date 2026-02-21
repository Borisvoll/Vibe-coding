import { useEffect, useRef } from 'react';
import { useMode } from '../hooks/useMode.jsx';

export function ModePicker({ open, onClose }) {
  const { mode, setMode, MODE_META } = useMode();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (open && panelRef.current) {
      const active = panelRef.current.querySelector('[data-active="true"]') || panelRef.current.querySelector('.mode-card');
      active?.focus();
    }
  }, [open]);

  if (!open) return null;

  function handleSelect(m) {
    setMode(m);
    onClose();
  }

  return (
    <div className="mode-picker mode-picker--visible" role="dialog" aria-label="Kies een modus" aria-modal="true">
      <div className="mode-picker__backdrop" onClick={onClose} />
      <div className="mode-picker__panel" ref={panelRef}>
        <p className="mode-picker__eyebrow">Jouw context</p>
        <h2 className="mode-picker__title">Welke modus?</h2>
        <div className="mode-picker__cards">
          {Object.entries(MODE_META).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              className={`mode-card ${mode === key ? 'mode-card--active' : ''}`}
              data-mode={key}
              data-active={mode === key}
              style={{ '--mode-color': meta.color, '--mode-color-light': meta.colorLight }}
              onClick={() => handleSelect(key)}
            >
              <span className="mode-card__emoji">{meta.emoji}</span>
              <span className="mode-card__label">{meta.label}</span>
              <span className="mode-card__desc">{meta.description}</span>
              <span className="mode-card__check" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
