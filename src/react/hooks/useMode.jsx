import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useEventBus } from './useEventBus.jsx';

const ModeContext = createContext(null);

const MODE_META = {
  School: {
    label: 'School',
    description: 'Opleiding & studie',
    color: 'var(--color-purple)',
    colorLight: 'var(--color-purple-light)',
    emoji: '📚',
  },
  Personal: {
    label: 'Persoonlijk',
    description: 'Persoonlijke groei & leven',
    color: 'var(--color-emerald)',
    colorLight: 'var(--color-emerald-light)',
    emoji: '🌱',
  },
  BPV: {
    label: 'BPV',
    description: 'Beroepspraktijkvorming',
    color: 'var(--color-blue)',
    colorLight: 'var(--color-blue-light)',
    emoji: '🏢',
  },
};

/**
 * Internal provider that listens for mode:changed via the EventBus.
 * Must be nested inside EventBusProvider.
 */
function ModeInner({ modeManager, children }) {
  const eventBus = useEventBus();
  const [mode, setModeState] = useState(modeManager.getMode());

  useEffect(() => {
    const unsub = eventBus.on('mode:changed', ({ mode: newMode }) => {
      setModeState(newMode);
    });
    return unsub;
  }, [eventBus]);

  const setMode = useCallback((newMode) => {
    modeManager.setMode(newMode);
  }, [modeManager]);

  const value = { mode, setMode, modeManager, meta: MODE_META[mode] || MODE_META.School, MODE_META };

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  );
}

export function ModeProvider({ modeManager, children }) {
  return <ModeInner modeManager={modeManager}>{children}</ModeInner>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within ModeProvider');
  return ctx;
}
