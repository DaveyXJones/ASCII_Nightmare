// The game itself: the player walking around, the main loop, and the screen around the map
// (health bars, the pack, menus, messages).

const WALK_SPEED = 4.5; // tiles per second with the stick pushed all the way
const FOOT_HALF_WIDTH = 0.3; // the player's feet, in tiles: what bumps into trees and walls
const FOOT_HALF_DEPTH = 0.2;
const CORNER_SLIP = 0.4; // how far off-center you can be and still slide around a corner or into a doorway
const WATER_FRAME_SECONDS = 0.45; // how often the water ripples
const FLAME_FRAME_SECONDS = 0.15; // how often campfire flames flicker
const MESSAGE_SECONDS = 3.5;

const FACINGS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const elements = {
  game: document.getElementById('game'),
  canvas: document.getElementById('map'),
  healthVital: document.querySelector('.vital.health'), // glows while you're warming by a fire
  bars: {
    health: document.getElementById('bar-health'),
    food: document.getElementById('bar-food'),
    water: document.getElementById('bar-water'),
  },
  // One counter in the pack for each item, with the id count-<item>.
  counts: Object.fromEntries(
    Object.keys(ITEMS).map((item) => [item, document.getElementById(`count-${item}`)]),
  ),
  // One slot in the pack for each tool, with the id tool-<tool>, shown once you've made it.
  tools: Object.fromEntries(
    Object.keys(TOOLS).map((tool) => [tool, document.getElementById(`tool-${tool}`)]),
  ),
  toast: document.getElementById('toast'),
  actionButton: document.getElementById('btn-action'),
  actionLabel: document.getElementById('action-label'),
  eatButton: document.getElementById('btn-eat'),
  craftButton: document.getElementById('btn-craft'),
  craftLabel: document.getElementById('craft-label'),
  menuButton: document.getElementById('menu-button'),
  stickZone: document.getElementById('stick-zone'),
  stick: document.getElementById('stick'),
  knob: document.getElementById('knob'),
  menu: document.getElementById('menu'),
  startButton: document.getElementById('start'),
  newWorldButton: document.getElementById('new-world'),
  fullscreenButton: document.getElementById('fullscreen'),
  seedLabel: document.getElementById('seed'),
  death: document.getElementById('death'),
  deathTime: document.getElementById('death-time'),
  againButton: document.getElementById('again'),
  deathNewWorldButton: document.getElementById('death-new-world'),
  craft: document.getElementById('craft'),
  recipes: document.getElementById('recipes'),
  craftClose: document.getElementById('craft-close'),
};

const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const state = {
  world: null,
  player: null,
  survivor: null,
  fx: { particles: [], floaters: [], shake: null },
  target: null,
  building: null, // in build mode: the key in RECIPES being built, otherwise null
  buildSpot: null, // in build mode: where it would go, from findBuildSpot()
  time: 0, // seconds of play, paused while a menu is open
  lifeStarted: 0,
  waterFrame: 0,
  waterClock: 0,
  flameFrame: 0,
  flameClock: 0,
  messageUntil: 0,
  bumpedInto: null,
  paused: true,
  dead: false,
  started: false,
  hud: {}, // what the screen around the map last showed, so it's only touched when something changes
};

function newGame(seed) {
  state.world = generateWorld(seed);
  elements.seedLabel.textContent = String(seed);
  wakeUp();
}

// Starts a life: in the cottage, beside the bed, with an empty pack.
function wakeUp() {
  const spawn = state.world.spawn;
  state.player = {
    x: spawn.x,
    y: spawn.y,
    facing: 'down',
    moving: false,
    stride: 0, // distance walked, for the walking animation
    clock: 0,
    swingUntil: 0,
  };
  state.survivor = newSurvivor();
  state.fx = { particles: [], floaters: [], shake: null };
  stopBuilding(state);
  state.dead = false;
  state.lifeStarted = state.time;
  snapCamera(state.world, state.player);
  showMessage(state, 'You wake up in your cottage. Find food and water to survive.');
}

// ---- Moving ----

function update(dt) {
  const { player, survivor } = state;
  state.time += dt;
  player.clock += dt;

  movePlayer(dt);
  if (state.building) {
    // In build mode the action button builds (see the 'action' press in frame()) instead.
    state.target = null;
    state.buildSpot = findBuildSpot(state);
  } else {
    state.target = findTarget(state);
    if (actionHeld() && state.target && player.clock >= survivor.nextSwingAt) {
      useTarget(state);
      survivor.nextSwingAt = player.clock + SWING_SECONDS;
    }
  }

  updateVitals(state, dt);
  updateRegrowth(state.world, state.time);
  if (survivor.vitals.health <= 0) die();
}

