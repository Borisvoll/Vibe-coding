import { escapeHTML } from '../../utils.js';

const DEFAULT_PHRASES = [
  'Kan ik hier later op terugkomen?',
  'Ik heb even pauze nodig.',
  'Ik denk erover na en laat het je weten.',
  'Nu even niet, maar ik waardeer het.',
  'Ik heb vandaag mijn grens bereikt.',
  'Mag ik dit morgen oppakken?',
];

export function renderBoundaries(container) {
  const wrapper = document.createElement('article');
  wrapper.className = 'boundaries os-mini-card';

  wrapper.innerHTML = `
    <h3 class="boundaries__title">Grenzen</h3>
    <p class="boundaries__hint">Tik om te kopiëren</p>
    <div class="boundaries__grid">
      ${DEFAULT_PHRASES.map(phrase => `
        <button type="button" class="boundaries__btn" data-phrase="${escapeHTML(phrase)}">
          ${escapeHTML(phrase)}
        </button>
      `).join('')}
    </div>
    <span class="boundaries__toast" hidden>Gekopieerd!</span>
  `;

  const toast = wrapper.querySelector('.boundaries__toast');

  wrapper.querySelectorAll('.boundaries__btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const phrase = btn.dataset.phrase;
      try {
        await navigator.clipboard.writeText(phrase);
      } catch {
        // Fallback: select text in a temp element
        const temp = document.createElement('textarea');
        temp.value = phrase;
        temp.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
      }

      toast.hidden = false;
      toast.classList.add('boundaries__toast--visible');
      setTimeout(() => {
        toast.classList.remove('boundaries__toast--visible');
        toast.hidden = true;
      }, 1500);
    });
  });

  container.appendChild(wrapper);

  return {
    unmount() {
      wrapper.remove();
    },
  };
}
