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
const GHOST_ALPHA = 0.55; // how solid the see-through copy in build mode looks

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
  baseline: 0, // where to put the text baseline inside a cell so block characters fill it
  camX: 0, // the world position, in tiles, at the middle of the screen
  camY: 0,
  originX: 0, // where the top-left corner of tile (0, 0) lands on screen
  originY: 0,
  atlas: null,
  playerBox: null, // where the player was drawn this frame, to tell if anything covered them
  playerCovered: false,
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

// A sprite's picture, drawn the first time it's needed at the current size.
function spriteImage(sprite) {
  if (sprite.image && sprite.imageAtlas === view.atlas) return sprite.image;
  const { canvas, ctx } = makeCanvas(sprite.width * view.cw, sprite.cells.length * view.th);
  for (let r = 0; r < sprite.cells.length; r++) {
    const cells = sprite.cells[r];
    const paint = sprite.paintCells[r];
    for (let c = 0; c < cells.length; c++) {
      const ink = sprite.ink[paint[c]];
      if (!ink) continue;
      const x = c * view.cw;
      const y = r * view.th;
      if (ink[1]) fillCell(ctx, ink[1], x, y);
      drawGlyph(ctx, cells[c], ink[0], x, y, sprite.bold);
    }
  }
  sprite.image = canvas;
  sprite.imageAtlas = view.atlas;
  return canvas;
}

