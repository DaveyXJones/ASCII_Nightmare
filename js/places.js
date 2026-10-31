// Places to find on the island: ruined cabins, an abandoned village with its graveyard, old camps,
// rings of standing stones with candles nobody lights, and a lighthouse on the coast with its
// keeper's hut. Each has something to search (a cupboard, a tent, a dropped pack, a strongbox), and
// most hold a note from someone who was here before you. The further from the cottage, the further
// along their story.
//
// Places are only built on islands made since they were added (`places` in WORLD_SIZE, world.js):
// a world you were already playing in stays as it was.
//
// Everything here is worked out from the island's seed, like the land itself: where each place
// stands, what's in each cupboard, which note is where. So it isn't saved; it's built again the
// same each time the game loads. Only what you've changed (a cupboard searched, a wall broken) is
// saved, like a tree you've chopped.

const PLACE_SPACING = 36; // at least this many tiles between one place and the next
const PLACE_TRY_EVERY = 5; // places are tried at spots this many tiles apart (fewer is slower but finds more room)
const PLACE_MOST_TREES = 0.3; // a place can be built where up to this share of the ground has trees (they're cleared)
// The clearing round a place, in tiles: trees and rocks this far round it are cleared, further in
// front (below it on the screen), where they'd stand in front of it and hide it.
const CLEARING = { sides: 2, above: 2, below: 5 };
const WALL_FALLEN = 0.22; // the share of an old cabin's walls that have fallen into a heap of logs
const WALL_GONE = 0.08; // ...and that are gone altogether, leaving a gap
const WEEDS = 0.14; // the share of an old cabin's floor where tall grass has grown up through the boards
const SCRAP_REACH = 12; // a scrap of map shows the land this many tiles round the place it's of
const LIGHTHOUSE_SEEN = 5; // you can see the lighthouse from anywhere: it's on the map this far round from the start
const KEEPER_HUT_REACH = [5, 18]; // the keeper's hut stands this many tiles from the lighthouse, nearest first
const LIGHTHOUSE_TRIES = 300; // the best spots for the lighthouse tried, looking for room for the hut
const LOOT_SALT = 9157; // mixed into the seed so what's in a cupboard doesn't follow the trees' pattern

// What each character in a place's layout (below) builds: the ground, and maybe an object on it.
// `ground: null` leaves the land as it is. Old walls (`ruin`) may have fallen, and a floor (`weeds`)
// may have grass growing through it. Spaces in a layout leave the land alone (but any trees there
// are cleared, so the place stands in a clearing).
const PLACE_LEGEND = {
  '#': { ground: 'boards', object: 'logWall', ruin: true },
  '.': { ground: 'boards', weeds: true },
  '_': { ground: 'boards' }, // a doorway
  ':': { ground: 'path' },
  'C': { ground: 'boards', object: 'cupboard', search: true },
  'B': { ground: 'boards', object: 'oldBed' },
  'T': { ground: 'boards', object: 'oldTable' },
  'S': { ground: 'boards', object: 'stove' },
  'X': { ground: 'boards', object: 'strongbox', search: true },
  'W': { ground: 'path', object: 'well' },
  'g': { ground: 'path', object: 'grave' },
  '+': { ground: 'path', object: 'graveCross' },
  'o': { ground: null, object: 'standingStone' },
  'A': { ground: null, object: 'altar', search: true },
  't': { ground: 'path', object: 'tent', search: true },
  'p': { ground: 'path', object: 'oldPack', search: true },
  'F': { ground: 'path', object: 'campfireOut' },
  's': { ground: 'path', object: 'logSeat' },
  'L': { ground: 'sand', object: 'lighthouseLeft' },
  'R': { ground: 'sand', object: 'lighthouseRight' },
};

// Ground places are built on (besides the hills, for the standing stones).
const PLACE_GROUND = new Set(['grass', 'tallGrass', 'flowers']);
// What grows wild and gets cleared to make room for a place. Anything else in the way (the wreck,
// the cottage's well) means the place can't go there.
const PLACE_CLEARS = new Set(['oak', 'pine', 'bush', 'boulder', 'cotton']);

