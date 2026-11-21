// main.js — bootstrap for Lantern Market.
// Wires the game, input and screenshot poses together, then runs the
// render loop. The canvas is fixed at 1280x720 logical pixels and CSS
// scales it to fit the window, so the layout never scrolls.

import { Game, VIEW_W, VIEW_H } from './game.js';
import { attachInput } from './input.js';
import { applyShotPose } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const game = new Game(canvas);
attachInput(canvas, game);

// Screenshot poses (?shot=...) are applied once at startup and freeze
// the clock; with no params the game opens on its normal menu.
applyShotPose(game, new URLSearchParams(window.location.search));

let lastTimestamp = performance.now();

function frame(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = timestamp;
  game.update(dt, timestamp / 1000);
  game.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
