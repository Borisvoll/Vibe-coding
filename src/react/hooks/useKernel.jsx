import { createContext, useContext } from 'react';

const KernelContext = createContext(null);

/**
 * Provides the kernel instance to the React tree.
 * The kernel must be created in main.js and passed in as a prop.
 */
export function KernelProvider({ kernel, children }) {
  return (
    <KernelContext.Provider value={kernel}>
      {children}
    </KernelContext.Provider>
  );
}

/**
 * Access the kernel from any React component.
 * Returns the full kernel object: { commands, queries, subscribe, emit, eventBus, mode }
 */
export function useKernel() {
  const kernel = useContext(KernelContext);
  if (!kernel) throw new Error('useKernel must be used within KernelProvider');
  return kernel;
}
