import { createContext, useContext, useEffect, useCallback } from 'react';

const EventBusContext = createContext(null);

export function EventBusProvider({ eventBus, children }) {
  return (
    <EventBusContext.Provider value={eventBus}>
      {children}
    </EventBusContext.Provider>
  );
}

export function useEventBus() {
  const bus = useContext(EventBusContext);
  if (!bus) throw new Error('useEventBus must be used within EventBusProvider');
  return bus;
}

/**
 * Subscribe to an event bus event. Auto-unsubscribes on unmount.
 */
export function useEvent(eventName, handler) {
  const bus = useEventBus();

  useEffect(() => {
    const unsub = bus.on(eventName, handler);
    return unsub;
  }, [bus, eventName, handler]);
}

/**
 * Returns a stable emit function for a specific event.
 */
export function useEmit(eventName) {
  const bus = useEventBus();
  return useCallback(
    (data) => bus.emit(eventName, data),
    [bus, eventName]
  );
}
