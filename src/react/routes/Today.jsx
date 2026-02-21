import { useMode } from '../hooks/useMode.jsx';
import { HostSlot } from '../components/HostSlot.jsx';
import { CollapsibleSection } from '../components/CollapsibleSection.jsx';

export function Today() {
  const { meta } = useMode();

  return (
    <section className="p-6 max-w-[var(--max-os-content-width)]">
      {/* Page header */}
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-[var(--color-text)]">
          Vandaag{' '}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
            style={{ background: meta.colorLight, color: meta.color }}
          >
            {meta.emoji} {meta.label}
          </span>
        </h2>
      </div>

      {/* Non-collapsible: Hero (Top 3 / daily outcomes) */}
      <HostSlot host="vandaag-hero" className="mb-4" />

      {/* Non-collapsible: Cockpit (stats) */}
      <HostSlot host="vandaag-cockpit" className="mb-4" />

      {/* Collapsible: Taken */}
      <CollapsibleSection id="vandaag-tasks" title="Taken" defaultOpen={true}>
        <HostSlot host="vandaag-tasks" />
      </CollapsibleSection>

      {/* Collapsible: Projecten & Lijsten */}
      <CollapsibleSection id="vandaag-projects" title="Projecten & Lijsten" defaultOpen={true}>
        <HostSlot host="vandaag-projects" />
      </CollapsibleSection>

      {/* Collapsible: Inbox */}
      <CollapsibleSection id="vandaag-capture" title="Inbox" defaultOpen={true}>
        <HostSlot host="vandaag-capture" />
      </CollapsibleSection>

      {/* Collapsible: Reflectie */}
      <CollapsibleSection id="vandaag-reflection" title="Reflectie" defaultOpen={false}>
        <HostSlot host="vandaag-reflection" />
      </CollapsibleSection>

      {/* Collapsible: Context (mode-specific blocks) */}
      <CollapsibleSection id="vandaag-mode" title="Context" defaultOpen={false}>
        <HostSlot host="vandaag-mode" />
      </CollapsibleSection>

      {/* Collapsible: Weekoverzicht */}
      <CollapsibleSection id="vandaag-weekly" title="Weekoverzicht" defaultOpen={false}>
        <HostSlot host="vandaag-weekly" />
      </CollapsibleSection>
    </section>
  );
}
