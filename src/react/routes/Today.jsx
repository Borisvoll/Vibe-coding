import { useMode } from '../hooks/useMode.jsx';

export function Today() {
  const { meta } = useMode();

  return (
    <section className="p-6 max-w-[var(--max-os-content-width)]">
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
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-text-secondary)]">
        <p className="text-sm">Vandaag pagina — wordt gemigreerd naar React</p>
      </div>
    </section>
  );
}
