// levels.js — the three level definitions for Lantern Market.
// Each level names its scene, its time limit, and its ten differences.
// Difference coordinates are in panel space (0..600 x 0..420).
// `apply` is the mutation key scene.js looks for when drawing the right panel.

export const PANEL_W = 600;
export const PANEL_H = 420;

export const LEVELS = [
  {
    id: 'market',
    scene: 'market',
    name: 'Lantern Market at Dusk',
    subtitle: 'A night market under paper lanterns',
    timeLimit: 150,
    difficulty: 'Easy',
    differences: [
      { x: 520, y: 55, r: 30, label: 'Moon colour', apply: 'moon-hue' },
      { x: 290, y: 70, r: 22, label: 'Missing lantern', apply: 'lantern-missing' },
      { x: 80, y: 38, r: 12, label: 'Missing star', apply: 'star-missing' },
      { x: 130, y: 215, r: 30, label: 'Awning stripes', apply: 'awning-color' },
      { x: 480, y: 300, r: 26, label: 'Missing cat', apply: 'cat-missing' },
      { x: 245, y: 335, r: 24, label: 'Apple colour', apply: 'apple-color' },
      { x: 350, y: 125, r: 14, label: 'Bunting flag', apply: 'bunting-color' },
      { x: 110, y: 255, r: 20, label: 'Vendor hat', apply: 'vendor-hat' },
      { x: 420, y: 392, r: 22, label: 'Extra puddle', apply: 'puddle-extra' },
      { x: 130, y: 185, r: 18, label: 'Stall sign', apply: 'sign-glyph' },
    ],
  },
  {
    id: 'harbor',
    scene: 'harbor',
    name: 'Harbor Dawn',
    subtitle: 'Fishing boats at first light',
    timeLimit: 150,
    difficulty: 'Medium',
    differences: [
      { x: 90, y: 70, r: 32, label: 'Sun colour', apply: 'sun-color' },
      { x: 300, y: 80, r: 14, label: 'Missing gull', apply: 'gull-missing' },
      { x: 520, y: 100, r: 24, label: 'Lighthouse lamp', apply: 'lighthouse-light' },
      { x: 160, y: 240, r: 26, label: 'Sail stripe', apply: 'sail-stripe' },
      { x: 470, y: 370, r: 20, label: 'Extra barrel', apply: 'barrel-extra' },
      { x: 250, y: 360, r: 22, label: 'Missing fish', apply: 'fish-count' },
      { x: 90, y: 380, r: 20, label: 'Missing rope', apply: 'rope-missing' },
      { x: 360, y: 230, r: 16, label: 'Boat flag', apply: 'boat-flag' },
      { x: 430, y: 300, r: 16, label: 'Buoy colour', apply: 'buoy-color' },
      { x: 520, y: 160, r: 14, label: 'Lighthouse window', apply: 'lighthouse-window' },
    ],
  },
  {
    id: 'garden',
    scene: 'garden',
    name: 'Starlight Garden',
    subtitle: 'Koi, fireflies and a fox at night',
    timeLimit: 120,
    difficulty: 'Hard',
    differences: [
      { x: 330, y: 305, r: 20, label: 'Missing koi', apply: 'koi-missing' },
      { x: 200, y: 150, r: 10, label: 'Missing firefly', apply: 'firefly-count' },
      { x: 450, y: 300, r: 18, label: 'Fox ear', apply: 'fox-ear' },
      { x: 120, y: 250, r: 16, label: 'Lantern flame', apply: 'lantern-flame' },
      { x: 180, y: 360, r: 20, label: 'Flower colour', apply: 'flower-color' },
      { x: 100, y: 350, r: 18, label: 'Missing mushroom', apply: 'mushroom-missing' },
      { x: 300, y: 105, r: 30, label: 'Torii beam', apply: 'torii-color' },
      { x: 480, y: 40, r: 12, label: 'Missing star', apply: 'garden-star-missing' },
      { x: 260, y: 320, r: 18, label: 'Extra ripple', apply: 'ripple-extra' },
      { x: 520, y: 360, r: 18, label: 'Extra stone lantern', apply: 'lantern-count' },
    ],
  },
];

export function levelById(id) {
  return LEVELS.find((level) => level.id === id) || LEVELS[0];
}
