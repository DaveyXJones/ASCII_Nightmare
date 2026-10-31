// The map: the island drawn in characters, showing only the land you've seen, with you, the cottage
// and the things you've built marked on it. The Map button (or M) opens it, and the game pauses
// while it's open.
//
// What you've seen is kept in world.seen, one number per tile (1 once seen), and saved packed down
// to one bit per tile (see packSeen). It's kept when you die: you remember the island.
//
// Each tile can say how it looks on the map with `map: [glyph, color, background]` (TILES), or else
// its first glyph and colors are used. Trees and rocks (`map` in OBJECTS) show where they're most
// of a block. Things you've built (`mark` in OBJECTS) always show, and are listed in the key.

const MAP_SIGHT = 11; // by day you take in the land this many tiles around you
const MAP_NIGHT_SIGHT = 2; // in the dark, only this far (or as far as your torch lights)
const MAP_MARK_SECONDS = 0.3; // how often what's around you is added to the map
const MAP_MIN_GLYPH_CSS = 6; // map characters are at least this many CSS pixels wide
const MAP_MOST_ZOOM = 14; // zoomed all the way in: CSS pixels for each tile
const MAP_FIRST_ZOOM = 3; // the first time the map opens on an island, this zoomed in (it remembers after)
const MAP_ZOOM_STEP = 1.6; // how much one tap of + or − zooms
const MAP_WHEEL_ZOOM = 1.0015; // how much each step of a mouse wheel zooms
const MAP_KEY_PAN = 40; // how far one press of an arrow key moves the map, in CSS pixels
const MAP_SIDE_CSS = 150; // room kept beside the map for the title, the buttons and the key
const MAP_MAX_CSS = [1100, 760]; // the map's window is at most this big, in CSS pixels
const MAP_UNSEEN = '#05080c'; // land you haven't seen yet
const MAP_YOU = { glyph: '@', color: '#fff6c8', background: '#7a1f1f', name: 'you' };
const MAP_COTTAGE = { glyph: '⌂', color: '#ffb08a', background: '#5a2a1e', name: 'cottage' };

const mapView = {
  markedAt: -Infinity, // when what's around you was last added, in seconds of play
  world: null, // the island the panel last showed
  scale: 0, // how zoomed in: CSS pixels for each tile
  fit: 0, // ...when the whole island just fits the window (as far out as it zooms)
  cx: 0, // the tile in the middle of the window
  cy: 0,
  width: 0, // the window's size, in CSS pixels
  height: 0,
  pointers: new Map(), // fingers (or the mouse) on the map: pointer id -> where, in CSS pixels
  pinch: null, // two fingers down: how far apart and where between them, last time they moved
  frame: null, // a redraw waiting for the next frame
};

// Adds the land around the player to the map. Called every update; does the work a few times a
// second.
function markSeen(game) {
  if (game.time - mapView.markedAt < MAP_MARK_SECONDS) return;
  mapView.markedAt = game.time;
  const { world, player, sky, survivor } = game;
  const nightSight = Math.max(MAP_NIGHT_SIGHT, torchReach(survivor));
  const reach = MAP_SIGHT + (nightSight - MAP_SIGHT) * sky.darkness;
  const reach2 = reach * reach;
  const top = Math.max(0, Math.floor(player.y - reach));
  const bottom = Math.min(world.height - 1, Math.ceil(player.y + reach));
  const left = Math.max(0, Math.floor(player.x - reach));
  const right = Math.min(world.width - 1, Math.ceil(player.x + reach));
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const dx = x + 0.5 - player.x;
      const dy = y + 0.5 - player.y;
      if (dx * dx + dy * dy <= reach2) world.seen[y * world.width + x] = 1;
    }
  }
}

// ---- Saving what you've seen ----

// world.seen packed into text: eight tiles to a byte, written as base64.
function packSeen(world) {
  const bytes = new Uint8Array(Math.ceil(world.seen.length / 8));
  for (let i = 0; i < world.seen.length; i++) {
    if (world.seen[i]) bytes[i >> 3] |= 1 << (i & 7);
  }
  let text = '';
  for (let i = 0; i < bytes.length; i += 4096) {
    text += String.fromCharCode(...bytes.subarray(i, i + 4096));
  }
  return btoa(text);
}

