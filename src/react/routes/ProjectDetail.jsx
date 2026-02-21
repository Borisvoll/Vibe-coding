import { useParams, useNavigate } from 'react-router-dom';

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <section className="p-6 max-w-[var(--max-os-content-width)]">
      <button
        type="button"
        className="text-sm text-[var(--color-accent)] hover:underline mb-4"
        onClick={() => navigate('/projects')}
      >
        &larr; Projecten
      </button>
      <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-4">Project Detail</h2>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-text-secondary)]">
        <p className="text-sm">Project {id} — wordt gemigreerd naar React</p>
      </div>
    </section>
  );
}