// Draws a sprite standing on a tile: its bottom row on the tile, the rest rising above it.
function drawSprite(sprite, tx, ty, offsetX = 0) {
  const image = spriteImage(sprite);
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

function drawFrame(game) {
  const { world, player } = game;
  const ctx = view.ctx;
  const inside = insideHouse(world, Math.floor(player.x), Math.floor(player.y));

  const range = {
    left: Math.floor(-view.originX / view.tw),
    right: Math.ceil((view.width - view.originX) / view.tw),
    top: Math.floor(-view.originY / view.th),
    bottom: Math.ceil((view.height - view.originY) / view.th),
  };

  ctx.globalAlpha = 1;
  updateGroundCache(game, range);
  ctx.drawImage(groundCache.canvas, screenX(groundCache.left), screenY(groundCache.top));

  drawShadows(game, range, inside);
  drawStanding(game, range, inside);

  if (inside) dimOutside(world.house);
  if (view.playerCovered) drawPlayer(game, 0.4);
  if (game.target) drawTarget(game.target, game.time);
  if (game.buildSpot) drawBuildSpot(game);
  drawParticles(game.fx);
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
  ctx.fillStyle = SHADOW_COLOR;
  ctx.beginPath();
  const bottom = Math.min(world.height - 1, range.bottom);
  const right = Math.min(world.width - 1, range.right + 1);
  for (let ty = Math.max(0, range.top); ty <= bottom; ty++) {
    for (let tx = Math.max(0, range.left - 1); tx <= right; tx++) {
      const key = world.objects[ty * world.width + tx];
      if (!key) continue;
      const shadow = SPRITES[OBJECTS[key].sprite].shadow;
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
  view.playerCovered = false;
  resetCover(left, top - SPRITE_REACH_ROWS, right, bottom);

  const placePlayer = () => {
    drawPlayer(game, 1);
    playerDrawn = true;
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
    for (let tx = left; tx <= right; tx++) {
      const i = ty * world.width + tx;
      const key = world.objects[i];
      if (!key) continue;
      const shake = game.fx.shake && game.fx.shake.index === i ? game.fx.shake : null;
      const offset = shake ? Math.round(Math.sin(game.time * 70) * view.cw * 0.2) : 0;
      drawSprite(objectSprite(OBJECTS[key], i, game.flameFrame), tx, ty, offset);
    }
    if (inside && ty === house.top) drawHouseImage(backWallImage(house), house.left, house.top - WALL_ROWS);
    if (!inside && ty === house.top + house.height - 1) {
      drawHouseImage(houseImage(house), house.left - 0.5, house.top - WALL_ROWS);
    }
    if (!playerDrawn && player.y < ty + 1) placePlayer();
  }
  if (!playerDrawn) placePlayer();
}

// The picture for an object. Ones with `frames`, like a campfire, flicker between pictures; each
// tile starts at a different point so two fires side by side don't flicker in step.
function objectSprite(object, i, flameFrame) {
  if (!object.frames) return SPRITES[object.sprite];
  return SPRITES[object.frames[(flameFrame + i) % object.frames.length]];
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
  const windowCols = [3, 4, wallCols - 5, wallCols - 4];

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
function heldGlyph(action, facing, survivor) {
  for (const key of Object.keys(survivor.tools)) {
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
    held: action ? heldGlyph(action, player.facing, survivor) : null,
    spot: set.held[name],
    lift: 0,
  });

  // Just did something: swinging, reaching, kneeling to drink.
  if (player.act) {
    const look = actionPose(player.act.action);
    if (player.clock - player.act.at < look.seconds) return pose(look.pose, player.act.action);
  }
  // Holding the button between swings: tool raised (or still kneeling, for a drink).
  if (player.working) {
    const look = actionPose(player.working);
    return pose(look.pose === 'strike' ? 'windup' : look.pose, player.working);
  }
  if (player.moving) {
    const step = Math.floor(player.stride / WALK_FRAME_TILES) % set.walk.length;
    return { sprite: set.walk[step], held: null, lift: step % 2 ? Math.round(view.th * WALK_BOB) : 0 };
  }
  if (set.blink && blinking(player.clock)) return pose('blink');
  return pose('stand');
}

// Blinks every few seconds. Two different rhythms laid over each other, so it doesn't look like
// clockwork.
function blinking(clock) {
  return clock % 4.3 < BLINK_SECONDS || (clock + 1.9) % 6.7 < BLINK_SECONDS;
}

function drawPlayer(game, alpha) {
  const { world, player } = game;
  const look = playerPose(game);
  const image = spriteImage(look.sprite);
  const left = Math.round(screenX(player.x) - image.width / 2);
  const top = Math.round(screenY(player.y) + view.th * 0.25) - image.height - look.lift;
  view.ctx.globalAlpha = alpha;
  view.ctx.drawImage(image, left, top);
  if (look.held) {
    const [col, row] = look.spot;
    drawGlyph(view.ctx, look.held, TOOL_COLOR, left + col * view.cw, top + row * view.th, true);
  }
  view.ctx.globalAlpha = 1;
  if (alpha < 1) return;

  view.playerBox = { x0: left, y0: top, x1: left + image.width, y1: top + image.height };
  markCover(left, top, left + image.width, top + image.height);
  // Tall grass in front of the player's feet is drawn again over them, so they wade through it.
  const footRow = Math.floor(player.y);
  for (let ty = footRow; ty <= footRow + 1; ty++) {
    for (let tx = Math.floor(player.x - 1); tx <= Math.floor(player.x + 1); tx++) {
      const tile = groundAt(world, tx, ty);
      if (!tile || !tile.tall) continue;
      const v = world.variants[ty * world.width + tx];
      drawGlyphPair(view.ctx, tile, v, tx, ty, screenX(tx), screenY(ty), 0);
    }
  }
}

// Remembers what's been drawn over, so cliffs in front of it can be drawn again, and whether
// anything was drawn over the player, so they can be shown through it as a ghost (walking behind a
// tree or the cottage shouldn't make you vanish).
function noteDrawn(x0, y0, x1, y1) {
  markCover(x0, y0, x1, y1);
  const box = view.playerBox;
  if (!box || view.playerCovered) return;
  if (x0 < box.x1 - view.cw / 2 && x1 > box.x0 + view.cw / 2 && y0 < box.y1 && y1 > box.y0 + view.th / 2) {
    view.playerCovered = true;
  }
}

// ---- Effects ----

// Brackets around whatever the action button will use.
function drawTarget(target, time, color = TARGET_COLOR) {
  const ctx = view.ctx;
  const x = screenX(target.x);
  const y = screenY(target.y);
  ctx.globalAlpha = 0.65 + Math.sin(time * 5) * 0.3;
  drawGlyph(ctx, '[', color, x - view.cw, y);
  drawGlyph(ctx, ']', color, x + view.tw, y);
  ctx.globalAlpha = 1;
}

// In build mode: a see-through copy of what you're building, standing where it would go, with
// red brackets instead of yellow if it can't go there.
function drawBuildSpot(game) {
  const spot = game.buildSpot;
  const object = OBJECTS[RECIPES[game.building].builds];
  view.ctx.globalAlpha = spot.problem ? GHOST_ALPHA / 2 : GHOST_ALPHA;
  drawSprite(SPRITES[object.sprite], spot.x, spot.y);
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