function unpackSeen(world, packed) {
  if (typeof packed !== 'string') return;
  const text = atob(packed);
  const count = Math.min(world.seen.length, text.length * 8);
  for (let i = 0; i < count; i++) {
    world.seen[i] = (text.charCodeAt(i >> 3) >> (i & 7)) & 1;
  }
}

// ---- The map panel ----

// The panel is a window onto the island. Drag it to look around; pinch, or + and −, to zoom
// (the mouse wheel and the + and − keys too, and the arrow keys move it); @ brings you back to the
// middle. Zoomed out, the whole island fits and each character stands for a block of tiles; zoomed
// in, it's one character for each tile across. Only what's in the window is drawn, each time it
// moves.

function setupMap(elements) {
  // The key: you, the cottage, and one line for each kind of mark (a lit fire and a cold one share
  // a name, so only the first is listed). Only the marks on land you've seen are shown (see
  // showKeyLines), so it grows as you explore.
  const marks = [MAP_YOU, MAP_COTTAGE];
  for (const object of Object.values(OBJECTS)) {
    if (object.mark && !marks.some((mark) => mark.name === object.mark.name)) marks.push(object.mark);
  }
  for (const mark of marks) {
    const line = document.createElement('li');
    line.dataset.name = mark.name;
    const glyph = document.createElement('span');
    glyph.className = 'map-glyph';
    glyph.textContent = mark.glyph;
    glyph.style.color = mark.color;
    if (mark.background) glyph.style.background = mark.background;
    line.append(glyph, ` ${mark.name}`);
    elements.mapKey.append(line);
  }
  elements.mapClose.addEventListener('click', closeMap);
  elements.mapZoomIn.addEventListener('click', () => zoomMapAboutYou(MAP_ZOOM_STEP));
  elements.mapZoomOut.addEventListener('click', () => zoomMapAboutYou(1 / MAP_ZOOM_STEP));
  elements.mapCentre.addEventListener('click', () => {
    centreMap(state.player.x, state.player.y);
    drawMapSoon();
  });
  // Tapping the dark space around the panel closes it too.
  elements.map.addEventListener('click', (event) => {
    if (event.target === elements.map) closeMap();
  });
  setupMapGestures(elements.mapPicture);
  window.addEventListener('keydown', mapKey);
  window.addEventListener('resize', () => {
    if (!elements.map.hidden) layoutMap();
  });
}

function openMap() {
  mapView.markedAt = -Infinity;
  markSeen(state); // include where you're standing right now
  state.paused = true;
  releaseAll();
  elements.map.hidden = false;
  if (mapView.world !== state.world) {
    mapView.world = state.world;
    mapView.scale = MAP_FIRST_ZOOM; // a new island: start zoomed in a fair way (layoutMap keeps it in range)
  }
  showKeyLines(state.world);
  layoutMap();
  centreMap(state.player.x, state.player.y);
  drawMap(state);
}

// Shows the key's line for each kind of mark that's somewhere on the land you've seen (and always
// you and the cottage).
function showKeyLines(world) {
  const names = new Set([MAP_YOU.name, MAP_COTTAGE.name]);
  for (let i = 0; i < world.objects.length; i++) {
    const key = world.objects[i];
    if (key && world.seen[i] && OBJECTS[key].mark) names.add(OBJECTS[key].mark.name);
  }
  for (const line of elements.mapKey.children) line.hidden = !names.has(line.dataset.name);
}

function closeMap() {
  if (elements.map.hidden) return;
  elements.map.hidden = true;
  mapView.pointers.clear();
  state.paused = false;
}

// Sizes the map's window to the room beside the key, and works out how far it can zoom out: until
// the whole island fits.
function layoutMap() {
  const overlay = elements.map.getBoundingClientRect();
  mapView.width = Math.floor(Math.min(MAP_MAX_CSS[0], Math.max(120, overlay.width - MAP_SIDE_CSS - 80)));
  mapView.height = Math.floor(Math.min(MAP_MAX_CSS[1], Math.max(80, overlay.height - 50)));
  const canvas = elements.mapPicture;
  canvas.width = Math.round(mapView.width * view.dpr);
  canvas.height = Math.round(mapView.height * view.dpr);
  canvas.style.width = `${mapView.width}px`;
  canvas.style.height = `${mapView.height}px`;
  const world = state.world;
  mapView.fit = Math.min(mapView.width / world.width, mapView.height / world.height);
  mapView.scale = Math.min(MAP_MOST_ZOOM, Math.max(mapView.fit, mapView.scale));
  centreMap(mapView.cx, mapView.cy);
}