// The kinds of place, in the order they're put on the island (the ones that need the most room
// first). Each has:
//   name      what a scrap of map calls it ("It shows ___, to the north")
//   layouts   pictures of it, like the cottage's (see PLACE_LEGEND); one is picked for each, maybe
//             turned round
//   count     how many on an island, for each 100,000 tiles of land (or `exactly` that many)
//   site      what it needs to stand on: 'field', 'hills' (the stones), 'water' (a field with
//             water near, for the camps), 'shore' (a field or sand, for the keeper's hut) or 'coast'
//             (the lighthouse, on the point of a headland)
//   fromHome  at least this many steps' walk from the cottage door
//   note      a note that's always in its cupboard (else it gets the next one in NOTES, nearest
//             places first)
const PLACES = {
  lighthouse: {
    name: 'the lighthouse',
    layouts: [['LR']],
    exactly: 1,
    site: 'coast',
    fromHome: 90,
  },
  keeper: {
    name: "the lighthouse keeper's hut",
    layouts: [[
      '#####',
      '#C.S#',
      '#..B#',
      '#_###',
    ]],
    exactly: 0, // built beside the lighthouse (see placeLighthouse), not on its own
    site: 'shore',
    note: 'keeper',
  },
  village: {
    name: 'the old village',
    layouts: [[
      '       ##########       ',
      '       #T...T..X#       ',
      '       #........#       ',
      '       #C..T....#       ',
      '       ####__####       ',
      '           ::           ',
      ' #####     ::     ##### ',
      ' #C.B#     ::     #S.C# ',
      ' #..._::::::::::::_...# ',
      ' #####:::::W::::::##### ',
      '      ::::::::::::      ',
      ' #####::::::::::::##### ',
      ' #B.C_::::::::::::_..C# ',
      ' #S..#     ::     #..B# ',
      ' #####     ::     ##### ',
      '           ::           ',
      '    g + g + g + g + g   ',
      '                        ',
      '    + g + g + g + g +   ',
    ]],
    exactly: 1,
    site: 'field',
    fromHome: 160,
    note: 'hall',
  },
  stones: {
    name: 'the standing stones',
    layouts: [[
      '   o o   ',
      ' o     o ',
      '         ',
      'o   A   o',
      '         ',
      ' o     o ',
      '   o o   ',
    ]],
    count: 1.5,
    site: 'hills',
    fromHome: 60,
  },
  cabin: {
    name: 'a ruined cabin',
    layouts: [
      [
        '######',
        '#C..B#',
        '#....#',
        '#S...#',
        '##_###',
      ],
      [
        '#######',
        '#B...C#',
        '#.....#',
        '#..T..#',
        '#.....#',
        '###_###',
      ],
      [
        '########',
        '#C.#...#',
        '#..#..B#',
        '#.._...#',
        '#..#...#',
        '###_####',
      ],
      [
        '########',
        '#S....C#',
        '#......#',
        '#B.....#',
        '####_###',
      ],
    ],
    count: 6,
    site: 'field',
    fromHome: 40,
  },
  camp: {
    name: 'an old camp',
    layouts: [[
      ' s  ',
      't F ',
      '  p ',
    ]],
    count: 4,
    site: 'water',
    fromHome: 30,
  },
};

