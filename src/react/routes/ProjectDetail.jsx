import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useCallback } from 'react';
import { VanillaBridge } from '../components/VanillaBridge.jsx';
import { useBlockRegistry } from '../hooks/useBlockRegistry.jsx';
import { useMode } from '../hooks/useMode.jsx';
import { useEventBus } from '../hooks/useEventBus.jsx';

/**
 * Project detail route — mounts the project-hub vanilla block
 * and navigates to the specific project via the projects:open event.
 */
export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const registry = useBlockRegistry();
  const { mode, modeManager } = useMode();
  const eventBus = useEventBus();
  const hasFiredRef = useRef(false);

  const context = { mode, eventBus, modeManager };

  const block = registry.get('project-hub');

  const mount = useCallback((container, ctx) => {
    if (!block) return null;
    const instance = block.mount(container, ctx);
    // After mount, navigate to the specific project
    if (id && !hasFiredRef.current) {
      hasFiredRef.current = true;
      // Use requestAnimationFrame to ensure the block has rendered
      requestAnimationFrame(() => {
        eventBus.emit('projects:open', { projectId: id });
      });
    }
    return instance;
  }, [block, id, eventBus]);

  if (!block) return null;

  return (
    <section className="p-6 max-w-[var(--max-os-content-width)]">
      <button
        type="button"
        className="text-sm text-[var(--color-accent)] hover:underline mb-4"
        onClick={() => navigate('/projects')}
      >
        &larr; Projecten
      </button>
      <VanillaBridge
        key={`project-hub-${id}-${mode}`}
        mount={mount}
        context={context}
      />
    </section>
  );
}
