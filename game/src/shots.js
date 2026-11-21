// shots.js — screenshot pose mode, read from URL query params.
// Used ONLY for taking screenshots; with no params the game opens on
// its normal menu. Every pose is deterministic: fixed timer display,
// fixed found sets, no animation drift (the clock is frozen).
//
//   ?shot=cover&found=0,2,5   level 1 mid-play, 3 differences ringed, 7 left
//   ?shot=levels              menu screen showing the three level cards
//   ?shot=hint&found=1,4      level 1 mid-play with a hint pulse active
//   ?shot=win                 level-1 complete overlay with stars + score

function parseFound(params) {
  const raw = params.get('found') || '';
  return raw
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n < 10);
}

export function applyShotPose(game, params) {
  const shot = params.get('shot');
  if (!shot) return false;

  // Freeze the clock so every pose renders identically every time.
  game.frozen = true;
  game.timeSec = 5;

  if (shot === 'levels') {
    game.state = 'menu';
    return true;
  }

  if (shot === 'cover') {
    game.startLevel(0);
    game.timeLeft = 87;
    game.score = 340;
    game.levelScore = 340;
    for (const i of parseFound(params)) game.found.add(i);
    game.message = 'Found: Moon colour! +100 points';
    game.messageUntil = Number.POSITIVE_INFINITY;
    return true;
  }

  if (shot === 'hint') {
    game.startLevel(0);
    game.timeLeft = 112;
    game.score = 215;
    game.levelScore = 215;
    game.hintsLeft = 2;
    for (const i of parseFound(params)) game.found.add(i);
    const remaining = game.level.differences
      .map((d, i) => i)
      .filter((i) => !game.found.has(i));
    game.hintPulse = { index: remaining[3], until: Number.POSITIVE_INFINITY };
    game.message = 'Hint: look near "Missing cat".';
    game.messageUntil = Number.POSITIVE_INFINITY;
    return true;
  }

  if (shot === 'win') {
    game.startLevel(0);
    game.timeLeft = 82;
    game.score = 1250;
    game.levelScore = 1250;
    game.bestCombo = 3;
    for (let i = 0; i < 10; i++) game.found.add(i);
    game.stars = 3;
    game.levelResults[0] = {
      name: game.level.name,
      score: 1250,
      stars: 3,
      timeLeft: 82,
    };
    game.state = 'levelComplete';
    return true;
  }

  return false;
}
