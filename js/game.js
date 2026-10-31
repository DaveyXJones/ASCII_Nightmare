// The game itself: the player walking around, the main loop, and the screen around the map
// (health bars, the pack, menus, messages).

const WALK_SPEED = 4.5; // tiles per second with the stick pushed all the way
const FOOT_HALF_WIDTH = 0.3; // the player's feet, in tiles: what bumps into trees and walls
const FOOT_HALF_DEPTH = 0.2;
const CORNER_SLIP = 0.4; // how far off-center you can be and still slide around a corner or into a doorway
// In build mode, a push of the stick (or a tap of a key) let go within this many seconds turns you to
// face that way without walking. Walking in build mode keeps the way you face.
const FLICK_SECONDS = 0.22;
const WATER_FRAME_SECONDS = 0.45; // how often the water ripples
const FLAME_FRAME_SECONDS = 0.15; // how often campfire flames flicker
const MESSAGE_SECONDS = 3.5;
const COLLAPSE_SECONDS = 1.8; // from health running out to the death screen: the player sinks and falls
const NEW_WORLD_CONFIRM_SECONDS = 4; // how long New world waits for the second tap

const FACINGS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const elements = {
  game: document.getElementById('game'),
  canvas: document.getElementById('map'),
  hud: document.querySelector('.hud'), // flashes red round the edges when something bites you
  healthVital: document.querySelector('.vital.health'), // glows while you're warming by a fire
  bars: {
    health: document.getElementById('bar-health'),
    food: document.getElementById('bar-food'),
    water: document.getElementById('bar-water'),
  },
  sky: document.querySelector('.vital.sky'), // the sun or tonight's moon, and how long it has left
  skyIcon: document.getElementById('sky-icon'),
  skyBar: document.getElementById('bar-sky'),
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
  mapButton: document.getElementById('map-button'),
  map: document.getElementById('island-map'), // the map panel (the game's own canvas is #map)
  mapPicture: document.getElementById('map-picture'),
  mapKey: document.getElementById('map-key'),
  mapClose: document.getElementById('map-close'),
  mapZoomIn: document.getElementById('map-zoom-in'),
  mapZoomOut: document.getElementById('map-zoom-out'),
  mapCentre: document.getElementById('map-centre'),
  note: document.getElementById('note'), // a note found in a ruin (see places.js)
  noteTitle: document.getElementById('note-title'),
  noteText: document.getElementById('note-text'),
  noteClose: document.getElementById('note-close'),
  stickZone: document.getElementById('stick-zone'),
  stick: document.getElementById('stick'),
  knob: document.getElementById('knob'),
  menu: document.getElementById('menu'),
  startButton: document.getElementById('start'),
  newWorldButton: document.getElementById('new-world'),
  fullscreenButton: document.getElementById('fullscreen'),
  soundButton: document.getElementById('sound-button'),
  outlineButton: document.getElementById('outline-button'), // the dark edge round the player, on or off
  seedLabel: document.getElementById('seed'),
  death: document.getElementById('death'),
  deathTitle: document.getElementById('death-title'),
  deathTime: document.getElementById('death-time'),
  againButton: document.getElementById('again'),
  deathNewWorldButton: document.getElementById('death-new-world'),
  craft: document.getElementById('craft'),
  recipes: document.getElementById('recipes'),
  craftClose: document.getElementById('craft-close'),
  lookButton: document.getElementById('look-button'),
  look: document.getElementById('look'),
  lookParts: document.getElementById('look-parts'),
  lookPicture: document.getElementById('look-picture'),
  lookDone: document.getElementById('look-done'),
  chest: document.getElementById('chest'),
  chestPack: document.getElementById('chest-pack'),
  chestHeld: document.getElementById('chest-held'),
  chestPut: document.getElementById('chest-put'),
  chestTake: document.getElementById('chest-take'),
  chestRemove: document.getElementById('chest-remove'),
  chestClose: document.getElementById('chest-close'),
};