function movePlayer(dt) {
  const player = state.player;
  const move = moveVector();
  player.moving = move.length > 0;
  if (!player.moving) return;

  turnToward(player, move.x, move.y);
  const step = WALK_SPEED * move.length * dt;
  const dx = move.x * step;
  const dy = move.y * step;
  const startX = player.x;
  const startY = player.y;

  const blockedX = slide(player, dx, 0, Math.abs(dx) > Math.abs(dy));
  const blockedY = slide(player, 0, dy, Math.abs(dy) >= Math.abs(dx));
  const blocker = blockedX || blockedY;
  const moved = Math.hypot(player.x - startX, player.y - startY);
  player.stride += moved;

  // Only say what's in the way when it actually stops the player, and only once per thing.
  if (moved > step * 0.25) {
    state.bumpedInto = null;
  } else if (blocker && blocker !== state.bumpedInto) {
    state.bumpedInto = blocker;
    if (blocker.blocked) showMessage(state, blocker.blocked);
  }
}

// Moves along one axis if the way is clear, and returns what's in the way if not. When this is the
// main direction of travel, it tries to slip around the corner: that makes doorways and gaps
// between trees much easier to hit with a thumbstick.
function slide(player, dx, dy, main) {
  if (dx === 0 && dy === 0) return null;
  const blocker = blockerFor(player.x + dx, player.y + dy);
  if (!blocker) {
    player.x += dx;
    player.y += dy;
    return null;
  }
  if (!main) return blocker;

  const step = Math.abs(dx + dy);
  for (const shift of [CORNER_SLIP / 2, -CORNER_SLIP / 2, CORNER_SLIP, -CORNER_SLIP]) {
    const sx = dx === 0 ? shift : 0;
    const sy = dy === 0 ? shift : 0;
    if (!blockerFor(player.x + dx + sx, player.y + dy + sy) && !blockerFor(player.x + sx, player.y + sy)) {
      player.x += Math.sign(sx) * Math.min(step, Math.abs(sx));
      player.y += Math.sign(sy) * Math.min(step, Math.abs(sy));
      return null;
    }
  }
  return blocker;
}

// What the player's feet would bump into standing at (x, y), or null if they'd fit.
function blockerFor(x, y) {
  const left = Math.floor(x - FOOT_HALF_WIDTH);
  const right = Math.floor(x + FOOT_HALF_WIDTH);
  const top = Math.floor(y - FOOT_HALF_DEPTH);
  const bottom = Math.floor(y + FOOT_HALF_DEPTH);
  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      const blocker = blockerAt(state.world, tx, ty);
      if (blocker) return blocker;
    }
  }
  return null;
}

// Faces the way the stick points. Near a diagonal it keeps the current facing, so the player
// doesn't flicker between two directions.
function turnToward(player, x, y) {
  const horizontal = x < 0 ? 'left' : 'right';
  const vertical = y < 0 ? 'up' : 'down';
  if (Math.abs(x) > Math.abs(y) * 1.2) player.facing = horizontal;
  else if (Math.abs(y) > Math.abs(x) * 1.2) player.facing = vertical;
  else if (player.facing !== horizontal && player.facing !== vertical) {
    player.facing = Math.abs(x) > Math.abs(y) ? horizontal : vertical;
  }
}

function faceToward(player, x, y) {
  const dx = x - player.x;
  const dy = y - player.y;
  if (Math.abs(dx) > Math.abs(dy)) player.facing = dx < 0 ? 'left' : 'right';
  else player.facing = dy < 0 ? 'up' : 'down';
}

// ---- Life and death ----

function die() {
  state.dead = true;
  releaseAll();
  const seconds = Math.floor(state.time - state.lifeStarted);
  const minutes = Math.floor(seconds / 60);
  elements.deathTime.textContent =
    minutes > 0 ? `${minutes} min ${seconds % 60} s` : `${seconds} seconds`;
  elements.death.hidden = false;
}

// ---- Menus ----

function openMenu() {
  state.paused = true;
  releaseAll();
  elements.startButton.textContent = state.started ? 'Resume' : 'Wake up';
  elements.menu.hidden = false;
}

function closeMenu() {
  elements.menu.hidden = true;
  state.paused = false;
  state.started = true;
}

// On phones, starting the game goes full screen and turns sideways where the browser allows it.
function goFullscreen() {
  const root = document.documentElement;
  if (!document.fullscreenEnabled || document.fullscreenElement) return;
  root
    .requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
    .catch(() => {});
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else goFullscreen();
}

elements.startButton.addEventListener('click', () => {
  if (!state.started && window.matchMedia('(pointer: coarse)').matches) goFullscreen();
  closeMenu();
});
elements.newWorldButton.addEventListener('click', () => {
  newGame(Math.floor(Math.random() * 1_000_000));
  closeMenu();
});
elements.fullscreenButton.addEventListener('click', toggleFullscreen);
elements.fullscreenButton.hidden = !document.fullscreenEnabled;
elements.againButton.addEventListener('click', () => {
  elements.death.hidden = true;
  wakeUp();
});
elements.deathNewWorldButton.addEventListener('click', () => {
  elements.death.hidden = true;
  newGame(Math.floor(Math.random() * 1_000_000));
});

// ---- The screen around the map ----