// What you might find when you search something (`loot` in OBJECTS). Each search makes `rolls`
// picks from `finds`, each find as likely as its `weight`: `items` for your pack, a `tool` (or the
// `or` items if you already have one), a scrap of `map`, or nothing. `empty` is what's said when
// every pick comes up with nothing.
const LOOT = {
  cupboard: {
    rolls: 2,
    finds: [
      { weight: 4, items: { tins: 1 } },
      { weight: 2, items: { tins: 2 } },
      { weight: 3, items: { cloth: 2 } },
      { weight: 2, items: { bullets: 2 } },
      { weight: 2, map: true },
      { weight: 1, tool: 'axe', or: { wood: 3 } },
      { weight: 1, tool: 'pick', or: { stone: 3 } },
      { weight: 1, tool: 'rod', or: { cloth: 1 } },
      { weight: 4 },
    ],
    empty: 'Nothing but dust and mouse droppings.',
  },
  tent: {
    rolls: 2,
    finds: [
      { weight: 4, items: { cloth: 3 } },
      { weight: 3, items: { tins: 1 } },
      { weight: 2, tool: 'torch', or: { wood: 2 } },
      { weight: 1, items: { bullets: 2 } },
      { weight: 2, map: true },
      { weight: 3 },
    ],
    empty: 'Only a damp blanket, rotten through.',
  },
  pack: {
    rolls: 1,
    finds: [
      { weight: 3, items: { tins: 2 } },
      { weight: 2, items: { bullets: 3 } },
      { weight: 2, items: { cloth: 2 } },
      { weight: 3, map: true },
      { weight: 2, items: { berries: 4 } },
    ],
    empty: 'Empty. Whoever dropped it took what was in it.',
  },
  strongbox: {
    rolls: 3,
    finds: [
      { weight: 4, items: { bullets: 4 } },
      { weight: 3, items: { tins: 3 } },
      { weight: 2, map: true },
      { weight: 1, tool: 'rod', or: { cloth: 2 } },
    ],
    empty: 'Empty. Somebody got here first.',
  },
  altar: {
    rolls: 1,
    finds: [
      { weight: 3, items: { bullets: 2 } },
      { weight: 3, items: { tins: 1 } },
      { weight: 2, items: { cloth: 2 } },
      { weight: 2, map: true },
    ],
    empty: 'Candle stubs, and a smell of smoke.',
  },
};

// The notes left in the places, nearest the cottage first: the story of what happened here, and
// what the people who wrote them learned too late. Each is { title, text }.
const NOTES = [
  {
    title: 'A note, folded small',
    text: 'Day three. The wood is wet and the fire won\'t take. Something walked round the cabin all ' +
      'night. It didn\'t try the door. Keep a light burning. Whatever you do, keep a light burning.',
  },
  {
    title: 'A page torn from a book',
    text: 'Saw eyes in the long grass at the edge of the field. They didn\'t blink. Not once. ' +
      'I kept to the open after that, and so should you.',
  },
  {
    title: 'A note in pencil',
    text: 'The rain put the fire out at midnight, and they came right up to the wall. Never again ' +
      'without a roof over the fire.',
  },
  {
    title: 'A letter, never sent',
    text: 'Dear Ada. The big ones don\'t care about a torch. Only a proper fire stops them. ' +
      'Tell the children to build the walls thick, and mend what gets scratched.',
  },
  {
    title: 'A note pinned with a nail',
    text: 'They can\'t open a door. Remember that. They can claw through a wall, given long enough, ' +
      'but a door stops them dead.',
  },
  {
    title: 'A scrap of paper',
    text: 'The full moon is the worst of it. More of them, and the low ones in the grass come out ' +
      'by the dozen. Stay in on a full moon.',
  },
  {
    title: 'A diary page',
    text: 'Marsh says the keeper let the lamp go out, and that\'s when they came. I say they were ' +
      'always here, and the light just kept them honest.',
  },
  {
    title: 'A note, half burnt',
    text: 'Somebody keeps candles burning on the stones up on the hill. Nobody will say who. ' +
      'Nothing comes near them after dark.',
  },
  {
    title: 'A note in a child\'s hand',
    text: 'I heard a gun on the beach last night. Then nothing. Mum says there are guns ' +
      'washed up from the wreck, if you know where to look.',
  },
  {
    title: 'A note, folded twice',
    text: 'The fish here are fat and stupid. Cook them, and they\'ll keep you better than berries ' +
      'ever will.',
  },
  {
    title: 'The last page of a diary',
    text: 'Last of the tins. I\'m going to try for the lighthouse. If the lamp could be lit ' +
      'again, maybe they would go back to wherever they came from.',
  },
  {
    title: 'A note with no name',
    text: 'If you are reading this, you are not the first. Don\'t trust the quiet. When the ' +
      'crickets stop, something is close.',
  },
];

// Notes that are always in the same place (`note` in PLACES).
const PLACE_NOTES = {
  keeper: {
    title: 'The keeper\'s log',
    text: 'No oil for the lamp. Third night dark. They are on the stairs. They do not come up. ' +
      'They are waiting for me to come down.',
  },
  hall: {
    title: 'A notice, nailed to the wall',
    text: 'ALL FAMILIES TO THE HALL AT DUSK. KEEP THE FIRES LIT. DO NOT ANSWER THE DOOR, ' +
      'WHOEVER IT SOUNDS LIKE.',
  },
};

