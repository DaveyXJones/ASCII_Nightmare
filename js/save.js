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
  remember(SAVE_KEY, {
    version: SAVE_VERSION,
    seed: world.seed,
    size: [world.width, world.height],
    places: world.hasPlaces,
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
      bucket: survivor.bucket,
      warned: survivor.warned,
      hurtBy: survivor.hurtBy,
    },
    objects,
    damage: [...world.damage],
    clawed: [...world.clawed],
    regrowing: world.regrowing,
    chests: [...world.chests],
    fuel: [...world.fuel],
    floors: [...world.floors.keys()],
    crops: [...world.crops],
    seen: packSeen(world),
    bed: world.bed,
  });
  game.savedAt = game.time;
}

// Puts back the world saved last time. Returns true if there was one to carry on, false if not (or
// it couldn't be read), in which case nothing is changed.
function loadGame(game) {
  const save = recall(SAVE_KEY);
  if (!save || save.version !== SAVE_VERSION || !Number.isInteger(save.seed)) return false;
  try {
    const world = generateWorld(save.seed, savedIsland(save));
    // If the code that builds islands has changed since (a new kind of ground, say), this seed
    // builds a different island now, and the changes saved for the old one would land in the wrong
    // places. Keep what you carry, but not the changes to the land, and wake up in the cottage.
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

// The island a save was made on: its size ([width, height] in tiles) and whether it has places to
// find. Saves from before islands grew don't say, and are FIRST_WORLD_SIZE; saves from before
// there were places don't have them.
function savedIsland(save) {
  const fits = (n) => Number.isInteger(n) && n >= 32 && n <= 2048;
  const { size } = save;
  if (!Array.isArray(size) || !fits(size[0]) || !fits(size[1])) return FIRST_WORLD_SIZE;
  return { width: size[0], height: size[1], places: save.places === true };
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
  // What's in each chest, for chests that are still standing.
  for (const [i, chest] of save.chests || []) {
    const key = valid(i) && world.objects[i];
    if (key && OBJECTS[key].chest) world.chests.set(i, restoreChest(chest));
  }
  // What's left in each lamp, for lamps still standing. A lit lamp with nothing saved for it (from
  // an older save) starts full.
  for (const [i, left] of save.fuel || []) {
    const key = valid(i) && world.objects[i];
    if (key && OBJECTS[key].fuel && OBJECTS[key].light) world.fuel.set(i, Math.max(0, finite(left, 0)));
  }
  for (let i = 0; i < world.objects.length; i++) {
    const object = world.objects[i] && OBJECTS[world.objects[i]];
    if (object && object.fuel && object.light && !world.fuel.has(i)) world.fuel.set(i, object.fuel.burns);
  }
  // How each plant in the garden is getting on, for plants still growing.
  for (const [i, crop] of save.crops || []) {
    const key = valid(i) && world.objects[i];
    if (!key || !OBJECTS[key].crop || !crop) continue;
    const seconds = (value) => Math.max(0, finite(value, 0));
    world.crops.set(i, { grown: seconds(crop.grown), water: seconds(crop.water), dry: seconds(crop.dry) });
  }
  for (let i = 0; i < world.objects.length; i++) {
    const object = world.objects[i] && OBJECTS[world.objects[i]];
    if (object && object.crop && !world.crops.has(i)) world.crops.set(i, { grown: 0, water: 0, dry: 0 });
  }
  // Floors you've laid. What was under each is the island's own ground, as built from its seed.
  for (const i of save.floors || []) {
    if (!valid(i) || world.floors.has(i) || TILES[world.ground[i]].solid) continue;
    world.floors.set(i, world.ground[i]);
    world.ground[i] = 'planks';
  }
  if (valid(save.bed)) world.bed = save.bed;
  unpackSeen(world, save.seen);
}

// A chest's contents as saved, keeping only whole numbers of items and tools that still exist.
function restoreChest(saved) {
  const chest = newChest();
  for (const [kind, table] of [['items', ITEMS], ['tools', TOOLS]]) {
    for (const [key, count] of Object.entries((saved && saved[kind]) || {})) {
      const n = Math.floor(finite(count, 0));
      if (table[key] && n > 0) chest[kind][key] = n;
    }
  }
  return chest;
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
  if (survivor.tools.bucket) {
    survivor.bucket = Math.max(0, Math.min(TOOLS.bucket.holds, Math.floor(finite(saved.bucket, 0))));
  }
  for (const name of Object.keys(survivor.warned)) {
    survivor.warned[name] = Boolean(saved.warned && saved.warned[name]);
  }
  survivor.hurtBy = saved.hurtBy || null;
  return survivor;
}

// A number standing for the island as it was built: its ground and what stood on it. Two islands
// with the same print are (all but certainly) the same island. It's taken before anything is put on
// the island for you to find (see generateWorld), so the wreck, the crates and the places can move
// without a saved island looking like a new one. (Things placed for you to find, `found` in
// OBJECTS, are left out too: prints were once taken after the wreck was placed.)
function worldPrint(world) {
  let hash = 2166136261;
  const mix = (text) => {
    for (let n = 0; n < text.length; n++) hash = Math.imul(hash ^ text.charCodeAt(n), 16777619);
  };
  for (let i = 0; i < world.ground.length; i++) {
    mix(world.ground[i]);
    const key = world.objects[i];
    mix(key && !OBJECTS[key].found ? key : '-');
  }
  return hash >>> 0;
}

function finite(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}
