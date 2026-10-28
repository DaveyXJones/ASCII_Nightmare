// Builds the world: an island of fields, forests, hills and lakes, with a cottage where you start.

const WORLD_WIDTH = 192;
const WORLD_HEIGHT = 128;
const DEFAULT_SEED = 1028;

// The cottage you wake up in, drawn as text. Each character maps to a tile through
// COTTAGE_LEGEND; a space leaves the land underneath as it is.
const COTTAGE = [
  '#########',
  '#.......#',
  '#.......#',
  '#.......#',
  '####+####',
  '    :    ',
  '    :  O ',
  '    :    ',
];

const COTTAGE_LEGEND = {
  '#': 'wall',
  '.': 'floor',
  '+': 'door',
  ':': 'path',
  'O': 'well',
};

// Where the player wakes up, counted from the cottage's top-left corner.
const COTTAGE_SPAWN = { x: 4, y: 2 };

// Ground the cottage may be built on. Trees and boulders in the way get cleared.
const FIELD_TILES = new Set(['grass', 'tallGrass', 'flowers', 'tree', 'rock']);

function generateWorld(seed) {
  const width = WORLD_WIDTH;
  const height = WORLD_HEIGHT;
  const tiles = new Array(width * height);
  // A random number per cell, used to pick which glyph and color that cell shows.
  const variants = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      tiles[i] = pickTerrain(x, y, width, height, seed);
      variants[i] = Math.floor(hash2(x, y, seed + 31) * 256);
    }
  }

  const world = { width, height, seed, tiles, variants, spawn: null };
  world.spawn = placeCottage(world);
  return world;
}

// Decides what a single cell is made of from two noise maps: elevation and moisture.
function pickTerrain(x, y, width, height, seed) {
  // 0 in the middle of the map, 1 at the edges. Pulling elevation down near the edges
  // sinks them into the sea, so the world is an island and you can't walk off the map.
  const dx = (x / width) * 2 - 1;
  const dy = (y / height) * 2 - 1;
  const edge = Math.min(1, Math.sqrt(dx * dx + dy * dy));

  const elevation = fractalNoise(x / 30, y / 30, seed) + 0.22 - edge ** 4 * 0.7;
  const moisture = fractalNoise(x / 18, y / 18, seed + 7919);
  const roll = hash2(x, y, seed + 17);

  if (elevation < 0.36) return 'deepWater';
  if (elevation < 0.42) return 'water';
  if (elevation < 0.45) return 'sand';
  if (elevation > 0.82) return 'mountain';
  if (elevation > 0.73) return roll < 0.12 ? 'rock' : 'hills';

  if (moisture > 0.57) {
    // Forest
    if (roll < 0.55) return 'tree';
    return roll < 0.75 ? 'tallGrass' : 'grass';
  }
  if (moisture > 0.51) {
    // Forest edge
    if (roll < 0.12) return 'tree';
    return roll < 0.40 ? 'tallGrass' : 'grass';
  }
  // Open field
  if (roll < 0.035) return 'flowers';
  if (roll < 0.05) return 'tree';
  if (roll < 0.06) return 'rock';
  return roll < 0.16 ? 'tallGrass' : 'grass';
}

// Finds open land near the middle of the map, builds the cottage there,
// and returns the spot inside it where the player starts.
function placeCottage(world) {
  const width = COTTAGE[0].length;
  const height = COTTAGE.length;
  const centerLeft = Math.floor((world.width - width) / 2);
  const centerTop = Math.floor((world.height - height) / 2);
  const maxRadius = Math.max(world.width, world.height);
  const mainland = findMainland(world);

  // Check sites in growing square rings around the middle until one fits.
  for (let radius = 0; radius < maxRadius; radius++) {
    for (let oy = -radius; oy <= radius; oy++) {
      for (let ox = -radius; ox <= radius; ox++) {
        if (Math.max(Math.abs(ox), Math.abs(oy)) !== radius) continue;
        const left = centerLeft + ox;
        const top = centerTop + oy;
        if (isGoodSite(world, mainland, left - 1, top - 1, width + 2, height + 2)) {
          return buildCottage(world, left, top);
        }
      }
    }
  }
  // No perfect site anywhere: build in the middle and clear the ground around it.
  return buildCottage(world, centerLeft, centerTop);
}

// Marks the largest area you can walk around without crossing water or mountains,
// so the cottage never ends up on a tiny islet or in a sealed-off valley.
function findMainland(world) {
  const { width, height, tiles } = world;
  const region = new Int32Array(width * height).fill(-1);
  let largest = -1;
  let largestSize = 0;

  for (let start = 0; start < tiles.length; start++) {
    if (region[start] !== -1 || TILES[tiles[start]].solid) continue;
    // Flood fill: spread from this cell to every walkable neighbour it can reach.
    const id = start;
    const stack = [start];
    let size = 0;
    region[start] = id;
    while (stack.length > 0) {
      const i = stack.pop();
      const x = i % width;
      const y = (i - x) / width;
      size++;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const n = ny * width + nx;
        if (region[n] === -1 && !TILES[tiles[n]].solid) {
          region[n] = id;
          stack.push(n);
        }
      }
    }
    if (size > largestSize) {
      largest = id;
      largestSize = size;
    }
  }
  return region.map((id) => (id === largest ? 1 : 0));
}

// A good site is all field (no water, sand or hills), mostly clear, and part of the mainland.
function isGoodSite(world, mainland, left, top, width, height) {
  let obstacles = 0;
  for (let y = top; y < top + height; y++) {
    for (let x = left; x < left + width; x++) {
      if (x < 0 || y < 0 || x >= world.width || y >= world.height) return false;
      const i = y * world.width + x;
      const key = world.tiles[i];
      if (!FIELD_TILES.has(key)) return false;
      if (TILES[key].solid) obstacles++;
      else if (!mainland[i]) return false;
    }
  }
  return obstacles <= width * height * 0.1;
}

function buildCottage(world, left, top) {
  // Clear a one-cell yard around the cottage so the door never opens onto a tree.
  for (let y = top - 1; y <= top + COTTAGE.length; y++) {
    for (let x = left - 1; x <= left + COTTAGE[0].length; x++) {
      const tile = tileAt(world, x, y);
      if (tile && tile.solid) setTile(world, x, y, 'grass');
    }
  }
  COTTAGE.forEach((row, dy) => {
    [...row].forEach((char, dx) => {
      if (COTTAGE_LEGEND[char]) setTile(world, left + dx, top + dy, COTTAGE_LEGEND[char]);
    });
  });
  return { x: left + COTTAGE_SPAWN.x, y: top + COTTAGE_SPAWN.y };
}

// The tile definition at a position, or null outside the map.
function tileAt(world, x, y) {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return null;
  return TILES[world.tiles[y * world.width + x]];
}

function variantAt(world, x, y) {
  return world.variants[y * world.width + x];
}

function setTile(world, x, y, key) {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return;
  world.tiles[y * world.width + x] = key;
}
