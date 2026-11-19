// Vice Cover Maker — the cover renderer.
// Draws the whole cover on any 2D canvas: panels, grades, caption lettering,
// grain and vignette. Pure canvas, no network, no library.

import { LAYOUTS, panelPhoto } from './state.js';
import { GRADES } from './grades.js';

/** The panel rectangles, in pixels, for a cover of W x H. */
export function coverRects(W, H, layoutKey) {
  const layout = LAYOUTS[layoutKey] ?? LAYOUTS.grid4;
  const g = Math.max(2, Math.round(Math.min(W, H) * 0.014));
  const innerW = W - g * 2;
  const innerH = H - g * 2;
  return layout.slots.map(([fx, fy, fw, fh]) => {
    const x = g + fx * innerW;
    const y = g + fy * innerH;
    const touchesRight = Math.abs(fx + fw - 1) < 1e-9;
    const touchesBottom = Math.abs(fy + fh - 1) < 1e-9;
    return {
      x,
      y,
      w: fw * innerW - (touchesRight ? 0 : g),
      h: fh * innerH - (touchesBottom ? 0 : g),
    };
  });
}

/** Cover-fit draw of one photo: `fit` is the rectangle the photo covers,
 *  `clip` is the rectangle actually painted (a panel, or the same rect). */
