// What the game keeps in the browser between visits: the world you're in, how you're doing, and
// how you've dressed the player.
//
// It's kept in localStorage, which belongs to this one browser on this one device. Private
// browsing, or clearing the browser's data, forgets it. Every read and write is wrapped so that
// if the browser won't keep anything, the game still plays; it just won't remember.
//
// The world isn't saved tile by tile. It's built from its seed, the same every time, so only what's
// changed since is kept: trees chopped, things built, bushes picked.

const LOOK_KEY = 'ascii-nightmare-look';
const SAVE_KEY = 'ascii-nightmare-world';
const SAVE_VERSION = 1; // bump this if what's saved changes shape, and older saves are left alone
const SAVE_EVERY = 10; // seconds of play between saves (it also saves when the page is put away)

// Keeps `value` under `key`, as text. Returns false if the browser wouldn't keep it.
function remember(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// What was kept under `key`, or null if nothing was (or it can't be read).
function recall(key) {
  try {
    const text = localStorage.getItem(key);
    return text === null ? null : JSON.parse(text);
  } catch {
    return null;
  }
}

// ---- Your look ----

// The look you picked last time, keeping only colors that are still in LOOKS (sprites.js), so a
// color taken out of the table falls back to the first one in its row.
function recallLook() {
  const look = defaultLook();
  const kept = recall(LOOK_KEY);
  if (!kept || typeof kept !== 'object') return look;
  for (const [part, { colors }] of Object.entries(LOOKS)) {
    if (colors.some(({ color }) => color === kept[part])) look[part] = kept[part];
  }
  return look;
}

// ---- The world ----

// Keeps where things stand. Called every SAVE_EVERY seconds, when the menu opens, when the page is
// put away, on waking up and on dying.
function saveGame(game) {
  const { world, player, survivor } = game;
  if (!world || !player) return;
  const objects = []; // [tile index, object key or null] for every tile that's changed
  for (let i = 0; i < world.objects.length; i++) {
    if (world.objects[i] !== world.original[i]) objects.push([i, world.objects[i]]);
  }
  // The island as it was built never changes, so its print is only worked out once.
  if (world.print === undefined) world.print = worldPrint(world);
  remember(SAVE_KEY, {
    version: SAVE_VERSION,
    seed: world.seed,
    print: world.print,
    time: game.time,
    dayClock: game.dayClock,
    lifeStarted: game.lifeStarted,
    dead: game.dead || Boolean(game.dying),
    player: { x: player.x, y: player.y, facing: player.facing },
    survivor: {
      vitals: survivor.vitals,
      pack: survivor.pack,
      tools: survivor.tools,
      torchLeft: survivor.torchLeft,
      warned: survivor.warned,
      hurtBy: survivor.hurtBy,
    },
    objects,
    damage: [...world.damage],
    clawed: [...world.clawed],
    regrowing: world.regrowing,
  });
  game.savedAt = game.time;
}

// Puts back the world saved last time. Returns true if there was one to carry on, false if not (or
// it couldn't be read), in which case nothing is changed.
function loadGame(game) {
  const save = recall(SAVE_KEY);
  if (!save || save.version !== SAVE_VERSION || !Number.isInteger(save.seed)) return false;
  try {
    const world = generateWorld(save.seed);
    // If the code that builds islands has changed since (a new kind of ground, say), this seed
    // builds a different island now, and the changes saved for the old one would land in the wrong
    // places. Keep what you carry, but not the changes to the land, and wake up in the cottage.
    world.print = worldPrint(world);
    const sameIsland = save.print === world.print;
    if (sameIsland) restoreWorld(world, save);
    game.world = world;
    game.time = finite(save.time, 0);
    game.dayClock = finite(save.dayClock, 0);
    game.lifeStarted = finite(save.lifeStarted, game.time);
    game.savedAt = game.time;
    if (save.dead) {
      wakeUp(); // you died last time: a new life, the next morning
      return true;
    }
    game.survivor = restoreSurvivor(save.survivor || {});
    const { x, y, facing } = save.player || {};
    const spot = sameIsland && Number.isFinite(x) && Number.isFinite(y) && !blockerFor(x, y);
    const spawn = world.spawn;
    startLife(spot ? x : spawn.x, spot ? y : spawn.y, FACINGS[facing] ? facing : 'down');
    const welcome = sameIsland
      ? 'You carry on where you left off.'
      : 'The island has changed while you were away.';
    showMessage(game, welcome);
    return true;
  } catch (error) {
    console.warn('The saved world could not be read, so a new one starts.', error);
    return false;
  }
}

function restoreWorld(world, save) {
  const valid = (i) => Number.isInteger(i) && i >= 0 && i < world.objects.length;
  for (const [i, key] of save.objects || []) {
    // Things that have since been taken out of OBJECTS are left out.
    if (valid(i) && (key === null || OBJECTS[key])) world.objects[i] = key;
  }
  for (const [i, swings] of save.damage || []) if (valid(i)) world.damage.set(i, swings);
  for (const [i, scratches] of save.clawed || []) if (valid(i)) world.clawed.set(i, scratches);
  world.regrowing = (save.regrowing || []).filter(
    (entry) => valid(entry.index) && OBJECTS[entry.from] && OBJECTS[entry.into],
  );
}

// A fresh survivor with the saved numbers laid over it, keeping only items and tools that still
// exist (and starting new ones at 0).
function restoreSurvivor(saved) {
  const survivor = newSurvivor();
  for (const name of Object.keys(survivor.vitals)) {
    survivor.vitals[name] = Math.max(0, Math.min(100, finite(saved.vitals && saved.vitals[name], 100)));
  }
  for (const item of Object.keys(ITEMS)) {
    survivor.pack[item] = Math.max(0, Math.floor(finite(saved.pack && saved.pack[item], 0)));
  }
  for (const tool of Object.keys(saved.tools || {})) {
    if (TOOLS[tool]) survivor.tools[tool] = true;
  }
  survivor.torchLeft = Math.max(0, finite(saved.torchLeft, 0));
  for (const name of Object.keys(survivor.warned)) {
    survivor.warned[name] = Boolean(saved.warned && saved.warned[name]);
  }
  survivor.hurtBy = saved.hurtBy || null;
  return survivor;
}

// A number standing for the island as it was built: its ground and what stood on it. Two islands
// with the same print are (all but certainly) the same island.
function worldPrint(world) {
  let hash = 2166136261;
  const mix = (text) => {
    for (let n = 0; n < text.length; n++) hash = Math.imul(hash ^ text.charCodeAt(n), 16777619);
  };
  for (let i = 0; i < world.ground.length; i++) {
    mix(world.ground[i]);
    mix(world.original[i] || '-');
  }
  return hash >>> 0;
}

function finite(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}
