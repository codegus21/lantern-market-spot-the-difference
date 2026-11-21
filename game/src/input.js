// input.js — mouse and keyboard input for Lantern Market.
// Clicks work on either panel (coordinates are mirrored between them);
// arrow keys move a crosshair shown on both panels, Enter/Space selects.

import { VIEW_W, VIEW_H } from './game.js';

const CROSSHAIR_STEP = 12;
const CROSSHAIR_STEP_FAST = 40;

export function attachInput(canvas, game) {
  // Convert a pointer event to the game's 1280x720 logical coordinates,
  // whatever size the canvas is displayed at.
  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    const point = toLogical(event);
    game.handleClick(point.x, point.y);
  });

  window.addEventListener('keydown', (event) => {
    const key = event.key;
    if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
      event.preventDefault();
      const step = event.shiftKey ? CROSSHAIR_STEP_FAST : CROSSHAIR_STEP;
      if (key === 'ArrowLeft') game.moveCrosshair(-step, 0);
      if (key === 'ArrowRight') game.moveCrosshair(step, 0);
      if (key === 'ArrowUp') game.moveCrosshair(0, -step);
      if (key === 'ArrowDown') game.moveCrosshair(0, step);
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      game.sound.ensure();
      if (game.state === 'menu') game.startLevel(0);
      else if (game.state === 'levelComplete') game.nextLevel();
      else if (game.state === 'timeUp') game.retryLevel();
      else if (game.state === 'victory') game.startLevel(0);
      else game.selectCrosshair();
      return;
    }
    const lower = key.toLowerCase();
    if (lower === 'h') {
      game.sound.ensure();
      game.useHint();
    } else if (lower === 'm') {
      game.sound.ensure();
      game.toggleMute();
    } else if (lower === 'r') {
      if (game.state === 'playing' || game.state === 'timeUp') game.retryLevel();
    } else if (key === 'Escape') {
      game.backToMenu();
    }
  });
}
