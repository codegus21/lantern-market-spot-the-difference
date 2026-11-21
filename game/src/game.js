// game.js — the state machine for Lantern Market.
// States: menu / playing / levelComplete / timeUp / victory.
// Owns the timer, score, combo, hints, found markers, wrong-click
// penalty and every overlay. The scenes themselves live in scene.js.

import { LEVELS } from './levels.js';
import { drawScene, PANEL_W, PANEL_H } from './scene.js';
import { SoundEngine } from './audio.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const PANEL_LEFT = { x: 20, y: 76 };
export const PANEL_RIGHT = { x: 660, y: 76 };
const HUD_H = 64;
const HINT_BUTTON = { x: 1075, y: 12, w: 80, h: 40 };
const MUTE_BUTTON = { x: 1165, y: 12, w: 95, h: 40 };

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = new SoundEngine();
    this.state = 'menu';
    this.levelIndex = 0;
    this.score = 0;
    this.totalScore = 0;
    this.found = new Set();
    this.timeLeft = 0;
    this.combo = 0;
    this.lastFindAt = -100;
    this.hintsLeft = 3;
    this.hintCooldownUntil = 0;
    this.hintPulse = null; // { index, until }
    this.wrongFlashes = []; // { x, y, until }
    this.shakeUntil = 0;
    this.now = 0;
    this.timeSec = 0;
    this.frozen = false; // screenshot poses freeze the timer and clock
    this.message = 'Find 10 differences between the two pictures.';
    this.messageUntil = 0;
    this.crosshair = { x: 300, y: 210 };
    this.showCrosshair = false;
    this.levelResults = []; // { name, score, stars, timeLeft }
    this.levelScore = 0;
    this.stars = 0;
    this.muted = false;
    this.bestCombo = 0;
  }

  get level() {
    return LEVELS[this.levelIndex];
  }

  // ---------- level flow ----------

  startLevel(index) {
    this.levelIndex = index;
    this.found = new Set();
    this.timeLeft = this.level.timeLimit;
    this.combo = 0;
    this.bestCombo = 0;
    this.hintsLeft = 3;
    this.hintCooldownUntil = 0;
    this.hintPulse = null;
    this.wrongFlashes = [];
    this.levelScore = 0;
    this.state = 'playing';
    this.message = `Level ${index + 1}: ${this.level.name} — find 10 differences!`;
    this.messageUntil = this.now + 4;
    this.crosshair = { x: 300, y: 210 };
    this.showCrosshair = false;
  }

  backToMenu() {
    this.state = 'menu';
    this.found = new Set();
    this.hintPulse = null;
    this.wrongFlashes = [];
  }

  retryLevel() {
    this.startLevel(this.levelIndex);
  }

  nextLevel() {
    if (this.levelIndex + 1 < LEVELS.length) this.startLevel(this.levelIndex + 1);
    else this.showVictory();
  }

  showVictory() {
    this.state = 'victory';
    this.sound.playVictory();
  }

  // ---------- scoring ----------

  awardFind(index) {
    const diff = this.level.differences[index];
    this.found.add(index);
    this.combo = this.now - this.lastFindAt <= 6 ? this.combo + 1 : 1;
    this.lastFindAt = this.now;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const points = 100 + 15 * (this.combo - 1);
    this.score += points;
    this.levelScore += points;
    this.message = `Found: ${diff.label}! +${points} points`;
    if (this.combo > 1) this.message += ` (combo x${this.combo})`;
    this.messageUntil = this.now + 2.5;
    this.sound.playFound(this.combo);
    if (this.found.size === this.level.differences.length) this.completeLevel();
  }

  completeLevel() {
    const timeBonus = Math.round(this.timeLeft) * 2;
    this.score += timeBonus;
    this.levelScore += timeBonus;
    const fraction = this.timeLeft / this.level.timeLimit;
    this.stars = fraction >= 0.5 ? 3 : fraction >= 0.25 ? 2 : 1;
    this.levelResults[this.levelIndex] = {
      name: this.level.name,
      score: this.levelScore,
      stars: this.stars,
      timeLeft: Math.round(this.timeLeft),
    };
    this.totalScore = this.score;
    this.state = 'levelComplete';
    this.sound.playLevelComplete();
  }

  // ---------- input actions ----------

  tryFindAt(panelX, panelY) {
    if (this.state !== 'playing') return;
    for (let i = 0; i < this.level.differences.length; i++) {
      if (this.found.has(i)) continue;
      const d = this.level.differences[i];
      const dx = panelX - d.x;
      const dy = panelY - d.y;
      if (dx * dx + dy * dy <= (d.r + 8) * (d.r + 8)) {
        this.awardFind(i);
        return;
      }
    }
    this.registerMiss(panelX, panelY);
  }

  registerMiss(panelX, panelY) {
    this.timeLeft = Math.max(0, this.timeLeft - 5);
    this.combo = 0;
    this.wrongFlashes.push({ x: panelX, y: panelY, until: this.now + 0.6 });
    this.shakeUntil = this.now + 0.3;
    this.message = 'Not a difference — 5 seconds lost!';
    this.messageUntil = this.now + 2;
    this.sound.playMiss();
    if (this.timeLeft <= 0) this.state = 'timeUp';
  }

  useHint() {
    if (this.state !== 'playing') return;
    if (this.hintsLeft <= 0) {
      this.message = 'No hints left on this level.';
      this.messageUntil = this.now + 2;
      return;
    }
    if (this.now < this.hintCooldownUntil) {
      const wait = Math.ceil(this.hintCooldownUntil - this.now);
      this.message = `Hint recharging — ${wait}s left.`;
      this.messageUntil = this.now + 1.5;
      return;
    }
    const remaining = this.level.differences
      .map((d, i) => i)
      .filter((i) => !this.found.has(i));
    if (remaining.length === 0) return;
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    this.hintsLeft -= 1;
    this.hintCooldownUntil = this.now + 10;
    this.hintPulse = { index: pick, until: this.now + 2 };
    this.message = `Hint: look near "${this.level.differences[pick].label}".`;
    this.messageUntil = this.now + 2;
    this.sound.playHint();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.sound.setMuted(this.muted);
  }

  moveCrosshair(dx, dy) {
    this.showCrosshair = true;
    this.crosshair.x = clamp(this.crosshair.x + dx, 0, PANEL_W);
    this.crosshair.y = clamp(this.crosshair.y + dy, 0, PANEL_H);
  }

  selectCrosshair() {
    if (this.state === 'playing') this.tryFindAt(this.crosshair.x, this.crosshair.y);
  }

  // ---------- pointer handling ----------

  handleClick(x, y) {
    this.sound.ensure();
    if (inRect(x, y, MUTE_BUTTON)) {
      this.toggleMute();
      return;
    }
    if (this.state === 'menu') {
      const card = this.levelCardAt(x, y);
      if (card >= 0) this.startLevel(card);
      return;
    }
    if (this.state === 'levelComplete') {
      if (inRect(x, y, this.overlayButtonRect(0))) this.nextLevel();
      if (inRect(x, y, this.overlayButtonRect(1))) this.backToMenu();
      return;
    }
    if (this.state === 'timeUp') {
      if (inRect(x, y, this.overlayButtonRect(0))) this.retryLevel();
      if (inRect(x, y, this.overlayButtonRect(1))) this.backToMenu();
      return;
    }
    if (this.state === 'victory') {
      if (inRect(x, y, this.overlayButtonRect(0))) {
        this.score = 0;
        this.levelResults = [];
        this.startLevel(0);
      }
      if (inRect(x, y, this.overlayButtonRect(1))) this.backToMenu();
      return;
    }
    // playing
    if (inRect(x, y, HINT_BUTTON)) {
      this.useHint();
      return;
    }
    const panel = this.panelAt(x, y);
    if (panel) this.tryFindAt(panel.lx, panel.ly);
  }

  panelAt(x, y) {
    for (const origin of [PANEL_LEFT, PANEL_RIGHT]) {
      if (x >= origin.x && x <= origin.x + PANEL_W && y >= origin.y && y <= origin.y + PANEL_H) {
        return { lx: x - origin.x, ly: y - origin.y };
      }
    }
    return null;
  }

  levelCardAt(x, y) {
    for (let i = 0; i < LEVELS.length; i++) {
      const r = this.levelCardRect(i);
      if (inRect(x, y, r)) return i;
    }
    return -1;
  }

  levelCardRect(i) {
    return { x: 140 + i * 340, y: 250, w: 300, h: 210 };
  }

  overlayButtonRect(i) {
    return { x: 490 + i * 200, y: 520, w: 180, h: 48 };
  }

  // ---------- update ----------

  update(dt, now) {
    this.now = now;
    if (!this.frozen) {
      this.timeSec += dt;
      if (this.state === 'playing') {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.state = 'timeUp';
        }
      }
    }
    this.wrongFlashes = this.wrongFlashes.filter((f) => f.until > now);
    if (this.hintPulse && this.hintPulse.until <= now) this.hintPulse = null;
  }

  // ---------- rendering ----------

  render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.now < this.shakeUntil) {
      const mag = 5;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
    this.drawBackdrop(ctx);
    if (this.state === 'menu') {
      this.drawMenu(ctx);
    } else {
      this.drawHud(ctx);
      this.drawPanels(ctx);
      this.drawBottomStrip(ctx);
      if (this.state === 'levelComplete') this.drawLevelComplete(ctx);
      else if (this.state === 'timeUp') this.drawTimeUp(ctx);
      else if (this.state === 'victory') this.drawVictory(ctx);
    }
    ctx.restore();
  }

  drawBackdrop(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, '#1a1226');
    grad.addColorStop(1, '#0e0a16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawPanels(ctx) {
    const mutated = new Set(this.level.differences.map((d) => d.apply));
    drawScene(ctx, this.level, new Set(), PANEL_LEFT.x, PANEL_LEFT.y, this.timeSec);
    drawScene(ctx, this.level, mutated, PANEL_RIGHT.x, PANEL_RIGHT.y, this.timeSec);
    // labels under each panel
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c9b8e8';
    ctx.fillText('ORIGINAL', PANEL_LEFT.x + 4, PANEL_LEFT.y + PANEL_H + 16);
    ctx.fillText('CHANGED', PANEL_RIGHT.x + 4, PANEL_RIGHT.y + PANEL_H + 16);
    this.drawMarkers(ctx);
  }

  drawMarkers(ctx) {
    for (const origin of [PANEL_LEFT, PANEL_RIGHT]) {
      for (const i of this.found) {
        const d = this.level.differences[i];
        const cx = origin.x + d.x;
        const cy = origin.y + d.y;
        ctx.strokeStyle = '#ffd94a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, d.r + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy);
        ctx.lineTo(cx - 2, cy + 6);
        ctx.lineTo(cx + 8, cy - 6);
        ctx.stroke();
      }
      if (this.hintPulse) {
        const d = this.level.differences[this.hintPulse.index];
        const pulse = 1 + 0.18 * Math.sin(this.now * 10);
        const cx = origin.x + d.x;
        const cy = origin.y + d.y;
        ctx.strokeStyle = 'rgba(255, 217, 74, 0.95)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, (d.r + 10) * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (this.showCrosshair && this.state === 'playing') {
        const cx = origin.x + this.crosshair.x;
        const cy = origin.y + this.crosshair.y;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
        ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const flash of this.wrongFlashes) {
        const cx = origin.x + flash.x;
        const cy = origin.y + flash.y;
        ctx.strokeStyle = '#ff4a4a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 10); ctx.lineTo(cx + 10, cy + 10);
        ctx.moveTo(cx + 10, cy - 10); ctx.lineTo(cx - 10, cy + 10);
        ctx.stroke();
      }
    }
  }

  drawHud(ctx) {
    ctx.fillStyle = '#241a33';
    ctx.fillRect(0, 0, VIEW_W, HUD_H);
    ctx.fillStyle = '#8a6a3a';
    ctx.fillRect(0, HUD_H, VIEW_W, 2);
    ctx.textBaseline = 'middle';
    // level name
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f3e8d0';
    ctx.fillText(`Level ${this.levelIndex + 1} · ${this.level.name}`, 20, 26);
    ctx.font = '400 13px system-ui, sans-serif';
    ctx.fillStyle = '#a898c8';
    ctx.fillText(`${this.level.difficulty} · ${this.level.timeLimit}s limit`, 20, 48);
    // timer bar
    const barX = 470;
    const barW = 320;
    const fraction = clamp(this.timeLeft / this.level.timeLimit, 0, 1);
    ctx.fillStyle = '#3a2a4a';
    ctx.fillRect(barX, 18, barW, 22);
    ctx.fillStyle = fraction > 0.3 ? '#4ac97a' : '#ff5a4a';
    ctx.fillRect(barX, 18, barW * fraction, 22);
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, 18, barW, 22);
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.ceil(this.timeLeft)}s`, barX + barW / 2, 30);
    // found counter — big and legible
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd94a';
    ctx.fillText(`Found ${this.found.size}/10`, 820, 32);
    // score
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillStyle = '#f3e8d0';
    ctx.fillText(`Score ${this.score}`, 960, 32);
    // hint button
    const cooling = this.now < this.hintCooldownUntil;
    ctx.fillStyle = cooling ? '#4a3a5a' : '#8a6a2a';
    ctx.fillRect(HINT_BUTTON.x, HINT_BUTTON.y, HINT_BUTTON.w, HINT_BUTTON.h);
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 2;
    ctx.strokeRect(HINT_BUTTON.x, HINT_BUTTON.y, HINT_BUTTON.w, HINT_BUTTON.h);
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Hint (${this.hintsLeft})`, HINT_BUTTON.x + 40, HINT_BUTTON.y + 21);
    // mute button
    ctx.fillStyle = '#3a2a4a';
    ctx.fillRect(MUTE_BUTTON.x, MUTE_BUTTON.y, MUTE_BUTTON.w, MUTE_BUTTON.h);
    ctx.strokeStyle = '#8a6a3a';
    ctx.strokeRect(MUTE_BUTTON.x, MUTE_BUTTON.y, MUTE_BUTTON.w, MUTE_BUTTON.h);
    ctx.fillStyle = '#f3e8d0';
    ctx.fillText(this.muted ? 'Muted' : 'Sound', MUTE_BUTTON.x + 47, MUTE_BUTTON.y + 21);
  }

  drawBottomStrip(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const showMessage = this.now < this.messageUntil;
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillStyle = showMessage ? '#ffd94a' : '#a898c8';
    ctx.fillText(
      showMessage ? this.message : 'Click a difference in either picture. Wrong clicks cost 5 seconds.',
      VIEW_W / 2,
      540,
    );
    ctx.font = '400 14px system-ui, sans-serif';
    ctx.fillStyle = '#7a6a98';
    ctx.fillText(
      'Mouse: click a difference  ·  Arrows: move crosshair  ·  Enter: select  ·  H: hint  ·  M: mute  ·  R: restart level  ·  Esc: menu',
      VIEW_W / 2,
      572,
    );
    // level progress dots
    for (let i = 0; i < LEVELS.length; i++) {
      ctx.beginPath();
      ctx.arc(600 + i * 30, 606, 7, 0, Math.PI * 2);
      ctx.fillStyle = this.levelResults[i] ? '#ffd94a' : i === this.levelIndex ? '#f3e8d0' : '#4a3a5a';
      ctx.fill();
    }
    ctx.font = '400 13px system-ui, sans-serif';
    ctx.fillStyle = '#7a6a98';
    ctx.fillText('Lantern Market — Spot the Difference', VIEW_W / 2, 640);
  }

  drawMenu(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 54px Georgia, serif';
    ctx.fillStyle = '#ffd94a';
    ctx.fillText('🏮 Lantern Market', VIEW_W / 2, 110);
    ctx.font = '700 30px Georgia, serif';
    ctx.fillStyle = '#f3e8d0';
    ctx.fillText('Spot the Difference', VIEW_W / 2, 160);
    ctx.font = '400 17px system-ui, sans-serif';
    ctx.fillStyle = '#c9b8e8';
    ctx.fillText('Two pictures side by side. Ten differences hiding in each scene.', VIEW_W / 2, 200);
    ctx.fillText('Find them all before the lanterns burn down. Click a level card to play.', VIEW_W / 2, 226);
    for (let i = 0; i < LEVELS.length; i++) {
      const r = this.levelCardRect(i);
      const level = LEVELS[i];
      ctx.fillStyle = '#2a2040';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = '#8a6a3a';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.font = '700 22px system-ui, sans-serif';
      ctx.fillStyle = '#ffd94a';
      ctx.fillText(`Level ${i + 1}`, r.x + r.w / 2, r.y + 36);
      ctx.font = '700 19px system-ui, sans-serif';
      ctx.fillStyle = '#f3e8d0';
      ctx.fillText(level.name, r.x + r.w / 2, r.y + 72);
      ctx.font = '400 15px system-ui, sans-serif';
      ctx.fillStyle = '#c9b8e8';
      ctx.fillText(level.subtitle, r.x + r.w / 2, r.y + 102);
      ctx.fillText(`${level.difficulty} · ${level.timeLimit}s · 10 differences`, r.x + r.w / 2, r.y + 132);
      const done = this.levelResults[i];
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.fillStyle = done ? '#4ac97a' : '#ffd94a';
      ctx.fillText(done ? `★ ${done.stars}  ·  ${done.score} pts` : '▶ Play', r.x + r.w / 2, r.y + 172);
    }
    ctx.font = '400 14px system-ui, sans-serif';
    ctx.fillStyle = '#7a6a98';
    ctx.fillText('Best played with mouse and keyboard · Sound on for the full market ambience', VIEW_W / 2, 520);
  }

  drawOverlayPanel(ctx, title) {
    ctx.fillStyle = 'rgba(10, 6, 18, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#2a2040';
    ctx.fillRect(390, 130, 500, 360);
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 3;
    ctx.strokeRect(390, 130, 500, 360);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 34px Georgia, serif';
    ctx.fillStyle = '#ffd94a';
    ctx.fillText(title, VIEW_W / 2, 175);
  }

  drawOverlayButton(ctx, index, label, primary) {
    const r = this.overlayButtonRect(index);
    ctx.fillStyle = primary ? '#8a6a2a' : '#3a2a4a';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = primary ? '#ffd94a' : '#8a6a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  }

  drawLevelComplete(ctx) {
    this.drawOverlayPanel(ctx, 'Level Complete!');
    const starsText = '★'.repeat(this.stars) + '☆'.repeat(3 - this.stars);
    ctx.font = '700 40px system-ui, sans-serif';
    ctx.fillStyle = '#ffd94a';
    ctx.fillText(starsText, VIEW_W / 2, 235);
    ctx.font = '400 18px system-ui, sans-serif';
    ctx.fillStyle = '#f3e8d0';
    const foundPoints = this.levelScore - Math.round(this.timeLeft) * 2;
    ctx.fillText(`Found 10/10 differences: ${foundPoints} points`, VIEW_W / 2, 290);
    ctx.fillText(`Time bonus (${Math.round(this.timeLeft)}s left × 2): ${Math.round(this.timeLeft) * 2} points`, VIEW_W / 2, 320);
    ctx.fillText(`Best combo: x${Math.max(this.bestCombo, 1)}`, VIEW_W / 2, 350);
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillStyle = '#ffd94a';
    ctx.fillText(`Level score: ${this.levelScore}  ·  Total: ${this.score}`, VIEW_W / 2, 395);
    ctx.font = '400 15px system-ui, sans-serif';
    ctx.fillStyle = '#a898c8';
    ctx.fillText(this.level.name, VIEW_W / 2, 430);
    this.drawOverlayButton(ctx, 0, this.levelIndex + 1 < LEVELS.length ? 'Next Level' : 'See Results', true);
    this.drawOverlayButton(ctx, 1, 'Menu', false);
  }

  drawTimeUp(ctx) {
    this.drawOverlayPanel(ctx, "Time's Up!");
    ctx.font = '400 18px system-ui, sans-serif';
    ctx.fillStyle = '#f3e8d0';
    ctx.fillText(`You found ${this.found.size} of 10 differences in ${this.level.name}.`, VIEW_W / 2, 250);
    ctx.fillText('The lanterns burned down — but the market is still there.', VIEW_W / 2, 280);
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillStyle = '#ffd94a';
    ctx.fillText(`Score so far: ${this.score}`, VIEW_W / 2, 330);
    this.drawOverlayButton(ctx, 0, 'Retry Level', true);
    this.drawOverlayButton(ctx, 1, 'Menu', false);
  }

  drawVictory(ctx) {
    this.drawOverlayPanel(ctx, 'You Found Them All!');
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillStyle = '#ffd94a';
    ctx.fillText(`Total score: ${this.score}`, VIEW_W / 2, 235);
    ctx.font = '400 18px system-ui, sans-serif';
    ctx.fillStyle = '#f3e8d0';
    this.levelResults.forEach((result, i) => {
      if (!result) return;
      ctx.fillText(
        `Level ${i + 1} · ${result.name}: ${result.score} pts · ${'★'.repeat(result.stars)}`,
        VIEW_W / 2,
        285 + i * 32,
      );
    });
    ctx.font = '400 16px system-ui, sans-serif';
    ctx.fillStyle = '#c9b8e8';
    ctx.fillText('Three scenes, thirty differences — and not one got past you.', VIEW_W / 2, 400);
    this.drawOverlayButton(ctx, 0, 'Play Again', true);
    this.drawOverlayButton(ctx, 1, 'Menu', false);
  }
}