const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const state = {
  world: null,
  player: null,
  survivor: null,
  fx: { particles: [], floaters: [], shake: null },
  creatures: [], // things out in the dark (creatures.js)
  hunt: newHunt(), // tonight's hunt: when the next one comes out, and which warnings have shown
  weather: newWeather(), // lightning, thunder on its way, and which rain messages have shown (weather.js)
  target: null,
  building: null, // in build mode: the key in RECIPES being built, otherwise null
  buildSpot: null, // in build mode: where it would go, from findBuildSpot()
  chest: null, // while a chest is open, the tile it stands on (see chest.js)
  fishing: null, // while your line is out, where the bobber is and when a fish bites (fishing.js)
  shot: null, // the last gunshot: where it hit and when, { x, y, at }, for its streak and flash (guns.js)
  dropped: 0, // guns dropped where you died, to mention when you wake
  tapped: false, // the action button went down since the last update (so even the quickest tap counts)
  time: 0, // seconds of play, paused while a menu is open
  dayClock: 0, // seconds since this world's first morning: the time of day and the moon come from it
  sky: null, // what the sky is doing right now, from skyAt() in night.js
  lifeStarted: 0,
  waterFrame: 0,
  waterClock: 0,
  flameFrame: 0,
  flameClock: 0,
  messageUntil: 0,
  bumpedInto: null,
  paused: true,
  dying: null, // while collapsing, { seconds } since health ran out; then the death screen
  dead: false,
  started: false,
  resumed: false, // true if this visit carried on a saved world (see loadGame() in save.js)
  savedAt: 0, // when the game was last saved, in seconds of play
  look: defaultLook(), // the player's colors, picked on the Your look panel
  hud: {}, // what the screen around the map last showed, so it's only touched when something changes
};

function newGame(seed) {
  state.world = generateWorld(seed);
  state.dayClock = 0;
  wakeUp();
}

// Starts a life: in the cottage beside the bed (or on the bedroll you built last), with an empty
// pack, at the start of a new day.
function wakeUp() {
  const bed = bedSpot(state.world);
  const spot = bed || state.world.spawn;
  state.survivor = newSurvivor();
  state.dayClock = nextMorning(state.dayClock);
  state.lifeStarted = state.time;
  startLife(spot.x, spot.y, 'down');
  const where = bed ? 'on your bedroll' : 'in your cottage';
  const guns = state.dropped > 1 ? 'Your guns lie' : 'Your gun lies';
  const after = state.dropped ? `${guns} where you fell.` : 'Find food and water to survive.';
  state.dropped = 0;
  showMessage(state, `You wake up ${where}. ${after}`);
  saveGame(state);
}

// Puts the player at (x, y) with everything around them settled: nothing flying through the air,
// nothing out in the dark yet. Used when waking up, and when carrying on a saved game.
function startLife(x, y, facing) {
  state.player = {
    x,
    y,
    facing,
    moving: false,
    stride: 0, // distance walked, for the walking animation
    steps: 0, // footsteps taken, to kick up a puff of dust at each one
    clock: 0,
    act: null, // the last thing they did, { action, at }, for the swing or kneel it shows
    working: null, // the action word while the action button is held on something
    holding: null, // the action word the button was held down for, while it's held
    pushedAt: null, // in build mode, when the stick was pushed from standing still (for a flick)
    pushed: null, // ...and which way, { x, y }
  };
  state.sky = skyAt(state.dayClock, state.world.seed);
  state.fx = { particles: [], floaters: [], shake: null };
  state.creatures = [];
  state.hunt = newHunt();
  state.weather = newWeather();
  state.weather.raining = state.sky.weather.rain > 0.15; // waking up in the rain isn't news
  stopBuilding(state);
  state.fishing = null;
  state.shot = null;
  state.dying = null;
  elements.game.classList.remove('collapsing');
  state.dead = false;
  snapCamera(state.world, state.player);
}

// ---- Moving ----

function update(dt) {
  const { player, survivor } = state;
  state.time += dt;
  state.dayClock += dt;
  player.clock += dt;

  const sky = skyAt(state.dayClock, state.world.seed);
  if (sky.phase !== state.sky.phase) {
    showMessage(state, skyMessage(state, sky));
    if (sky.phase === 'day') washUp(state); // some mornings the sea brings something in
  }
  state.sky = sky;

  movePlayer(dt);
  if (state.building) {
    // In build mode the action button builds (see the 'action' press in frame()) instead.
    state.target = null;
    state.buildSpot = findBuildSpot(state);
    player.working = null;
  } else {
    state.target = findTarget(state);
    const label = state.target ? state.target.label : null;
    // Holding the button keeps doing one thing. If the thing changes under your thumb (lighting a
    // torch turns the fire's button into Put out), it waits until you let go.
    if (!actionHeld() && !state.tapped) {
      player.holding = null;
      player.triggerHeld = false; // a gun fires once per press
    }
    else if (!player.holding) player.holding = label;
    player.working = label && label === player.holding ? label : null;
    if (player.working && player.clock >= survivor.nextSwingAt) {
      useTarget(state);
      survivor.nextSwingAt = player.clock + SWING_SECONDS;
    }
  }

  state.tapped = false;
  updateVitals(state, dt);
  updateTorch(state, dt);
  updateLamps(state, dt);
  markSeen(state);
  updateWeather(state, dt);
  updateCreatures(state, dt);
  updateRegrowth(state.world, state.time);
  updateFishing(state);
  updateGuns(state);
  if (survivor.vitals.health <= 0) collapse();
  if (state.time - state.savedAt >= SAVE_EVERY) saveGame(state);
}

