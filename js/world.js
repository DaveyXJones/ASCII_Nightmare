// Builds the world: an island of fields, forests, hills and lakes, with a cottage where you start.
//
// The world is a grid of tiles in two layers: `ground` (what you walk on, from TILES) and
// `objects` (what stands on it, from OBJECTS, or null). Mountains are ground with a height,
// counted in rows of cliff face.

const WORLD_WIDTH = 192;
const WORLD_HEIGHT = 128;
const DEFAULT_SEED = 1028;

// The cottage you wake up in, drawn as text. Each character maps to ground (and maybe an object)
// through COTTAGE_LEGEND; a space leaves the land underneath as it is. The walls must be a
// rectangle in the top-left corner: the game draws them with a roof (see drawHouse() in render.js).
const COTTAGE = [
  '###########    ',
  '#.........#    ',
  '#.B.......#    ',
  '#.b..rrr..#    ',
  '#....rrrT.#    ',
  '#.........#    ',
  '#####+#####    ',
  '     :      W  ',
  ' c   :         ',
  '     :    c    ',
];

const COTTAGE_LEGEND = {
  '#': { ground: 'wall' },
  '.': { ground: 'floor' },
  '+': { ground: 'door' },
  ':': { ground: 'path' },
  'r': { ground: 'rug' },
  'B': { ground: 'floor', object: 'bedHead' },
  'b': { ground: 'floor', object: 'bedFoot' },
  'T': { ground: 'floor', object: 'table' },
  'W': { ground: 'grass', object: 'well' },
  'c': { ground: 'grass', object: 'cotton' },
};

// Where the player wakes up, counted from the cottage's top-left corner: right beside the bed.
const COTTAGE_SPAWN = { x: 3.5, y: 3.6 };

// Ground the cottage may be built on. Trees and rocks in the way get cleared.
const FIELD_TILES = new Set(['grass', 'tallGrass', 'flowers']);

// Mountains rise in steps: the higher the land, the taller the cliff. The lowest step stands two
// rows tall and each step above it adds one more.
const MOUNTAIN_LEVELS = [0.82, 0.87, 0.92];

function generateWorld(seed) {
  const width = WORLD_WIDTH;
  const height = WORLD_HEIGHT;
  const size = width * height;
  const world = {
    width,
    height,
    seed,
    ground: new Array(size),
    objects: new Array(size).fill(null),
    heights: new Uint8Array(size), // rows of cliff face, for mountains
    shades: new Uint8Array(size), // which background color a tile uses, in patches
    variants: new Uint8Array(size), // a random number per tile, for picking glyphs and colors
    damage: new Map(), // tile index -> swings taken, for trees and rocks being worked on
    clawed: new Map(), // tile index -> scratches taken, for walls things in the dark are clawing at
    regrowing: [], // { index, at, into } for picked bushes
    house: null,
    spawn: null,
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const cell = pickTerrain(x, y, width, height, seed);
      world.ground[i] = cell.ground;
      world.objects[i] = cell.object;
      world.heights[i] = cell.height;
      world.shades[i] = Math.floor(clamp01((fractalNoise(x / 9, y / 9, seed + 555, 2) - 0.3) / 0.4) * 3.99);
      world.variants[i] = Math.floor(hash2(x, y, seed + 31) * 256);
    }
  }

  placeCottage(world);
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
  // The same land with the finest bumps left out, so mountains have bold shapes, not ragged ones.
  const ridge = fractalNoise(x / 30, y / 30, seed, 3) + 0.22 - edge ** 4 * 0.7;
  const moisture = fractalNoise(x / 18, y / 18, seed + 7919);
  const roll = hash2(x, y, seed + 17);
  const cell = (ground, object = null) => ({ ground, object, height: 0 });

  if (elevation < 0.36) return cell('deepWater');
  if (elevation < 0.42) return cell('water');
  if (elevation < 0.45) return cell('sand');
  if (ridge > MOUNTAIN_LEVELS[0]) {
    const height = 1 + MOUNTAIN_LEVELS.filter((level) => ridge > level).length;
    return { ground: 'mountain', object: null, height };
  }
  if (elevation > 0.73) return cell('hills', roll < 0.05 ? 'boulder' : null);

  if (moisture > 0.57) {
    // Forest: mostly pines, with clearings of tall grass.
    if (roll < 0.2) return cell('grass', 'pine');
    if (roll < 0.24) return cell('grass', 'oak');
    if (roll < 0.26) return cell('grass', 'bush');
    return cell(roll < 0.6 ? 'tallGrass' : 'grass');
  }
  if (moisture > 0.51) {
    // Forest edge
    if (roll < 0.06) return cell('grass', 'oak');
    if (roll < 0.09) return cell('grass', 'pine');
    if (roll < 0.12) return cell('grass', 'bush');
    return cell(roll < 0.4 ? 'tallGrass' : 'grass');
  }
  // Open field
  if (roll < 0.035) return cell('flowers');
  if (roll < 0.05) return cell('grass', 'oak');
  if (roll < 0.058) return cell('grass', 'boulder');
  if (roll < 0.07) return cell('grass', 'bush');
  if (roll < 0.078) return cell('grass', 'cotton');
  return cell(roll < 0.17 ? 'tallGrass' : 'grass');
}

