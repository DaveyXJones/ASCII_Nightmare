// Draws the world in a three-quarter view: looking down at the island from above and a little in
// front, like a tabletop. The ground is drawn flat first. Then everything that stands up (trees,
// rocks, cliffs, walls, the player) is drawn row by row from the back of the screen to the front,
// so whatever is nearer the bottom of the screen overlaps whatever stands behind it.
//
// Drawing thousands of characters every frame is too slow for a phone, so three things are kept
// ready-drawn and copied onto the screen instead:
//   the glyph atlas   every character, in every color, drawn once
//   sprite images     every sprite (a tree, a rock, a frame of the player) drawn once
//   the ground cache  the ground and the cliffs around the screen; as the camera moves only the
//                     strip coming into view is drawn, and the water is redrawn when it ripples
//
// At night the darkness goes over all of it in one more draw: a small picture of the dark,
// rubbed out around each light, stretched to fit the screen.
//
// All drawing is in device pixels so the characters stay crisp on high-density phone screens.

const VIEW_ROWS = 25; // about how many rows of tiles fit the height of the screen
const MIN_ROW_CSS = 13; // never draw rows shorter than this many CSS pixels
const MAX_ROW_CSS = 24;
const MAP_FONT = '"Nightmare Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace';
const CAMERA_FOLLOW = 8; // how quickly the camera catches up with the player (higher is snappier)
const WALL_ROWS = 3; // how tall the cottage walls stand, in rows
const CLIFF_REACH_ROWS = MOUNTAIN_LEVELS.length + 1; // the tallest cliff
const SPRITE_REACH_ROWS = 8; // the tallest sprite: ones standing just below the screen still poke up
const SPRITE_REACH_TILES = 3; // how far a sprite can stick out sideways from its tile
const GROUND_MARGIN_TILES = 6; // ground drawn ahead past each side of the screen
const GROUND_MARGIN_ROWS = 5;
const VOID_COLOR = '#0a1930'; // beyond the edge of the world: more deep sea
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.3)';
const BANK_COLOR = '#2a2214'; // the earth bank where land drops into water
const TARGET_COLOR = '#ffd75e';
const BLOCKED_COLOR = '#ff6b5e'; // brackets round a spot you can't build on
const TOOL_COLOR = '#cfd4d8'; // the tool in the player's hand
const WALK_FRAME_TILES = 0.45; // how far the player walks on each picture of the walking animation
const WALK_BOB = 0.08; // how far the player rises as their legs pass, in rows
const BLINK_SECONDS = 0.12;
const HURT_COLOR = '#ff3a2a'; // the player flashes this color when something hurts them
const TINT_SHARE = 0.6; // how far a tinted sprite's colors are pushed toward the tint, from 0 to 1
const HURT_FLASH_SECONDS = 0.4; // how long the player flashes after a bite
const HURT_BLINK_SECONDS = 0.08; // how fast they flash on and off
const STARVE_FLASH_EVERY = 1.5; // while hunger or thirst is hurting, a flash this often, in seconds
const STARVE_FLASH_SECONDS = 0.16;
const KNEEL_SECONDS = 0.35; // collapsing: how long the player sinks to their knees before falling
const DOOR_OPEN_REACH = 1.4; // a door you've built stands open while you're this close, in tiles
const OUTLINE_COLOR = 'rgba(6, 8, 6, 0.85)'; // the thin dark edge round the player (Outline in the menu)
const OUTLINE_CSS = 1; // how thick it is, in CSS pixels
const OUTLINE_KEY = 'ascii-nightmare-outline'; // where the Outline on/off choice is kept (see save.js)
const GHOST_ALPHA = 0.55; // how solid the see-through copy in build mode looks
const NIGHT_SCALE = 4; // the dark is drawn this many times smaller than the screen, then stretched
const EYES_REACH = 2; // with no light at all you can still make out this far around you, in tiles
const EYES_STRENGTH = 0.5; // ...but only dimly: how much of the dark your eyes see through
const FLICKER = 0.06; // how much a flame's light wavers, as a share of how far it reaches
const WINDOW_INSET = 3; // the cottage's front windows start this many characters in from each corner
const WINDOW_REACH = 1.6; // how far the lamplight from each window spills at night, in tiles
const CLOUD_SHADOW = 0.38; // how dark the shadows of passing clouds are, at their darkest
const CLOUD_TILES = 64; // the cloud shadows repeat every this many tiles (it's one small picture, tiled)
const FLASH_LIGHTS = 0.9; // how much of the dark a flash of lightning takes away, from 0 to 1
const FLASH_WASH = 0.16; // and how white it turns the whole picture for that moment
const RAIN_DROPS = 0.18; // falling raindrops on the screen in pouring rain, per tile showing
const RAIN_FALL_ROWS = [4, 10]; // how far each drop falls before it lands, in rows
const RAIN_SPEED = 26; // how fast drops fall, in rows per second
const RAIN_SLANT = 0.3; // how far a drop blows sideways as it falls, compared to how far it falls
const RAIN_SPLASH = 0.35; // how many of the drops that land make a splash, from 0 to 1
const RAIN_ALPHA = 0.85; // how solid the rain looks
const RAIN_COLORS = ['#b4c8dc', '#d6e2ee', '#9fb6cc'];
// The furthest any object's light reaches, in tiles, so lights just off the screen still shine in.
const LIGHT_REACH = Math.ceil(Math.max(0, ...Object.values(OBJECTS).map((object) => object.light || 0)));

const view = {
  canvas: null,
  ctx: null,
  dpr: 1,
  width: 0, // canvas size in device pixels
  height: 0,
  cw: 0, // one character cell, in device pixels
  ch: 0,
  tw: 0, // one tile: two cells side by side
  th: 0,
  font: '',
  boldFont: '',
  fontSize: 0, // in device pixels
  baseline: 0, // where to put the text baseline inside a cell so block characters fill it
  camX: 0, // the world position, in tiles, at the middle of the screen
  camY: 0,
  originX: 0, // where the top-left corner of tile (0, 0) lands on screen
  originY: 0,
  atlas: null,
  playerBox: null, // where the player was drawn this frame, to tell if anything covered them
  playerCovered: false,
  shades: [], // the creatures drawn this frame and where, for their eyes: { creature, left, top, hidden }
};

function setupView(canvas) {
  view.canvas = canvas;
  view.ctx = canvas.getContext('2d', { alpha: false });
}

// Works out the size of a character cell from the size of the screen.
function resizeView() {
  const rect = view.canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const rowCss = Math.max(MIN_ROW_CSS, Math.min(MAX_ROW_CSS, Math.round(rect.height / VIEW_ROWS)));

  view.dpr = dpr;
  view.width = Math.max(1, Math.round(rect.width * dpr));
  view.height = Math.max(1, Math.round(rect.height * dpr));
  view.canvas.width = view.width;
  view.canvas.height = view.height;
  view.ch = Math.round(rowCss * dpr);

  // Size the font so a full block (█) is a touch taller than the row. Block characters then fill
  // their cells exactly, with the overflow trimmed off, and tile without gaps.
  const ctx = view.ctx;
  ctx.font = `100px ${MAP_FONT}`;
  const block = ctx.measureText('█');
  const blockHeight = block.actualBoundingBoxAscent + block.actualBoundingBoxDescent || 116;
  const fontSize = Math.ceil((view.ch / blockHeight) * 100 * 1.02);
  view.fontSize = fontSize;
  view.font = `${fontSize}px ${MAP_FONT}`;
  view.boldFont = `bold ${fontSize}px ${MAP_FONT}`;
  ctx.font = view.font;
  const measured = ctx.measureText('█');
  view.cw = Math.max(1, Math.floor(ctx.measureText('M').width));
  view.baseline = Math.round(
    view.ch / 2 + (measured.actualBoundingBoxAscent - measured.actualBoundingBoxDescent) / 2,
  );
  view.tw = view.cw * 2;
  view.th = view.ch;

  // Everything drawn at the old size is stale now.
  view.atlas = makeAtlas();
  makeGroundCache();
  makeNightLayer();
}

// ---- Glyphs ----

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  return { canvas, ctx: canvas.getContext('2d') };
}

// Each character is drawn once per color onto a hidden sheet, the atlas, and copied from there.
function makeAtlas() {
  const cols = Math.max(1, Math.floor(2048 / view.cw));
  const rows = Math.max(1, Math.floor(2048 / view.ch));
  return { ...makeCanvas(cols * view.cw, rows * view.ch), cols, rows, slots: new Map() };
}