// What's written on the graves in the village (`epitaph` in OBJECTS), one picked for each.
const EPITAPHS = [
  'Here lies Tom Reeve. He went out after dark.',
  'Ada Marsh. Asleep at last.',
  'Unknown. Found in the long grass.',
  'J. Pike, keeper of the light for thirty-one years.',
  'A child. The stone gives no name.',
  'Mary Hale. She kept the fire.',
  'Gone into the dark. Not buried here.',
  'Will Cotter. Shot in error, at dusk.',
  'The name has been scratched off. From the inside, it looks like.',
  'Ruth and Sam Fenn. Together, as they wished.',
];

const COMPASS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];

// ---- Building the places ----

// Puts the places on a new island. `steps` is how far each tile is from the cottage door
// (stepsFromDoor), -1 where you can't walk, and `sea` which tiles are the sea (findSea). Fills
// world.places with { kind, x, y, search } (the middle of each, in tiles, and the tiles of the
// things to search there) and world.notes with tile index -> note.
function placePlaces(world, steps, sea) {
  world.places = [];
  world.notes = new Map();
  const land = world.ground.reduce((count, key) => count + (TILES[key].drink ? 0 : 1), 0);
  const roll = placeRandom(world.seed);

  placeLighthouse(world, steps, sea);

  for (const [kind, place] of Object.entries(PLACES)) {
    if (kind === 'lighthouse' || kind === 'keeper') continue;
    const want = place.exactly !== undefined ? place.exactly : Math.round((place.count * land) / 100000);
    // Spots to try, shuffled: a grid, each nudged a little at random so the places don't line up.
    const spots = [];
    for (let y = 2; y < world.height - 2; y += PLACE_TRY_EVERY) {
      for (let x = 2; x < world.width - 2; x += PLACE_TRY_EVERY) {
        const sx = x + Math.floor(roll() * PLACE_TRY_EVERY);
        const sy = y + Math.floor(roll() * PLACE_TRY_EVERY);
        const i = sy * world.width + sx;
        if (sx < world.width && sy < world.height && steps[i] >= (place.fromHome || 0)) spots.push(i);
      }
    }
    shuffle(spots, roll);
    // The village goes as far out as there's room for it: try the furthest spots first.
    if (kind === 'village') spots.sort((a, b) => steps[b] - steps[a]);
    let placed = 0;
    for (const i of spots) {
      if (placed >= want) break;
      const layout = turnLayout(place.layouts[Math.floor(roll() * place.layouts.length)], roll, kind);
      const left = (i % world.width) - Math.floor(layout[0].length / 2);
      const top = Math.floor(i / world.width) - Math.floor(layout.length / 2);
      if (!siteFits(world, steps, place.site, layout, left, top)) continue;
      buildPlace(world, kind, layout, left, top, roll);
      placed++;
    }
  }
  handOutNotes(world, steps);
}

// The lighthouse stands on a point of land with the sea on as many sides as possible, a good walk
// from the cottage, with room near it for the keeper's hut. It's on your map from the start.
function placeLighthouse(world, steps, sea) {
  const { width } = world;
  const place = PLACES.lighthouse;
  const layout = place.layouts[0];
  const spots = []; // [tile index, how good a spot]
  for (let i = 0; i < steps.length; i += 2) {
    if (steps[i] < place.fromHome || world.ground[i] !== 'sand' || world.objects[i]) continue;
    const x = i % width;
    const y = (i - x) / width;
    if (!siteFits(world, steps, 'coast', layout, x, y)) continue;
    // How much sea is round it: the more, the further out on a point it is.
    let score = 0;
    for (let dy = -8; dy <= 8; dy += 2) {
      for (let dx = -8; dx <= 8; dx += 2) {
        if (inBounds(world, x + dx, y + dy) && sea[(y + dy) * width + x + dx]) score++;
      }
    }
    spots.push([i, score + steps[i] / 1000]); // between two as good, the one further away
  }
  spots.sort((a, b) => b[1] - a[1]);
  for (const [i] of spots.slice(0, LIGHTHOUSE_TRIES)) {
    const x = i % width;
    const y = (i - x) / width;
    const hut = findKeeperSite(world, steps, x, y);
    if (!hut) continue;
    buildPlace(world, 'lighthouse', layout, x, y, () => 0);
    buildPlace(world, 'keeper', PLACES.keeper.layouts[0], hut.left, hut.top, placeRandom(world.seed + i));
    revealAround(world, x + 1, y, LIGHTHOUSE_SEEN);
    return;
  }
}