function drawPhoto(ctx, img, fit, clip, crop, grade) {
  const scale = Math.max(fit.w / img.naturalWidth, fit.h / img.naturalHeight) * crop.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = fit.x + (fit.w - dw) / 2 + crop.ox * Math.max(0, dw - fit.w);
  const dy = fit.y + (fit.h - dh) / 2 + crop.oy * Math.max(0, dh - fit.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(clip.x, clip.y, clip.w, clip.h);
  ctx.clip();
  ctx.filter = grade.filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  for (const wash of grade.washes) {
    const grad = ctx.createLinearGradient(clip.x, clip.y, clip.x, clip.y + clip.h);
    for (const [stop, color] of wash.stops) grad.addColorStop(stop, color);
    ctx.globalCompositeOperation = wash.blend;
    ctx.globalAlpha = wash.alpha;
    ctx.fillStyle = grad;
    ctx.fillRect(clip.x, clip.y, clip.w, clip.h);
  }
  ctx.restore();
}

/** An empty panel: deep violet with a faint plus, so the layout reads even
 *  before any photo is placed. */
function drawEmptyPanel(ctx, rect) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, '#1d1238');
  grad.addColorStop(1, '#120a26');
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = 'rgba(169,159,208,0.35)';
  ctx.lineWidth = Math.max(1, rect.w * 0.004);
  ctx.setLineDash([rect.w * 0.02, rect.w * 0.015]);
  ctx.strokeRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6);
  ctx.setLineDash([]);
  const size = Math.min(rect.w, rect.h) * 0.28;
  ctx.fillStyle = 'rgba(169,159,208,0.5)';
  ctx.font = `${size}px Anton, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/** The caption: a dark scrim, then the title in the chosen lettering style
 *  and the subtitle letterspaced beneath it. */
function drawCaption(ctx, W, H, state) {
  const title = (state.title || '').trim();
  const subtitle = (state.subtitle || '').trim();
  if (!title && !subtitle) return;

  const scrim = ctx.createLinearGradient(0, H * 0.6, 0, H);
  scrim.addColorStop(0, 'rgba(6,2,18,0)');
  scrim.addColorStop(0.55, 'rgba(6,2,18,0.55)');
  scrim.addColorStop(1, 'rgba(6,2,18,0.92)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.6, W, H * 0.4);

  const cx = W / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (title) {
    const upper = title.toUpperCase();
    let size = H * 0.105;
    const minSize = H * 0.045;
    ctx.font = `${size}px Anton, system-ui, sans-serif`;
    while (size > minSize && ctx.measureText(upper).width > W * 0.92) {
      size *= 0.94;
      ctx.font = `${size}px Anton, system-ui, sans-serif`;
    }
    const baseline = H * 0.925;
    const style = state.lettering;
    ctx.save();
    if (style === 'pop') {
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = size * 0.045;
      ctx.lineWidth = size * 0.1;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#14041f';
      ctx.strokeText(upper, cx, baseline);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(upper, cx, baseline);
    } else if (style === 'outline') {
      ctx.lineWidth = size * 0.045;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(upper, cx, baseline);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillText(upper, cx, baseline);
    } else if (style === 'neon') {
      ctx.shadowColor = '#ff2e63';
      ctx.shadowBlur = size * 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(upper, cx, baseline);
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = size * 0.16;
      ctx.fillText(upper, cx, baseline);
      ctx.shadowBlur = 0;
      ctx.lineWidth = size * 0.02;
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.strokeText(upper, cx, baseline);
    } else {
      // chrome: a sunset-metal gradient fill with a dark edge.
      const metal = ctx.createLinearGradient(0, baseline - size, 0, baseline);
      metal.addColorStop(0, '#ffffff');
      metal.addColorStop(0.45, '#ffd166');
      metal.addColorStop(0.7, '#ff2e63');
      metal.addColorStop(1, '#ffffff');
      ctx.lineWidth = size * 0.05;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#14041f';
      ctx.strokeText(upper, cx, baseline);
      ctx.fillStyle = metal;
      ctx.fillText(upper, cx, baseline);
    }
    ctx.restore();
  }

  if (subtitle) {
    const size = H * 0.026;
    ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    try {
      ctx.letterSpacing = `${size * 0.42}px`;
    } catch {
      // Older engines ignore letterSpacing; the subtitle still draws.
    }
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = size * 0.25;
    ctx.fillText(subtitle.toUpperCase(), cx, H * 0.972);
    ctx.shadowBlur = 0;
    try {
      ctx.letterSpacing = '0px';
    } catch {
      // ignore
    }
  }
}

let noiseCanvas = null;
/** A small tile of random grey noise, reused as the grain pattern. */
function grainTile() {
  if (noiseCanvas) return noiseCanvas;
  const tile = document.createElement('canvas');
  tile.width = 192;
  tile.height = 192;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(192, 192);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = Math.floor(Math.random() * 200);
  }
  tctx.putImageData(data, 0, 0);
  noiseCanvas = tile;
  return tile;
}

/** Render the whole cover onto `ctx` at exactly W x H. */
export function renderCover(ctx, W, H, state) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0616';
  ctx.fillRect(0, 0, W, H);

  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const rects = coverRects(W, H, state.layout);
  const gutter = Math.max(2, Math.round(Math.min(W, H) * 0.014));
  const whole = { x: gutter, y: gutter, w: W - gutter * 2, h: H - gutter * 2 };

  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    if (state.span) {
      const first = state.panels.find((p) => p.photoId);
      const photo = first ? panelPhoto(state, first) : null;
      if (photo) {
        drawPhoto(ctx, photo.img, whole, rect, state.spanCrop, grade);
        return;
      }
    } else {
      const photo = panelPhoto(state, panel);
      if (photo) {
        drawPhoto(ctx, photo.img, rect, rect, panel, grade);
        return;
      }
    }
    drawEmptyPanel(ctx, rect);
  });

  drawCaption(ctx, W, H, state);

  if (state.grain > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = state.grain * 0.16;
    ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  if (state.vignette > 0) {
    const r = Math.max(W, H) * 0.72;
    const vg = ctx.createRadialGradient(W / 2, H / 2, r * 0.45, W / 2, H / 2, r);
    vg.addColorStop(0, 'rgba(4,1,12,0)');
    vg.addColorStop(1, `rgba(4,1,12,${0.55 * state.vignette})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}

/** Render the cover onto a fresh canvas at W x H and return it. */
export function renderCoverToCanvas(W, H, state) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  renderCover(canvas.getContext('2d'), W, H, state);
  return canvas;
}
