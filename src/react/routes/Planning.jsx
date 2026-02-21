import { HostSlot } from '../components/HostSlot.jsx';

export function Planning() {
  return (
    <section className="p-6 max-w-[var(--max-os-content-width)]">
      <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-4">Planning</h2>
      <HostSlot host="planning-main" />
    </section>
  );
}
