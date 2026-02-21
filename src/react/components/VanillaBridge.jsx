import { useEffect, useRef } from 'react';

/**
 * Bridge component that mounts a vanilla JS block into a React tree.
 * Used during incremental migration — each route can use this to
 * render existing vanilla blocks until they're rewritten in React.
 *
 * IMPORTANT: This component mounts the vanilla block once on initial render.
 * To remount with different props, change the `key` prop on the parent.
 *
 * Usage:
 *   <VanillaBridge key={`${blockId}-${mode}`} mount={fn} context={ctx} />
 */
export function VanillaBridge({ mount, context, className = '' }) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);
  const mountRef = useRef(mount);
  const contextRef = useRef(context);

  // Keep refs current (for cleanup, but don't trigger re-mount)
  mountRef.current = mount;
  contextRef.current = context;

  useEffect(() => {
    const el = containerRef.current;
    const mountFn = mountRef.current;
    if (!el || !mountFn) return;

    // Mount the vanilla block once
    instanceRef.current = mountFn(el, contextRef.current) || null;

    return () => {
      // Unmount on cleanup
      instanceRef.current?.unmount?.();
      instanceRef.current = null;
      if (el) el.innerHTML = '';
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className={className} />;
}
