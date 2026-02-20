import { updateMindmap } from '../../../stores/projects.js';
import { escapeHTML } from '../../../utils.js';

const NODE_W = 140;
const NODE_H = 44;
const LEVEL_GAP_X = 200;
const SIBLING_GAP_Y = 64;
const EDGE_CURVE = 0.55;

/**
 * Mindmap tab — HTML5 Canvas with smooth pan/zoom via touch & mouse.
 * Nodes stored as: [{ id, parentId, label }]
 */
export function renderMindmapTab(host, project, context) {
  const { eventBus } = context;
  let nodes = project.mindmap ? JSON.parse(JSON.stringify(project.mindmap)) : [
    { id: 'root', parentId: null, label: project.title },
  ];
  let selectedId = null;
  let editingId = null;
  let contextMenu = null;

  // Camera state (pan/zoom)
  let camera = { x: 0, y: 0, scale: 1 };
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let cameraStart = { x: 0, y: 0 };

  // Touch state
  let lastPinchDist = 0;

  /** @type {HTMLCanvasElement} */
  let canvas = null;
  let ctx = null;
  let layout = {};
  let animFrame = null;
  let dpr = 1;

  function init() {
    host.innerHTML = `
      <div class="hub-mindmap">
        <div class="hub-mindmap__toolbar">
          <button type="button" class="btn btn-ghost btn-sm" data-mm-add-child disabled>+ Kindknoop</button>
          <button type="button" class="btn btn-ghost btn-sm" data-mm-delete disabled>Verwijder</button>
          <button type="button" class="btn btn-ghost btn-sm" data-mm-export>PNG exporteren</button>
          <button type="button" class="btn btn-ghost btn-sm" data-mm-fit>Inpassen</button>
        </div>
        <div class="hub-mindmap__canvas-wrap" tabindex="0">
          <canvas class="hub-mindmap__canvas" data-mm-canvas></canvas>
        </div>
        <div class="hub-mindmap__edit-overlay" data-edit-overlay hidden>
          <input class="hub-mindmap__inline-edit" data-edit-input autocomplete="off" />
        </div>
        <p class="hub-mindmap__hint">Klik op een knoop \u00b7 Dubbelklik om te bewerken \u00b7 Scroll om te zoomen \u00b7 Sleep om te pannen</p>
      </div>
    `;

    canvas = host.querySelector('[data-mm-canvas]');
    ctx = canvas.getContext('2d');
    dpr = window.devicePixelRatio || 1;

    resizeCanvas();
    computeLayout();
    fitToView();
    scheduleRender();
    bindEvents();
  }

  function resizeCanvas() {
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth;
    const h = Math.min(480, Math.max(320, wrap.clientHeight || 420));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function computeLayout() {
    layout = {};
    const root = nodes.find((n) => n.parentId === null);
    if (!root) return;

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
  }

  function fitToView() {
    if (Object.keys(layout).length === 0) return;
    const xs = Object.values(layout).map((n) => n.x);
    const ys = Object.values(layout).map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + NODE_W;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + NODE_H;
    const contentW = maxX - minX + 80;
    const contentH = maxY - minY + 80;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    const scaleX = cw / contentW;
    const scaleY = ch / contentH;
    camera.scale = Math.min(scaleX, scaleY, 1.5);
    camera.x = (cw - contentW * camera.scale) / 2 - minX * camera.scale + 40;
    camera.y = (ch - contentH * camera.scale) / 2 - minY * camera.scale + 40;
  }

  function scheduleRender() {
    if (animFrame) return;
    animFrame = requestAnimationFrame(() => {
      animFrame = null;
      draw();
    });
  }

  // ── Canvas drawing ─────────────────────────────────────────
  function draw() {
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    ctx.clearRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    drawEdges();
    drawNodes();

    ctx.restore();
  }

  function drawEdges() {
    ctx.lineWidth = 2;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.getAttribute('data-theme') !== 'light');
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';

    nodes.forEach((n) => {
      if (n.parentId === null) return;
      const parent = layout[n.parentId];
      const child = layout[n.id];
      if (!parent || !child) return;
      const x1 = parent.x + NODE_W;
      const y1 = parent.y + NODE_H / 2;
      const x2 = child.x;
      const y2 = child.y + NODE_H / 2;
      const mx = x1 + (x2 - x1) * EDGE_CURVE;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
      ctx.stroke();
    });
  }

  function drawNodes() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.getAttribute('data-theme') !== 'light');

    nodes.forEach((n) => {
      const pos = layout[n.id];
      if (!pos) return;

      const isRoot = n.parentId === null;
      const isSelected = n.id === selectedId;

      // Background
      ctx.beginPath();
      roundRect(ctx, pos.x, pos.y, NODE_W, NODE_H, 10);
      if (isRoot) {
        const accent = getAccentHex();
        ctx.fillStyle = accent;
      } else if (isSelected) {
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
      } else {
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.04)' : '#fff';
      }
      ctx.fill();

      // Border
      ctx.lineWidth = isSelected ? 2.5 : 1;
      if (isSelected) {
        ctx.strokeStyle = getAccentHex();
      } else {
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
      }
      ctx.stroke();

      // Label
      const label = n.label.length > 16 ? n.label.slice(0, 16) + '\u2026' : n.label;
      ctx.font = `${isRoot ? '600' : '500'} 13px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isRoot ? '#fff' : (isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)');
      ctx.fillText(label, pos.x + NODE_W / 2, pos.y + NODE_H / 2);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function getAccentHex() {
    const accent = project.accentColor;
    if (accent && accent.startsWith('#')) return accent;
    if (accent && accent.startsWith('rgb')) return accent;
    // Fallback
    return getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#3b82f6';
  }

  // ── Hit testing ────────────────────────────────────────────
  function hitTest(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left - camera.x) / camera.scale;
    const py = (clientY - rect.top - camera.y) / camera.scale;

    for (const n of nodes) {
      const pos = layout[n.id];
      if (!pos) continue;
      if (px >= pos.x && px <= pos.x + NODE_W && py >= pos.y && py <= pos.y + NODE_H) {
        return n.id;
      }
    }
    return null;
  }

  // ── Events ─────────────────────────────────────────────────
  function bindEvents() {
    const toolbar = host.querySelector('.hub-mindmap__toolbar');
    const wrap = canvas.parentElement;

    // Mouse: click to select, double-click to edit
    canvas.addEventListener('click', (e) => {
      closeContextMenu();
      const hit = hitTest(e.clientX, e.clientY);
      selectedId = hit;
      updateToolbar();
      scheduleRender();
    });

    canvas.addEventListener('dblclick', (e) => {
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) startEdit(hit, e.clientX, e.clientY);
    });

    // Right-click context menu
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) {
        selectedId = hit;
        updateToolbar();
        scheduleRender();
        showContextMenu(e.clientX, e.clientY, hit);
      }
    });

    // Pan: mouse drag
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) return; // don't pan if clicking a node
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
      cameraStart = { x: camera.x, y: camera.y };
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Zoom: scroll wheel
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      zoomAt(mx, my, delta);
    }, { passive: false });

    // Touch: pinch zoom + pan
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    // Toolbar
    toolbar?.querySelector('[data-mm-add-child]')?.addEventListener('click', () => {
      if (selectedId) addChildNode(selectedId);
    });
    toolbar?.querySelector('[data-mm-delete]')?.addEventListener('click', () => {
      if (selectedId) deleteNode(selectedId);
    });
    toolbar?.querySelector('[data-mm-export]')?.addEventListener('click', exportPNG);
    toolbar?.querySelector('[data-mm-fit]')?.addEventListener('click', () => {
      fitToView();
      scheduleRender();
    });

    // Keyboard: Delete, Enter to rename
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' && selectedId && selectedId !== 'root') {
        deleteNode(selectedId);
      }
      if (e.key === 'Enter' && selectedId) {
        const pos = layout[selectedId];
        if (pos) {
          const rect = canvas.getBoundingClientRect();
          startEdit(selectedId, rect.left + camera.x + pos.x * camera.scale + NODE_W * camera.scale / 2, rect.top + camera.y + pos.y * camera.scale);
        }
      }
    });

    // Edit overlay
    const editInput = host.querySelector('[data-edit-input]');
    editInput.addEventListener('blur', commitEdit);
    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
      if (e.key === 'Escape') { editingId = null; host.querySelector('[data-edit-overlay]').hidden = true; }
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      resizeCanvas();
      scheduleRender();
    });
    ro.observe(wrap);
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    camera.x = cameraStart.x + (e.clientX - dragStart.x);
    camera.y = cameraStart.y + (e.clientY - dragStart.y);
    scheduleRender();
  }

  function handleMouseUp() {
    isDragging = false;
    if (canvas) canvas.style.cursor = '';
  }

  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const hit = hitTest(t.clientX, t.clientY);
      if (!hit) {
        isDragging = true;
        dragStart = { x: t.clientX, y: t.clientY };
        cameraStart = { x: camera.x, y: camera.y };
      }
    } else if (e.touches.length === 2) {
      isDragging = false;
      lastPinchDist = pinchDist(e.touches);
    }
  }

  function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const t = e.touches[0];
      camera.x = cameraStart.x + (t.clientX - dragStart.x);
      camera.y = cameraStart.y + (t.clientY - dragStart.y);
      scheduleRender();
    } else if (e.touches.length === 2) {
      const dist = pinchDist(e.touches);
      if (lastPinchDist > 0) {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        zoomAt(mx, my, dist / lastPinchDist);
      }
      lastPinchDist = dist;
    }
  }

  function handleTouchEnd() {
    isDragging = false;
    lastPinchDist = 0;
  }

  function pinchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function zoomAt(mx, my, factor) {
    const newScale = Math.max(0.2, Math.min(3, camera.scale * factor));
    const ratio = newScale / camera.scale;
    camera.x = mx - ratio * (mx - camera.x);
    camera.y = my - ratio * (my - camera.y);
    camera.scale = newScale;
    scheduleRender();
  }

  function updateToolbar() {
    const addBtn = host.querySelector('[data-mm-add-child]');
    const delBtn = host.querySelector('[data-mm-delete]');
    if (addBtn) addBtn.disabled = !selectedId;
    if (delBtn) delBtn.disabled = !selectedId || selectedId === 'root';
  }

  // ── Inline editing ─────────────────────────────────────────
  function startEdit(nodeId, screenX, screenY) {
    editingId = nodeId;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const overlay = host.querySelector('[data-edit-overlay]');
    const input = host.querySelector('[data-edit-input]');
    overlay.hidden = false;

    // Position the input near the node
    const wrapRect = host.querySelector('.hub-mindmap__canvas-wrap').getBoundingClientRect();
    const pos = layout[nodeId];
    const left = camera.x + pos.x * camera.scale;
    const top = camera.y + pos.y * camera.scale;
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${NODE_W * camera.scale}px`;

    input.value = node.label;
    input.focus();
    input.select();
  }

  function commitEdit() {
    if (!editingId) return;
    const input = host.querySelector('[data-edit-input]');
    const node = nodes.find((n) => n.id === editingId);
    if (node && input) {
      const trimmed = input.value.trim();
      if (trimmed) node.label = trimmed;
    }
    editingId = null;
    host.querySelector('[data-edit-overlay]').hidden = true;
    saveAndRender();
  }

  // ── CRUD ───────────────────────────────────────────────────
  function addChildNode(parentId) {
    const newNode = {
      id: crypto.randomUUID(),
      parentId,
      label: 'Nieuw idee',
    };
    nodes.push(newNode);
    selectedId = newNode.id;
    computeLayout();
    scheduleRender();

    // Auto-edit the new node
    requestAnimationFrame(() => {
      const pos = layout[newNode.id];
      if (pos) {
        const rect = canvas.getBoundingClientRect();
        startEdit(newNode.id, rect.left + camera.x + pos.x * camera.scale, rect.top + camera.y + pos.y * camera.scale);
      }
    });
    saveNodes();
  }

  function deleteNode(nodeId) {
    if (nodeId === 'root') return;
    function collectIds(id) {
      const children = nodes.filter((n) => n.parentId === id);
      return [id, ...children.flatMap((c) => collectIds(c.id))];
    }
    const toDelete = new Set(collectIds(nodeId));
    nodes = nodes.filter((n) => !toDelete.has(n.id));
    if (selectedId && toDelete.has(selectedId)) selectedId = null;
    saveAndRender();
  }

  async function saveNodes() {
    project.mindmap = nodes;
    await updateMindmap(project.id, nodes);
    eventBus.emit('projects:changed');
  }

  function saveAndRender() {
    computeLayout();
    scheduleRender();
    updateToolbar();
    saveNodes();
  }

  // ── Context menu ───────────────────────────────────────────
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
      const pos = layout[nodeId];
      if (pos) {
        const rect = canvas.getBoundingClientRect();
        startEdit(nodeId, rect.left + camera.x + pos.x * camera.scale, rect.top + camera.y + pos.y * camera.scale);
      }
    });
    menu.querySelector('[data-ctx="delete"]')?.addEventListener('click', () => {
      closeContextMenu();
      deleteNode(nodeId);
    });

    document.body.appendChild(menu);
    contextMenu = menu;
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

  // ── PNG export ─────────────────────────────────────────────
  function exportPNG() {
    const exportCanvas = document.createElement('canvas');
    const xs = Object.values(layout).map((n) => n.x);
    const ys = Object.values(layout).map((n) => n.y);
    const minX = Math.min(...xs) - 40;
    const minY = Math.min(...ys) - 40;
    const maxX = Math.max(...xs) + NODE_W + 40;
    const maxY = Math.max(...ys) + NODE_H + 40;
    const w = maxX - minX;
    const h = maxY - minY;

    exportCanvas.width = w * 2;
    exportCanvas.height = h * 2;
    const ectx = exportCanvas.getContext('2d');
    ectx.scale(2, 2);

    // Background
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || '#ffffff';
    ectx.fillStyle = bgColor;
    ectx.fillRect(0, 0, w, h);

    // Temporarily shift camera for export
    const savedCam = { ...camera };
    camera = { x: -minX, y: -minY, scale: 1 };
    const savedCtx = ctx;
    ctx = ectx;
    drawEdges();
    drawNodes();
    ctx = savedCtx;
    camera = savedCam;

    const link = document.createElement('a');
    link.download = `${project.title.replace(/[^a-z0-9]/gi, '_')}-mindmap.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }

  init();

  return {
    unmount() {
      if (animFrame) cancelAnimationFrame(animFrame);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      closeContextMenu();
      host.innerHTML = '';
    },
  };
}