function showMessage(game, text) {
  if (elements.toast.textContent !== text) elements.toast.textContent = text;
  elements.toast.classList.add('visible');
  game.messageUntil = game.time + MESSAGE_SECONDS;
}

function updateHud() {
  const hud = state.hud;
  const { vitals, pack } = state.survivor;
  for (const name of ['health', 'food', 'water']) {
    const value = Math.ceil(vitals[name]);
    if (hud[name] === value) continue;
    hud[name] = value;
    elements.bars[name].style.width = `${value}%`;
    elements.bars[name].parentElement.classList.toggle('low', value < LOW);
  }
  for (const item of Object.keys(ITEMS)) {
    if (hud[item] === pack[item]) continue;
    hud[item] = pack[item];
    elements.counts[item].textContent = String(pack[item]);
  }
  for (const tool of Object.keys(TOOLS)) {
    const has = Boolean(state.survivor.tools[tool]);
    if (hud[`tool-${tool}`] === has) continue;
    hud[`tool-${tool}`] = has;
    elements.tools[tool].hidden = !has;
  }
  const warm = state.survivor.warm;
  if (hud.warm !== warm) {
    hud.warm = warm;
    elements.healthVital.classList.toggle('warm', warm);
  }

  let label = state.target ? state.target.label : 'Use';
  let ready = Boolean(state.target);
  if (state.building) {
    label = 'Build';
    ready = Boolean(state.buildSpot && !state.buildSpot.problem);
  }
  if (hud.action !== label) {
    hud.action = label;
    elements.actionLabel.textContent = label;
  }
  if (hud.ready !== ready) {
    hud.ready = ready;
    elements.actionButton.classList.toggle('idle', !ready);
  }
  const canEat = pack.berries > 0;
  if (hud.canEat !== canEat) {
    hud.canEat = canEat;
    elements.eatButton.classList.toggle('idle', !canEat);
  }
  // The Craft button is bright when there's something you could make, and says Done in build mode.
  const craftLabel = state.building ? 'Done' : 'Craft';
  if (hud.craftLabel !== craftLabel) {
    hud.craftLabel = craftLabel;
    elements.craftLabel.textContent = craftLabel;
  }
  const canCraft = Boolean(state.building) || Object.values(RECIPES).some((r) => canMake(state.survivor, r));
  if (hud.canCraft !== canCraft) {
    hud.canCraft = canCraft;
    elements.craftButton.classList.toggle('idle', !canCraft);
  }

  if (state.time > state.messageUntil && elements.toast.classList.contains('visible')) {
    elements.toast.classList.remove('visible');
  }
}

// ---- Main loop ----

let lastFrame = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  let playing = !state.paused && !state.dead && !portrait.matches;
  for (let press = takePress(); press; press = takePress()) {
    const crafting = !elements.craft.hidden;
    if (press === 'menu' || press === 'back') {
      // Esc backs out of one thing at a time (the craft panel, the menu, build mode) before it
      // opens the menu. The ☰ button and P go straight to the menu.
      if (crafting) closeCraft();
      else if (!elements.menu.hidden && state.started) closeMenu();
      else if (press === 'back' && state.building && playing) stopBuilding(state);
      else if (!state.dead) openMenu();
    } else if (press === 'craft' && (playing || crafting)) {
      if (crafting) closeCraft();
      else if (state.building) stopBuilding(state);
      else openCraft();
    } else if (press.startsWith('recipe:') && crafting) {
      craft(state, Object.keys(RECIPES)[Number(press.slice(7))]);
    } else if (press === 'action' && playing && state.building) {
      build(state);
    } else if (press === 'eat' && playing) {
      eatBerry(state);
    }
    playing = !state.paused && !state.dead && !portrait.matches;
  }

  if (playing) update(dt);
  else state.player.moving = false;

  updateEffects(state.fx, dt);
  if (state.fx.shake && state.time > state.fx.shake.until) state.fx.shake = null;
  if (!reducedMotion.matches) {
    state.waterClock += dt;
    if (state.waterClock >= WATER_FRAME_SECONDS) {
      state.waterClock = 0;
      state.waterFrame++;
    }
    state.flameClock += dt;
    if (state.flameClock >= FLAME_FRAME_SECONDS) {
      state.flameClock = 0;
      state.flameFrame++;
    }
  }

  followCamera(state.world, state.player, dt);
  drawFrame(state);
  updateHud();
  requestAnimationFrame(frame);
}

setupView(elements.canvas);
setupInput(elements);
setupCrafting(elements);
newGame(DEFAULT_SEED);
resizeView();
snapCamera(state.world, state.player);
openMenu();
new ResizeObserver(() => {
  resizeView();
  placeCamera(state.world);
}).observe(elements.canvas);
// Measure again once the font has loaded; until then the map is drawn in a fallback font.
if (document.fonts) {
  const fonts = [document.fonts.load(`20px ${MAP_FONT}`), document.fonts.load(`bold 20px ${MAP_FONT}`)];
  Promise.all(fonts).then(() => {
    resizeView();
    placeCamera(state.world);
  }, () => {});
}
requestAnimationFrame(frame);
