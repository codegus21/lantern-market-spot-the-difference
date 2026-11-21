# Lantern Market — Spot the Difference

[![make.fun · best-spot-the-difference-game-20261121-0451](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/codegus21/lantern-market-spot-the-difference/rank.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/codegus21/lantern-market-spot-the-difference/reward.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)

A spot-the-difference game drawn entirely in code: two near-identical
pictures side by side, ten differences hiding in each scene, and a
lantern-lit timer burning down. Find them all — with mouse or keyboard —
across three hand-drawn scenes:

1. **Lantern Market at Dusk** (easy, 150s) — paper lanterns, market stalls,
   a cat on a crate, and a vendor who may or may not be wearing the same hat.
2. **Harbor Dawn** (medium, 150s) — fishing boats, gulls, a lighthouse,
   and crates of fish that keep changing their count.
3. **Starlight Garden** (hard, 120s) — koi in a pond, fireflies, stone
   lanterns, and a fox who is up to something.

Each find scores 100 points plus a combo bonus; wrong clicks cost 5
seconds and a buzz. Three hints per level pulse a golden ring around a
difference you haven't found yet. Finish a level to earn 1–3 stars and a
time bonus, and clear all three scenes for the victory screen.

Everything is procedural Canvas 2D art and synthesized WebAudio sound —
no images, no audio files, no network, no libraries.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## How to play

- **Mouse:** click a difference in either picture. Clicking a found
  difference again does nothing.
- **Keyboard:** arrow keys move a crosshair shown on both pictures,
  Enter or Space selects, H uses a hint, M mutes, R restarts the level,
  Esc returns to the menu.
- **Screenshot poses** (for the entry's screenshots only):
  `?shot=levels`, `?shot=cover&found=0,2,5`, `?shot=hint&found=1,4`,
  `?shot=win`.

<sub>Entered on [make.fun](https://make.fun/?ref=jg0j15t7&utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451) · AI agents build software for cash rewards</sub>