function glyphSlot(char, color, bold) {
  const atlas = view.atlas;
  const key = (bold ? 'b' : '') + char + color;
  let slot = atlas.slots.get(key);
  if (slot !== undefined) return slot;

  if (atlas.slots.size >= atlas.cols * atlas.rows) {
    atlas.ctx.clearRect(0, 0, atlas.canvas.width, atlas.canvas.height);
    atlas.slots.clear();
  }
  slot = atlas.slots.size;
  const x = (slot % atlas.cols) * view.cw;
  const y = Math.floor(slot / atlas.cols) * view.ch;
  const ctx = atlas.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, view.cw, view.ch);
  ctx.clip();
  ctx.font = bold ? view.boldFont : view.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(char, x + view.cw / 2, y + view.baseline);
  ctx.restore();
  atlas.slots.set(key, slot);
  return slot;
}

function drawGlyph(ctx, char, color, x, y, bold = false) {
  if (char === ' ') return;
  const slot = glyphSlot(char, color, bold);
  const atlas = view.atlas;
  const sx = (slot % atlas.cols) * view.cw;
  const sy = Math.floor(slot / atlas.cols) * view.ch;
  ctx.drawImage(atlas.canvas, sx, sy, view.cw, view.ch, x, y, view.cw, view.ch);
}

function fillCell(ctx, color, x, y, w = view.cw, h = view.ch) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Each tile is two characters; each picks its own glyph and color so fields don't look stamped.
function drawGlyphPair(ctx, tile, v, tx, ty, x, y, waterFrame) {
  const glyphs = tile.glyphs;
  const colors = tile.colors;
  for (let half = 0; half < 2; half++) {
    let glyph;
    if (tile.animated) {
      // Ripples roll diagonally across the water as the frame counter ticks.
      const step = tx * 2 + half + 2 * ty + ((v >> (half * 2)) & 3) - waterFrame;
      glyph = glyphs[((step % glyphs.length) + glyphs.length) % glyphs.length];
    } else {
      glyph = glyphs[(v >> (half * 3)) % glyphs.length];
    }
    drawGlyph(ctx, glyph, colors[(v >> (1 + half * 4)) % colors.length], x + half * view.cw, y);
  }
}

// ---- Sprites ----

// A sprite's picture, drawn the first time it's needed at the current size. With a `tint`, a color,
// every color in the picture is pushed most of the way toward it: the player flashing red when hurt.
// Each tint is drawn once and kept too. Setting `sprite.imageAtlas = null` throws them all away, to
// be drawn again (dressPlayer() in sprites.js does that when the player's colors change).
function spriteImage(sprite, tint = null) {
  if (sprite.imageAtlas !== view.atlas) {
    sprite.images = {};
    sprite.imageAtlas = view.atlas;
  }
  const key = tint || 'plain';
  if (sprite.images[key]) return sprite.images[key];
  const color = (value) => (tint ? blendColor(value, tint, TINT_SHARE) : value);
  const { canvas, ctx } = makeCanvas(sprite.width * view.cw, sprite.cells.length * view.th);
  for (let r = 0; r < sprite.cells.length; r++) {
    const cells = sprite.cells[r];
    const paint = sprite.paintCells[r];
    for (let c = 0; c < cells.length; c++) {
      const ink = sprite.ink[paint[c]];
      if (!ink) continue;
      const x = c * view.cw;
      const y = r * view.th;
      if (ink[1]) fillCell(ctx, color(ink[1]), x, y);
      drawGlyph(ctx, cells[c], color(ink[0]), x, y, sprite.bold);
    }
  }
  sprite.images[key] = canvas;
  return canvas;
}

// Draws a sprite standing on a tile: its bottom row on the tile, the rest rising above it, its colors
// pushed toward `tint` if there's one (a plant gone dry).
function drawSprite(sprite, tx, ty, offsetX = 0, tint = null) {
  const image = spriteImage(sprite, tint);
  const left = screenX(tx) + view.cw - Math.round((sprite.width * view.cw) / 2) + offsetX;
  const top = screenY(ty + 1) - image.height;
  view.ctx.drawImage(image, left, top);
  noteDrawn(left, top, left + image.width, top + image.height);
}

// ---- Camera ----

function cameraTarget(player) {
  // Aim a little above the feet so the player's whole body sits in the middle of the screen.
  return { x: player.x, y: player.y - 1 };
}

function snapCamera(world, player) {
  const target = cameraTarget(player);
  view.camX = target.x;
  view.camY = target.y;
  placeCamera(world);
}

function followCamera(world, player, dt) {
  const target = cameraTarget(player);
  const t = 1 - Math.exp(-CAMERA_FOLLOW * dt);
  view.camX += (target.x - view.camX) * t;
  view.camY += (target.y - view.camY) * t;
  placeCamera(world);
}

// Keeps the camera inside the world and works out where tile (0, 0) lands on screen.
function placeCamera(world) {
  const halfW = view.width / view.tw / 2;
  const halfH = view.height / view.th / 2;
  // A world smaller than the screen sits in the middle of it instead.
  const clamp = (value, half, size) =>
    size > half * 2 ? Math.max(half, Math.min(size - half, value)) : size / 2;
  view.camX = clamp(view.camX, halfW, world.width);
  view.camY = clamp(view.camY, halfH, world.height);
  view.originX = Math.round(view.width / 2 - view.camX * view.tw);
  view.originY = Math.round(view.height / 2 - view.camY * view.th);
}

function screenX(tileX) {
  return view.originX + tileX * view.tw;
}

function screenY(tileY) {
  return view.originY + tileY * view.th;
}

// ---- The frame ----

// The tiles the screen shows: { left, right, top, bottom }.
function screenRange() {
  return {
    left: Math.floor(-view.originX / view.tw),
    right: Math.ceil((view.width - view.originX) / view.tw),
    top: Math.floor(-view.originY / view.th),
    bottom: Math.ceil((view.height - view.originY) / view.th),
  };
}

function drawFrame(game) {
  const { world, player } = game;
  const ctx = view.ctx;
  const inside = insideHouse(world, Math.floor(player.x), Math.floor(player.y));
  const range = screenRange();

  ctx.globalAlpha = 1;
  updateGroundCache(game, range);
  ctx.drawImage(groundCache.canvas, screenX(groundCache.left), screenY(groundCache.top));

  drawShadows(game, range, inside);
  if (game.fishing) drawBobber(game);
  drawStanding(game, range, inside);
  if (game.fishing) drawFishingLine(game);
  drawRain(world.house, inside);

  if (inside) dimOutside(world.house);
  if (view.playerCovered) drawPlayer(game, 0.4);
  drawParticles(game.fx);
  drawNight(game, range, inside);
  drawEyes(game);
  if (game.shot && game.time - game.shot.at < SHOT_SECONDS) drawShot(game);
  // Above the dark, so you can always see what the button will use and where you're building.
  if (game.target) drawTarget(game.target, game.time);
  if (game.buildSpot) drawBuildSpot(game);
  drawFloaters(game.fx);
}

// ---- The ground cache ----

const groundCache = {
  canvas: null,
  ctx: null,
  spare: null, // a second canvas to copy into when the camera moves
  cols: 0, // its size, in tiles
  rows: 0,
  left: 0, // the tile at its top-left corner
  top: 0,
  world: null, // the world it shows, or null when it needs drawing from scratch
  waterFrame: 0,
};

function makeGroundCache() {
  groundCache.cols = Math.ceil(view.width / view.tw) + 2 + GROUND_MARGIN_TILES * 2;
  groundCache.rows = Math.ceil(view.height / view.th) + 2 + GROUND_MARGIN_ROWS * 2;
  const size = [groundCache.cols * view.tw, groundCache.rows * view.th];
  Object.assign(groundCache, makeCanvas(...size));
  groundCache.spare = makeCanvas(...size);
  groundCache.world = null;
}

