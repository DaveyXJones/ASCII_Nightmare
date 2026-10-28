// The game itself: reads the keyboard (or touch pad), moves the player, and draws the
// world as text on a canvas, with the camera following the player around.

const MOVE_DELAY_FIRST = 180; // ms a held key waits before it starts repeating
const MOVE_DELAY_REPEAT = 90; // ms between steps while a key stays held
const WATER_FRAME_MS = 450; // how often the water ripples

const KEY_DIRECTIONS = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

const DIRECTIONS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const theme = getComputedStyle(document.documentElement);
const MAP_FONT = theme.getPropertyValue('--font-mono').trim() || 'monospace';
const VOID_COLOR = theme.getPropertyValue('--night').trim() || '#080b0a';

const PLAYER = {
  glyph: '@',
  color: theme.getPropertyValue('--lantern').trim() || '#ffd75e',
  bg: '#2a2410',
};

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
const groundLabel = document.getElementById('status-ground');
const positionLabel = document.getElementById('status-position');
const seedLabel = document.getElementById('status-seed');
const messageLine = document.getElementById('message');
const focusHint = document.getElementById('focus-hint');
const newWorldButton = document.getElementById('new-world');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const state = {
  world: null,
  player: { x: 0, y: 0 },
  held: [], // directions being held down; the most recent one wins
  nextMoveAt: 0,
  waterFrame: 0,
  lastWaterTick: 0,
  dirty: true, // true when the screen needs to be redrawn
};

// How the canvas is divided into character cells. Filled in by resize().
const view = { width: 0, height: 0, cellW: 0, cellH: 0, cols: 0, rows: 0, offsetX: 0, offsetY: 0 };

function newGame(seed) {
  state.world = generateWorld(seed);
  state.player = { ...state.world.spawn };
  showMessage('You wake up in a quiet cottage. The door is to the south.');
  updateStatus();
  state.dirty = true;
}

function tryMove(direction) {
  const { dx, dy } = DIRECTIONS[direction];
  const x = state.player.x + dx;
  const y = state.player.y + dy;
  const tile = tileAt(state.world, x, y);

  if (!tile) {
    showMessage("You can't go that way.");
    return;
  }
  if (tile.solid) {
    showMessage(tile.blocked || `The ${tile.name.toLowerCase()} is in the way.`);
    return;
  }

  state.player.x = x;
  state.player.y = y;
  showMessage('');
  updateStatus();
  state.dirty = true;
}

// ---- Input ----

function press(direction) {
  if (state.held.includes(direction)) return;
  state.held.push(direction);
  // Step right away so a quick tap always moves exactly one cell.
  tryMove(direction);
  state.nextMoveAt = performance.now() + MOVE_DELAY_FIRST;
}

function release(direction) {
  state.held = state.held.filter((held) => held !== direction);
}

window.addEventListener('keydown', (event) => {
  // Leave browser shortcuts like Ctrl+W alone.
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const direction = KEY_DIRECTIONS[event.code];
  if (!direction) return;
  event.preventDefault(); // stop the arrow keys from scrolling the page
  press(direction);
});

window.addEventListener('keyup', (event) => {
  const direction = KEY_DIRECTIONS[event.code];
  if (direction) release(direction);
});

// If the window loses focus mid-step we never hear the key go up, so stop walking.
window.addEventListener('blur', () => {
  state.held = [];
  updateFocusHint();
});
window.addEventListener('focus', updateFocusHint);
canvas.addEventListener('pointerdown', () => window.focus());

for (const button of document.querySelectorAll('[data-direction]')) {
  const direction = button.dataset.direction;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    press(direction);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(type, () => release(direction));
  }
  button.addEventListener('contextmenu', (event) => event.preventDefault());
}

newWorldButton.addEventListener('click', () => {
  newGame(Math.floor(Math.random() * 1_000_000));
  newWorldButton.blur();
});

// ---- Screen ----

