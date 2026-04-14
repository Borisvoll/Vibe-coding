/**
 * Stageverslag generator block — compact card on BPV-Vandaag.
 *
 * Reads from the shared `os_report` store (same data as the full form at
 * #verslag) and exposes two actions: open the full editor, or download the
 * current state as a structured Markdown file.
 */
import { escapeHTML, debounce } from '../../utils.js';
import { getReportProgress } from '../../stores/report.js';
import { getAllHoursSorted } from '../../db.js';
import { updateHash } from '../../os/deepLinks.js';
import { showToast } from '../../toast.js';
import { BPV_END } from '../../constants.js';
import { downloadReportMarkdown } from './markdown.js';

export function renderBPVReportGenerator(container, context) {
  const { eventBus } = context || {};
  const mountId = `bpv-rg-${crypto.randomUUID()}`;

  container.insertAdjacentHTML('beforeend', `
    <article class="bpv-report-gen os-mini-card" data-mount-id="${mountId}">
      <div class="bpv-report-gen__loading">Laden...</div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  let cleanup = [];

  async function render() {
    const [progress, hoursRows] = await Promise.all([
      getReportProgress(),
      getAllHoursSorted().catch(() => []),
    ]);

    const workRows = hoursRows.filter(h => h.type === 'work');
    const totalMin = workRows.reduce((s, h) => s + (h.netMinutes || 0), 0);
    const totalHours = (totalMin / 60).toFixed(1);

    // Days until deadline
    const today = new Date();
    const deadline = new Date(BPV_END + 'T00:00:00');
    const daysLeft = Math.max(0, Math.ceil((deadline - today) / 86400000));

    const progressColor = progress.percent >= 80 ? 'var(--color-success)'
      : progress.percent >= 40 ? 'var(--color-warning)' : 'var(--color-accent)';

    el.innerHTML = `
      <div class="bpv-report-gen__header">
        <h3 class="bpv-report-gen__title">Stageverslag</h3>
        <span class="bpv-report-gen__pct" style="color:${progressColor}">${progress.percent}%</span>
      </div>

      <div class="bpv-report-gen__bar">
        <div class="bpv-report-gen__bar-fill" style="width:${progress.percent}%;background:${progressColor}"></div>
      </div>

      <div class="bpv-report-gen__stats">
        <div class="bpv-report-gen__stat">
          <span class="bpv-report-gen__stat-label">Velden</span>
          <span class="bpv-report-gen__stat-value">${progress.filled}/${progress.total}</span>
        </div>
        <div class="bpv-report-gen__stat">
          <span class="bpv-report-gen__stat-label">Uren gewerkt</span>
          <span class="bpv-report-gen__stat-value">${escapeHTML(totalHours)}u</span>
        </div>
        <div class="bpv-report-gen__stat">
          <span class="bpv-report-gen__stat-label">Deadline</span>
          <span class="bpv-report-gen__stat-value">${daysLeft}d</span>
        </div>
      </div>

      <p class="bpv-report-gen__hint">Jouw tekst blijft zoals je hem schrijft — alleen minimale opmaak. Uren komen automatisch uit BORIS.</p>

      <div class="bpv-report-gen__actions">
        <button type="button" class="btn btn-primary" data-action="download">
          Download als Markdown
        </button>
        <button type="button" class="btn btn-ghost" data-action="edit">
          Bewerk volledig verslag
        </button>
      </div>
    `;

    const editBtn = el.querySelector('[data-action="edit"]');
    const dlBtn = el.querySelector('[data-action="download"]');

    if (editBtn) {
      const handler = () => {
        updateHash('verslag');
        // Also dispatch hashchange so shell re-renders
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      };
      editBtn.addEventListener('click', handler);
      cleanup.push(() => editBtn.removeEventListener('click', handler));
    }

    if (dlBtn) {
      const handler = async () => {
        dlBtn.disabled = true;
        const originalLabel = dlBtn.textContent;
        dlBtn.textContent = 'Exporteren...';
        try {
          const { filename, bytes } = await downloadReportMarkdown();
          showToast(`Verslag geëxporteerd (${filename}, ${Math.round(bytes / 1024)} KB)`, { type: 'success' });
        } catch (err) {
          console.error('[stageverslag] download failed', err);
          showToast('Export mislukt — probeer opnieuw', { type: 'error' });
        } finally {
          dlBtn.disabled = false;
          dlBtn.textContent = originalLabel;
        }
      };
      dlBtn.addEventListener('click', handler);
      cleanup.push(() => dlBtn.removeEventListener('click', handler));
    }
  }

  function detach() {
    cleanup.forEach(fn => { try { fn(); } catch { /* ignore */ } });
    cleanup = [];
  }

  const rerender = debounce(() => {
    detach();
    render();
  }, 300);

  // Re-render when underlying data changes
  if (eventBus) {
    eventBus.on('bpv:changed', rerender);
    eventBus.on('sync:merged', rerender);
    cleanup.push(() => eventBus.off?.('bpv:changed', rerender));
    cleanup.push(() => eventBus.off?.('sync:merged', rerender));
  }

  render();

  return {
    unmount() {
      detach();
      el?.remove();
    },
  };
}