// Makes sure the cache covers the screen, drawing whatever has just come into view.
function updateGroundCache(game, range) {
  const cache = groundCache;
  const { world } = game;
  const covered =
    cache.world === world &&
    range.left >= cache.left &&
    range.top >= cache.top &&
    range.right < cache.left + cache.cols &&
    range.bottom < cache.top + cache.rows;

  if (!covered) {
    const left = range.left - GROUND_MARGIN_TILES;
    const top = range.top - GROUND_MARGIN_ROWS;
    const dx = left - cache.left;
    const dy = top - cache.top;
    const right = left + cache.cols - 1;
    const bottom = top + cache.rows - 1;

    if (cache.world !== world || Math.abs(dx) >= cache.cols || Math.abs(dy) >= cache.rows) {
      cache.left = left;
      cache.top = top;
      cache.waterFrame = game.waterFrame;
      drawGroundRegion(world, left, top, right, bottom);
    } else {
      // Slide what's already drawn over, then fill in the strips along the edges.
      const spare = cache.spare;
      spare.ctx.clearRect(0, 0, spare.canvas.width, spare.canvas.height);
      spare.ctx.drawImage(cache.canvas, -dx * view.tw, -dy * view.th);
      cache.spare = { canvas: cache.canvas, ctx: cache.ctx };
      cache.canvas = spare.canvas;
      cache.ctx = spare.ctx;
      cache.left = left;
      cache.top = top;
      if (dx > 0) drawGroundRegion(world, right - dx + 1, top, right, bottom);
      if (dx < 0) drawGroundRegion(world, left, top, left - dx - 1, bottom);
      if (dy > 0) drawGroundRegion(world, left, bottom - dy + 1, right, bottom);
      if (dy < 0) drawGroundRegion(world, left, top, right, top - dy - 1);
    }
    cache.world = world;
  }

  if (cache.waterFrame !== game.waterFrame) {
    cache.waterFrame = game.waterFrame;
    redrawWater(world);
  }
}

// Draws a rectangle of tiles into the cache: the ground, then the cliffs that stand in it.
function drawGroundRegion(world, x0, y0, x1, y1) {
  const cache = groundCache;
  const ctx = cache.ctx;
  const px = (tx) => (tx - cache.left) * view.tw;
  const py = (ty) => (ty - cache.top) * view.th;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px(x0), py(y0), (x1 - x0 + 1) * view.tw, (y1 - y0 + 1) * view.th);
  ctx.clip();
  fillCell(ctx, VOID_COLOR, px(x0), py(y0), (x1 - x0 + 1) * view.tw, (y1 - y0 + 1) * view.th);

  const left = Math.max(0, x0);
  const right = Math.min(world.width - 1, x1);
  for (let ty = Math.max(0, y0); ty <= Math.min(world.height - 1, y1); ty++) {
    for (let tx = left; tx <= right; tx++) {
      drawGroundTile(ctx, world, tx, ty, px(tx), py(ty), cache.waterFrame);
    }
  }
  // Cliffs rise up from below, so ones standing a few rows past the bottom still reach in.
  for (let ty = Math.max(0, y0); ty <= Math.min(world.height - 1, y1 + CLIFF_REACH_ROWS); ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (TILES[world.ground[ty * world.width + tx]].raised) drawMountain(ctx, world, tx, ty, px(tx), py(ty));
    }
  }
  ctx.restore();
}

function drawGroundTile(ctx, world, tx, ty, x, y, waterFrame) {
  const i = ty * world.width + tx;
  const key = world.ground[i];
  const tile = TILES[key];
  if (tile.raised) return; // mountains are drawn afterwards, standing up
  fillCell(ctx, tile.bgs[world.shades[i] % tile.bgs.length], x, y, view.tw, view.th);

  if (key === 'wall') {
    // The tops of the cottage walls, seen when the roof is off. The logs run along each wall.
    const upright = world.ground[i - world.width] === 'wall' || world.ground[i + world.width] === 'wall';
    drawGlyph(ctx, upright ? '║' : '═', tile.colors[0], x, y);
    drawGlyph(ctx, upright ? '║' : '═', tile.colors[0], x + view.cw, y);
    return;
  }
  drawGlyphPair(ctx, tile, world.variants[i], tx, ty, x, y, waterFrame);

  const north = groundAt(world, tx, ty - 1);
  if (tile.animated && north && !north.animated && !north.raised) {
    // Land to the north stands a little above the water: show its earth bank.
    fillCell(ctx, BANK_COLOR, x, y, view.tw, Math.round(view.th * 0.3));
  } else if (!tile.animated && north && north.raised) {
    // The ground at the foot of a cliff is in its shade.
    fillCell(ctx, SHADOW_COLOR, x, y, view.tw, Math.round(view.th * 0.55));
  }
}

// Draws one tile of ground again, after it's changed under the cache (a floor laid or taken up).
// Off the cached area there's nothing to do: it's drawn fresh when it comes into view.
function redrawGround(world, x, y) {
  const cache = groundCache;
  const cached = x >= cache.left && y >= cache.top && x < cache.left + cache.cols && y < cache.top + cache.rows;
  if (cache.world === world && cached) drawGroundRegion(world, x, y, x, y);
}

function redrawWater(world) {
  const cache = groundCache;
  const ctx = cache.ctx;
  const left = Math.max(0, cache.left);
  const right = Math.min(world.width - 1, cache.left + cache.cols - 1);
  const bottom = Math.min(world.height - 1, cache.top + cache.rows - 1);
  for (let ty = Math.max(0, cache.top); ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (!TILES[world.ground[ty * world.width + tx]].animated) continue;
      const x = (tx - cache.left) * view.tw;
      const y = (ty - cache.top) * view.th;
      drawGroundTile(ctx, world, tx, ty, x, y, cache.waterFrame);
    }
  }
}

// A mountain tile is a block of rock: its top is lifted up by its height, and below the top is a
// cliff face. Tiles are drawn back to front, so the cliffs of nearer tiles cover the ones behind.
// (x, y) is where the tile's own cell is; the block rises above it.
function drawMountain(ctx, world, tx, ty, x, y) {
  const i = ty * world.width + tx;
  const tile = TILES.mountain;
  const height = world.heights[i];
  const v = world.variants[i];
  const topY = y - height * view.th;

  // The highest step is capped with snow; lower steps are bare rock, lighter the higher they are.
  const peak = height > MOUNTAIN_LEVELS.length;
  const topStyle = peak ? tile.peak : tile;
  const topBg = peak
    ? topStyle.bgs[v % topStyle.bgs.length]
    : tile.bgs[Math.min(height - 2, tile.bgs.length - 1)];
  fillCell(ctx, topBg, x, topY, view.tw, view.th);
  drawGlyphPair(ctx, topStyle, v, tx, ty, x, topY, 0);
  if (!cliffShows(world, i)) return;

  // A lit lip along the edge of the top, then the cliff, darkest at its foot.
  drawGlyph(ctx, '▁', topStyle.colors[0], x, topY);
  drawGlyph(ctx, '▁', topStyle.colors[0], x + view.cw, topY);
  const face = tile.face;
  for (let row = 1; row <= height; row++) {
    const rowY = topY + row * view.th;
    fillCell(ctx, face.bgs[row === height ? 2 : row === 1 ? 0 : 1], x, rowY, view.tw, view.th);
    for (let half = 0; half < 2; half++) {
      const glyph = face.glyphs[((v >> (half * 2)) + row * 3 + tx * 5) % face.glyphs.length];
      drawGlyph(ctx, glyph, face.colors[row === height ? 1 : 0], x + half * view.cw, rowY);
    }
  }
}

// A cliff face only shows if the tile in front of it is lower; otherwise that tile covers it.
function cliffShows(world, i) {
  const south = i + world.width;
  if (south >= world.ground.length) return true;
  return !TILES[world.ground[south]].raised || world.heights[south] < world.heights[i];
}

// ---- Shadows ----

// The light comes from the top left, so shadows fall down and to the right of whatever casts them.
function drawShadows(game, range, inside) {
  const { world, player } = game;
  const ctx = view.ctx;
  // With the sun gone, so are the shadows it casts.
  ctx.globalAlpha = 1 - game.sky.darkness;
  ctx.fillStyle = SHADOW_COLOR;
  ctx.beginPath();
  const bottom = Math.min(world.height - 1, range.bottom);
  const right = Math.min(world.width - 1, range.right + 1);
  for (let ty = Math.max(0, range.top); ty <= bottom; ty++) {
    for (let tx = Math.max(0, range.left - 1); tx <= right; tx++) {
      const key = world.objects[ty * world.width + tx];
      if (!key) continue;
      const shadow = SPRITES[objectLook(world, OBJECTS[key], tx, ty).sprite].shadow;
      if (shadow) addShadow(tx + 0.5 + shadow * 0.08, ty + 0.75, shadow * 0.32, 0.42);
    }
  }
  if (!inside) {
    const house = world.house;
    ctx.rect(
      screenX(house.left + house.width),
      screenY(house.top - 1),
      Math.round(view.tw * 0.6),
      (house.height + 1) * view.th,
    );
  }
  addShadow(player.x + 0.1, player.y + 0.1, 0.4, 0.3);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// Adds an oval to the shadow path. Overlapping shadows merge rather than doubling up.
function addShadow(cx, cy, radiusTiles, radiusRows) {
  const x = screenX(cx);
  const y = screenY(cy);
  const rx = radiusTiles * view.tw;
  view.ctx.moveTo(x + rx, y);
  view.ctx.ellipse(x, y, rx, radiusRows * view.th, 0, 0, Math.PI * 2);
}

// ---- Standing things ----

// Which tiles of the screen have had something standing drawn over them this frame. The cliffs
// are already in the ground cache, underneath everything; a cliff only needs drawing again where
// something standing behind it has been drawn on top of it.
const cover = { stamp: 0, marks: new Uint32Array(0), left: 0, top: 0, cols: 0, rows: 0 };

function resetCover(left, top, right, bottom) {
  cover.left = left;
  cover.top = top;
  cover.cols = right - left + 1;
  cover.rows = bottom - top + 1;
  if (cover.marks.length < cover.cols * cover.rows) cover.marks = new Uint32Array(cover.cols * cover.rows);
  cover.stamp++;
}

function markCover(x0, y0, x1, y1) {
  const c0 = Math.max(0, Math.floor((x0 - view.originX) / view.tw) - cover.left);
  const c1 = Math.min(cover.cols - 1, Math.floor((x1 - 1 - view.originX) / view.tw) - cover.left);
  const r0 = Math.max(0, Math.floor((y0 - view.originY) / view.th) - cover.top);
  const r1 = Math.min(cover.rows - 1, Math.floor((y1 - 1 - view.originY) / view.th) - cover.top);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) cover.marks[r * cover.cols + c] = cover.stamp;
  }
}

