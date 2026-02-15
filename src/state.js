const listeners = new Map();

export function emit(event, data) {
  const fns = listeners.get(event);
  if (fns) fns.forEach(fn => fn(data));
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