// Where the keeper's hut can go near a lighthouse at (x, y): its top-left corner, as near as
// there's room, or null if there's none within KEEPER_HUT_REACH.
function findKeeperSite(world, steps, x, y) {
  const place = PLACES.keeper;
  const layout = place.layouts[0];
  const [near, far] = KEEPER_HUT_REACH;
  for (let reach = near; reach <= far; reach++) {
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== reach) continue;
        if (siteFits(world, steps, place.site, layout, x + dx, y + dy, true)) return { left: x + dx, top: y + dy };
      }
    }
  }
  return null;
}

// Whether the layout fits with its top-left corner at (left, top): on the right kind of ground,
// every bit of it somewhere you can walk to, not too wooded, and not too close to another place
// (unless `closeIsFine`, for the keeper's hut by its lighthouse).
function siteFits(world, steps, site, layout, left, top, closeIsFine = false) {
  const w = layout[0].length;
  const h = layout.length;
  // A tile's clearance round it: one tile, and three more above for tall things' tops.
  if (left < 1 || top < 4 || left + w + 1 > world.width || top + h + 1 > world.height) return false;
  const middleX = left + w / 2;
  const middleY = top + h / 2;
  if (!closeIsFine) {
    for (const other of world.places) {
      if (Math.hypot(other.x - middleX, other.y - middleY) < PLACE_SPACING) return false;
    }
  }
  let trees = 0;
  let tiles = 0;
  for (let y = top - 1; y <= top + h; y++) {
    for (let x = left - 1; x <= left + w; x++) {
      const i = y * world.width + x;
      const ground = world.ground[i];
      const key = world.objects[i];
      const inside = x >= left && x < left + w && y >= top && y < top + h;
      if (key && !PLACE_CLEARS.has(key)) return false;
      tiles++;
      if (key) trees++;
      if (site === 'coast') {
        // The lighthouse stands on sand you can walk to; round it can be sea.
        if (inside && (ground !== 'sand' || steps[i] < 0)) return false;
        continue;
      }
      if (steps[i] < 0) return false; // every bit of it, and the ground round it, somewhere you can walk
      if (site === 'hills') {
        if (ground !== 'hills' && !PLACE_GROUND.has(ground)) return false;
      } else if (site === 'shore') {
        if (ground !== 'sand' && !PLACE_GROUND.has(ground)) return false;
      } else if (!PLACE_GROUND.has(ground)) {
        return false;
      }
    }
  }
  if (trees > tiles * PLACE_MOST_TREES) return false;
  if (site === 'hills' && world.ground[Math.floor(middleY) * world.width + Math.floor(middleX)] !== 'hills') {
    return false;
  }
  if (site === 'water' && !waterNear(world, Math.floor(middleX), Math.floor(middleY), 8)) return false;
  return true;
}

function waterNear(world, x, y, reach) {
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const ground = groundAt(world, x + dx, y + dy);
      if (ground && ground.drink) return true;
    }
  }
  return false;
}

// Builds a place from its layout, top-left corner at (left, top): clears the trees from round it,
// lays the ground and stands things up, lets the walls fall and the weeds grow.
function buildPlace(world, kind, layout, left, top, roll) {
  const w = layout[0].length;
  const h = layout.length;
  for (let y = top - CLEARING.above; y < top + h + CLEARING.below; y++) {
    for (let x = left - CLEARING.sides; x < left + w + CLEARING.sides; x++) {
      if (!inBounds(world, x, y)) continue;
      const i = y * world.width + x;
      if (PLACE_CLEARS.has(world.objects[i])) world.objects[i] = null;
    }
  }
  const place = { kind, x: left + w / 2, y: top + h / 2, search: [] };
  layout.forEach((row, dy) => {
    [...row].forEach((char, dx) => {
      const cell = PLACE_LEGEND[char];
      if (!cell) return;
      const x = left + dx;
      const y = top + dy;
      const i = y * world.width + x;
      let object = cell.object || null;
      let ground = cell.ground;
      // Old walls fall down, except at the corners, so you can still see the shape of the house.
      if (cell.ruin && !isCorner(layout, dx, dy)) {
        const fall = roll();
        if (fall < WALL_GONE) object = null;
        else if (fall < WALL_GONE + WALL_FALLEN) object = 'logPile';
      }
      if (cell.weeds && roll() < WEEDS) ground = 'tallGrass';
      if (ground) world.ground[i] = ground;
      world.objects[i] = object;
      if (cell.search) place.search.push(i);
    });
  });
  world.places.push(place);
}