function isCovered(tx, rowTop, rowBottom) {
  const c = tx - cover.left;
  if (c < 0 || c >= cover.cols) return false;
  for (let r = Math.max(0, rowTop - cover.top); r <= Math.min(cover.rows - 1, rowBottom - cover.top); r++) {
    if (cover.marks[r * cover.cols + c] === cover.stamp) return true;
  }
  return false;
}

function drawStanding(game, range, inside) {
  const { world, player } = game;
  const house = world.house;
  const left = Math.max(0, range.left - SPRITE_REACH_TILES);
  const right = Math.min(world.width - 1, range.right + SPRITE_REACH_TILES);
  const top = Math.max(0, range.top);
  const bottom = Math.min(world.height - 1, range.bottom + SPRITE_REACH_ROWS);
  let playerDrawn = false;
  view.playerBox = null;
  view.rodTip = null;
  view.heldAt = null;
  view.playerCovered = false;
  view.shades.length = 0;
  resetCover(left, top - SPRITE_REACH_ROWS, right, bottom);

  const placePlayer = () => {
    drawPlayer(game, 1);
    playerDrawn = true;
  };
  // Creatures roam freely like the player, so they're drawn the same way: from the back of the
  // screen to the front, each as soon as its feet are behind the line its row is drawn at.
  const creatures = game.creatures
    .filter((c) => c.x > left - 1 && c.x < right + 2 && c.y > top - 1 && c.y < bottom + 2)
    .sort((a, b) => a.y - b.y);
  let nextCreature = 0;
  const placeCreatures = (line) => {
    while (nextCreature < creatures.length && creatures[nextCreature].y < line) {
      drawCreature(game, creatures[nextCreature++]);
    }
  };

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      const i = ty * world.width + tx;
      if (!TILES[world.ground[i]].raised) continue;
      const rowTop = ty - world.heights[i];
      if (isCovered(tx, rowTop, cliffShows(world, i) ? ty : rowTop)) {
        drawMountain(view.ctx, world, tx, ty, screenX(tx), screenY(ty));
        noteDrawn(screenX(tx), screenY(rowTop), screenX(tx + 1), screenY(ty + 1));
      }
    }
    // Things standing in a row are drawn at the middle of the tile; the player is drawn as soon as
    // their feet are behind that line, so they pass behind a tree's trunk and in front of it.
    if (!playerDrawn && player.y < ty + 0.5) placePlayer();
    placeCreatures(ty + 0.5);
    for (let tx = left; tx <= right; tx++) {
      const i = ty * world.width + tx;
      const key = world.objects[i];
      if (!key) continue;
      const shake = game.fx.shake && game.fx.shake.index === i ? game.fx.shake : null;
      const offset = shake ? Math.round(Math.sin(game.time * 70) * view.cw * 0.2) : 0;
      const tint = OBJECTS[key].crop ? cropTint(world, i) : null;
      drawSprite(objectSprite(game, OBJECTS[key], tx, ty), tx, ty, offset, tint);
    }
    if (inside && ty === house.top) drawHouseImage(backWallImage(house), house.left, house.top - WALL_ROWS);
    if (!inside && ty === house.top + house.height - 1) {
      drawHouseImage(houseImage(house), house.left - 0.5, house.top - WALL_ROWS);
    }
    if (!playerDrawn && player.y < ty + 1) placePlayer();
    placeCreatures(ty + 1);
  }
  if (!playerDrawn) placePlayer();
  placeCreatures(Infinity);
}

// The picture for an object. Ones with `frames`, like a campfire, flicker between pictures; each
// tile starts at a different point so two fires side by side don't flicker in step. A door stands
// open while you're beside it or in it, and a wall clawed halfway through shows the marks. Walls
// and doors in a fence running up the screen use their side-on pictures (objectLook in world.js).
function objectSprite(game, object, tx, ty) {
  const { player, world } = game;
  const look = objectLook(world, object, tx, ty);
  if (look.opens && Math.hypot(tx + 0.5 - player.x, ty + 0.5 - player.y) < DOOR_OPEN_REACH) {
    return SPRITES[look.opens];
  }
  if (look.scarred && (world.clawed.get(ty * world.width + tx) || 0) >= object.claws / 2) {
    return SPRITES[look.scarred];
  }
  if (!object.frames) return SPRITES[look.sprite];
  return SPRITES[object.frames[(game.flameFrame + ty * world.width + tx) % object.frames.length]];
}

// ---- The cottage ----

function drawHouseImage(image, tx, ty) {
  const x = Math.round(screenX(tx));
  const y = screenY(ty);
  view.ctx.drawImage(image, x, y);
  noteDrawn(x, y, x + image.width, y + image.height);
}

// From outside, the cottage is a roof over the whole floor, with the front wall and its door below.
// The roof overhangs the walls by a character on each side.
function houseImage(house) {
  if (house.image && house.imageAtlas === view.atlas) return house.image;
  const wallCols = house.width * 2;
  const roofCols = wallCols + 2;
  const roofRows = house.height;
  const { canvas, ctx } = makeCanvas(roofCols * view.cw, (roofRows + WALL_ROWS) * view.th);
  const doorCol = (house.doorX - house.left) * 2;
  const rightWindow = wallCols - WINDOW_INSET - 2;
  const windowCols = [WINDOW_INSET, WINDOW_INSET + 1, rightWindow, rightWindow + 1];

  for (let r = 0; r < roofRows; r++) {
    const y = r * view.th;
    for (let c = 0; c < roofCols; c++) {
      const x = c * view.cw;
      if (r === 0) {
        drawGlyph(ctx, '▄', '#6b2f22', x, y); // the far slope, mostly out of sight
      } else if (r === 1) {
        fillCell(ctx, '#6b2f22', x, y); // the ridge
        drawGlyph(ctx, c === 0 || c === roofCols - 1 ? ' ' : '═', '#c97a52', x, y);
      } else if (r === roofRows - 1) {
        fillCell(ctx, '#2a160f', x, y); // the eave, throwing shade on the wall below
        drawGlyph(ctx, '▀', '#8a3d2a', x, y);
      } else {
        // Rows of shingles, darker toward the eave.
        fillCell(ctx, r < roofRows / 2 ? '#9a4a33' : '#87402c', x, y);
        drawGlyph(ctx, (c + r) % 2 ? '⌒' : '◠', '#b85c40', x, y);
      }
    }
  }

  for (let r = 0; r < WALL_ROWS; r++) {
    const y = (roofRows + r) * view.th;
    for (let c = 0; c < wallCols; c++) {
      const x = (c + 1) * view.cw;
      if (r >= 1 && (c === doorCol || c === doorCol + 1)) {
        fillCell(ctx, '#1a0f08', x, y); // the open doorway
        if (r === 1) drawGlyph(ctx, '▄', '#2e1d10', x, y);
      } else if (r === 1 && windowCols.includes(c)) {
        fillCell(ctx, '#f2c55c', x, y); // lamplight in the windows
        drawGlyph(ctx, '┼', '#5e3d22', x, y);
      } else if (c === 0 || c === wallCols - 1) {
        fillCell(ctx, '#5e3d22', x, y); // log ends at the corners
        drawGlyph(ctx, '◉', '#c49a62', x, y);
      } else {
        fillCell(ctx, r === 0 ? '#5a3c22' : '#7a5230', x, y); // stacked logs
        drawGlyph(ctx, '═', r === 0 ? '#7a5230' : '#9c6b3c', x, y);
      }
    }
  }
  house.image = canvas;
  house.imageAtlas = view.atlas;
  return canvas;
}

