// Vice Cover Maker — editor wiring.
// Owns the DOM, photo loading, panel dragging/zooming, export and the
// ?shot= parameters the screenshot run uses. Renders through renderer.js.

import { createState, applyLayout, panelPhoto, EXPORT_SIZES } from './state.js';
import { GRADES, GRADE_KEYS } from './grades.js';
import { renderCover, renderCoverToCanvas, coverRects } from './renderer.js';

const $ = (id) => document.getElementById(id);
let photoSeq = 0;

export function initEditor() {
  const state = createState();
  const canvas = $('preview');
  const ctx = canvas.getContext('2d');
  let drag = null; // { panel, lastX, lastY } while a drag is live

  // ---- rendering ---------------------------------------------------------
  function render() {
    canvas.width = state.exportW;
    canvas.height = state.exportH;
    renderCover(ctx, state.exportW, state.exportH, state);
    drawSelection();
    syncPanelControls();
    $('emptyState').classList.toggle('show', state.photos.length === 0);
  }

  /** The dashed outline around the selected panel on the preview only. */
  function drawSelection() {
    if (state.photos.length === 0) return;
    const rects = coverRects(state.exportW, state.exportH, state.layout);
    const rect = rects[state.selected];
    if (!rect) return;
    ctx.save();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(3, state.exportW * 0.004);
    ctx.setLineDash([state.exportW * 0.02, state.exportW * 0.012]);
    ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
    ctx.setLineDash([]);
    ctx.restore();
  }

  function requestRender() {
    render();
  }

  // ---- photos ------------------------------------------------------------
  // One photo filling every panel reads as one poster sliced up, not four
  // copies: give each panel its own slice of the photo.
  const SLICE_OFFSETS = [
    { ox: 0, oy: 0 },
    { ox: 0.25, oy: -0.1 },
    { ox: -0.2, oy: 0.2 },
    { ox: 0.2, oy: 0.15 },
    { ox: 0, oy: -0.25 },
    { ox: -0.25, oy: 0.05 },
    { ox: 0.25, oy: 0.1 },
    { ox: 0, oy: 0.25 },
    { ox: -0.1, oy: -0.2 },
  ];

  function addPhoto(img, name) {
    const id = `photo-${++photoSeq}`;
    const photo = { id, name, img, url: img.src };
    state.photos.push(photo);
    // First photo fills every empty panel; later ones go to the selection.
    const empty = state.panels.findIndex((p) => !p.photoId);
    if (state.photos.length === 1) {
      state.panels.forEach((p, i) => {
        p.photoId = id;
        const slice = SLICE_OFFSETS[i % SLICE_OFFSETS.length];
        p.ox = slice.ox;
        p.oy = slice.oy;
        p.zoom = 1.1;
      });
    } else if (empty >= 0) {
      state.panels[empty].photoId = id;
      state.selected = empty;
    } else {
      state.panels[state.selected].photoId = id;
    }
    buildStrip();
    requestRender();
    return photo;
  }

  function loadFromFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => addPhoto(img, file.name);
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function loadSample(name) {
    const img = new Image();
    img.onload = () => addPhoto(img, `${name}.jpg`);
    img.src = `samples/${name}.jpg`;
  }

  function buildStrip() {
    const strip = $('photoStrip');
    strip.innerHTML = '';
    for (const photo of state.photos) {
      const thumb = document.createElement('img');
      thumb.className = 'thumb';
      thumb.src = photo.url;
      thumb.alt = photo.name;
      thumb.title = photo.name;
      thumb.addEventListener('click', () => {
        state.panels[state.selected].photoId = photo.id;
        state.spanCrop = { ox: 0, oy: 0, zoom: 1 };
        buildStrip();
        requestRender();
      });
      strip.appendChild(thumb);
    }
    $('photoHint').textContent =
      state.photos.length === 0
        ? 'No photos yet — add your own or load a sample.'
        : `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded. Click one to place it in the selected panel.`;
  }

  // ---- controls ----------------------------------------------------------
  function buildGradeSwatches() {
    const box = $('gradeSwatches');
    for (const key of GRADE_KEYS) {
      const grade = GRADES[key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `swatch${key === state.grade ? ' active' : ''}`;
      btn.style.background = grade.swatch;
      btn.title = grade.label;
      btn.setAttribute('aria-label', `Grade ${grade.label}`);
      const label = document.createElement('span');
      label.textContent = grade.label;
      btn.appendChild(label);
      btn.addEventListener('click', () => {
        state.grade = key;
        box.querySelectorAll('.swatch').forEach((el) => el.classList.remove('active'));
        btn.classList.add('active');
        requestRender();
      });
      box.appendChild(btn);
    }
  }

  function syncPanelControls() {
    const panel = state.panels[state.selected];
    const photo = panelPhoto(state, panel);
    $('panelNote').textContent = photo
      ? `Panel ${state.selected + 1}: ${photo.name} — drag to move, scroll to zoom.`
      : `Panel ${state.selected + 1} is empty — pick a photo from the strip.`;
    const crop = state.span ? state.spanCrop : panel;
    $('zoomSlider').value = String(crop ? crop.zoom : 1);
  }

  function bindControls() {
    $('fileInput').addEventListener('change', (event) => {
      for (const file of event.target.files) loadFromFile(file);
      event.target.value = '';
    });
    $('samplePier').addEventListener('click', () => loadSample('pier'));
    $('sampleBoulevard').addEventListener('click', () => loadSample('boulevard'));

    $('layoutSeg').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-layout]');
      if (!btn) return;
      applyLayout(state, btn.dataset.layout);
      $('layoutSeg').querySelectorAll('button').forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
      requestRender();
    });

    $('spanToggle').addEventListener('change', (event) => {
      state.span = event.target.checked;
      state.spanCrop = { ox: 0, oy: 0, zoom: 1 };
      requestRender();
    });

    $('letteringSeg').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-lettering]');
      if (!btn) return;
      state.lettering = btn.dataset.lettering;
      $('letteringSeg').querySelectorAll('button').forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
      requestRender();
    });

    $('titleInput').addEventListener('input', (event) => {
      state.title = event.target.value;
      requestRender();
    });
    $('subtitleInput').addEventListener('input', (event) => {
      state.subtitle = event.target.value;
      requestRender();
    });

    $('zoomSlider').addEventListener('input', (event) => {
      const crop = state.span ? state.spanCrop : state.panels[state.selected];
      if (crop) crop.zoom = Number(event.target.value);
      requestRender();
    });
    $('grainSlider').addEventListener('input', (event) => {
      state.grain = Number(event.target.value);
      requestRender();
    });
    $('vignetteSlider').addEventListener('input', (event) => {
      state.vignette = Number(event.target.value);
      requestRender();
    });

    $('resetCrop').addEventListener('click', () => {
      const crop = state.span ? state.spanCrop : state.panels[state.selected];
      if (crop) {
        crop.ox = 0;
        crop.oy = 0;
        crop.zoom = 1;
      }
      requestRender();
    });
    $('fillAll').addEventListener('click', () => {
      const panel = state.panels[state.selected];
      if (!panel || !panel.photoId) return;
      state.panels.forEach((p) => { p.photoId = panel.photoId; });
      requestRender();
    });

    document.querySelectorAll('[data-export]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [w, h] = btn.dataset.export.split('x').map(Number);
        exportCover(w, h);
      });
    });

    // Drag a photo to drop it in; also accept drops on the whole stage.
    const wrap = $('canvasWrap');
    wrap.addEventListener('dragover', (event) => event.preventDefault());
    wrap.addEventListener('drop', (event) => {
      event.preventDefault();
      for (const file of event.dataTransfer.files) loadFromFile(file);
    });
  }

  // ---- canvas pointer: select a panel, drag its photo, wheel to zoom -----
  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * state.exportW,
      y: ((event.clientY - rect.top) / rect.height) * state.exportH,
    };
  }

  function bindCanvas() {
    canvas.addEventListener('pointerdown', (event) => {
      const p = canvasPoint(event);
      const rects = coverRects(state.exportW, state.exportH, state.layout);
      const hit = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
      if (hit < 0) return;
      state.selected = hit;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('dragging');
      drag = { panel: hit, lastX: p.x, lastY: p.y };
      requestRender();
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const p = canvasPoint(event);
      const dx = p.x - drag.lastX;
      const dy = p.y - drag.lastY;
      drag.lastX = p.x;
      drag.lastY = p.y;
      const rects = coverRects(state.exportW, state.exportH, state.layout);
      const rect = rects[drag.panel];
      const crop = state.span ? state.spanCrop : state.panels[drag.panel];
      const photo = state.span
        ? panelPhoto(state, state.panels.find((pp) => pp.photoId))
        : panelPhoto(state, state.panels[drag.panel]);
      if (!crop || !photo || !rect) return;
      const g = Math.max(2, Math.round(Math.min(state.exportW, state.exportH) * 0.014));
      const fit = state.span
        ? { x: g, y: g, w: state.exportW - g * 2, h: state.exportH - g * 2 }
        : rect;
      const scale = Math.max(fit.w / photo.img.naturalWidth, fit.h / photo.img.naturalHeight) * crop.zoom;
      const overflowX = Math.max(0, photo.img.naturalWidth * scale - fit.w);
      const overflowY = Math.max(0, photo.img.naturalHeight * scale - fit.h);
      if (overflowX > 0) crop.ox = clamp(crop.ox + dx / overflowX, -0.5, 0.5);
      if (overflowY > 0) crop.oy = clamp(crop.oy + dy / overflowY, -0.5, 0.5);
      requestRender();
    });
    const endDrag = () => {
      drag = null;
      canvas.classList.remove('dragging');
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      const p = canvasPoint(event);
      const rects = coverRects(state.exportW, state.exportH, state.layout);
      const hit = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
      if (hit < 0) return;
      state.selected = hit;
      const crop = state.span ? state.spanCrop : state.panels[hit];
      if (!crop) return;
      crop.zoom = clamp(crop.zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08), 1, 3);
      requestRender();
    }, { passive: false });
  }

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  // ---- export ------------------------------------------------------------
  function exportCover(w, h) {
    const out = renderCoverToCanvas(w, h, state);
    out.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
  }

  /** A screenshot-sized JPEG of the cover at w x h, scaled to the
   *  screenshot limits (long side at most 1280, short side at least 480). */
  function coverShotDataUrl(w, h, quality = 0.88) {
    const full = renderCoverToCanvas(w, h, state);
    const scale = Math.min(1, 1280 / Math.max(w, h));
    const sw = Math.max(1, Math.round(w * scale));
    const sh = Math.max(1, Math.round(h * scale));
    const small = document.createElement('canvas');
    small.width = sw;
    small.height = sh;
    small.getContext('2d').drawImage(full, 0, 0, sw, sh);
    return small.toDataURL('image/jpeg', quality);
  }

  // ---- ?shot= parameters (screenshot automation) --------------------------
  function applyShotParams() {
    const params = new URLSearchParams(location.search);
    const shot = params.get('shot');
    if (!shot) return Promise.resolve();
    const photo = params.get('photo') || 'pier';
    const caption = params.get('caption');
    const layout = params.get('layout');
    const grade = params.get('grade');
    const lettering = params.get('lettering');
    if (caption) {
      state.title = caption;
      $('titleInput').value = caption;
    }
    if (layout && document.querySelector(`[data-layout="${layout}"]`)) {
      applyLayout(state, layout);
      document.querySelectorAll('#layoutSeg button').forEach((el) => el.classList.toggle('active', el.dataset.layout === layout));
    }
    if (grade && GRADES[grade]) {
      state.grade = grade;
      document.querySelectorAll('#gradeSwatches .swatch').forEach((el) => el.classList.toggle('active', el.title === GRADES[grade].label));
    }
    if (lettering && document.querySelector(`[data-lettering="${lettering}"]`)) {
      state.lettering = lettering;
      document.querySelectorAll('#letteringSeg button').forEach((el) => el.classList.toggle('active', el.dataset.lettering === lettering));
    }
    if (shot === 'cover') document.body.classList.add('shot-cover');
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        addPhoto(img, `${photo}.jpg`);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = `samples/${photo}.jpg`;
    });
  }

  // ---- boot --------------------------------------------------------------
  buildGradeSwatches();
  bindControls();
  bindCanvas();
  render();
  const ready = Promise.all([
    document.fonts ? document.fonts.load('100px Anton').catch(() => {}) : Promise.resolve(),
    applyShotParams(),
  ]).then(() => {
    render();
    return true;
  });

  // Handle for the screenshot run (and for curious users in devtools).
  window.__vice = {
    state,
    ready,
    exportSizes: EXPORT_SIZES,
    coverShotDataUrl,
    renderNow: render,
  };

  return { state, ready };
}