// Puts tile (x, y) in the middle of the window, as near as the island's edges allow: zoomed in, the
// window never goes past them; zoomed out further than the island, it sits in the middle.
function centreMap(x, y) {
  const world = state.world;
  const halfW = mapView.width / 2 / mapView.scale;
  const halfH = mapView.height / 2 / mapView.scale;
  const clamp = (value, half, size) => (size <= half * 2 ? size / 2 : Math.max(half, Math.min(size - half, value)));
  mapView.cx = clamp(x, halfW, world.width);
  mapView.cy = clamp(y, halfH, world.height);
}

// Zooms by `factor`, keeping the spot at (px, py) in the window (CSS pixels; the middle if left
// out) where it is.
function zoomMap(factor, px = mapView.width / 2, py = mapView.height / 2) {
  const before = mapView.scale;
  const after = Math.min(MAP_MOST_ZOOM, Math.max(mapView.fit, before * factor));
  if (after === before) return;
  const x = mapView.cx + (px - mapView.width / 2) / before;
  const y = mapView.cy + (py - mapView.height / 2) / before;
  mapView.scale = after;
  centreMap(x - (px - mapView.width / 2) / after, y - (py - mapView.height / 2) / after);
  drawMapSoon();
}

// The + and − buttons (and keys) zoom toward you, if you're in the window, or else its middle.
function zoomMapAboutYou(factor) {
  const { player } = state;
  const x = (player.x - mapView.cx) * mapView.scale + mapView.width / 2;
  const y = (player.y - mapView.cy) * mapView.scale + mapView.height / 2;
  const inView = x >= 0 && y >= 0 && x <= mapView.width && y <= mapView.height;
  if (inView) zoomMap(factor, x, y);
  else zoomMap(factor);
}

function panMap(dx, dy) {
  centreMap(mapView.cx - dx / mapView.scale, mapView.cy - dy / mapView.scale);
  drawMapSoon();
}

// Redraws at the next frame, once however many moves come in before it.
function drawMapSoon() {
  if (mapView.frame) return;
  mapView.frame = requestAnimationFrame(() => {
    mapView.frame = null;
    if (!elements.map.hidden) drawMap(state);
  });
}

// One finger (or the mouse) drags the map; two fingers pinch to zoom, about the point between them.
function setupMapGestures(canvas) {
  const { pointers } = mapView;
  const where = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const pinchNow = () => {
    const [a, b] = [...pointers.values()];
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    capture(canvas, event.pointerId);
    pointers.set(event.pointerId, where(event));
    if (pointers.size === 2) mapView.pinch = pinchNow();
  });
  canvas.addEventListener('pointermove', (event) => {
    const before = pointers.get(event.pointerId);
    if (!before) return;
    const now = where(event);
    pointers.set(event.pointerId, now);
    if (pointers.size === 1) {
      panMap(now.x - before.x, now.y - before.y);
    } else if (pointers.size === 2 && mapView.pinch) {
      const pinch = pinchNow();
      panMap(pinch.x - mapView.pinch.x, pinch.y - mapView.pinch.y);
      zoomMap(pinch.distance / Math.max(1, mapView.pinch.distance), pinch.x, pinch.y);
      mapView.pinch = pinch;
    }
  });
  const end = (event) => {
    pointers.delete(event.pointerId);
    mapView.pinch = pointers.size === 2 ? pinchNow() : null;
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, end);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const at = where(event);
    zoomMap(MAP_WHEEL_ZOOM ** -event.deltaY, at.x, at.y);
  }, { passive: false });
}

// On a keyboard, while the map's open: + and − zoom, the arrow keys (or WASD) look around.
function mapKey(event) {
  if (elements.map.hidden) return;
  const zoom = { Equal: MAP_ZOOM_STEP, NumpadAdd: MAP_ZOOM_STEP, Minus: 1 / MAP_ZOOM_STEP, NumpadSubtract: 1 / MAP_ZOOM_STEP };
  if (zoom[event.code]) zoomMapAboutYou(zoom[event.code]);
  else if (KEY_MOVES[event.code]) panMap(-KEY_MOVES[event.code][0] * MAP_KEY_PAN, -KEY_MOVES[event.code][1] * MAP_KEY_PAN);
}