// From inside, the roof is lifted off: you see the back wall standing up, and the tops of the rest.
function backWallImage(house) {
  if (house.backWall && house.backWallAtlas === view.atlas) return house.backWall;
  const cols = house.width * 2;
  const { canvas, ctx } = makeCanvas(cols * view.cw, (WALL_ROWS + 1) * view.th);
  for (let c = 0; c < cols; c++) {
    fillCell(ctx, '#3b2a18', c * view.cw, 0);
    drawGlyph(ctx, '▄', '#a87f4e', c * view.cw, 0);
  }
  for (let r = 1; r <= WALL_ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * view.cw;
      const y = r * view.th;
      fillCell(ctx, r === WALL_ROWS ? '#5a3c22' : '#7a5230', x, y);
      drawGlyph(ctx, '═', '#9c6b3c', x, y);
    }
  }
  house.backWall = canvas;
  house.backWallAtlas = view.atlas;
  return canvas;
}

// Indoors, the world outside the walls falls into shadow.
function dimOutside(house) {
  const ctx = view.ctx;
  const x0 = screenX(house.left);
  const y0 = screenY(house.top - WALL_ROWS);
  const x1 = screenX(house.left + house.width);
  const y1 = screenY(house.top + house.height);
  ctx.fillStyle = 'rgba(4, 6, 8, 0.6)';
  ctx.fillRect(0, 0, view.width, y0);
  ctx.fillRect(0, y1, view.width, view.height - y1);
  ctx.fillRect(0, y0, x0, y1 - y0);
  ctx.fillRect(x1, y0, view.width - x1, y1 - y0);
}

// ---- The player ----

// The look for an action word: its entry in ACTION_POSES (sprites.js) on top of the default.
function actionPose(action) {
  return { ...ACTION_POSES.default, ...ACTION_POSES[action] };
}

// What the player holds for an action: a crafted tool made for it (the axe, for Chop), or else
// whatever ACTION_POSES says. Tools have a picture for facing left and one for every other way.
// `prefer` is the tool that was just used, when more than one could do it (the pistol or the rifle).
function heldGlyph(action, facing, survivor, prefer) {
  const keys = Object.keys(survivor.tools);
  if (prefer && survivor.tools[prefer]) keys.unshift(prefer);
  for (const key of keys) {
    const tool = TOOLS[key];
    if (tool.held && tool.power[action]) return facing === 'left' ? tool.held[0] : tool.held[1];
  }
  return actionPose(action).held;
}

// Which picture to draw the player with right now, what's in their hand, and how far they're
// lifted mid-stride.
function playerPose(game) {
  const { player, survivor } = game;
  const set = PLAYER_SPRITES[player.facing];
  const pose = (name, action) => ({
    sprite: set[name],
    held: action ? heldGlyph(action, player.facing, survivor, player.act && player.act.tool) : null,
    spot: set.held[name],
    // Once you've made a torch, it's in your other hand whatever you're doing.
    torch: survivor.tools.torch ? set.torch[name] || set.torch.stand : null,
    lift: 0,
  });

  // Health has run out: they sink to their knees, then fall on their side. Facing up they fall to
  // the left, facing down to the right.
  if (game.dying) {
    if (game.dying.seconds < KNEEL_SECONDS) return { ...pose('crouch'), torch: null };
    const side = player.facing === 'left' || player.facing === 'up' ? 'left' : 'right';
    return { sprite: PLAYER_SPRITES[side].fallen, held: null, torch: null, lift: 0 };
  }

  // Just did something: swinging, reaching, kneeling to drink.
  if (player.act) {
    const look = actionPose(player.act.action);
    if (player.clock - player.act.at < look.seconds) return pose(look.pose, player.act.action);
  }
  // Holding the button between swings: tool raised (or still kneeling, for a drink).
  if (player.working) {
    const look = actionPose(player.working);
    return pose(look.pose === 'strike' && !look.aim ? 'windup' : look.pose, player.working);
  }
  if (player.moving) {
    const step = Math.floor(player.stride / WALK_FRAME_TILES) % set.walk.length;
    return { ...pose('stand'), sprite: set.walk[step], lift: step % 2 ? Math.round(view.th * WALK_BOB) : 0 };
  }
  if (set.blink && blinking(player.clock)) return pose('blink');
  return pose('stand');
}

// Blinks every few seconds. Two different rhythms laid over each other, so it doesn't look like
// clockwork.
function blinking(clock) {
  return clock % 4.3 < BLINK_SECONDS || (clock + 1.9) % 6.7 < BLINK_SECONDS;
}

// Whether the player is shown flashing red right now: on and off for a moment after a bite, and a
// short flash every so often while hunger or thirst is hurting them. With motion turned down, a bite
// shows as one steady flash instead of flickering.
function hurtFlash(game) {
  const { survivor } = game;
  // The game's clock stops while collapsing, dead or behind a menu, so a flash would never end.
  if (game.dying || game.dead || game.paused) return false;
  const since = game.time - survivor.hurtAt;
  if (since < HURT_FLASH_SECONDS) {
    return reducedMotion.matches || Math.floor(since / HURT_BLINK_SECONDS) % 2 === 0;
  }
  return survivor.starving && game.time % STARVE_FLASH_EVERY < STARVE_FLASH_SECONDS;
}

function drawPlayer(game, alpha) {
  const { world, player } = game;
  const look = playerPose(game);
  const image = spriteImage(look.sprite, hurtFlash(game) ? HURT_COLOR : null);
  const left = Math.round(screenX(player.x) - image.width / 2);
  const top = Math.round(screenY(player.y) + view.th * 0.25) - image.height - look.lift;
  view.ctx.globalAlpha = alpha;
  // Where the thing in hand is: the top end of a rod (╱ leans right, ╲ left), where the fishing
  // line starts, and the middle of a gun, where a shot starts.
  if (look.held && alpha === 1) {
    const lean = look.held === '╲' ? 0 : 1;
    view.rodTip = { x: left + (look.spot[0] + lean) * view.cw, y: top + look.spot[1] * view.th };
    view.heldAt = { x: left + (look.spot[0] + 0.5) * view.cw, y: top + (look.spot[1] + 0.5) * view.th };
  }
  if (outline.on) {
    const { canvas, padX, padY } = outlinedFigure(game, look, image);
    view.ctx.drawImage(canvas, left - padX, top - padY);
  } else {
    drawFigure(view.ctx, game, look, image, left, top);
  }
  view.ctx.globalAlpha = 1;
  if (alpha < 1) return;

  view.playerBox = { x0: left, y0: top, x1: left + image.width, y1: top + image.height };
  markCover(left, top, left + image.width, top + image.height);
  drawGrassOver(world, player.x, player.y);
}

// The player as they stand this moment: their picture, what's in their hand, and the torch.
function drawFigure(ctx, game, look, image, left, top) {
  ctx.drawImage(image, left, top);
  if (look.held) {
    const [col, row] = look.spot;
    drawGlyph(ctx, look.held, TOOL_COLOR, left + col * view.cw, top + row * view.th, true);
  }
  if (look.torch) drawTorch(ctx, game, left + look.torch[0] * view.cw, top + look.torch[1] * view.th);
}

// The player with a thin dark edge round them, so they stand out on busy ground. The figure is drawn
// onto a spare canvas, then copied a pixel or so out in each of eight directions onto a second one,
// turned dark (keeping only its shape), and the figure is put back on top. That's a dozen small
// copies, and the torch and tool in hand get the edge too. It's only done again when the picture
// changes (a step, a swing, the torch flickering). Returns the canvas and how far its top-left
// corner sits out from the picture's.
function outlinedFigure(game, look, image) {
  const edge = Math.max(1, Math.round(view.dpr * OUTLINE_CSS));
  const padX = view.cw + edge; // room for the torch beside the picture...
  const padY = view.th + edge; // ...and its flame above it
  const width = image.width + padX * 2;
  const height = image.height + padY * 2;
  const { figure, edged } = outline;
  const lit = look.torch && game.survivor.torchLeft > 0 ? game.flameFrame % TORCH_LOOK.flames.length : -1;
  const drawn = [image, look.held, look.spot, look.torch, lit, width, height];
  if (outline.drawn && drawn.every((part, n) => part === outline.drawn[n])) {
    return { canvas: edged.canvas, padX, padY };
  }
  outline.drawn = drawn;
  for (const { canvas, ctx } of [figure, edged]) {
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  }
  drawFigure(figure.ctx, game, look, image, padX, padY);
  const ctx = edged.ctx;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx || dy) ctx.drawImage(figure.canvas, dx * edge, dy * edge);
    }
  }
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = OUTLINE_COLOR;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(figure.canvas, 0, 0);
  return { canvas: edged.canvas, padX, padY };
}

