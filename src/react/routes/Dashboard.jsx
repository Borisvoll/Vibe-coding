import { useState, useEffect } from 'react';
import { useMode } from '../hooks/useMode.jsx';
import { useEvent } from '../hooks/useEventBus.jsx';
import { getTodaySnapshot, getProjectsPulse, getBPVPulse, getWeekFocus } from '../../os/dashboardData.js';

export function Dashboard() {
  const { mode, meta } = useMode();
  const [snapshot, setSnapshot] = useState(null);
  const [projects, setProjects] = useState(null);
  const [bpv, setBpv] = useState(null);
  const [week, setWeek] = useState(null);

  async function loadData() {
    const [snap, proj, bpvData, weekData] = await Promise.all([
      getTodaySnapshot(mode),
      getProjectsPulse(),
      getBPVPulse(),
      getWeekFocus(),
    ]);
    setSnapshot(snap);
    setProjects(proj);
    setBpv(bpvData);
    setWeek(weekData);
  }

  useEffect(() => { loadData(); }, [mode]);
  useEvent('tasks:changed', loadData);
  useEvent('projects:changed', loadData);

  return (
    <section className="p-6 max-w-[var(--max-os-content-width)]">
      {/* Mode hero */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text)]">
          Dashboard{' '}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
            style={{ background: meta.colorLight, color: meta.color }}
          >
            {meta.emoji} {meta.label}
          </span>
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">{meta.description}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Taken vandaag"
          value={snapshot ? `${snapshot.tasksDone}/${snapshot.tasksTotal}` : '-'}
          sub={snapshot?.tasksTotal > 0 ? `${Math.round((snapshot.tasksDone / snapshot.tasksTotal) * 100)}% klaar` : 'Geen taken'}
          accent={meta.color}
        />
        <StatCard
          label="Inbox"
          value={snapshot?.inboxCount ?? '-'}
          sub="items te verwerken"
          accent="var(--color-amber)"
        />
        <StatCard
          label="Projecten"
          value={projects?.activeCount ?? '-'}
          sub={projects?.atRiskCount > 0 ? `${projects.atRiskCount} zonder actie` : 'Alles op schema'}
          accent="var(--color-cyan)"
        />
        <StatCard
          label="BPV deze week"
          value={bpv?.formattedTotal ?? '-'}
          sub={bpv?.percentComplete != null ? `${bpv.percentComplete}% van doel` : ''}
          accent="var(--color-blue)"
        />
      </div>

      {/* Week focus */}
      {week && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 mb-6">
          <h3 className="text-base font-semibold text-[var(--color-text)] mb-3">Weekfocus</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-[var(--color-text-tertiary)]">Taken klaar</span>
              <p className="text-lg font-semibold text-[var(--color-text)]">{week.completedTaskCount}</p>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Nog open</span>
              <p className="text-lg font-semibold text-[var(--color-text)]">{week.openTaskCount}</p>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Gewoontes</span>
              <p className="text-lg font-semibold text-[var(--color-text)]">{week.habitsComplete}/{week.habitsTotal}</p>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Reflectiedagen</span>
              <p className="text-lg font-semibold text-[var(--color-text)]">{week.reflectionDays}</p>
            </div>
          </div>
          {week.prompt && (
            <p className="mt-4 text-sm italic text-[var(--color-text-secondary)] border-l-2 border-[var(--color-accent)] pl-3">
              {week.prompt}
            </p>
          )}
        </div>
      )}

      {/* Active projects */}
      {projects?.active.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="text-base font-semibold text-[var(--color-text)] mb-3">Actieve projecten</h3>
          <div className="space-y-2">
            {projects.active.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: getModeColor(p.mode) }} />
                  <span className="text-sm font-medium text-[var(--color-text)]">{p.title}</span>
                </div>
                {!p.hasNextAction && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-amber-light)] text-[var(--color-amber)]">
                    Geen actie
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-shadow hover:shadow-md"
      style={{ borderTopColor: accent, borderTopWidth: '2px' }}
    >
      <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-[var(--color-text)] mt-1">{value}</p>
      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{sub}</p>
    </div>
  );
}

function getModeColor(mode) {
  const map = {
    School: 'var(--color-purple)',
    Personal: 'var(--color-emerald)',
    BPV: 'var(--color-blue)',
  };
  return map[mode] || 'var(--color-accent)';
}
