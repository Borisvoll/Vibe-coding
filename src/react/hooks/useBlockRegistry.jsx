import { createContext, useContext, useMemo, useCallback } from 'react';
import { useMode } from './useMode.jsx';

const BlockRegistryContext = createContext(null);

export function BlockRegistryProvider({ blockRegistry, children }) {
  return (
    <BlockRegistryContext.Provider value={blockRegistry}>
      {children}
    </BlockRegistryContext.Provider>
  );
}

export function useBlockRegistry() {
  const registry = useContext(BlockRegistryContext);
  if (!registry) throw new Error('useBlockRegistry must be used within BlockRegistryProvider');
  return registry;
}

/**
 * Returns blocks for a given host slot, filtered by current mode and sorted by order.
 * Blocks with empty modes array match all modes.
 */
export function useHostBlocks(hostSlot) {
  const registry = useBlockRegistry();
  const { mode } = useMode();

  return useMemo(() => {
    const enabled = registry.getEnabled();
    return enabled
      .filter((block) => {
        const hosts = Array.isArray(block.hosts) ? block.hosts : [];
        if (!hosts.includes(hostSlot)) return false;
        if (!Array.isArray(block.modes) || block.modes.length === 0) return true;
        return block.modes.includes(mode);
      })
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [registry, hostSlot, mode]);
}
