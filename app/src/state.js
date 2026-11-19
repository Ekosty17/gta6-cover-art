// Vice Cover Maker — state and panel layouts.
// A layout is a list of panel slots, each [x, y, w, h] as fractions of the cover.
// A panel holds one photo plus its own crop: ox/oy shift the photo inside the
// panel (0 = centred, range about -0.5..0.5) and zoom magnifies it (>= 1).

export const LAYOUTS = {
  grid4: {
    label: 'Four panel',
    slots: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  },
  hero3: {
    label: 'Hero + three',
    slots: [
      [0, 0, 0.62, 1],
      [0.62, 0, 0.38, 1 / 3],
      [0.62, 1 / 3, 0.38, 1 / 3],
      [0.62, 2 / 3, 0.38, 1 / 3],
    ],
  },
  fullbleed: {
    label: 'Full bleed',
    slots: [[0, 0, 1, 1]],
  },
  grid9: {
    label: 'Nine panel',
    slots: [
      [0, 0, 1 / 3, 1 / 3],
      [1 / 3, 0, 1 / 3, 1 / 3],
      [2 / 3, 0, 1 / 3, 1 / 3],
      [0, 1 / 3, 1 / 3, 1 / 3],
      [1 / 3, 1 / 3, 1 / 3, 1 / 3],
      [2 / 3, 1 / 3, 1 / 3, 1 / 3],
      [0, 2 / 3, 1 / 3, 1 / 3],
      [1 / 3, 2 / 3, 1 / 3, 1 / 3],
      [2 / 3, 2 / 3, 1 / 3, 1 / 3],
    ],
  },
};

export const EXPORT_SIZES = [
  { label: '1080 × 1080', w: 1080, h: 1080 },
  { label: '1080 × 1350', w: 1080, h: 1350 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
];

/** A fresh panel crop: photo centred, no zoom. */
export function freshCrop() {
  return { photoId: null, ox: 0, oy: 0, zoom: 1 };
}

/** A fresh editor state. */
export function createState() {
  return {
    layout: 'grid4',
    grade: 'sunset',
    lettering: 'pop',
    title: 'SUNSET HEIST',
    subtitle: 'VICE CITY · 2026',
    exportW: 1080,
    exportH: 1080,
    grain: 0.5,
    vignette: 0.6,
    span: false,
    spanCrop: { ox: 0, oy: 0, zoom: 1 },
    photos: [], // { id, name, img, url }
    panels: LAYOUTS.grid4.slots.map(() => freshCrop()),
    selected: 0,
  };
}

/** Rebuild the panel list for a new layout, keeping each slot's photo where it fits. */
export function applyLayout(state, layoutKey) {
  const next = LAYOUTS[layoutKey];
  if (!next) return;
  const old = state.panels;
  state.layout = layoutKey;
  state.panels = next.slots.map((_, i) => {
    const kept = old[i] ?? old[0] ?? freshCrop();
    return { photoId: kept.photoId, ox: kept.ox, oy: kept.oy, zoom: kept.zoom };
  });
  if (state.selected >= state.panels.length) state.selected = 0;
}

/** The photo object for a panel, or null when the panel is empty. */
export function panelPhoto(state, panel) {
  if (!panel || !panel.photoId) return null;
  return state.photos.find((p) => p.id === panel.photoId) ?? null;
}