function updateStatus() {
  const { world, player } = state;
  groundLabel.textContent = tileAt(world, player.x, player.y).name;
  positionLabel.textContent = `${player.x}, ${player.y}`;
  seedLabel.textContent = String(world.seed);
}

function showMessage(text) {
  if (messageLine.textContent !== text) messageLine.textContent = text;
}

function updateFocusHint() {
  focusHint.hidden = document.hasFocus();
}

// Works out how many character cells fit on the canvas at the current size.
function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const fontSize = rect.width < 560 ? 15 : 18;

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = `${fontSize}px ${MAP_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  view.width = rect.width;
  view.height = rect.height;
  view.cellW = Math.ceil(ctx.measureText('M').width);
  view.cellH = Math.ceil(fontSize * 1.2);
  view.cols = Math.max(1, Math.floor(rect.width / view.cellW));
  view.rows = Math.max(1, Math.floor(rect.height / view.cellH));
  view.offsetX = Math.floor((rect.width - view.cols * view.cellW) / 2);
  view.offsetY = Math.floor((rect.height - view.rows * view.cellH) / 2);
  state.dirty = true;
}

// Keeps the player in the middle of the screen, but stops scrolling at the edge of the world.
function cameraStart(playerPos, screenSize, worldSize) {
  if (screenSize >= worldSize) return -Math.floor((screenSize - worldSize) / 2);
  const start = playerPos - Math.floor(screenSize / 2);
  return Math.max(0, Math.min(start, worldSize - screenSize));
}

function glyphFor(tile, variant, x, y) {
  const glyphs = tile.glyphs;
  if (!tile.animated) return glyphs[variant % glyphs.length];
  // Ripples roll diagonally across the water as the frame counter ticks.
  const step = x + 2 * y + (variant & 3) - state.waterFrame;
  return glyphs[((step % glyphs.length) + glyphs.length) % glyphs.length];
}

function drawCell(col, row, glyph, color, bg) {
  const px = view.offsetX + col * view.cellW;
  const py = view.offsetY + row * view.cellH;
  ctx.fillStyle = bg;
  ctx.fillRect(px, py, view.cellW, view.cellH);
  ctx.fillStyle = color;
  ctx.fillText(glyph, px + view.cellW / 2, py + view.cellH / 2);
}

function draw() {
  const { world, player } = state;
  const camX = cameraStart(player.x, view.cols, world.width);
  const camY = cameraStart(player.y, view.rows, world.height);

  ctx.fillStyle = VOID_COLOR;
  ctx.fillRect(0, 0, view.width, view.height);

  for (let row = 0; row < view.rows; row++) {
    for (let col = 0; col < view.cols; col++) {
      const x = camX + col;
      const y = camY + row;
      const tile = tileAt(world, x, y);
      if (!tile) continue;
      const variant = variantAt(world, x, y);
      const color = tile.colors[(variant >> 4) % tile.colors.length];
      drawCell(col, row, glyphFor(tile, variant, x, y), color, tile.bg);
    }
  }

  drawCell(player.x - camX, player.y - camY, PLAYER.glyph, PLAYER.color, PLAYER.bg);
}

// ---- Main loop ----

function frame(now) {
  if (state.held.length > 0 && now >= state.nextMoveAt) {
    tryMove(state.held[state.held.length - 1]);
    state.nextMoveAt = now + MOVE_DELAY_REPEAT;
  }
  if (!reducedMotion.matches && now - state.lastWaterTick >= WATER_FRAME_MS) {
    state.waterFrame++;
    state.lastWaterTick = now;
    state.dirty = true;
  }
  if (state.dirty) {
    draw();
    state.dirty = false;
  }
  requestAnimationFrame(frame);
}

newGame(DEFAULT_SEED);
resize();
updateFocusHint();
new ResizeObserver(resize).observe(canvas);
// Re-measure once the web font arrives; until then the map uses a fallback font.
document.fonts?.load(`18px ${MAP_FONT}`).then(resize, () => {});
requestAnimationFrame(frame);