// Whether the wall at (dx, dy) in a layout is a corner: walls both across and up or down from it.
function isCorner(layout, dx, dy) {
  const wall = (x, y) => (layout[y] || '')[x] === '#';
  return (wall(dx - 1, dy) || wall(dx + 1, dy)) && (wall(dx, dy - 1) || wall(dx, dy + 1));
}

// A layout as it is, or flipped left to right, or (for a cabin) with its door at the top instead.
function turnLayout(layout, roll, kind) {
  let rows = layout;
  if (roll() < 0.5) rows = rows.map((row) => [...row].reverse().join(''));
  if (kind === 'cabin' && roll() < 0.3) rows = [...rows].reverse();
  return rows;
}

// Things a note can be left in (`loot` in OBJECTS): not the strongbox, and not the stones.
const NOTE_HOLDERS = new Set(['cupboard', 'tent', 'pack']);

// Gives each place a note: the ones with their own (`note` in PLACES) get theirs, and the rest get
// NOTES in order, nearest the cottage first, so the story unfolds as you go further out. The note
// goes in the place's first cupboard, tent or pack.
function handOutNotes(world, steps) {
  const at = (place) => Math.floor(place.y) * world.width + Math.floor(place.x);
  const order = [...world.places].sort((a, b) => steps[at(a)] - steps[at(b)]);
  let next = 0;
  for (const place of order) {
    const holder = place.search.find((i) => NOTE_HOLDERS.has(OBJECTS[world.objects[i]].loot));
    if (holder === undefined) continue;
    const fixed = PLACES[place.kind].note;
    if (fixed) world.notes.set(holder, PLACE_NOTES[fixed]);
    else if (next < NOTES.length) world.notes.set(holder, NOTES[next++]);
  }
}

// Marks the land within `reach` tiles of (x, y) as seen, for the map.
function revealAround(world, x, y, reach) {
  for (let ty = Math.floor(y - reach); ty <= Math.ceil(y + reach); ty++) {
    for (let tx = Math.floor(x - reach); tx <= Math.ceil(x + reach); tx++) {
      if (inBounds(world, tx, ty) && Math.hypot(tx + 0.5 - x, ty + 0.5 - y) <= reach) {
        world.seen[ty * world.width + tx] = 1;
      }
    }
  }
}

// A stream of random numbers from 0 to 1, the same for the same seed.
function placeRandom(seed) {
  let n = 0;
  return () => hash2(n++, 7, seed + 4099);
}

