// Vice Cover Maker — colour grades.
// Each grade is a canvas filter for the photo plus one or two translucent
// gradient washes drawn over it with a blend mode. All grades are computed
// locally on the canvas; no image ever leaves the machine.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    swatch: 'linear-gradient(135deg, #ff9a3d, #ff2e63 55%, #7b2ff7)',
    filter: 'saturate(1.45) contrast(1.12) sepia(0.22) hue-rotate(-12deg)',
    washes: [
      {
        // Warm sky melting into violet at the bottom.
        stops: [[0, '#ff9a3d'], [0.55, '#ff2e63'], [1, '#7b2ff7']],
        blend: 'soft-light',
        alpha: 0.55,
      },
      {
        stops: [[0, 'rgba(255,154,61,0)'], [1, 'rgba(123,47,247,0.35)']],
        blend: 'overlay',
        alpha: 0.5,
      },
    ],
  },
  neon: {
    label: 'Neon',
    swatch: 'linear-gradient(135deg, #00e5ff, #ff00a8 60%, #ffd166)',
    filter: 'saturate(1.9) contrast(1.15) hue-rotate(14deg)',
    washes: [
      {
        stops: [[0, '#00e5ff'], [0.5, '#b537f2'], [1, '#ff00a8']],
        blend: 'color',
        alpha: 0.38,
      },
      {
        stops: [[0, 'rgba(0,229,255,0)'], [1, 'rgba(255,0,168,0.4)']],
        blend: 'overlay',
        alpha: 0.55,
      },
    ],
  },
  vice: {
    label: 'Vice',
    swatch: 'linear-gradient(135deg, #00e5ff, #7b2ff7 55%, #ff2e63)',
    filter: 'saturate(1.35) contrast(1.08) brightness(1.05)',
    washes: [
      {
        stops: [[0, '#00e5ff'], [1, '#ff2e63']],
        blend: 'overlay',
        alpha: 0.42,
      },
    ],
  },
  dusk: {
    label: 'Dusk',
    swatch: 'linear-gradient(135deg, #2c1d52, #ff2e63 60%, #ffd166)',
    filter: 'saturate(0.9) contrast(1.16) brightness(0.92) sepia(0.15)',
    washes: [
      {
        stops: [[0, 'rgba(44,29,82,0.1)'], [1, 'rgba(44,29,82,0.55)']],
        blend: 'multiply',
        alpha: 0.6,
      },
      {
        stops: [[0, 'rgba(255,209,102,0)'], [1, 'rgba(255,46,99,0.3)']],
        blend: 'overlay',
        alpha: 0.5,
      },
    ],
  },
  original: {
    label: 'Original',
    swatch: 'linear-gradient(135deg, #888, #444)',
    filter: 'none',
    washes: [],
  },
};

export const GRADE_KEYS = Object.keys(GRADES);
