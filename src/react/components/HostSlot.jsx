import { useMemo } from 'react';
import { VanillaBridge } from './VanillaBridge.jsx';
import { useHostBlocks } from '../hooks/useBlockRegistry.jsx';
import { useMode } from '../hooks/useMode.jsx';
import { useEventBus } from '../hooks/useEventBus.jsx';

/**
 * Renders all vanilla blocks assigned to a host slot.
 * Filters by current mode and sorts by block order.
 *
 * Usage:
 *   <HostSlot host="vandaag-tasks" />
 *   <HostSlot host="inbox-screen" className="my-class" />
 */
export function HostSlot({ host, className = '' }) {
  const blocks = useHostBlocks(host);
  const { mode, modeManager } = useMode();
  const eventBus = useEventBus();

  // Memoize context to avoid unnecessary VanillaBridge remounts
  const context = useMemo(
    () => ({ mode, eventBus, modeManager }),
    [mode, eventBus, modeManager]
  );

  if (blocks.length === 0) return null;

  return (
    <div className={className} data-os-host={host}>
      {blocks.map((block) => (
        <VanillaBridge
          key={`${block.id}-${mode}`}
          mount={(container, ctx) => block.mount(container, ctx)}
          context={context}
        />
      ))}
    </div>
  );
}
