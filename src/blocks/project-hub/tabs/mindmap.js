import { updateMindmap } from '../../../stores/projects.js';
import { escapeHTML } from '../../../utils.js';

const NODE_W = 120;
const NODE_H = 40;
const LEVEL_GAP_X = 180;
const SIBLING_GAP_Y = 60;

/**
 * Mindmap tab — pure SVG canvas, radial tree layout, context-menu CRUD, PNG export.
 * Nodes stored as: [{ id, parentId, label }]
 */
export function renderMindmapTab(host, project, context) {
  const { eventBus } = context;
  let nodes = project.mindmap ? JSON.parse(JSON.stringify(project.mindmap)) : [
    { id: 'root', parentId: null, label: project.title },
  ];
  let selectedId = null;
  let contextMenu = null;
  let editingId = null;

  function render() {
    const layout = computeLayout(nodes);
    const svgW = Math.max(600, ...Object.values(layout).map((n) => n.x + NODE_W + 40));
    const svgH = Math.max(400, ...Object.values(layout).map((n) => n.y + NODE_H + 40));

    host.innerHTML = `
      <div class="hub-mindmap">
        <div class="hub-mindmap__toolbar">
          <button type="button" class="btn btn-ghost btn-sm" data-mm-add-child disabled data-tooltip="Selecteer een knoop eerst">+ Kindknoop</button>
          <button type="button" class="btn btn-ghost btn-sm" data-mm-delete disabled data-tooltip="Selecteer een knoop eerst">Verwijder</button>
          <button type="button" class="btn btn-ghost btn-sm" data-mm-export>PNG exporteren</button>
        </div>
        <div class="hub-mindmap__canvas-wrap" tabindex="0">
          <svg class="hub-mindmap__svg" width="${svgW}" height="${svgH}"
            viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg"
            data-mm-svg>
            <g class="hub-mindmap__edges">
              ${renderEdges(nodes, layout)}
            </g>
            <g class="hub-mindmap__nodes">
              ${renderNodes(nodes, layout)}
            </g>
          </svg>
        </div>
        <p class="hub-mindmap__hint">Klik op een knoop om te selecteren · Rechtsklik voor opties</p>
      </div>
    `;

    bindEvents();
  }

  function computeLayout(nodes) {
    // Simple left-to-right tree layout
    const layout = {};
    const root = nodes.find((n) => n.parentId === null);
    if (!root) return layout;

    function getChildren(id) {
      return nodes.filter((n) => n.parentId === id);
    }

    function countLeaves(id) {
      const children = getChildren(id);
      if (children.length === 0) return 1;
      return children.reduce((sum, c) => sum + countLeaves(c.id), 0);
    }

    function layoutNode(id, depth, yOffset) {
      const leaves = countLeaves(id);
      const height = leaves * SIBLING_GAP_Y;
      layout[id] = {
        x: depth * LEVEL_GAP_X + 40,
        y: yOffset + height / 2 - NODE_H / 2,
      };
      const children = getChildren(id);
      let childY = yOffset;
      children.forEach((child) => {
        const childLeaves = countLeaves(child.id);
        layoutNode(child.id, depth + 1, childY);
        childY += childLeaves * SIBLING_GAP_Y;
      });
    }

    layoutNode(root.id, 0, 20);
    return layout;
  }

  function renderEdges(nodes, layout) {
    return nodes
      .filter((n) => n.parentId !== null)
      .map((n) => {
        const parent = layout[n.parentId];
        const child = layout[n.id];
        if (!parent || !child) return '';
        const x1 = parent.x + NODE_W;
        const y1 = parent.y + NODE_H / 2;
        const x2 = child.x;
        const y2 = child.y + NODE_H / 2;
        const mx = (x1 + x2) / 2;
        return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"
          fill="none" stroke="var(--color-border)" stroke-width="2"/>`;
      })
      .join('');
  }

  function renderNodes(nodes, layout) {
    return nodes.map((n) => {
      const pos = layout[n.id];
      if (!pos) return '';
      const isRoot = n.parentId === null;
      const isSelected = n.id === selectedId;
      const isEditing = n.id === editingId;
      const fill = isRoot ? 'var(--project-accent, var(--color-accent))' : isSelected ? 'var(--color-surface-raised)' : 'var(--color-surface)';
      const textColor = isRoot ? '#fff' : 'var(--color-text)';
      const stroke = isSelected ? 'var(--project-accent, var(--color-accent))' : 'var(--color-border)';
      const label = n.label.length > 14 ? n.label.slice(0, 14) + '…' : n.label;

      if (isEditing) {
        return `
          <foreignObject x="${pos.x}" y="${pos.y}" width="${NODE_W}" height="${NODE_H}">
            <div xmlns="http://www.w3.org/1999/xhtml">
              <input class="hub-mindmap__inline-edit" data-edit-id="${n.id}"
                value="${escapeHTML(n.label)}"
                style="width:${NODE_W - 8}px;height:${NODE_H - 8}px;margin:4px;"
              />
            </div>
          </foreignObject>`;
      }

      return `
        <g class="hub-mindmap__node ${isSelected ? 'hub-mindmap__node--selected' : ''}"
          data-node-id="${n.id}" style="cursor:pointer">
          <rect x="${pos.x}" y="${pos.y}" width="${NODE_W}" height="${NODE_H}"
            rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${isSelected ? 2 : 1}"/>
          <text x="${pos.x + NODE_W / 2}" y="${pos.y + NODE_H / 2 + 4}"
            text-anchor="middle" font-size="13" fill="${textColor}"
            font-family="var(--font-ui, system-ui)">${escapeHTML(label)}</text>
        </g>`;
    }).join('');
  }

  function bindEvents() {
    const toolbar = host.querySelector('.hub-mindmap__toolbar');
    const svg = host.querySelector('[data-mm-svg]');

    // Node click → select
    svg?.querySelectorAll('[data-node-id]').forEach((g) => {
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        closeContextMenu();
        selectedId = g.dataset.nodeId;
        updateToolbar();
        render();
      });

      // Right-click → context menu
      g.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectedId = g.dataset.nodeId;
        showContextMenu(e.clientX, e.clientY, g.dataset.nodeId);
      });
    });

    // Click on canvas — deselect
    svg?.addEventListener('click', () => {
      closeContextMenu();
      selectedId = null;
      updateToolbar();
      render();
    });

    // Toolbar buttons
    toolbar?.querySelector('[data-mm-add-child]')?.addEventListener('click', () => {
      if (!selectedId) return;
      addChildNode(selectedId);
    });

    toolbar?.querySelector('[data-mm-delete]')?.addEventListener('click', () => {
      if (!selectedId) return;
      deleteNode(selectedId);
    });

    toolbar?.querySelector('[data-mm-export]')?.addEventListener('click', () => {
      exportPNG();
    });

    // Inline edit (double-click) — via dblclick on rect/text
    svg?.querySelectorAll('[data-node-id]').forEach((g) => {
      g.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        editingId = g.dataset.nodeId;
        render();
        const input = host.querySelector(`[data-edit-id="${editingId}"]`);
        if (input) {
          input.focus();
          input.select();
          input.addEventListener('blur', commitEdit);
          input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') { ev.preventDefault(); commitEdit(); }
            if (ev.key === 'Escape') { editingId = null; render(); }
          });
        }
      });
    });
  }

  function updateToolbar() {
    const addBtn = host.querySelector('[data-mm-add-child]');
    const delBtn = host.querySelector('[data-mm-delete]');
    if (addBtn) addBtn.disabled = !selectedId;
    if (delBtn) delBtn.disabled = !selectedId || selectedId === 'root';
  }

  function showContextMenu(x, y, nodeId) {
    closeContextMenu();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const isRoot = node.parentId === null;

    const menu = document.createElement('div');
    menu.className = 'hub-mindmap__context-menu';
    menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:1000`;
    menu.innerHTML = `
      <button type="button" data-ctx="add-child">+ Kindknoop</button>
      <button type="button" data-ctx="rename">Hernoemen</button>
      ${!isRoot ? `<button type="button" data-ctx="delete" class="danger">Verwijder</button>` : ''}
    `;

    menu.querySelector('[data-ctx="add-child"]')?.addEventListener('click', () => {
      closeContextMenu();
      addChildNode(nodeId);
    });
    menu.querySelector('[data-ctx="rename"]')?.addEventListener('click', () => {
      closeContextMenu();
      editingId = nodeId;
      render();
      const input = host.querySelector(`[data-edit-id="${editingId}"]`);
      if (input) {
        input.focus();
        input.select();
        input.addEventListener('blur', commitEdit);
        input.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); commitEdit(); }
          if (ev.key === 'Escape') { editingId = null; render(); }
        });
      }
    });
    menu.querySelector('[data-ctx="delete"]')?.addEventListener('click', () => {
      closeContextMenu();
      deleteNode(nodeId);
    });

    document.body.appendChild(menu);
    contextMenu = menu;

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', closeContextMenu, { once: true });
    }, 10);
  }

  function closeContextMenu() {
    if (contextMenu) {
      contextMenu.remove();
      contextMenu = null;
    }
  }

  function addChildNode(parentId) {
    const newNode = {
      id: crypto.randomUUID(),
      parentId,
      label: 'Nieuw idee',
    };
    nodes.push(newNode);
    selectedId = newNode.id;
    editingId = newNode.id;
    saveAndRender();
  }

  function deleteNode(nodeId) {
    if (nodeId === 'root') return;
    // Delete node + all descendants
    function collectIds(id) {
      const children = nodes.filter((n) => n.parentId === id);
      return [id, ...children.flatMap((c) => collectIds(c.id))];
    }
    const toDelete = new Set(collectIds(nodeId));
    nodes = nodes.filter((n) => !toDelete.has(n.id));
    if (selectedId && toDelete.has(selectedId)) selectedId = null;
    saveAndRender();
  }

  function commitEdit() {
    if (!editingId) return;
    const input = host.querySelector(`[data-edit-id="${editingId}"]`);
    if (input) {
      const node = nodes.find((n) => n.id === editingId);
      if (node) node.label = input.value.trim() || node.label;
    }
    editingId = null;
    saveAndRender();
  }

  async function saveAndRender() {
    project.mindmap = nodes;
    await updateMindmap(project.id, nodes);
    eventBus.emit('projects:changed');
    render();
  }

  function exportPNG() {
    const svg = host.querySelector('[data-mm-svg]');
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svg.viewBox.baseVal.width || svg.width.baseVal.value;
      canvas.height = svg.viewBox.baseVal.height || svg.height.baseVal.value;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-bg') || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const link = document.createElement('a');
      link.download = `${project.title.replace(/[^a-z0-9]/gi, '_')}-mindmap.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  }

  render();

  return {
    unmount() {
      closeContextMenu();
      host.innerHTML = '';
    },
  };
}