function movePlayer(dt) {
  const player = state.player;
  const move = moveVector();
  if (!state.building) player.pushedAt = null;
  else if (!flickOrWalk(player, move)) {
    player.moving = false;
    return;
  }
  player.moving = move.length > 0;
  if (!player.moving) return;

  if (!state.building) turnToward(player, move.x, move.y);
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
  // A foot comes down every other picture of the walk (see WALK_FRAME_TILES in render.js).
  const steps = Math.floor(player.stride / (WALK_FRAME_TILES * 2));
  if (steps !== player.steps) {
    player.steps = steps;
    footstep(state);
  }

  // Only say what's in the way when it actually stops the player, and only once per thing.
  if (moved > step * 0.25) {
    state.bumpedInto = null;
  } else if (blocker && blocker !== state.bumpedInto) {
    state.bumpedInto = blocker;
    // A grave says what's written on its stone (see EPITAPHS in places.js).
    const words = blocker.epitaph ? epitaphNear(state.world, player) : blocker.blocked;
    if (words) showMessage(state, words);
  }
}

// In build mode you keep facing the same way as you walk (you step sideways), so you can walk along
// a line building beside you. To turn, flick the stick: push it and let go quickly. A push is held
// back for FLICK_SECONDS to see which it is; returns true once it's a walk.
function flickOrWalk(player, move) {
  if (move.length > 0) {
    if (player.pushedAt === null) player.pushedAt = player.clock;
    player.pushed = { x: move.x, y: move.y };
    return player.clock - player.pushedAt >= FLICK_SECONDS;
  }
  if (player.pushedAt !== null && player.clock - player.pushedAt < FLICK_SECONDS) {
    turnToward(player, player.pushed.x, player.pushed.y);
  }
  player.pushedAt = null;
  return false;
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

// Health has run out. The player sinks to their knees and falls (see playerPose() in render.js)
// while the screen darkens, and then the death screen comes up.
function collapse() {
  state.dropped = dropGuns(state);
  state.dying = { seconds: 0 };
  state.player.moving = false;
  state.player.working = null;
  state.target = null;
  stopBuilding(state);
  releaseAll();
  elements.game.classList.add('collapsing');
  playSound('collapse');
  buzz(120);
}

function updateDying(dt) {
  const dying = state.dying;
  const before = dying.seconds;
  dying.seconds += dt;
  // The moment they hit the ground: a puff of dust.
  if (before < KNEEL_SECONDS && dying.seconds >= KNEEL_SECONDS) {
    burst(state.fx, state.player.x, state.player.y, 'dust', 6);
    buzz(60);
  }
  if (dying.seconds >= COLLAPSE_SECONDS) die();
}

function die() {
  state.dying = null;
  state.dead = true;
  releaseAll();
  const takenByTheDark = state.survivor.hurtBy === 'dark';
  elements.deathTitle.textContent = takenByTheDark ? 'The dark takes you.' : 'You collapse.';
  const seconds = Math.floor(state.time - state.lifeStarted);
  const minutes = Math.floor(seconds / 60);
  elements.deathTime.textContent =
    minutes > 0 ? `${minutes} min ${seconds % 60} s` : `${seconds} seconds`;
  elements.death.hidden = false;
  saveGame(state); // so reloading the page doesn't undo dying
}

// ---- Menus ----

function openMenu() {
  state.paused = true;
  releaseAll();
  saveGame(state);
  elements.startButton.textContent = state.started ? 'Resume' : state.resumed ? 'Carry on' : 'Wake up';
  const day = Math.floor(state.dayClock / CYCLE_SECONDS) + 1;
  elements.seedLabel.textContent = `${state.world.seed}, day ${day}`;
  confirmNewWorld(false);
  elements.menu.hidden = false;
}

// Starting a new world throws this one away, so once you've played in it, New world asks for a
// second tap first.
let newWorldTimer = null;

function confirmNewWorld(asking) {
  clearTimeout(newWorldTimer);
  elements.newWorldButton.classList.toggle('asking', asking);
  elements.newWorldButton.textContent = asking ? 'Tap again to leave this world' : 'New world';
  if (asking) newWorldTimer = setTimeout(() => confirmNewWorld(false), NEW_WORLD_CONFIRM_SECONDS * 1000);
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
  const played = state.started || state.resumed;
  if (played && !elements.newWorldButton.classList.contains('asking')) {
    confirmNewWorld(true);
    return;
  }
  confirmNewWorld(false);
  newGame(Math.floor(Math.random() * 1_000_000));
  closeMenu();
});
elements.fullscreenButton.addEventListener('click', toggleFullscreen);
elements.soundButton.addEventListener('click', () => {
  setSoundOn(!audio.on);
  showSoundButton();
});

