export function createEventBus() {
  const listeners = new Map();

  function on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => off(event, handler);
  }

  function off(event, handler) {
    const set = listeners.get(event);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) listeners.delete(event);
  }

  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    [...set].forEach((handler) => handler(payload));
  }

  function clear() {
    listeners.clear();
  }

  return { on, off, emit, clear };
}