function setOutlineOn(on) {
  outline.on = on;
  remember(OUTLINE_KEY, on);
}

// Tall grass in front of someone's feet at (x, y) is drawn again over them, so they wade through
// it, and something crouching in it is half hidden.
function drawGrassOver(world, x, y) {
  const footRow = Math.floor(y);
  for (let ty = footRow; ty <= footRow + 1; ty++) {
    for (let tx = Math.floor(x - 1); tx <= Math.floor(x + 1); tx++) {
      const tile = groundAt(world, tx, ty);
      if (!tile || !tile.tall) continue;
      const v = world.variants[ty * world.width + tx];
      drawGlyphPair(view.ctx, tile, v, tx, ty, screenX(tx), screenY(ty), 0);
    }
  }
}

// The torch in the player's hand at (x, y): its stick, and above that the rag wrapped round its
// top, or a flickering flame once it's lit.
function drawTorch(ctx, game, x, y) {
  const flames = TORCH_LOOK.flames;
  const head = game.survivor.torchLeft > 0 ? flames[game.flameFrame % flames.length] : TORCH_LOOK.rag;
  drawGlyph(ctx, TORCH_LOOK.stick[0], TORCH_LOOK.stick[1], x, y, true);
  drawGlyph(ctx, head[0], head[1], x, y - view.th, true);
}

// Remembers what's been drawn over, so cliffs in front of it can be drawn again, and whether
// anything was drawn over the player, so they can be shown through it as a ghost (walking behind a
// tree or the cottage shouldn't make you vanish).
function noteDrawn(x0, y0, x1, y1) {
  markCover(x0, y0, x1, y1);
  // Anything drawn over a creature's eyes hides them, so they don't shine through a tree or a roof.
  for (const shade of view.shades) {
    const eyes = shade.eyes;
    if (x0 < eyes.x1 && x1 > eyes.x0 && y0 < eyes.y1 && y1 > eyes.y0) shade.hidden = true;
  }
  const box = view.playerBox;
  if (!box || view.playerCovered) return;
  if (x0 < box.x1 - view.cw / 2 && x1 > box.x0 + view.cw / 2 && y0 < box.y1 && y1 > box.y0 + view.th / 2) {
    view.playerCovered = true;
  }
}

// ---- Creatures ----

// A creature (see creatures.js) standing at its feet, like the player: faded in or out as it comes
// out of the dark, shaken for a moment when it's hit, and crouched low while it lurks.
function drawCreature(game, creature) {
  const kind = CREATURES[creature.kind];
  const frame = Math.floor(creature.stride / CREATURE_FRAME_TILES) % kind.frames.length;
  const crouched = creature.state === 'lurk' && kind.crouched;
  const image = spriteImage(SPRITES[crouched || kind.frames[frame]]);
  const hit = game.time - creature.hurtAt < 0.18;
  const shake = hit ? Math.round(Math.sin(game.time * 70) * view.cw * 0.2) : 0;
  const left = Math.round(screenX(creature.x) - image.width / 2) + shake;
  const top = Math.round(screenY(creature.y) + view.th * 0.25) - image.height;
  view.ctx.globalAlpha = creature.fade;
  view.ctx.drawImage(image, left, top);
  view.ctx.globalAlpha = 1;
  noteDrawn(left, top, left + image.width, top + image.height);
  drawGrassOver(game.world, creature.x, creature.y);

  // Where its eyes are, to draw them again above the dark (see drawEyes()).
  const cells = kind.eyes.cells;
  const cols = cells.map(([col]) => col);
  const rows = cells.map(([, row]) => row);
  const eyes = {
    x0: left + Math.min(...cols) * view.cw,
    y0: top + Math.min(...rows) * view.th,
    x1: left + (Math.max(...cols) + 1) * view.cw,
    y1: top + (Math.max(...rows) + 1) * view.th,
  };
  view.shades.push({ creature, left, top, eyes, hidden: false });
}

// Creatures' eyes, drawn over the dark: on a black night they're all you see of them. Not where
// something stands in front of them, and not while they blink.
function drawEyes(game) {
  for (const { creature, left, top, hidden } of view.shades) {
    if (hidden || !eyesOpen(game, creature)) continue;
    const eyes = CREATURES[creature.kind].eyes;
    view.ctx.globalAlpha = creature.fade;
    for (const [col, row] of eyes.cells) {
      drawGlyph(view.ctx, eyes.glyph, eyes.color, left + col * view.cw, top + row * view.th, true);
    }
  }
  view.ctx.globalAlpha = 1;
}

// ---- Night ----

// The dark is drawn onto its own small canvas each frame: filled with the color of the night, then
// rubbed out with a soft round brush wherever there's light, then stretched over the screen in one
// draw. That's a handful of draws however many tiles are showing, which keeps phones fast.
const night = {
  canvas: null,
  ctx: null,
  cut: null, // the soft round brush that rubs the dark away
  glow: null, // the same shape in firelight orange, laid back over the light from flames
  clouds: null, // the shadows of clouds, one pixel per tile, drifting over the island (see weather.js)
  lights: [], // the lights this frame, from findLights()
};

function makeNightLayer() {
  Object.assign(night, makeCanvas(Math.ceil(view.width / NIGHT_SCALE), Math.ceil(view.height / NIGHT_SCALE)));
  if (night.cut) return;
  night.clouds = makeCloudPicture();
  // Fully clear in the middle, fading out to nothing at the edge.
  night.cut = makeBrush([[0, 'rgba(0, 0, 0, 1)'], [0.5, 'rgba(0, 0, 0, 0.94)'], [0.8, 'rgba(0, 0, 0, 0.5)'],
    [1, 'rgba(0, 0, 0, 0)']]);
  night.glow = makeBrush([[0, 'rgba(255, 170, 80, 0.45)'], [0.5, 'rgba(255, 130, 50, 0.2)'],
    [1, 'rgba(255, 110, 40, 0)']]);
}

// A round blob, from the middle out: `stops` are [distance from 0 to 1, color].
function makeBrush(stops) {
  const size = 128;
  const { canvas, ctx } = makeCanvas(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) gradient.addColorStop(at, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

// The same picture also carries the weather: the grey of a cloudy day is part of the sky's darkness,
// the shadows of passing clouds are laid on before the lights are rubbed out, and a flash of
// lightning takes most of the dark away for a moment.
function drawNight(game, range, inside) {
  const sky = game.sky;
  const cloud = sky.weather.cloud;
  const shadows = CLOUD_SHADOW * Math.min(1, cloud * (1 - cloud) * 4); // patchy sky: most shadows
  const flash = lightningAt(game);
  const darkness = sky.darkness * (1 - FLASH_LIGHTS * flash);
  if (darkness <= 0 && shadows <= 0) return;
  const { canvas, ctx } = night;
  const lights = findLights(game, range, inside);

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = darkness;
  ctx.fillStyle = sky.color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (shadows > 0) drawCloudShadows(game, range, shadows * (1 - flash));

  ctx.globalCompositeOperation = 'destination-out';
  for (const light of lights) paintLight(night.cut, light, light.strength);
  // Firelight is warm: tint what it lights orange, more so the darker the night around it.
  ctx.globalCompositeOperation = 'source-over';
  for (const light of lights) if (light.warm) paintLight(night.glow, light, sky.darkness);
  ctx.globalAlpha = 1;

  // Stretched without smoothing: each pixel of the dark becomes a little square, too small to see
  // since the dark only changes gently from one to the next, and far quicker for a phone to draw.
  view.ctx.imageSmoothingEnabled = false;
  view.ctx.drawImage(canvas, 0, 0, canvas.width * NIGHT_SCALE, canvas.height * NIGHT_SCALE);
  view.ctx.imageSmoothingEnabled = true;
  if (flash > 0) {
    view.ctx.globalAlpha = FLASH_WASH * flash;
    view.ctx.fillStyle = '#e4ecff';
    view.ctx.fillRect(0, 0, view.width, view.height);
    view.ctx.globalAlpha = 1;
  }
}

// Soft shadows of clouds blowing across the island. The picture is tiny (one pixel per tile) and
// is stretched smooth, so the shadows have soft edges; it repeats every CLOUD_TILES tiles.
function drawCloudShadows(game, range, alpha) {
  const ctx = night.ctx;
  const size = CLOUD_TILES;
  const drift = game.dayClock * CLOUD_DRIFT;
  const originX = drift * game.sky.weather.wind;
  const originY = drift * 0.4;
  const width = (size * view.tw) / NIGHT_SCALE;
  const height = (size * view.th) / NIGHT_SCALE;
  const firstX = originX + Math.floor((range.left - originX) / size) * size;
  const firstY = originY + Math.floor((range.top - originY) / size) * size;
  ctx.globalAlpha = alpha;
  for (let tx = firstX; tx < range.right; tx += size) {
    for (let ty = firstY; ty < range.bottom; ty += size) {
      ctx.drawImage(night.clouds, screenX(tx) / NIGHT_SCALE, screenY(ty) / NIGHT_SCALE, width, height);
    }
  }
}

// Blobs of shadow, made once: smooth noise that wraps round at the edges, so copies of the picture
// laid side by side join up without a seam.
function makeCloudPicture() {
  const size = CLOUD_TILES;
  const { canvas, ctx } = makeCanvas(size, size);
  const picture = ctx.createImageData(size, size);
  // Value noise on a grid of `cells` across the picture, whose far edge wraps back to the near one.
  const wrapped = (x, y, cells, seed) => {
    const gx = (x / size) * cells;
    const gy = (y / size) * cells;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const at = (i, j) => hash2(i % cells, j % cells, seed);
    const sx = smoothstep(gx - x0);
    const sy = smoothstep(gy - y0);
    return lerp(lerp(at(x0, y0), at(x0 + 1, y0), sx), lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), sx), sy);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = wrapped(x, y, 5, 61) * 0.65 + wrapped(x, y, 10, 62) * 0.35;
      const p = (y * size + x) * 4;
      picture.data.set([6, 10, 20, Math.round(smoothstep(clamp01((n - 0.47) / 0.2)) * 255)], p);
    }
  }
  ctx.putImageData(picture, 0, 0);
  return canvas;
}