// Finds open land near the middle of the map and builds the cottage there.
function placeCottage(world) {
  const width = COTTAGE[0].length;
  const height = COTTAGE.length;
  const centerLeft = Math.floor((world.width - width) / 2);
  const centerTop = Math.floor((world.height - height) / 2);
  const maxRadius = Math.max(world.width, world.height);
  const mainland = findMainland(world);

  // Check sites in growing square rings around the middle until one fits. The site reaches a few
  // rows above the cottage too, where its roof will stand.
  for (let radius = 0; radius < maxRadius; radius++) {
    for (let oy = -radius; oy <= radius; oy++) {
      for (let ox = -radius; ox <= radius; ox++) {
        if (Math.max(Math.abs(ox), Math.abs(oy)) !== radius) continue;
        const left = centerLeft + ox;
        const top = centerTop + oy;
        if (isGoodSite(world, mainland, left - 1, top - 4, width + 2, height + 5)) {
          buildCottage(world, left, top);
          return;
        }
      }
    }
  }
  // No perfect site anywhere: build in the middle and clear the ground around it.
  buildCottage(world, centerLeft, centerTop);
}

// Marks the largest area you can walk around without crossing water or mountains,
// so the cottage never ends up on a tiny islet or in a sealed-off valley.
function findMainland(world) {
  const { width, height } = world;
  const region = new Int32Array(width * height).fill(-1);
  let largest = -1;
  let largestSize = 0;

  for (let start = 0; start < region.length; start++) {
    if (region[start] !== -1 || TILES[world.ground[start]].solid) continue;
    // Flood fill: spread from this cell to every walkable neighbour it can reach. Trees and rocks
    // don't count as walls here, since they can be chopped down.
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
        if (region[n] === -1 && !TILES[world.ground[n]].solid) {
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
      if (!FIELD_TILES.has(world.ground[i]) || !mainland[i]) return false;
      if (world.objects[i]) obstacles++;
    }
  }
  return obstacles <= width * height * 0.06;
}

function buildCottage(world, left, top) {
  const width = COTTAGE[0].length;
  const height = COTTAGE.length;
  // Clear the ground around the cottage, and the rows above it where the roof stands, so nothing
  // grows through the house and the door never opens onto a tree.
  for (let y = top - 4; y <= top + height; y++) {
    for (let x = left - 1; x <= left + width; x++) {
      if (!inBounds(world, x, y)) continue;
      const i = y * world.width + x;
      world.objects[i] = null;
      if (TILES[world.ground[i]].solid) world.ground[i] = 'grass';
    }
  }
  COTTAGE.forEach((row, dy) => {
    [...row].forEach((char, dx) => {
      const cell = COTTAGE_LEGEND[char];
      if (!cell) return;
      setGround(world, left + dx, top + dy, cell.ground);
      setObject(world, left + dx, top + dy, cell.object || null);
    });
  });

  // The walls are the run of '#' along the top row and down the left side.
  const wallWidth = COTTAGE[0].lastIndexOf('#') + 1;
  const wallHeight = COTTAGE.findIndex((row) => row[0] !== '#');
  const doorX = left + COTTAGE[wallHeight - 1].indexOf('+');
  world.house = { left, top, width: wallWidth, height: wallHeight, doorX };
  world.spawn = { x: left + COTTAGE_SPAWN.x, y: top + COTTAGE_SPAWN.y };
}

// ---- Looking things up ----

function inBounds(world, x, y) {
  return x >= 0 && y >= 0 && x < world.width && y < world.height;
}

// The ground definition at a tile, or null outside the map.
function groundAt(world, x, y) {
  if (!inBounds(world, x, y)) return null;
  return TILES[world.ground[y * world.width + x]];
}

// The object standing on a tile, or null if there's none.
function objectAt(world, x, y) {
  if (!inBounds(world, x, y)) return null;
  const key = world.objects[y * world.width + x];
  return key ? OBJECTS[key] : null;
}

// What stops the player at a tile, or null if they can walk there.
function blockerAt(world, x, y) {
  const ground = groundAt(world, x, y);
  if (!ground) return { blocked: "You can't go that way." };
  const object = objectAt(world, x, y);
  if (object && object.solid) return object;
  return ground.solid ? ground : null;
}

function insideHouse(world, x, y) {
  const house = world.house;
  return (
    x >= house.left && x < house.left + house.width && y >= house.top && y < house.top + house.height
  );
}

function setGround(world, x, y, key) {
  if (inBounds(world, x, y)) world.ground[y * world.width + x] = key;
}

function setObject(world, x, y, key) {
  if (!inBounds(world, x, y)) return;
  const i = y * world.width + x;
  world.objects[i] = key;
  world.damage.delete(i);
  world.clawed.delete(i);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
