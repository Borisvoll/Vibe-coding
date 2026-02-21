import { useEffect, useRef } from 'react';

/**
 * Bridge component that mounts a vanilla JS block into a React tree.
 * Used during incremental migration — each route can use this to
 * render existing vanilla blocks until they're rewritten in React.
 *
 * Usage:
 *   <VanillaBridge mount={(container, ctx) => myBlock.mount(container, ctx)} context={ctx} />
 */
export function VanillaBridge({ mount, context, className = '' }) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !mount) return;

    // Mount the vanilla block
    instanceRef.current = mount(el, context) || null;

    return () => {
      // Unmount on cleanup
      instanceRef.current?.unmount?.();
      instanceRef.current = null;
      if (el) el.innerHTML = '';
    };
  }, [mount, context]);

  return <div ref={containerRef} className={className} />;
}