elements.outlineButton.addEventListener('click', () => {
  setOutlineOn(!outline.on);
  showOutlineButton();
});

function showOutlineButton() {
  elements.outlineButton.textContent = outline.on ? 'Outline on' : 'Outline off';
  elements.outlineButton.setAttribute('aria-pressed', String(outline.on));
}

function showSoundButton() {
  elements.soundButton.textContent = audio.on ? 'Sound on' : 'Sound off';
  elements.soundButton.setAttribute('aria-pressed', String(audio.on));
}
elements.fullscreenButton.hidden = !document.fullscreenEnabled;
elements.againButton.addEventListener('click', () => {
  elements.death.hidden = true;
  wakeUp();
});
elements.deathNewWorldButton.addEventListener('click', () => {
  elements.death.hidden = true;
  newGame(Math.floor(Math.random() * 1_000_000));
});

// ---- Your look ----

// One row of color buttons for each part of the player (LOOKS in sprites.js), made once at startup.
function setupLook() {
  for (const [part, { name, colors }] of Object.entries(LOOKS)) {
    const row = document.createElement('div');
    row.className = 'look-part';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', name);
    const label = document.createElement('span');
    label.className = 'look-name';
    label.textContent = name;
    row.append(label);
    for (const choice of colors) {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'swatch';
      swatch.dataset.part = part;
      swatch.dataset.color = choice.color;
      swatch.style.setProperty('--swatch', choice.color);
      swatch.setAttribute('aria-label', `${name}: ${choice.name}`);
      swatch.addEventListener('click', () => {
        state.look[part] = choice.color;
        dressPlayer(state.look);
        remember(LOOK_KEY, state.look);
        showLook();
      });
      row.append(swatch);
    }
    elements.lookParts.append(row);
  }
  elements.lookButton.addEventListener('click', openLook);
  elements.lookDone.addEventListener('click', closeLook);
  elements.look.addEventListener('click', (event) => {
    if (event.target === elements.look) closeLook();
  });
}

// Marks the colors being worn and draws the player in them.
function showLook() {
  for (const swatch of elements.lookParts.querySelectorAll('.swatch')) {
    swatch.setAttribute('aria-pressed', String(state.look[swatch.dataset.part] === swatch.dataset.color));
  }
  const { down, right, up } = PLAYER_SPRITES;
  drawLookPicture(elements.lookPicture, [down.stand, right.stand, up.stand]);
}

// The panel opens over the menu, and closing it goes back to the menu.
function openLook() {
  showLook();
  elements.look.hidden = false;
  elements.lookDone.focus({ preventScroll: true });
}