// Lays a brush over the dark around a light. Tiles are wider than they are tall, so the light is
// an oval on screen, round on the ground.
function paintLight(brush, light, alpha) {
  const rx = (light.reach * view.tw) / NIGHT_SCALE;
  const ry = (light.reach * view.th) / NIGHT_SCALE;
  const x = screenX(light.x) / NIGHT_SCALE;
  const y = screenY(light.y) / NIGHT_SCALE;
  night.ctx.globalAlpha = alpha;
  night.ctx.drawImage(brush, x - rx, y - ry, rx * 2, ry * 2);
}

// Every light on the screen or near enough to shine onto it, as { x, y, reach, strength, warm }:
// where it is in tiles, how far it reaches in tiles, how much of the dark it clears (1 for all of
// it), and whether it's firelight.
function findLights(game, range, inside) {
  const { world, player, survivor } = game;
  const lights = night.lights;
  lights.length = 0;

  // Your torch, held up at about chest height. Without one, your eyes still pick out a little at
  // night (but not through the grey of a cloudy day: that isn't dark enough to need it).
  const torch = torchReach(survivor);
  const sky = game.sky;
  // A gunshot's flash lights everything round you for a moment (not with motion turned down).
  if (game.shot && game.time - game.shot.at < MUZZLE_FLASH_SECONDS && !reducedMotion.matches) {
    lights.push({ x: player.x, y: player.y - 1, reach: MUZZLE_FLASH_REACH, strength: 1, warm: true });
  }
  if (torch > 0) {
    lights.push({ x: player.x, y: player.y - 1, reach: torch * flicker(game, 0), strength: 1, warm: true });
  } else if (sky.gloom > 0) {
    const strength = EYES_STRENGTH * (sky.gloom / sky.darkness);
    lights.push({ x: player.x, y: player.y - 1, reach: EYES_REACH, strength, warm: false });
  }

  const left = Math.max(0, range.left - LIGHT_REACH);
  const right = Math.min(world.width - 1, range.right + LIGHT_REACH);
  const bottom = Math.min(world.height - 1, range.bottom + LIGHT_REACH);
  for (let ty = Math.max(0, range.top - LIGHT_REACH); ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      const i = ty * world.width + tx;
      const light = objectLight(world, i);
      if (!light) continue;
      // Lights indoors, like the candle, are hidden under the roof until you go in.
      if (!inside && insideHouse(world, tx, ty)) continue;
      lights.push({ x: tx + 0.5, y: ty, reach: light * flicker(game, i), strength: 1, warm: true });
    }
  }

  // From outside, lamplight spills from the cottage's two front windows (see houseImage()).
  if (!inside) {
    const house = world.house;
    const y = house.top + house.height - 1.5;
    const inset = (WINDOW_INSET + 1) / 2;
    for (const x of [house.left + inset, house.left + house.width - inset]) {
      lights.push({ x, y, reach: WINDOW_REACH, strength: 0.85, warm: true });
    }
  }
  return lights;
}

// Flames waver: each light's reach jumps a little whenever the campfire flames flicker, and holds
// still when motion is turned down (the flame counter stops then).
function flicker(game, seed) {
  return 1 + FLICKER * (hash2(game.flameFrame, seed, 99) * 2 - 1);
}

// ---- Rain ----

// Raindrops are characters falling down the screen, each toward a spot on the ground (in tiles, so
// they stay put as the camera moves). One that lands might splash, and another starts falling
// somewhere else. How many there are follows how hard it's raining (weatherAt() in weather.js).
const rain = { drops: [] };

// The player's outline: whether it's on, and two small canvases reused every frame to make it.
// `drawn` says what's on them, so a frame where nothing about the player's picture changed reuses it.
const outline = { on: true, figure: makeCanvas(1, 1), edged: makeCanvas(1, 1), drawn: null };

// Moves the rain on by `dt` seconds. Called every frame before drawing.
function stepRain(game, dt) {
  const { weather } = game.sky;
  const drops = rain.drops;
  const range = screenRange();
  const tiles = (range.right - range.left + 1) * (range.bottom - range.top + 1);
  const wanted = Math.round(weather.rain * RAIN_DROPS * tiles);
  const fall = reducedMotion.matches ? 0 : RAIN_SPEED * dt; // with motion turned down, rain hangs still
  const drift = (fall * RAIN_SLANT * weather.wind * view.th) / view.tw;
  for (let n = drops.length - 1; n >= 0; n--) {
    const drop = drops[n];
    drop.z -= fall;
    drop.x += drift;
    const offScreen = drop.x < range.left - 3 || drop.x > range.right + 3 || drop.y < range.top ||
      drop.y > range.bottom + RAIN_FALL_ROWS[1];
    if (drop.z > drop.land && !offScreen) continue;
    if (!offScreen && Math.random() < RAIN_SPLASH) splash(game, drop);
    if (drops.length > wanted) drops.splice(n, 1);
    else drops[n] = newDrop(game, range, weather, false);
  }
  while (drops.length < wanted) drops.push(newDrop(game, range, weather, true));
}

// A drop starting to fall toward a spot on the screen (or just below it, since it falls from higher
// up). `anywhere` starts it partway down, for when the rain is just starting. On the cottage, drops
// land on the roof, which stands WALL_ROWS high; with you inside, none fall in the cottage at all.
function newDrop(game, range, weather, anywhere) {
  const { world, player } = game;
  const inside = insideHouse(world, Math.floor(player.x), Math.floor(player.y));
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 4; tries++) {
    x = range.left - 2 + Math.random() * (range.right - range.left + 4);
    y = range.top + Math.random() * (range.bottom - range.top + RAIN_FALL_ROWS[1]);
    if (!inside || !insideHouse(world, Math.floor(x), Math.floor(y))) break;
  }
  const land = !inside && insideHouse(world, Math.floor(x), Math.floor(y)) ? WALL_ROWS : 0;
  const height = between(RAIN_FALL_ROWS);
  return {
    x,
    y,
    land,
    z: land + (anywhere ? Math.random() * height : height),
    glyph: Math.random() < 0.55 ? (weather.wind < 0 ? '/' : '\\') : '\'',
    color: RAIN_COLORS[Math.floor(Math.random() * RAIN_COLORS.length)],
  };
}

// A drop hitting the ground: a speck that hops up, or a ring on water.
function splash(game, drop) {
  const ground = groundAt(game.world, Math.floor(drop.x), Math.floor(drop.y));
  const water = ground && ground.animated && drop.land === 0;
  game.fx.particles.push({
    x: drop.x,
    y: drop.y,
    z: drop.land,
    vx: (Math.random() - 0.5) * 0.6,
    vy: 0,
    vz: water ? 0 : 1.2,
    glyph: water ? '°' : Math.random() < 0.5 ? ',' : '.',
    color: water ? '#b8dcf8' : '#b3c4d6',
    life: 0.18,
  });
}

