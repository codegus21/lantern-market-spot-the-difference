// scene.js — one procedural scene renderer for Lantern Market.
// drawScene draws a scene from its definition into a 600x420 panel.
// `mutated` is a Set of difference keys (the `apply` field from levels.js).
// The game passes an empty set for the left panel and the found+hidden
// mutation set for the right panel, so only the right picture changes.
// All art is drawn in code; there are no images and no network calls.

import { PANEL_W, PANEL_H } from './levels.js';

export { PANEL_W, PANEL_H };

// ---------- small drawing helpers ----------

function circle(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function rect(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

function line(ctx, x0, y0, x1, y1, color, width) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function text(ctx, str, x, y, size, color, align) {
  ctx.font = `bold ${size}px Georgia, 'Times New Roman', serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function star(ctx, x, y, r, color, timeSec, phase) {
  const twinkle = 0.65 + 0.35 * Math.sin(timeSec * 1.6 + phase);
  ctx.globalAlpha = twinkle;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function sky(ctx, stops) {
  const grad = ctx.createLinearGradient(0, 0, 0, PANEL_H);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);
}

// A glowing paper lantern hanging from a string.
function paperLantern(ctx, x, y, scale, body, timeSec, phase) {
  const glow = 0.75 + 0.25 * Math.sin(timeSec * 1.2 + phase);
  ctx.globalAlpha = glow * 0.25;
  circle(ctx, x, y, 26 * scale, body);
  ctx.globalAlpha = 1;
  line(ctx, x, y - 26 * scale, x, y - 14 * scale, '#3a2a1a', 2);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y, 16 * scale, 20 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60, 30, 10, 0.55)';
  ctx.lineWidth = 1.5;
  for (const dy of [-10, 0, 10]) {
    ctx.beginPath();
    ctx.ellipse(x, y + dy * scale, 15 * scale, 4 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  rect(ctx, x - 5 * scale, y - 24 * scale, 10 * scale, 5 * scale, '#8a6a2a');
  rect(ctx, x - 5 * scale, y + 19 * scale, 10 * scale, 5 * scale, '#8a6a2a');
  circle(ctx, x, y, 4 * scale, '#fff6c9');
}

// A market stall: striped awning, counter, goods shelf and a sign.
function marketStall(ctx, x, y, w, awningA, awningB, signGlyph) {
  // posts
  rect(ctx, x, y + 58, 6, 62, '#5a3a22');
  rect(ctx, x + w - 6, y + 58, 6, 62, '#5a3a22');
  // counter
  rect(ctx, x - 4, y + 58, w + 8, 12, '#7a4a28');
  rect(ctx, x - 4, y + 70, w + 8, 50, '#8a5a34');
  line(ctx, x - 4, y + 70, x + w + 4, y + 70, '#5a3a22', 2);
  // striped awning
  const stripes = 6;
  const sw = w / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? awningA : awningB;
    ctx.beginPath();
    ctx.moveTo(x + i * sw, y);
    ctx.lineTo(x + (i + 1) * sw, y);
    ctx.lineTo(x + (i + 1) * sw + 4, y + 34);
    ctx.lineTo(x + i * sw + 4, y + 34);
    ctx.closePath();
    ctx.fill();
  }
  line(ctx, x, y, x + w, y, '#3a2412', 2);
  // hanging sign
  rect(ctx, x + w / 2 - 22, y + 38, 44, 20, '#f3e2b8');
  ctx.strokeStyle = '#7a4a28';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + w / 2 - 22, y + 38, 44, 20);
  text(ctx, signGlyph, x + w / 2, y + 49, 14, '#7a2a1a');
}

function fruitCrate(ctx, x, y, fruitColor, fruitCount) {
  rect(ctx, x, y, 52, 30, '#9a6a34');
  line(ctx, x, y + 10, x + 52, y + 10, '#6a4520', 2);
  line(ctx, x, y + 20, x + 52, y + 20, '#6a4520', 2);
  const spots = [[8, -6], [22, -9], [36, -5], [15, -14], [30, -14], [44, -11]];
  for (let i = 0; i < fruitCount; i++) {
    const [dx, dy] = spots[i % spots.length];
    circle(ctx, x + dx, y + dy, 7, fruitColor);
    circle(ctx, x + dx - 2, y + dy - 2, 2, 'rgba(255,255,255,0.5)');
  }
}

function sittingCat(ctx, x, y, coat) {
  // body
  ellipse(ctx, x, y, 16, 20, coat);
  // head
  circle(ctx, x, y - 26, 13, coat);
  // ears
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(x - 11, y - 34);
  ctx.lineTo(x - 13, y - 46);
  ctx.lineTo(x - 3, y - 36);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 11, y - 34);
  ctx.lineTo(x + 13, y - 46);
  ctx.lineTo(x + 3, y - 36);
  ctx.closePath();
  ctx.fill();
  // tail curled around the base
  ctx.strokeStyle = coat;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x + 10, y + 14, 12, Math.PI * 0.9, Math.PI * 1.9);
  ctx.stroke();
  // eyes
  circle(ctx, x - 5, y - 28, 2, '#ffd94a');
  circle(ctx, x + 5, y - 28, 2, '#ffd94a');
}

function vendor(ctx, x, y, hatColor, shirtColor) {
  // body
  ctx.fillStyle = shirtColor;
  ctx.beginPath();
  ctx.moveTo(x - 16, y + 40);
  ctx.lineTo(x - 14, y - 8);
  ctx.quadraticCurveTo(x, y - 16, x + 14, y - 8);
  ctx.lineTo(x + 16, y + 40);
  ctx.closePath();
  ctx.fill();
  // apron
  ctx.fillStyle = '#f3e2b8';
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 2);
  ctx.lineTo(x + 10, y - 2);
  ctx.lineTo(x + 12, y + 40);
  ctx.lineTo(x - 12, y + 40);
  ctx.closePath();
  ctx.fill();
  // head
  circle(ctx, x, y - 22, 11, '#e8b88a');
  // wide hat
  ctx.fillStyle = hatColor;
  ctx.beginPath();
  ctx.ellipse(x, y - 30, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - 30, 9, Math.PI, 0);
  ctx.fill();
  // arm waving
  line(ctx, x + 14, y, x + 26, y - 16, shirtColor, 6);
  circle(ctx, x + 26, y - 16, 4, '#e8b88a');
}

// ---------- Scene 1: Lantern Market at Dusk ----------

const MARKET_STARS = [
  [40, 30], [80, 38], [140, 24], [200, 44], [250, 26], [330, 34],
  [380, 22], [430, 42], [470, 26], [560, 30], [30, 90], [580, 90],
  [110, 60], [420, 60],
];

function drawMarket(ctx, m, timeSec) {
  sky(ctx, [[0, '#2a1a4a'], [0.45, '#6a2a5a'], [0.7, '#c96a3a'], [1, '#e8a04a']]);
  // stars
  MARKET_STARS.forEach(([x, y], i) => {
    if (m.has('star-missing') && x === 80 && y === 38) return;
    star(ctx, x, y, 5, '#fff8d0', timeSec, i * 1.3);
  });
  // moon
  circle(ctx, 520, 55, 26, m.has('moon-hue') ? '#ff7a3a' : '#ffe9a8');
  circle(ctx, 512, 48, 5, 'rgba(200,160,60,0.5)');
  circle(ctx, 528, 62, 4, 'rgba(200,160,60,0.5)');
  // distant rooftops
  ctx.fillStyle = '#3a2040';
  ctx.beginPath();
  ctx.moveTo(0, 240); ctx.lineTo(90, 190); ctx.lineTo(180, 240); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(420, 240); ctx.lineTo(510, 185); ctx.lineTo(600, 240); ctx.closePath(); ctx.fill();
  rect(ctx, 0, 235, 600, 8, '#2a1830');
  // ground
  const ground = ctx.createLinearGradient(0, 240, 0, 420);
  ground.addColorStop(0, '#4a2c3a');
  ground.addColorStop(1, '#2c1a28');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 240, 600, 180);
  // lantern string
  ctx.strokeStyle = '#1c1018';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 36);
  ctx.quadraticCurveTo(300, 96, 580, 36);
  ctx.stroke();
  const lanternXs = [80, 180, 290, 400, 510];
  lanternXs.forEach((x, i) => {
    if (m.has('lantern-missing') && i === 2) return;
    const sag = 36 + 60 * (1 - Math.pow((x - 300) / 300, 2));
    const colors = ['#ff5a4a', '#ffb03a', '#ff7a6a', '#ff9a3a', '#e84a6a'];
    paperLantern(ctx, x, sag + 8, 1, colors[i], timeSec, i * 0.9);
  });
  // bunting flags
  const buntingColors = ['#ff5a4a', '#ffd94a', '#4ac9ff', '#7ae87a', '#ff9ad0'];
  ctx.strokeStyle = '#1c1018';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(180, 108);
  ctx.quadraticCurveTo(300, 140, 470, 104);
  ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = 180 + t * 290;
    const y = 108 + 26 * Math.sin(t * Math.PI) * 0.9 + 4;
    let color = buntingColors[i % buntingColors.length];
    if (m.has('bunting-color') && i === 4) color = '#8a5aff';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + 8, y);
    ctx.lineTo(x, y + 14);
    ctx.closePath();
    ctx.fill();
  }
  // stalls
  marketStall(ctx, 40, 168, 180, m.has('awning-color') ? '#2a8a9a' : '#c93a3a', '#f3e2b8', m.has('sign-glyph') ? '集' : '市');
  marketStall(ctx, 380, 178, 190, '#3a7a4a', '#f3e2b8', '茶');
  // goods on the counters
  for (let i = 0; i < 5; i++) circle(ctx, 60 + i * 26, 222, 7, i % 2 ? '#ff9a3a' : '#c94a6a');
  for (let i = 0; i < 4; i++) circle(ctx, 400 + i * 30, 232, 8, '#7ac94a');
  // fruit crates
  fruitCrate(ctx, 220, 330, m.has('apple-color') ? '#7ac94a' : '#e83a3a', 6);
  fruitCrate(ctx, 300, 345, '#ff9a3a', 5);
  // vendor behind the left stall
  vendor(ctx, 110, 250, m.has('vendor-hat') ? '#c93a3a' : '#d8b25a', '#4a6ac9');
  // cat on a crate
  if (!m.has('cat-missing')) {
    rect(ctx, 452, 322, 56, 26, '#9a6a34');
    sittingCat(ctx, 480, 316, '#2a2a30');
  } else {
    rect(ctx, 452, 322, 56, 26, '#9a6a34');
  }
  // puddles catching the lantern light
  ctx.globalAlpha = 0.5;
  ellipse(ctx, 300, 392, 46, 8, '#ffd94a');
  ellipse(ctx, 150, 398, 30, 6, '#ff9a6a');
  if (m.has('puddle-extra')) ellipse(ctx, 420, 392, 34, 7, '#ffd94a');
  ctx.globalAlpha = 1;
}

// ---------- Scene 2: Harbor Dawn ----------

const HARBOR_GULLS = [[180, 70], [300, 80], [430, 60]];

function gull(ctx, x, y, timeSec, phase) {
  const bob = Math.sin(timeSec * 0.8 + phase) * 3;
  ctx.strokeStyle = '#2a2a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 10, y + bob);
  ctx.quadraticCurveTo(x - 3, y - 6 + bob, x, y + bob);
  ctx.quadraticCurveTo(x + 3, y - 6 + bob, x + 10, y + bob);
  ctx.stroke();
}

function fishingBoat(ctx, x, y, sailStripe, flagColor) {
  // hull
  ctx.fillStyle = '#6a3a22';
  ctx.beginPath();
  ctx.moveTo(x - 55, y);
  ctx.lineTo(x + 55, y);
  ctx.lineTo(x + 40, y + 18);
  ctx.lineTo(x - 40, y + 18);
  ctx.closePath();
  ctx.fill();
  // mast and sail
  line(ctx, x, y, x, y - 62, '#4a2c1a', 4);
  ctx.fillStyle = '#f3e8d0';
  ctx.beginPath();
  ctx.moveTo(x + 4, y - 58);
  ctx.lineTo(x + 44, y - 6);
  ctx.lineTo(x + 4, y - 6);
  ctx.closePath();
  ctx.fill();
  line(ctx, x + 6, y - 40, x + 34, y - 14, sailStripe, 5);
  // flag
  ctx.fillStyle = flagColor;
  ctx.beginPath();
  ctx.moveTo(x, y - 62);
  ctx.lineTo(x + 18, y - 57);
  ctx.lineTo(x, y - 52);
  ctx.closePath();
  ctx.fill();
}

function drawHarbor(ctx, m, timeSec) {
  sky(ctx, [[0, '#f7c9a0'], [0.4, '#f7a06a'], [0.55, '#c96a8a'], [1, '#7a5a9a']]);
  // sun
  circle(ctx, 90, 70, 30, m.has('sun-color') ? '#fff3c9' : '#ffb03a');
  ctx.globalAlpha = 0.25;
  circle(ctx, 90, 70, 42, '#ffb03a');
  ctx.globalAlpha = 1;
  // clouds
  ctx.fillStyle = 'rgba(255, 240, 220, 0.85)';
  ellipse(ctx, 220, 55, 46, 12, 'rgba(255,240,220,0.85)');
  ellipse(ctx, 250, 48, 30, 10, 'rgba(255,240,220,0.85)');
  ellipse(ctx, 430, 40, 40, 10, 'rgba(255,240,220,0.85)');
  // gulls
  HARBOR_GULLS.forEach(([x, y], i) => {
    if (m.has('gull-missing') && x === 300) return;
    gull(ctx, x, y, timeSec, i * 2.1);
  });
  // lighthouse on the headland
  ctx.fillStyle = '#4a3a3a';
  ctx.beginPath();
  ctx.moveTo(500, 250); ctx.lineTo(545, 250); ctx.lineTo(540, 90); ctx.lineTo(505, 90); ctx.closePath();
  ctx.fill();
  rect(ctx, 500, 160, 45, 16, m.has('lighthouse-light') ? '#ff4a3a' : '#f3e8d0');
  rect(ctx, 500, 120, 45, 16, m.has('lighthouse-light') ? '#ff4a3a' : '#f3e8d0');
  rect(ctx, 502, 84, 41, 14, '#2a2a3a');
  circle(ctx, 522, 78, 9, '#ffd94a');
  // lamp beam
  ctx.globalAlpha = m.has('lighthouse-light') ? 0.3 : 0.45;
  ctx.fillStyle = m.has('lighthouse-light') ? '#ff8a6a' : '#fff3a0';
  ctx.beginPath();
  ctx.moveTo(515, 78);
  ctx.lineTo(430, 55);
  ctx.lineTo(430, 105);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // lighthouse window
  rect(ctx, 518, 152, 10, 14, m.has('lighthouse-window') ? '#2a2a3a' : '#ffe9a8');
  // sea
  const sea = ctx.createLinearGradient(0, 250, 0, 350);
  sea.addColorStop(0, '#e8a06a');
  sea.addColorStop(1, '#3a6a9a');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 250, 600, 100);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = 268 + i * 15;
    ctx.beginPath();
    ctx.moveTo(20 + i * 30, y);
    ctx.quadraticCurveTo(80 + i * 40, y - 5, 160 + i * 30, y);
    ctx.stroke();
  }
  // boats
  fishingBoat(ctx, 150, 285, m.has('sail-stripe') ? '#4ac9ff' : '#c93a3a', '#c93a3a');
  fishingBoat(ctx, 350, 305, '#3a7a4a', m.has('boat-flag') ? '#4ac9ff' : '#ffb03a');
  // buoy
  circle(ctx, 430, 300, 9, m.has('buoy-color') ? '#ffd94a' : '#e83a3a');
  rect(ctx, 426, 286, 8, 8, '#2a2a3a');
  // dock foreground
  ctx.fillStyle = '#6a4a2c';
  ctx.fillRect(0, 340, 600, 80);
  ctx.fillStyle = '#5a3a22';
  for (let x = 0; x < 600; x += 46) ctx.fillRect(x, 340, 4, 80);
  // fish crate on the dock
  rect(ctx, 220, 348, 64, 26, '#9a6a34');
  const fishColors = ['#c9d8e8', '#9ab8d8', '#7a9ac9'];
  const fishShown = m.has('fish-count') ? 2 : 3;
  for (let i = 0; i < fishShown; i++) {
    const fx = 232 + i * 20;
    ellipse(ctx, fx, 342, 9, 4, fishColors[i]);
    ctx.fillStyle = fishColors[i];
    ctx.beginPath();
    ctx.moveTo(fx + 8, 342); ctx.lineTo(fx + 14, 337); ctx.lineTo(fx + 14, 347);
    ctx.closePath(); ctx.fill();
    circle(ctx, fx - 5, 341, 1.2, '#1a1a2a');
  }
  // rope coil
  if (!m.has('rope-missing')) {
    ctx.strokeStyle = '#d8b25a';
    ctx.lineWidth = 4;
    for (const r of [16, 11, 6]) {
      ctx.beginPath();
      ctx.arc(90, 382, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // barrels
  const barrels = [[440, 372], [500, 372]];
  if (m.has('barrel-extra')) barrels.push([470, 398]);
  for (const [bx, by] of barrels) {
    ctx.fillStyle = '#7a4a28';
    ctx.beginPath();
    ctx.ellipse(bx, by, 16, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    line(ctx, bx - 15, by - 8, bx + 15, by - 8, '#3a2412', 2);
    line(ctx, bx - 15, by + 8, bx + 15, by + 8, '#3a2412', 2);
  }
  // draped net
  ctx.strokeStyle = 'rgba(230,230,200,0.8)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(320 + i * 8, 348);
    ctx.lineTo(320 + i * 8 + 6, 372);
    ctx.stroke();
  }
  line(ctx, 320, 348, 368, 348, 'rgba(230,230,200,0.8)', 1.5);
  line(ctx, 320, 360, 368, 360, 'rgba(230,230,200,0.8)', 1.5);
}

// ---------- Scene 3: Starlight Garden ----------

const GARDEN_STARS = [
  [40, 30], [110, 50], [180, 28], [250, 44], [330, 30], [410, 46],
  [480, 40], [540, 30], [70, 90], [560, 90], [300, 70], [200, 80],
];

const FIREFLIES = [
  [200, 150], [150, 210], [260, 130], [380, 170], [440, 120],
  [500, 210], [90, 260], [330, 90],
];

function stoneLantern(ctx, x, y, scale, flameColor) {
  rect(ctx, x - 16 * scale, y + 18 * scale, 32 * scale, 6 * scale, '#6a6a72');
  rect(ctx, x - 10 * scale, y + 6 * scale, 20 * scale, 12 * scale, '#8a8a92');
  rect(ctx, x - 6 * scale, y - 12 * scale, 12 * scale, 18 * scale, '#7a7a82');
  // fire chamber glow
  ctx.globalAlpha = 0.85;
  circle(ctx, x, y - 3 * scale, 4 * scale, flameColor);
  ctx.globalAlpha = 1;
  // roof
  ctx.fillStyle = '#5a5a62';
  ctx.beginPath();
  ctx.moveTo(x - 18 * scale, y - 12 * scale);
  ctx.lineTo(x, y - 26 * scale);
  ctx.lineTo(x + 18 * scale, y - 12 * scale);
  ctx.closePath();
  ctx.fill();
  circle(ctx, x, y - 28 * scale, 3 * scale, '#5a5a62');
}

function koi(ctx, x, y, angle, body, timeSec, phase) {
  const wiggle = Math.sin(timeSec * 2 + phase) * 0.12;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + wiggle);
  ellipse(ctx, 0, 0, 16, 7, body);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-14, 0); ctx.lineTo(-24, -7); ctx.lineTo(-24, 7);
  ctx.closePath(); ctx.fill();
  circle(ctx, 9, -3, 1.5, '#1a1a2a');
  ctx.restore();
}

function fox(ctx, x, y, earColor) {
  // body
  ctx.fillStyle = '#c96a2a';
  ctx.beginPath();
  ctx.ellipse(x, y, 22, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // head
  circle(ctx, x - 2, y - 22, 14, '#c96a2a');
  // ears
  ctx.fillStyle = '#c96a2a';
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 30); ctx.lineTo(x - 16, y - 44); ctx.lineTo(x - 5, y - 33);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = earColor;
  ctx.beginPath();
  ctx.moveTo(x + 10, y - 30); ctx.lineTo(x + 12, y - 44); ctx.lineTo(x + 1, y - 33);
  ctx.closePath(); ctx.fill();
  // white chest and muzzle
  ellipse(ctx, x - 4, y - 8, 9, 10, '#f3e8d8');
  circle(ctx, x - 10, y - 18, 6, '#f3e8d8');
  circle(ctx, x - 15, y - 19, 2, '#1a1a2a');
  // tail
  ctx.strokeStyle = '#c96a2a';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 8);
  ctx.quadraticCurveTo(x + 38, y + 14, x + 34, y - 6);
  ctx.stroke();
  circle(ctx, x + 34, y - 6, 6, '#f3e8d8');
}

function drawGarden(ctx, m, timeSec) {
  sky(ctx, [[0, '#0a1030'], [0.5, '#1a2a5a'], [1, '#2a3a6a']]);
  GARDEN_STARS.forEach(([x, y], i) => {
    if (m.has('garden-star-missing') && x === 480 && y === 40) return;
    star(ctx, x, y, 5, '#fff8d0', timeSec, i * 1.7);
  });
  // small moon
  circle(ctx, 540, 70, 18, '#ffe9a8');
  circle(ctx, 534, 64, 3, 'rgba(200,160,60,0.5)');
  // torii-style arch
  const beamColor = m.has('torii-color') ? '#1a1a22' : '#c93a2a';
  ctx.fillStyle = beamColor;
  ctx.beginPath();
  ctx.moveTo(190, 100);
  ctx.quadraticCurveTo(300, 84, 410, 100);
  ctx.lineTo(410, 112);
  ctx.quadraticCurveTo(300, 96, 190, 112);
  ctx.closePath();
  ctx.fill();
  rect(ctx, 210, 122, 180, 8, '#8a2a20');
  rect(ctx, 226, 110, 12, 90, beamColor);
  rect(ctx, 362, 110, 12, 90, beamColor);
  circle(ctx, 300, 126, 7, '#ffd94a');
  // garden ground
  ctx.fillStyle = '#1e3a24';
  ctx.fillRect(0, 200, 600, 220);
  ctx.fillStyle = '#244a2c';
  for (let i = 0; i < 8; i++) ellipse(ctx, 40 + i * 70, 230 + (i % 3) * 8, 40, 10, '#244a2c');
  // pond
  const pond = ctx.createLinearGradient(0, 250, 0, 360);
  pond.addColorStop(0, '#2a5a8a');
  pond.addColorStop(1, '#122a4a');
  ctx.fillStyle = pond;
  ctx.beginPath();
  ctx.ellipse(300, 305, 165, 58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7ac9e8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(300, 305, 165, 58, 0, 0, Math.PI * 2);
  ctx.stroke();
  // ripples
  ctx.strokeStyle = 'rgba(180, 220, 255, 0.5)';
  ctx.beginPath();
  ctx.ellipse(250, 295, 30, 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(350, 320, 24, 7, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (m.has('ripple-extra')) {
    ctx.beginPath();
    ctx.ellipse(260, 320, 20, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // koi
  koi(ctx, 280, 300, 0.15, '#ff7a3a', timeSec, 0);
  if (!m.has('koi-missing')) koi(ctx, 330, 312, -0.3, '#f3e8d8', timeSec, 2);
  koi(ctx, 310, 330, 2.8, '#ffb03a', timeSec, 4);
  // stone lanterns
  stoneLantern(ctx, 120, 250, 1, m.has('lantern-flame') ? '#4ac9ff' : '#ffb03a');
  stoneLantern(ctx, 480, 240, 0.9, '#ffb03a');
  if (m.has('lantern-count')) stoneLantern(ctx, 520, 360, 0.7, '#ffb03a');
  // flowers
  const flowerColor = m.has('flower-color') ? '#f3e8d8' : '#ff7aa0';
  const flowerSpots = [[160, 360], [180, 368], [200, 358], [170, 376], [195, 374]];
  for (const [fx, fy] of flowerSpots) {
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      circle(ctx, fx + Math.cos(a) * 6, fy + Math.sin(a) * 6, 4, flowerColor);
    }
    circle(ctx, fx, fy, 3, '#ffd94a');
  }
  // mushrooms
  if (!m.has('mushroom-missing')) {
    for (const [mx, my, s] of [[100, 350, 1], [118, 356, 0.7]]) {
      rect(ctx, mx - 3 * s, my, 6 * s, 10 * s, '#f3e8d8');
      ctx.fillStyle = '#e84a4a';
      ctx.beginPath();
      ctx.arc(mx, my, 11 * s, Math.PI, 0);
      ctx.fill();
      circle(ctx, mx - 4 * s, my - 5 * s, 2, '#fff');
      circle(ctx, mx + 4 * s, my - 6 * s, 1.5, '#fff');
    }
  }
  // fox
  fox(ctx, 450, 316, m.has('fox-ear') ? '#f3e8d8' : '#c96a2a');
  // fireflies
  FIREFLIES.forEach(([x, y], i) => {
    if (m.has('firefly-count') && x === 200 && y === 150) return;
    const glow = 0.4 + 0.6 * Math.abs(Math.sin(timeSec * 0.9 + i * 1.9));
    ctx.globalAlpha = glow;
    circle(ctx, x, y, 3, '#d8ff7a');
    ctx.globalAlpha = glow * 0.3;
    circle(ctx, x, y, 8, '#d8ff7a');
    ctx.globalAlpha = 1;
  });
}

// ---------- public entry point ----------

export function drawScene(ctx, level, mutated, ox, oy, timeSec) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, PANEL_W, PANEL_H);
  ctx.clip();
  ctx.translate(ox, oy);
  if (level.scene === 'market') drawMarket(ctx, mutated, timeSec);
  else if (level.scene === 'harbor') drawHarbor(ctx, mutated, timeSec);
  else drawGarden(ctx, mutated, timeSec);
  ctx.restore();
  // panel frame
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 3;
  ctx.strokeRect(ox, oy, PANEL_W, PANEL_H);
}