function closeLook() {
  elements.look.hidden = true;
}

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
    // Things you only have now and then only take up room in the pack while you have some.
    if (ITEMS[item].hideEmpty) elements.counts[item].parentElement.hidden = pack[item] === 0;
  }
  for (const tool of Object.keys(TOOLS)) {
    const has = Boolean(state.survivor.tools[tool]);
    if (hud[`tool-${tool}`] === has) continue;
    hud[`tool-${tool}`] = has;
    elements.tools[tool].hidden = !has;
  }
  // A red flash round the edges of the screen each time something bites.
  const { hurtAt } = state.survivor;
  if (hud.hurtAt !== hurtAt) {
    hud.hurtAt = hurtAt;
    elements.hud.classList.remove('hurt');
    if (Number.isFinite(hurtAt)) {
      void elements.hud.offsetWidth; // so the flash starts again from the beginning
      elements.hud.classList.add('hurt');
    }
  }
  const warm = state.survivor.warm;
  if (hud.warm !== warm) {
    hud.warm = warm;
    elements.healthVital.classList.toggle('warm', warm);
  }
  // The torch in the pack glows while it's lit, and turns red as it burns low.
  const { torchLeft } = state.survivor;
  const torch = torchLeft <= 0 ? 'out' : torchLeft < TOOLS.torch.burns * TORCH_LOW ? 'low' : 'lit';
  if (hud.torch !== torch) {
    hud.torch = torch;
    elements.tools.torch.classList.toggle('lit', torch !== 'out');
    elements.tools.torch.classList.toggle('low', torch === 'low');
  }
  // A gun dims in the pack while it's reloading.
  for (const key of Object.keys(TOOLS)) {
    if (!TOOLS[key].gun) continue;
    const reloading = gunReloading(state.survivor, key);
    if (hud[`reload-${key}`] === reloading) continue;
    hud[`reload-${key}`] = reloading;
    elements.tools[key].classList.toggle('reloading', reloading);
  }

  // By day: the sun (or a cloud, or an umbrella in the rain), and how much daylight is left. By night:
  // tonight's moon, and how long until dawn.
  const sky = state.sky;
  const daylight = sky.phase === 'day' || sky.phase === 'dusk';
  const weather = sky.weather.rain > 0.15 ? 'rain' : sky.weather.cloud > 0.6 ? 'cloud' : 'sun';
  const dayIcon = { rain: '☂', cloud: '☁', sun: '☼' }[weather];
  const dayName = { rain: 'Raining. ', cloud: 'Cloudy. ', sun: '' }[weather] + 'Daylight left';
  const skyName = daylight ? dayName : `${sky.moon.name}: night left`;
  if (hud.skyName !== skyName) {
    hud.skyName = skyName;
    elements.skyIcon.textContent = daylight ? dayIcon : sky.moon.glyph;
    elements.sky.title = skyName;
    elements.sky.classList.toggle('night', !daylight);
  }
  const skyLeft = Math.ceil(sky.left * 100);
  if (hud.skyLeft !== skyLeft) {
    hud.skyLeft = skyLeft;
    elements.skyBar.style.width = `${skyLeft}%`;
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
  const canEat = bestFood(pack) !== null;
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

  let playing = !state.paused && !state.dead && !state.dying && !portrait.matches;
  for (let press = takePress(); press; press = takePress()) {
    const crafting = !elements.craft.hidden;
    if (press === 'menu' || press === 'back') {
      // Esc backs out of one thing at a time (the craft panel, a chest, the look panel, the menu,
      // build mode) before it opens the menu. The ☰ button and P go straight to the menu.
      if (crafting) closeCraft();
      else if (!elements.map.hidden) closeMap();
      else if (!elements.chest.hidden) closeChest();
      else if (!elements.note.hidden) closeNote();
      else if (!elements.look.hidden) closeLook();
      else if (!elements.menu.hidden && state.started) closeMenu();
      else if (press === 'back' && state.building && playing) stopBuilding(state);
      else if (!state.dead && !state.dying) openMenu();
    } else if (press === 'craft' && (playing || crafting)) {
      if (crafting) closeCraft();
      else if (state.building) stopBuilding(state);
      else openCraft();
    } else if (press === 'map' && (playing || !elements.map.hidden)) {
      if (!elements.map.hidden) closeMap();
      else openMap();
    } else if (press.startsWith('recipe:') && crafting) {
      craft(state, Object.keys(RECIPES)[Number(press.slice(7))]);
    } else if (press === 'action' && playing && state.building) {
      build(state);
    } else if (press === 'action' && playing) {
      state.tapped = true;
    } else if (press === 'eat' && playing) {
      eat(state);
    }
    playing = !state.paused && !state.dead && !state.dying && !portrait.matches;
  }

  if (playing) update(dt);
  else state.player.moving = false;
  if (state.dying && !state.paused && !portrait.matches) updateDying(dt);

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

  updateSound(state, playing);
  followCamera(state.world, state.player, dt);
  stepRain(state, state.paused ? 0 : dt);
  drawFrame(state);
  updateHud();
  requestAnimationFrame(frame);
}

state.look = recallLook();
dressPlayer(state.look);
setupView(elements.canvas);
setupInput(elements);
setupCrafting(elements);
setupChest(elements);
setupMap(elements);
setupNote(elements);
setupLook();
setupSound();
showSoundButton();
outline.on = recall(OUTLINE_KEY) !== false;
showOutlineButton();
// Carry on from last time if there's a saved world; otherwise the first island.
state.resumed = loadGame(state);
if (!state.resumed) newGame(DEFAULT_SEED);
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
// Save when the page is put away (switching apps, locking the phone, closing the tab), since it
// might not come back.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGame(state);
});
window.addEventListener('pagehide', () => saveGame(state));
requestAnimationFrame(frame);
