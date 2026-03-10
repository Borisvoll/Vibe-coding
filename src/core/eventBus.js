/**
 * BORIS OS — Event Bus
 * Central pub/sub system for inter-block communication.
 * Blocks must NEVER import each other directly.
 * All communication flows through this bus.
 */

const listeners = new Map();
const onceListeners = new Map();

export function emit(event, data) {
  const fns = listeners.get(event);
  if (fns) fns.forEach(fn => { try { fn(data); } catch (e) { console.error(`[EventBus] Error in handler for "${event}":`, e); } });

  const onceFns = onceListeners.get(event);
  if (onceFns) {
    onceFns.forEach(fn => { try { fn(data); } catch (e) { console.error(`[EventBus] Error in once-handler for "${event}":`, e); } });
    onceListeners.delete(event);
  }
}

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(fn);
  return () => off(event, fn);
}

export function off(event, fn) {
  const fns = listeners.get(event);
  if (!fns) return;
  const idx = fns.indexOf(fn);
  if (idx >= 0) fns.splice(idx, 1);
}

export function once(event, fn) {
  if (!onceListeners.has(event)) onceListeners.set(event, []);
  onceListeners.get(event).push(fn);
}

export function clear() {
  listeners.clear();
  onceListeners.clear();
}
