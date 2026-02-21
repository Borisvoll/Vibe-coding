import { HostSlot } from '../components/HostSlot.jsx';

export function Inbox() {
  return (
    <section className="p-6 max-w-[var(--max-os-content-width)]">
      <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-4">Inbox</h2>
      <HostSlot host="inbox-screen" />
    </section>
  );
}