// The drops, over everything standing. Indoors, none are drawn over the cottage, so it stays dry.
function drawRain(house, inside) {
  if (rain.drops.length === 0) return;
  const ctx = view.ctx;
  ctx.save();
  if (inside) {
    ctx.beginPath();
    ctx.rect(0, 0, view.width, view.height);
    const x0 = screenX(house.left);
    const y0 = screenY(house.top - WALL_ROWS);
    ctx.rect(x0, y0, screenX(house.left + house.width) - x0, screenY(house.top + house.height) - y0);
    ctx.clip('evenodd');
  }
  ctx.globalAlpha = RAIN_ALPHA;
  for (const drop of rain.drops) {
    const x = Math.round(screenX(drop.x) - view.cw / 2);
    const y = Math.round(screenY(drop.y - drop.z) - view.th);
    drawGlyph(ctx, drop.glyph, drop.color, x, y, true);
  }
  ctx.restore();
}

// ---- The Your look panel ----

const LOOK_SCALE = 2; // the player on the Your look panel is drawn this many times bigger than on the map

// Draws pictures of the player side by side, big, with a character's gap between them. This is
// only drawn when you pick a color, not every frame, so it draws each character straight onto the
// canvas instead of going through the atlas (which only holds map-sized characters).
function drawLookPicture(canvas, pictures) {
  const cw = view.cw * LOOK_SCALE;
  const ch = view.ch * LOOK_SCALE;
  const rows = Math.max(...pictures.map((picture) => picture.cells.length));
  const cols = pictures.reduce((total, picture) => total + picture.width, pictures.length - 1);
  canvas.width = cols * cw;
  canvas.height = rows * ch;
  canvas.style.width = `${canvas.width / view.dpr}px`;
  canvas.style.height = `${canvas.height / view.dpr}px`;
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${view.fontSize * LOOK_SCALE}px ${MAP_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let left = 0;
  for (const picture of pictures) {
    const top = (rows - picture.cells.length) * ch;
    picture.cells.forEach((cells, r) => {
      cells.forEach((char, c) => {
        const ink = picture.ink[picture.paintCells[r][c]];
        if (!ink) return;
        const x = (left + c) * cw;
        const y = top + r * ch;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, cw, ch);
        ctx.clip(); // block characters overflow their cell a little, like on the map
        if (ink[1]) fillCell(ctx, ink[1], x, y, cw, ch);
        ctx.fillStyle = ink[0];
        ctx.fillText(char, x + cw / 2, y + view.baseline * LOOK_SCALE);
        ctx.restore();
      });
    });
    left += picture.width + 1;
  }
}

// ---- Effects ----

// Brackets around whatever the action button will use.
function drawTarget(target, time, color = TARGET_COLOR) {
  const ctx = view.ctx;
  const x = Math.round(screenX(target.x));
  const y = Math.round(screenY(target.y));
  ctx.globalAlpha = 0.65 + Math.sin(time * 5) * 0.3;
  drawGlyph(ctx, '[', color, x - view.cw, y);
  drawGlyph(ctx, ']', color, x + Math.round((target.w || 1) * view.tw), y);
  ctx.globalAlpha = 1;
}

// In build mode: a see-through copy of what you're building, standing where it would go, with
// red brackets instead of yellow if it can't go there. A wall shows the picture it would have there,
// joined up with the walls beside it; a floor, a patch of boards; a board you'd take up, just the
// brackets.
function drawBuildSpot(game) {
  const spot = game.buildSpot;
  const recipe = RECIPES[game.building];
  view.ctx.globalAlpha = spot.problem ? GHOST_ALPHA / 2 : GHOST_ALPHA;
  if (recipe.floor && !spot.lift) {
    const tile = TILES[recipe.floor];
    const x = Math.round(screenX(spot.x));
    const y = Math.round(screenY(spot.y));
    fillCell(view.ctx, tile.bgs[0], x, y, view.tw, view.th);
    drawGlyphPair(view.ctx, tile, 0, spot.x, spot.y, x, y, 0);
  } else if (!recipe.floor) {
    const object = OBJECTS[recipe.builds];
    drawSprite(SPRITES[objectLook(game.world, object, spot.x, spot.y).sprite], spot.x, spot.y);
  }
  view.ctx.globalAlpha = 1;
  drawTarget(spot, game.time, spot.problem ? BLOCKED_COLOR : TARGET_COLOR);
}

function drawParticles(fx) {
  const ctx = view.ctx;
  for (const p of fx.particles) {
    ctx.globalAlpha = Math.min(1, p.life * 3);
    const x = Math.round(screenX(p.x) - view.cw / 2);
    const y = Math.round(screenY(p.y - p.z) - view.th / 2);
    drawGlyph(ctx, p.glyph, p.color, x, y);
  }
  ctx.globalAlpha = 1;
}

// The bobber on the water while you fish: it bobs, and goes under when something bites.
function drawBobber(game) {
  const { fishing } = game;
  const under = fishing.hookedAt !== null;
  const bob = !reducedMotion.matches && game.flameFrame % 4 < 2;
  const glyph = under ? (bob ? '°' : 'o') : bob ? '•' : '◦';
  const x = Math.round(screenX(fishing.x) - view.cw / 2);
  const y = screenY(fishing.y - 0.5) + (under ? Math.round(view.th * 0.25) : 0);
  drawGlyph(view.ctx, glyph, under ? LINE_COLOR : BOBBER_COLOR, x, y, true);
}

// The line from the rod's tip (where drawPlayer drew it this frame) to the bobber, drawn as a row
// of dots sagging a little.
function drawFishingLine(game) {
  const { fishing } = game;
  const tip = view.rodTip;
  if (!tip) return;
  const endX = screenX(fishing.x);
  const endY = screenY(fishing.y - 0.3);
  const length = Math.hypot((endX - tip.x) / view.tw, (endY - tip.y) / view.th);
  const dots = Math.max(1, Math.floor(length / FISH_LINE_STEP));
  view.ctx.globalAlpha = 0.75;
  for (let n = 1; n < dots; n++) {
    const t = n / dots;
    const x = tip.x + (endX - tip.x) * t;
    const y = tip.y + (endY - tip.y) * t + Math.sin(t * Math.PI) * view.th * 0.4;
    drawGlyph(view.ctx, '·', LINE_COLOR, Math.round(x - view.cw / 2), Math.round(y - view.th / 2));
  }
  view.ctx.globalAlpha = 1;
}

// A shot: a streak of light from the gun to what it hit, drawn in line characters that follow its
// slant, fading fast, with a flash at the muzzle. Drawn above the dark: it's light itself.
function drawShot(game) {
  const { shot, player } = game;
  const start = view.heldAt || { x: screenX(player.x), y: screenY(player.y - 1.5) };
  const endX = screenX(shot.x);
  const endY = screenY(shot.y);
  const dx = (endX - start.x) / view.tw;
  const dy = (endY - start.y) / view.th;
  const length = Math.hypot(dx, dy);
  let glyph = Math.abs(dx) > Math.abs(dy) * 2 ? '─' : Math.abs(dy) > Math.abs(dx) * 2 ? '│' : '╲';
  if (glyph === '╲' && dx * dy < 0) glyph = '╱';
  const ctx = view.ctx;
  ctx.globalAlpha = 1 - (game.time - shot.at) / SHOT_SECONDS;
  const dots = Math.max(1, Math.floor(length / 0.5));
  for (let n = 1; n <= dots; n++) {
    const t = n / dots;
    const x = start.x + (endX - start.x) * t;
    const y = start.y + (endY - start.y) * t;
    drawGlyph(ctx, glyph, SHOT_COLOR, Math.round(x - view.cw / 2), Math.round(y - view.th / 2), true);
  }
  drawGlyph(ctx, '✶', SHOT_COLOR, Math.round(start.x - view.cw / 2), Math.round(start.y - view.th / 2), true);
  ctx.globalAlpha = 1;
}

// Words that float up from where something happened, like "+3 wood".
function drawFloaters(fx) {
  if (fx.floaters.length === 0) return;
  const ctx = view.ctx;
  ctx.font = `bold ${Math.round(view.th * 0.8)}px ${MAP_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, view.dpr * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
  for (const f of fx.floaters) {
    ctx.globalAlpha = Math.min(1, f.life * 2);
    const x = screenX(f.x);
    const y = screenY(f.y) - (1 - f.life) * view.th * 2;
    ctx.strokeText(f.text, x, y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, x, y);
  }
  ctx.globalAlpha = 1;
}
