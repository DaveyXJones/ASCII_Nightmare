// The map: the island drawn in characters, one character for a small block of tiles, showing only
// the land you've seen, with you, the cottage and the things you've built marked on it. The Map
// button (or M) opens it, and the game pauses while it's open.
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
const MAP_BLOCKS = [2, 3, 4, 6]; // tiles across one map character, smallest first (twice as many down)
const MAP_SIDE_CSS = 150; // room kept beside the map for the title and the key, in CSS pixels
const MAP_UNSEEN = '#05080c'; // land you haven't seen yet
const MAP_YOU = { glyph: '@', color: '#fff6c8', background: '#7a1f1f', name: 'you' };
const MAP_COTTAGE = { glyph: '⌂', color: '#ffb08a', background: '#5a2a1e', name: 'cottage' };

const mapView = {
  markedAt: -Infinity, // when what's around you was last added, in seconds of play
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

function setupMap(elements) {
  // The key: you, the cottage, and one line for each kind of mark (a lit fire and a cold one share
  // a name, so only the first is listed).
  const marks = [MAP_YOU, MAP_COTTAGE];
  for (const object of Object.values(OBJECTS)) {
    if (object.mark && !marks.some((mark) => mark.name === object.mark.name)) marks.push(object.mark);
  }
  for (const mark of marks) {
    const line = document.createElement('li');
    const glyph = document.createElement('span');
    glyph.className = 'map-glyph';
    glyph.textContent = mark.glyph;
    glyph.style.color = mark.color;
    if (mark.background) glyph.style.background = mark.background;
    line.append(glyph, ` ${mark.name}`);
    elements.mapKey.append(line);
  }
  elements.mapClose.addEventListener('click', closeMap);
  // Tapping the dark space around the panel closes it too.
  elements.map.addEventListener('click', (event) => {
    if (event.target === elements.map) closeMap();
  });
}

function openMap() {
  mapView.markedAt = -Infinity;
  markSeen(state); // include where you're standing right now
  state.paused = true;
  releaseAll();
  elements.map.hidden = false;
  drawMap(state, elements.mapPicture);
}

function closeMap() {
  if (elements.map.hidden) return;
  elements.map.hidden = true;
  state.paused = false;
}

// Draws the map to fit the screen: as many tiles to a character as it takes for the whole island to
// fit with characters at least MAP_MIN_GLYPH_CSS wide. A character is twice as tall as it is wide,
// so each covers twice as many tiles down as across, and the island keeps its shape.
function drawMap(game, canvas) {
  const { world, player } = game;
  const overlay = elements.map.getBoundingClientRect();
  const roomX = Math.max(120, overlay.width - MAP_SIDE_CSS - 80);
  const roomY = Math.max(80, overlay.height - 50);
  let block = MAP_BLOCKS[MAP_BLOCKS.length - 1];
  let cellCss = 0;
  for (const size of MAP_BLOCKS) {
    const fit = Math.min(roomX / Math.ceil(world.width / size), roomY / Math.ceil(world.height / (size * 2)) / 2);
    block = size;
    cellCss = fit;
    if (fit >= MAP_MIN_GLYPH_CSS) break;
  }
  const cols = Math.ceil(world.width / block);
  const rows = Math.ceil(world.height / (block * 2));
  const dpr = view.dpr;
  const cw = Math.max(2, Math.floor(cellCss * dpr));
  const ch = cw * 2;
  canvas.width = cols * cw;
  canvas.height = rows * ch;
  canvas.style.width = `${canvas.width / dpr}px`;
  canvas.style.height = `${canvas.height / dpr}px`;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = MAP_UNSEEN;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const plain = `${Math.round(ch * 0.78)}px ${MAP_FONT}`;
  const bold = `bold ${plain}`;
  const put = (look, col, row, background) => {
    ctx.fillStyle = background || look.background || look[2];
    ctx.fillRect(col * cw, row * ch, cw, ch);
    ctx.fillStyle = look.color || look[1];
    ctx.fillText(look.glyph || look[0], col * cw + cw / 2, row * ch + ch / 2);
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = readCell(world, col * block, row * block * 2, block, block * 2);
      if (!cell) continue;
      ctx.font = cell.mark ? bold : plain;
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
function readCell(world, x, y, w, h) {
  const counts = new Map();
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