// Draws what's in the window. Each character stands for `block` tiles across and twice that down
// (a character is twice as tall as it's wide, so the island keeps its shape): as few as keeps
// characters at least MAP_MIN_GLYPH_CSS wide at this zoom.
function drawMap(game) {
  const { world, player } = game;
  const canvas = elements.mapPicture;
  const ctx = canvas.getContext('2d');
  const { scale, cx, cy, width, height } = mapView;
  const dpr = view.dpr;
  const block = Math.max(1, Math.ceil(MAP_MIN_GLYPH_CSS / scale));
  // Where tile (x, y) lands on the canvas, in device pixels.
  const toX = (x) => Math.round(((x - cx) * scale + width / 2) * dpr);
  const toY = (y) => Math.round(((y - cy) * scale + height / 2) * dpr);

  ctx.fillStyle = MAP_UNSEEN;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const plain = `${Math.round(block * 2 * scale * dpr * 0.78)}px ${MAP_FONT}`;
  const bold = `bold ${plain}`;
  const put = (look, col, row, background) => {
    const x0 = toX(col * block);
    const x1 = toX((col + 1) * block);
    const y0 = toY(row * block * 2);
    const y1 = toY((row + 1) * block * 2);
    ctx.fillStyle = background || look.background || look[2];
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = look.color || look[1];
    ctx.fillText(look.glyph || look[0], (x0 + x1) / 2, (y0 + y1) / 2);
  };

  // Only the characters in the window.
  const left = Math.max(0, Math.floor((cx - width / 2 / scale) / block));
  const right = Math.min(Math.ceil(world.width / block) - 1, Math.floor((cx + width / 2 / scale) / block));
  const top = Math.max(0, Math.floor((cy - height / 2 / scale) / (block * 2)));
  const bottom = Math.min(Math.ceil(world.height / (block * 2)) - 1, Math.floor((cy + height / 2 / scale) / (block * 2)));
  let font = null;
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      const cell = readCell(world, col * block, row * block * 2, block, block * 2);
      if (!cell) continue;
      const want = cell.mark ? bold : plain;
      if (font !== want) ctx.font = font = want;
      put(cell.mark || cell.look, col, row, cell.mark && cell.look[2]);
    }
  }

  ctx.font = bold;
  const house = world.house;
  const houseX = house.left + house.width / 2;
  const houseY = house.top + house.height / 2;
  if (world.seen[Math.floor(houseY) * world.width + Math.floor(houseX)]) {
    put(MAP_COTTAGE, Math.floor(houseX / block), Math.floor(houseY / (block * 2)));
  }
  put(MAP_YOU, Math.floor(player.x / block), Math.floor(player.y / (block * 2)));
}

// What one map character shows for the block of tiles from (x, y), `w` across and `h` down: null if
// none of it's been seen; otherwise `look` ([glyph, color, background]) for the ground most of it
// is (or the trees, if they cover most of it), and `mark` for something built there.
const cellCounts = new Map(); // reused by readCell: how many seen tiles of each ground

function readCell(world, x, y, w, h) {
  const counts = cellCounts;
  counts.clear();
  let seen = 0;
  let mark = null;
  let cover = null; // trees or rocks, and how many tiles of them
  let coverCount = 0;
  for (let ty = y; ty < Math.min(y + h, world.height); ty++) {
    for (let tx = x; tx < Math.min(x + w, world.width); tx++) {
      const i = ty * world.width + tx;
      if (!world.seen[i]) continue;
      seen++;
      const key = world.ground[i];
      counts.set(key, (counts.get(key) || 0) + 1);
      const object = world.objects[i] && OBJECTS[world.objects[i]];
      if (!object) continue;
      if (object.mark && (!mark || object.mark.rank > mark.rank)) mark = object.mark;
      if (object.map) {
        coverCount++;
        cover = object.map;
      }
    }
  }
  if (seen === 0) return null;
  let ground = null;
  let most = 0;
  for (const [key, count] of counts) {
    if (count > most) {
      ground = key;
      most = count;
    }
  }
  const tile = TILES[ground];
  const look = tile.map || [tile.glyphs[0], tile.colors[0], tile.bgs[0]];
  if (cover && coverCount * 2 >= seen) return { look: [cover[0], cover[1], look[2]], mark };
  return { look, mark };
}