function shuffle(list, roll) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(roll() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

// ---- Searching ----

// You've searched the thing at `target` (an object with `loot`): into your pack go what's found,
// with a note to read if there's one, or a scrap of map showing somewhere you haven't been.
function searchLoot(game, target, object, index) {
  const { world, survivor, fx } = game;
  const table = LOOT[object.loot];
  const found = { items: {}, tools: [], map: false };
  for (let n = 0; n < table.rolls; n++) {
    const find = pickFind(table.finds, hash2(index, n * 31 + 7, world.seed + LOOT_SALT));
    if (find.tool && !survivor.tools[find.tool] && !found.tools.includes(find.tool)) {
      found.tools.push(find.tool);
    } else if (find.tool) {
      addItems(found.items, find.or);
    }
    addItems(found.items, find.items);
    if (find.map) found.map = true;
  }

  const parts = [];
  let color = '#e6dcc4';
  for (const tool of found.tools) {
    survivor.tools[tool] = true;
    parts.push(TOOLS[tool].short);
    color = TOOLS[tool].color;
  }
  for (const [item, count] of Object.entries(found.items)) {
    survivor.pack[item] += count;
    parts.push(`+${count} ${ITEMS[item].name}`);
    if (!found.tools.length && parts.length === 1) color = ITEMS[item].color;
  }
  const note = world.notes.get(index);
  const scrap = found.map ? readScrap(game, index) : null;
  if (scrap) parts.push('a scrap of map');
  if (parts.length) floatText(fx, target.x + 0.5, target.y - 1, parts.join('  '), color);

  if (note) openNote(game, note, scrap);
  else if (scrap) showMessage(game, scrap);
  else if (!parts.length) showMessage(game, table.empty);
}

function addItems(into, items) {
  for (const [item, count] of Object.entries(items || {})) into[item] = (into[item] || 0) + count;
}

// The find from `finds` that `roll` (0 to 1) lands on, each as likely as its weight.
function pickFind(finds, roll) {
  const total = finds.reduce((sum, find) => sum + find.weight, 0);
  let left = roll * total;
  for (const find of finds) {
    left -= find.weight;
    if (left < 0) return find;
  }
  return finds[finds.length - 1];
}

// A scrap of map found at tile `index`: it shows the nearest place you haven't seen yet, which goes
// on your map. Returns what to say about it.
function readScrap(game, index) {
  const { world } = game;
  const fromX = (index % world.width) + 0.5;
  const fromY = Math.floor(index / world.width) + 0.5;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const place of world.places || []) {
    if (world.seen[Math.floor(place.y) * world.width + Math.floor(place.x)]) continue;
    const distance = Math.hypot(place.x - fromX, place.y - fromY);
    if (distance < nearestDistance) {
      nearest = place;
      nearestDistance = distance;
    }
  }
  if (!nearest) return 'A scrap of map in pencil. It only shows places you\'ve already been.';
  revealAround(world, nearest.x, nearest.y, SCRAP_REACH);
  const angle = Math.atan2(nearest.y - fromY, nearest.x - fromX);
  const way = COMPASS[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
  return `A scrap of map in pencil. It shows ${PLACES[nearest.kind].name}, to the ${way}. It's on your map now.`;
}

// What a grave you've walked into says: the epitaph on the grave nearest you.
function epitaphNear(world, player) {
  let best = null;
  let bestDistance = Infinity;
  for (let y = Math.floor(player.y) - 1; y <= Math.floor(player.y) + 1; y++) {
    for (let x = Math.floor(player.x) - 1; x <= Math.floor(player.x) + 1; x++) {
      const object = objectAt(world, x, y);
      const distance = Math.hypot(x + 0.5 - player.x, y + 0.5 - player.y);
      if (object && object.epitaph && distance < bestDistance) {
        best = y * world.width + x;
        bestDistance = distance;
      }
    }
  }
  if (best === null) return null;
  return EPITAPHS[Math.floor(hash2(best, 3, world.seed + LOOT_SALT) * EPITAPHS.length)];
}

// ---- Reading a note ----

// Only a tap that starts on the note counts (as with the chest: the action button opens it the
// moment it's touched, and some phones pass the lift of that touch on to the note).
let noteArmed = false;
let noteAfter = null; // what to say once the note's put away (a scrap of map found with it)

function setupNote(elements) {
  elements.note.addEventListener('pointerdown', () => {
    noteArmed = true;
  }, true);
  elements.noteClose.addEventListener('click', () => {
    if (noteArmed) closeNote();
  });
  elements.note.addEventListener('click', (event) => {
    if (noteArmed && event.target === elements.note) closeNote();
  });
}

// Shows a note ({ title, text }), pausing the game while you read it. `after` is a message to show
// once it's put away, if there's one.
function openNote(game, note, after = null) {
  noteAfter = after;
  elements.noteTitle.textContent = note.title;
  elements.noteText.textContent = note.text;
  game.paused = true;
  noteArmed = false;
  releaseAll();
  elements.note.hidden = false;
}

function closeNote() {
  if (elements.note.hidden) return;
  elements.note.hidden = true;
  state.paused = false;
  if (noteAfter) showMessage(state, noteAfter);
  noteAfter = null;
}
