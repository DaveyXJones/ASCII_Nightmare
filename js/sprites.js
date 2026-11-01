// Everything that stands up off the ground, drawn as ASCII art.
//
// A sprite is two pictures of the same shape:
//   art    the characters to draw
//   paint  for each character, a key into `ink` saying how to color it
// Each ink entry is [glyph color, background color]. Leave the background out (or null) to let the
// ground show through. A space in `paint` skips that cell entirely; a space in `art` with a paint
// key fills just the background, for solid patches of color.
//
// Sprites stand on a tile: the bottom row is drawn on the tile itself and the rows above it rise up
// the screen, which is what gives the world its height. Each tile is two characters wide and the
// art is centered on it, so even widths line up best.
//
// The light comes from the top left: tops and left sides are lighter, fronts and right sides
// darker. `shadow` is how many tiles wide the shadow on the ground is (0 for none).

// The campfire's colors, shared by each of its flickering pictures.
const FIRE_INK = {
  y: ['#fff0a0'], // the tip of a flame
  Y: ['#ffd75e'], // yellow flame
  o: ['#ff8a2a'], // orange flame
  O: ['#ffb347'],
  r: ['#e8552a'], // a flame dying down
  L: ['#c98a4a'], // crossed logs
  s: ['#a3a69e'], // the ring of stones
};

// A campfire with a roof over it: the fire's colors, plus a little plank roof on two posts.
const ROOFED_INK = {
  ...FIRE_INK,
  a: ['#d8b07a'], // the far slope of the roof, catching the light
  b: ['#e2bf8a', '#9c7048'], // rows of shingles
  e: ['#7a5230', '#2e1d10'], // the eave, with the shade under the roof
  p: ['#8b6239'], // the posts
};

// The colors of things built from wood: the wall and the door.
const WOOD_INK = {
  t: ['#d8b07a'], // tops, in the light
  T: ['#b08458'],
  L: ['#5e3d22', '#b08458'], // planks, with dark lines between them
  l: ['#5e3d22', '#9c7048'],
  D: ['#4a2f1c', '#8b6239'], // the lower planks, in shade
  d: ['#4a2f1c', '#7a5230'],
  P: ['#7a5230'], // a post seen edge-on, or the shaded side of a stake
  S: ['#b08458'], // the lit side of a stake seen from the side
  s: ['#8b6239'], // ...lower down, in the shade of the stakes beside it
  p: ['#5e3d22'],
  k: ['#6b4528'], // a door seen edge-on
  o: ['#4a2f1c'], // ...its latch side
};

// The colors of the stone wall and the gate you build: grey blocks with dark mortar between them, and
// for the gate, heavy planks hung between stone posts.
const STONE_WALL_INK = {
  t: ['#cdcbc4'], // the coping along the top, in the light
  T: ['#a3a19a'],
  B: ['#4a4844', '#aaa8a1'], // blocks, with the mortar between them
  b: ['#423f3b', '#97958e'],
  D: ['#3a3834', '#86847d'], // the lower blocks, in shade
  d: ['#34322e', '#77756f'],
  S: ['#aaa8a1'], // the lit side of a wall seen from the side
  s: ['#8c8a84'],
  P: ['#6f6d67'], // ...and its shaded side
  p: ['#5b5953'],
  L: ['#4a2f1c', '#a87c50'], // the gate's planks, with their rails
  l: ['#4a2f1c', '#946a42'],
  W: ['#3a2414', '#86603a'],
  w: ['#3a2414', '#74522f'],
  k: ['#6b4528'], // the gate seen edge-on
  o: ['#3a2414'], // ...its latch side
};

// Sharpened stakes, crossed: pale cut points, the shafts darker lower down.
const SPIKE_INK = {
  t: ['#f2dfb4'],
  s: ['#b08458'],
  S: ['#7a5230'],
};

// The garden's colors: dug earth, and what grows in it. Anything on the bottom row sits on the earth
// (the second color); anything above it stands up against whatever's behind.
const GARDEN_INK = {
  e: ['#8f6a44', '#3c2817'], // furrows of dug earth
  E: ['#7a5836', '#33220f'],
  b: ['#a87c50', '#3c2817'], // the board along the bed's edge
  g: ['#86cc5e', '#3c2817'], // new shoots, coming up out of the earth
  G: ['#6aa84f', '#3c2817'], // leaves on the earth
  H: ['#4f8a38', '#33220f'],
  l: ['#7ab858'], // leaves standing up
  L: ['#5d9a45'],
  f: ['#e8e0a8'], // potato flowers
  p: ['#d8b070', '#3c2817'], // potatoes, poking out of the earth
  s: ['#6a8a3a'], // a pumpkin's stalk
  o: ['#7a3a08', '#f08a2a'], // a pumpkin, with the grooves down it
  O: ['#6a3008', '#d8701c'],
  r: ['#e0475a', '#3c2817'], // a berry
  w: ['#c8c0a8'], // a cotton boll
  d: ['#8a7048', '#3c2817'], // a dead plant
  D: ['#6e5838'],
};

// A lamp's colors: dark metal, glass lit from inside (two shades for the flicker), and a wooden post.
const LAMP_INK = {
  m: ['#4a4842'], // the cap and the base
  g: ['#3a3226', '#ffd75e'], // the glass, glowing
  G: ['#3a3226', '#f2b94a'],
  h: ['#3a3226', '#ffe58a'],
  H: ['#3a3226', '#ffcc55'],
  d: ['#4a4842', '#2c2a24'], // the glass, gone out
  D: ['#4a4842', '#24221d'],
  p: ['#9c7048'], // the post, lit side
  P: ['#6b4528'],
};

// The wreck's colors: grey, sun-bleached planks, darker below, and the black of the hole.
const WRECK_INK = {
  t: ['#c8b89a'], // the top edge, bleached by the sun
  h: ['#7a6650'], // the bow and stern posts
  L: ['#5a4a38', '#8a7458'], // planks, with dark seams
  X: ['#000000', '#1c140c'], // the hole in its side
  d: ['#4a3c2c'], // the bottom, sunk in the sand
  m: ['#8a7660'], // the broken mast
};

// A washed-up crate's colors: pale planks with a darker cross brace.
const CRATE_INK = {
  t: ['#e0c896'], // the lid's edge, in the light
  L: ['#6b4a2a', '#b8925e'], // planks with the brace across them
  l: ['#6b4a2a', '#a8844f'],
  D: ['#5a3e22', '#94714a'], // the lower planks, in shade
  d: ['#5a3e22', '#86653f'],
  X: ['#000000', '#2a1c10'], // the dark inside of an open crate
};

// The colors of old, weathered wood (the ruined cabins in places.js): grey, cracked, with moss.
const OLD_WOOD_INK = {
  t: ['#a89a84'], // tops, bleached grey by the sun
  T: ['#8a7c66'],
  L: ['#3e342a', '#7a6c58'], // logs, with dark cracks between them
  l: ['#3e342a', '#6c604e'],
  D: ['#2e2620', '#5c5242'], // the lower logs, in shade
  d: ['#2e2620', '#524838'],
  m: ['#6a8a44', '#524838'], // moss
  S: ['#8a7c66'], // the lit side of a wall seen from the side
  s: ['#6c604e'],
  P: ['#4e4436'], // ...and its shaded side
  p: ['#3e342a'],
  C: ['#3e342a', '#7a6c58'], // a cupboard's frame
  c: ['#2e2620', '#6c604e'], // ...its doors
  k: ['#d8c890', '#6c604e'], // ...a brass knob
  X: ['#1a1410', '#120e0a'], // the dark inside of something open
  x: ['#4e4436', '#120e0a'],
  o: ['#7a6c58'], // a door swung open, edge on
  M: ['#3a4a30', '#6a6650'], // a mouldy mattress
  n: ['#5a6a4a'],
  g: ['#7a9a6a', '#6c604e'], // plates, gone green
};

// Old iron: the stove and the strongbox.
const IRON_INK = {
  t: ['#9aa0a4'], // the top, catching the light
  T: ['#7a8084'],
  I: ['#3e4448', '#646a6e'], // the sides
  i: ['#30363a', '#565c60'],
  c: ['#c8b070', '#646a6e'], // the chain
  r: ['#a0502a', '#3a3632'], // rust, round the stove's door
  p: ['#4a4842'], // the stovepipe
  X: ['#141414', '#0e0e0e'], // the inside, open
};

// Canvas, rope and a dead fire's company: the old camps.
const CAMP_INK = {
  a: ['#d8ccb0'], // canvas in the light
  b: ['#9a8e74'], // canvas in shade
  t: ['#c0b494', '#1a1610'], // a torn flap, and the dark inside
  X: ['#1a1610', '#1a1610'],
  P: ['#8a7a4a'], // a pack
  q: ['#6a5a34', '#4a3e22'],
  e: ['#c49a62'], // the cut end of a log
  L: ['#5e3d22', '#8b6239'], // bark
};

// Stone: graves and standing stones.
const STONE_INK = {
  t: ['#c8c6d0'], // tops, in the light
  T: ['#9a98a4'],
  S: ['#a8a6b2'], // the lit side
  P: ['#6e6c78'], // the shaded side
  s: ['#8a8894'],
  p: ['#56545e'],
  c: ['#45434c', '#a8a6b2'], // something carved
  q: ['#56545e', '#8a8894'], // rough stone, in shade
  Q: ['#45434c', '#6e6c78'],
  m: ['#5a4a32'], // the mound of a grave
  w: ['#8b6239'], // a wooden cross
  f: ['#ffd75e'], // candle flames
  F: ['#ff9a3a'],
  y: ['#f0e8d0'], // candle wax
};

// A rain barrel's colors: oak staves, iron hoops, and the water showing at the top.
const RAIN_BARREL_INK = {
  T: ['#c49a62'], // the rim
  d: ['#2a1e14', '#2a1e14'], // dry inside
  w: ['#5a8ab8', '#16304c'], // a little water, low down and dark
  W: ['#a8d8ff', '#2a6aa8'], // brimming, and catching the light
  L: ['#a87a4c'], // the staves, in the light
  D: ['#6c4828'], // ...in shade
  s: ['#7a5230', '#93683e'],
  h: ['#3a3a3a', '#7e8084'], // the hoops
};

// The lighthouse: red and white bands, a dark lantern room with a broken pane.
const LIGHTHOUSE_INK = {
  c: ['#3a3a3a'], // the cap
  F: ['#2a2a2a'], // the lantern's frame
  g: ['#506070', '#1a2028'], // its glass, dark
  G: ['#a0b0c0', '#1a2028'], // ...broken
  k: ['#4a4a4a', '#e8e4dc'], // the gallery round it, over the top of the tower
  K: ['#4a4a4a', '#a8a49c'],
  W: ['#e8e4dc'], // white band, in the light
  w: ['#a8a49c', '#d0ccc4'], // ...in shade
  R: ['#b5474f'], // red band, in the light
  r: ['#7a2e34', '#9a3a42'], // ...in shade
  D: ['#e8e4dc', '#2a1e14'], // the door's arch
  d: ['#a8a49c', '#2a1e14'],
};

// A brute's colors: bigger and heavier than a shade, with a shaggy hide and one amber eye.
const BRUTE_INK = {
  t: ['#3e3050'], // the top of its back, catching a little light
  s: ['#241a30'], // its shoulders and sides
  b: ['#3a2a4a', '#1a1224'], // its face
  f: ['#33263f', '#140e1c'], // its shaggy hide
  E: ['#ffb02e', '#1a1224'], // its eye
  l: ['#1e1528'], // legs
};

// A lurker's colors: the dark green-black of grass at night, with yellow-green eyes.
const LURKER_INK = {
  t: ['#2f4024'], // the ridge of its back, catching a little light
  b: ['#18240f', '#0b1207'], // its body
  d: ['#101a0a', '#0b1207'], // its shaded side
  E: ['#c6ff3d', '#0b1207'], // eyes
  l: ['#1c2a14'], // legs
};

// A shade's colors (see CREATURES in creatures.js), shared by both its pictures.
const SHADE_INK = {
  w: ['#4a3a5a'], // ears
  t: ['#2c2038'], // the top of its head, catching a little light
  b: ['#2a1d36', '#0d0812'], // its body
  d: ['#1a1222', '#0d0812'], // its shaded side
  E: ['#ff4a3d', '#0d0812'], // eyes
  l: ['#22172c'], // legs
};

const SPRITES = {
  oak: {
    art: [
      '  ▄▄▄▄  ',
      ' ▟ ♣  ▙ ',
      '▐♣  " ♣▌',
      '▐ "♣  "▌',
      ' ▜♣ ♣ ▛ ',
      '  ▀▐▌▀  ',
    ],
    paint: [
      '  aabb  ',
      ' aAABBb ',
      'aAABBBCc',
      'aABBBCCc',
      ' bBBCCc ',
      '  cttc  ',
    ],
    ink: {
      a: ['#5c9c3e'],
      A: ['#8fcc63', '#5c9c3e'],
      b: ['#46852f'],
      B: ['#6fb04c', '#46852f'],
      c: ['#2f6422'],
      C: ['#4f8a38', '#2f6422'],
      t: ['#7a5230'],
    },
    shadow: 4,
  },
  pine: {
    art: [
      '   ▲▲   ',
      '  ▲^^▲  ',
      ' ▲^^^^▲ ',
      '  ▲^^▲  ',
      ' ▲^^^^▲ ',
      '▲^^^^^^▲',
      '   ▐▌   ',
    ],
    paint: [
      '   hl   ',
      '  hllm  ',
      ' hllmmd ',
      '  lmmd  ',
      ' llmmdd ',
      'llmmmddd',
      '   tt   ',
    ],
    ink: {
      h: ['#7fbf6a', '#265c33'],
      l: ['#5fa257', '#1f5030'],
      m: ['#4a8a4a', '#1a442a'],
      d: ['#397040', '#143822'],
      t: ['#7a5230'],
    },
    shadow: 3,
  },
  boulder: {
    art: [
      '▗▄▄▖',
      '▐▄▄▌',
      '▝▀▀▘',
    ],
    paint: [
      'tttt',
      'tFFf',
      'ffff',
    ],
    ink: {
      t: ['#b3b7ae'],
      F: ['#7b7f77', '#b3b7ae'],
      f: ['#7b7f77'],
    },
    shadow: 2,
  },
  bush: {
    art: [
      ' ,♣♣, ',
      '♣•♣♣•♣',
      '♣♣•♣♣♣',
    ],
    paint: [
      ' llll ',
      'lBllBm',
      'mmBmmd',
    ],
    ink: {
      l: ['#6fae4a', '#2d5f22'],
      m: ['#56913a', '#244e1b'],
      d: ['#447a2e', '#1c4015'],
      B: ['#e0475a', '#2d5f22'],
    },
    shadow: 3,
  },
  bushBare: {
    art: [
      ' ,♣♣, ',
      '♣♣♣♣♣♣',
      '♣♣♣♣♣♣',
    ],
    paint: [
      ' llll ',
      'llllmm',
      'mmmmmd',
    ],
    ink: {
      l: ['#6fae4a', '#2d5f22'],
      m: ['#56913a', '#244e1b'],
      d: ['#447a2e', '#1c4015'],
    },
    shadow: 3,
  },
  // Cotton: a little shrub of thin stems with fluffy white bolls on them, picked for cloth.
  cotton: {
    art: [
      ' ●● ',
      '●╲╱●',
      '♣▐▌♣',
    ],
    paint: [
      ' Ww ',
      'Wbcw',
      'lttd',
    ],
    ink: {
      W: ['#f6f2e6'],
      w: ['#cdc6b6'],
      b: ['#9cb866'],
      c: ['#6f8c45'],
      l: ['#6fae4a'],
      d: ['#4f8a38'],
      t: ['#5d7a3a'],
    },
    shadow: 2,
  },
  cottonBare: {
    art: [
      ' ,, ',
      '·╲╱·',
      '♣▐▌♣',
    ],
    paint: [
      ' bc ',
      'wbcw',
      'lttd',
    ],
    ink: {
      w: ['#9a9486'],
      b: ['#9cb866'],
      c: ['#6f8c45'],
      l: ['#6fae4a'],
      d: ['#4f8a38'],
      t: ['#5d7a3a'],
    },
    shadow: 2,
  },
  stump: {
    art: [
      '▗▄▄▖',
      '▐@@▌',
    ],
    paint: [
      'tttt',
      'SRRS',
    ],
    ink: {
      t: ['#d8b07a'],
      R: ['#9c6b3c', '#d8b07a'],
      S: ['#5e3d22', '#7a5230'],
    },
    shadow: 2,
  },
  well: {
    art: [
      ' ▄▄▄▄ ',
      ' ▌ ┬▐ ',
      '▐≈≈≈≈▌',
      '▐▀▀▀▀▌',
    ],
    paint: [
      ' rrrr ',
      ' p bp ',
      'SwwwwS',
      'SssssS',
    ],
    ink: {
      r: ['#b5474f'],
      p: ['#8b6239'],
      b: ['#c49a62'],
      w: ['#7ab4e8', '#163a5e'],
      S: ['#a3a69e'],
      s: ['#a3a69e', '#6c6f68'],
    },
    shadow: 3,
  },
  bedHead: {
    art: ['▐▀▀▌', '▐▓▓▌'],
    paint: ['PppP', 'PbbP'],
    ink: {
      P: ['#5e3d22'],
      p: ['#efe6d2', '#5e3d22'],
      b: ['#3e6aa8', '#2e5288'],
    },
    shadow: 0,
  },
  bedFoot: {
    art: ['▐▓▓▌', '▐▄▄▌'],
    paint: ['PbbP', 'PFFP'],
    ink: {
      P: ['#5e3d22'],
      b: ['#3e6aa8', '#2e5288'],
      F: ['#5e3d22', '#2e5288'],
    },
    shadow: 0,
  },
  table: {
    art: ['▗▄▄▄▄▖', '▐ ¤  ▌', ' |  | '],
    paint: ['tttttt', 'TTCTTT', ' L  L '],
    ink: {
      t: ['#c49a62'],
      T: ['#8b6239', '#c49a62'],
      C: ['#e8d8b0', '#c49a62'],
      L: ['#6e4a2a'],
    },
    shadow: 3,
  },
  // A ring of stones round two crossed logs, with a flame on top. The three pictures differ only in
  // the flame; the campfire flickers between them (see `frames` in objects.js).
  campfire: {
    art: [
      ' ▗▖ ',
      ' ▟▙ ',
      '◖╳╳◗',
    ],
    paint: [
      ' yy ',
      ' oO ',
      'sLLs',
    ],
    ink: FIRE_INK,
    shadow: 0,
  },
  campfire2: {
    art: [
      '  ▖·',
      ' ▟▙ ',
      '◖╳╳◗',
    ],
    paint: [
      '  yY',
      ' Oo ',
      'sLLs',
    ],
    ink: FIRE_INK,
    shadow: 0,
  },
  campfire3: {
    art: [
      ' ▗  ',
      ' ▟▙ ',
      '◖╳╳◗',
    ],
    paint: [
      ' Y  ',
      ' rO ',
      'sLLs',
    ],
    ink: FIRE_INK,
    shadow: 0,
  },
  // A campfire the rain has put out: the ring of stones round charred logs, and a little ash.
  campfireOut: {
    art: [
      ' ·˙ ',
      '◖╳╳◗',
    ],
    paint: [
      ' aa ',
      'sCCs',
    ],
    ink: {
      a: ['#8a8580'],
      C: ['#4a3a2e'],
      s: ['#a3a69e'],
    },
    shadow: 0,
  },
  // A campfire under a roof (see `roofedFire` in objects.js): the same fire, with a small plank roof
  // on a post either side. The three pictures differ only in the flame, like the campfire's.
  roofedFire: {
    art: [
      ' ▄▄▄▄ ',
      '▟◠⌒◠⌒▙',
      '▀▀▀▀▀▀',
      '▌ ▗▖ ▐',
      '▌ ▟▙ ▐',
      '▌◖╳╳◗▐',
    ],
    paint: [
      ' aaaa ',
      'abbbba',
      'eeeeee',
      'p yy p',
      'p oO p',
      'psLLsp',
    ],
    ink: ROOFED_INK,
    shadow: 3,
  },
  roofedFire2: {
    art: [
      ' ▄▄▄▄ ',
      '▟◠⌒◠⌒▙',
      '▀▀▀▀▀▀',
      '▌  ▖·▐',
      '▌ ▟▙ ▐',
      '▌◖╳╳◗▐',
    ],
    paint: [
      ' aaaa ',
      'abbbba',
      'eeeeee',
      'p  yYp',
      'p Oo p',
      'psLLsp',
    ],
    ink: ROOFED_INK,
    shadow: 3,
  },
  roofedFire3: {
    art: [
      ' ▄▄▄▄ ',
      '▟◠⌒◠⌒▙',
      '▀▀▀▀▀▀',
      '▌ ▗  ▐',
      '▌ ▟▙ ▐',
      '▌◖╳╳◗▐',
    ],
    paint: [
      ' aaaa ',
      'abbbba',
      'eeeeee',
      'p Y  p',
      'p rO p',
      'psLLsp',
    ],
    ink: ROOFED_INK,
    shadow: 3,
  },
  // One stretch of wall: sharpened stakes, two to a tile, so a row of them joins up into a fence.
  woodWall: {
    art: [
      '▲▲',
      '▏▏',
      '▏▏',
    ],
    paint: [
      'tT',
      'Ll',
      'Dd',
    ],
    ink: WOOD_INK,
    shadow: 2,
  },
  // A door you build into a wall: a frame of two posts under a crossbar, with a plank door between
  // them. It lines up with the wall stakes on either side. Beside it, it stands open (woodDoorOpen):
  // swung back against one post, with the ground showing through.
  woodDoor: {
    art: [
      '▄▄',
      '╟╢',
      '╟╢',
    ],
    paint: [
      'tT',
      'Ll',
      'Dd',
    ],
    ink: WOOD_INK,
    shadow: 2,
  },
  // The same, once something in the dark has clawed it halfway through (see `scarred` in objects.js).
  woodWallScarred: {
    art: [
      '▲▲',
      '╱▏',
      '▏╱',
    ],
    paint: [
      'tT',
      'Ll',
      'Dd',
    ],
    ink: WOOD_INK,
    shadow: 2,
  },
  woodDoorScarred: {
    art: [
      '▄▄',
      '╱╢',
      '╟╱',
    ],
    paint: [
      'tT',
      'Ll',
      'Dd',
    ],
    ink: WOOD_INK,
    shadow: 2,
  },
  woodDoorOpen: {
    art: [
      '▄▄',
      '▌▐',
      '▌▐',
    ],
    paint: [
      'tT',
      'LP',
      'DP',
    ],
    ink: WOOD_INK,
    shadow: 2,
  },
  // A wall in a fence running up the screen, seen from the side (`side` in objects.js): one stake
  // behind the next, so each tile shows the sharpened tip of its stake over the one behind it, and
  // the nearest one shows all the way down. The lit side faces left, into the light.
  woodWallSide: {
    art: [
      '▗▖',
      '▐▌',
      '▐▌',
    ],
    paint: [
      'tT',
      'SP',
      'sp',
    ],
    ink: WOOD_INK,
    shadow: 1,
  },
  woodWallSideScarred: {
    art: [
      '▗▖',
      '╱▌',
      '▐╱',
    ],
    paint: [
      'tT',
      'SP',
      'sp',
    ],
    ink: WOOD_INK,
    shadow: 1,
  },
  // A door in a fence running up the screen, seen edge-on: a crossbar over it, and the plank door
  // below, darker than the stakes, with its latch. Open, it's swung back out of the way.
  woodDoorSide: {
    art: [
      '▄▄',
      '▐▌',
      '▐▌',
    ],
    paint: [
      'TP',
      'ko',
      'kk',
    ],
    ink: WOOD_INK,
    shadow: 1,
  },
  woodDoorSideScarred: {
    art: [
      '▄▄',
      '╱▌',
      '▐╱',
    ],
    paint: [
      'TP',
      'ko',
      'kk',
    ],
    ink: WOOD_INK,
    shadow: 1,
  },
  woodDoorSideOpen: {
    art: [
      '▄▄',
      '  ',
      ' ▏',
    ],
    paint: [
      'TP',
      '  ',
      ' k',
    ],
    ink: WOOD_INK,
    shadow: 1,
  },
  // A stretch of stone wall: blocks laid in courses under a coping, two to a tile like the wooden
  // wall, so a row of them joins up.
  stoneWall: {
    art: [
      '▄▄',
      '┴┬',
      '┬┴',
    ],
    paint: [
      'tT',
      'Bb',
      'Dd',
    ],
    ink: STONE_WALL_INK,
    shadow: 2,
  },
  stoneWallScarred: {
    art: [
      '▄▄',
      '╱┬',
      '┬╱',
    ],
    paint: [
      'tT',
      'Bb',
      'Dd',
    ],
    ink: STONE_WALL_INK,
    shadow: 2,
  },
  // In a wall running up the screen, seen from the side, like woodWallSide.
  stoneWallSide: {
    art: [
      '▗▖',
      '▐▌',
      '▐▌',
    ],
    paint: [
      'tT',
      'SP',
      'sp',
    ],
    ink: STONE_WALL_INK,
    shadow: 1,
  },
  stoneWallSideScarred: {
    art: [
      '▗▖',
      '╱▌',
      '▐╱',
    ],
    paint: [
      'tT',
      'SP',
      'sp',
    ],
    ink: STONE_WALL_INK,
    shadow: 1,
  },
  // The gate: planks and rails under a stone lintel. Beside it, it stands open between its two posts.
  stoneGate: {
    art: [
      '▄▄',
      '╫╫',
      '╫╫',
    ],
    paint: [
      'tT',
      'Ll',
      'Ww',
    ],
    ink: STONE_WALL_INK,
    shadow: 2,
  },
  stoneGateScarred: {
    art: [
      '▄▄',
      '╱╫',
      '╫╱',
    ],
    paint: [
      'tT',
      'Ll',
      'Ww',
    ],
    ink: STONE_WALL_INK,
    shadow: 2,
  },
  stoneGateOpen: {
    art: [
      '▄▄',
      '▌▐',
      '▌▐',
    ],
    paint: [
      'tT',
      'SP',
      'sp',
    ],
    ink: STONE_WALL_INK,
    shadow: 2,
  },
  stoneGateSide: {
    art: [
      '▄▄',
      '▐▌',
      '▐▌',
    ],
    paint: [
      'TP',
      'ko',
      'kk',
    ],
    ink: STONE_WALL_INK,
    shadow: 1,
  },
  stoneGateSideScarred: {
    art: [
      '▄▄',
      '╱▌',
      '▐╱',
    ],
    paint: [
      'TP',
      'ko',
      'kk',
    ],
    ink: STONE_WALL_INK,
    shadow: 1,
  },
  stoneGateSideOpen: {
    art: [
      '▄▄',
      '  ',
      ' ▏',
    ],
    paint: [
      'TP',
      '  ',
      ' k',
    ],
    ink: STONE_WALL_INK,
    shadow: 1,
  },
  // ---- The garden (see garden.js) ----
  // A garden bed: rows of dug earth.
  soil: {
    art: ['∷∷'],
    paint: ['eE'],
    ink: GARDEN_INK,
    shadow: 0,
  },
  potatoSprout: {
    art: [',\''],
    paint: ['gg'],
    ink: GARDEN_INK,
    shadow: 0,
  },
  potatoPlant: {
    art: [
      '♣♣',
      '╹╹',
    ],
    paint: [
      'lL',
      'GH',
    ],
    ink: GARDEN_INK,
    shadow: 1,
  },
  // Ready to dig up: flowering, with potatoes showing at the foot.
  potatoRipe: {
    art: [
      '*♣',
      'ɵɵ',
    ],
    paint: [
      'fL',
      'pp',
    ],
    ink: GARDEN_INK,
    shadow: 1,
  },
  pumpkinSprout: {
    art: ['\'ʷ'],
    paint: ['gg'],
    ink: GARDEN_INK,
    shadow: 0,
  },
  pumpkinVine: {
    art: ['♣∽'],
    paint: ['GH'],
    ink: GARDEN_INK,
    shadow: 0,
  },
  // A ripe pumpkin on its vine, its stalk sticking up.
  pumpkinRipe: {
    art: [
      ' ╻',
      '()',
    ],
    paint: [
      ' s',
      'oO',
    ],
    ink: GARDEN_INK,
    shadow: 1,
  },
  bushSprout: {
    art: [
      ',♣',
      '♣•',
    ],
    paint: [
      'lL',
      'Gr',
    ],
    ink: GARDEN_INK,
    shadow: 1,
  },
  cottonSprout: {
    art: [
      ' ●',
      '╲╱',
    ],
    paint: [
      ' w',
      'gG',
    ],
    ink: GARDEN_INK,
    shadow: 1,
  },
  wilted: {
    art: [
      '╮,',
      '╹∷',
    ],
    paint: [
      'DD',
      'de',
    ],
    ink: GARDEN_INK,
    shadow: 0,
  },
  // A spiked barricade: stakes crossed in an X, their sharpened ends pointing out.
  spikes: {
    art: [
      '╲╱',
      '╳╳',
      '╱╲',
    ],
    paint: [
      'tt',
      'ss',
      'SS',
    ],
    ink: SPIKE_INK,
    shadow: 2,
  },
  spikesScarred: {
    art: [
      '╲ ',
      '╳╱',
      '╱╲',
    ],
    paint: [
      't ',
      'ss',
      'SS',
    ],
    ink: SPIKE_INK,
    shadow: 2,
  },
  // A lantern hanging from a post: a metal cap, glass with the flame glowing through it (the three
  // pictures flicker), a base, and the post. Gone out, the glass is dark.
  lamp: {
    art: [
      '▗▖',
      '[]',
      '▀▀',
      '▕▏',
      '▕▏',
    ],
    paint: [
      'mm',
      'gG',
      'mm',
      'pP',
      'pP',
    ],
    ink: LAMP_INK,
    shadow: 1,
  },
  lamp2: {
    art: [
      '▗▖',
      '[]',
      '▀▀',
      '▕▏',
      '▕▏',
    ],
    paint: [
      'mm',
      'hH',
      'mm',
      'pP',
      'pP',
    ],
    ink: LAMP_INK,
    shadow: 1,
  },
  lamp3: {
    art: [
      '▗▖',
      '[]',
      '▀▀',
      '▕▏',
      '▕▏',
    ],
    paint: [
      'mm',
      'Gg',
      'mm',
      'pP',
      'pP',
    ],
    ink: LAMP_INK,
    shadow: 1,
  },
  lampOut: {
    art: [
      '▗▖',
      '[]',
      '▀▀',
      '▕▏',
      '▕▏',
    ],
    paint: [
      'mm',
      'dD',
      'mm',
      'pP',
      'pP',
    ],
    ink: LAMP_INK,
    shadow: 1,
  },
  // A rain barrel (see garden.js): staves and two hoops, with what's in it showing at the top.
  rainBarrelEmpty: {
    art: [
      '▗▄▄▖',
      '▐══▌',
      '▐▒▒▌',
      '▐══▌',
    ],
    paint: [
      'TddT',
      'LhhD',
      'LssD',
      'LhhD',
    ],
    ink: RAIN_BARREL_INK,
    shadow: 2,
  },
  rainBarrelLow: {
    art: [
      '▗≈≈▖',
      '▐══▌',
      '▐▒▒▌',
      '▐══▌',
    ],
    paint: [
      'TwwT',
      'LhhD',
      'LssD',
      'LhhD',
    ],
    ink: RAIN_BARREL_INK,
    shadow: 2,
  },
  rainBarrel: {
    art: [
      '▗≈≈▖',
      '▐══▌',
      '▐▒▒▌',
      '▐══▌',
    ],
    paint: [
      'TWWT',
      'LhhD',
      'LssD',
      'LhhD',
    ],
    ink: RAIN_BARREL_INK,
    shadow: 2,
  },
  // The wrecked boat on the beach, in three pieces (bow, middle, stern), seen from the side, bow to
  // the left: sun-bleached planks along the top, a hole stove in the side, a broken mast.
  wreckBow: {
    art: [
      ' ▄',
      '◥═',
      ' ▀',
    ],
    paint: [
      ' t',
      'hL',
      ' d',
    ],
    ink: WRECK_INK,
    shadow: 1,
  },
  wreckMid: {
    art: [
      ' ╽',
      '▄▄',
      '╱ ',
      '▀▀',
    ],
    paint: [
      ' m',
      'tt',
      'LX',
      'dd',
    ],
    ink: WRECK_INK,
    shadow: 2,
  },
  wreckStern: {
    art: [
      '▄▖',
      '═▌',
      '▀ ',
    ],
    paint: [
      'tt',
      'Lh',
      'd ',
    ],
    ink: WRECK_INK,
    shadow: 1,
  },
  // A crate washed up from the wreck: pale planks with a cross brace. Opened, it's empty inside.
  crate: {
    art: [
      '▗▄▄▖',
      '▐╲╱▌',
      '▐╱╲▌',
    ],
    paint: [
      'tttt',
      'LllL',
      'DddD',
    ],
    ink: CRATE_INK,
    shadow: 2,
  },
  crateOpen: {
    art: [
      '▗▄▄▖',
      '▐  ▌',
      '▐══▌',
    ],
    paint: [
      'tttt',
      'LXXL',
      'DddD',
    ],
    ink: CRATE_INK,
    shadow: 2,
  },
  // A little tin box of bullets on the sand.
  bulletBox: {
    art: [
      '▗▖',
    ],
    paint: [
      'bB',
    ],
    ink: { b: ['#c8d0c0'], B: ['#8a968a'] },
    shadow: 0,
  },
  // A gun lying on the ground where you fell.
  pistolDropped: {
    art: [
      ' ⌐',
    ],
    paint: [
      ' g',
    ],
    ink: { g: ['#aab4bc'] },
    shadow: 0,
  },
  rifleDropped: {
    art: [
      '╾─',
    ],
    paint: [
      'wg',
    ],
    ink: { w: ['#9c7048'], g: ['#aab4bc'] },
    shadow: 0,
  },
  // A chest of planks with a lid, banded, with a clasp on the front.
  chest: {
    art: [
      '▗▄▄▖',
      '▐═¤▌',
      '▐▄▄▌',
    ],
    paint: [
      'tttt',
      'LlCl',
      'DddD',
    ],
    ink: {
      t: ['#d8b07a'], // the lid, in the light
      L: ['#5e3d22', '#a87a4c'], // the front, with a band across it
      l: ['#5e3d22', '#93683e'],
      C: ['#f0d080', '#93683e'], // the clasp
      D: ['#3e2814', '#7a5230'], // the bottom, in shade
      d: ['#3e2814', '#6c4828'],
    },
    shadow: 2,
  },
  // A bedroll spread on the ground: a pillow at one end and a blanket. It's flat, so it sits across
  // the line between two rows rather than standing up.
  bedroll: {
    art: [
      '▄▄▄▄',
      '▀┄┄┄',
    ],
    paint: [
      'pbbb',
      'PBBB',
    ],
    ink: {
      p: ['#efe6d2'], // the pillow
      P: ['#bfb39a'],
      b: ['#b0634a'], // the top of the blanket
      B: ['#d08a6a', '#7e4232'], // its front edge, stitched
    },
    shadow: 0,
  },
  // ---- Places to find (see places.js) ----

  // A wall of old logs, front on: grey and cracked, moss creeping up the lowest log.
  logWall: {
    art: [
      '▄▄',
      '══',
      '═≈',
    ],
    paint: [
      'tT',
      'Ll',
      'Dm',
    ],
    ink: OLD_WOOD_INK,
    shadow: 2,
  },
  logWallScarred: {
    art: [
      '▄▄',
      '╱═',
      '═╱',
    ],
    paint: [
      'tT',
      'Ll',
      'Dd',
    ],
    ink: OLD_WOOD_INK,
    shadow: 2,
  },
  logWallSide: {
    art: [
      '▗▖',
      '▐▌',
      '▐▌',
    ],
    paint: [
      'tT',
      'SP',
      'sp',
    ],
    ink: OLD_WOOD_INK,
    shadow: 1,
  },
  logWallSideScarred: {
    art: [
      '▗▖',
      '╱▌',
      '▐╱',
    ],
    paint: [
      'tT',
      'SP',
      'sp',
    ],
    ink: OLD_WOOD_INK,
    shadow: 1,
  },
  // Where a wall fell: a low heap of logs.
  logPile: {
    art: [
      '▂▄',
      '═≈',
    ],
    paint: [
      'tT',
      'Dm',
    ],
    ink: OLD_WOOD_INK,
    shadow: 1,
  },
  // A tall cupboard with two doors and a knob. Searched, its doors hang open on an empty shelf.
  cupboard: {
    art: [
      '▗▄▄▖',
      '▐││▌',
      '▐¤│▌',
      '▐▄▄▌',
    ],
    paint: [
      'tttt',
      'CccC',
      'CkcC',
      'DddD',
    ],
    ink: OLD_WOOD_INK,
    shadow: 2,
  },
  cupboardOpen: {
    art: [
      '▗▄▄▖',
      '╱  ╲',
      '▐▁▁▌',
      '▐▄▄▌',
    ],
    paint: [
      'tttt',
      'oXXo',
      'CxxC',
      'DddD',
    ],
    ink: OLD_WOOD_INK,
    shadow: 2,
  },
  oldBed: {
    art: [
      '▗▄▄▖',
      '▐▓▒▌',
      '╹  ╹',
    ],
    paint: [
      'tnnt',
      'CMMC',
      'p  p',
    ],
    ink: OLD_WOOD_INK,
    shadow: 2,
  },
  oldTable: {
    art: [
      '▗▄▄▄▄▖',
      '▐°  °▌',
      ' |  | ',
    ],
    paint: [
      'tttttt',
      'lgllgl',
      ' p  p ',
    ],
    ink: OLD_WOOD_INK,
    shadow: 3,
  },
  stove: {
    art: [
      ' ▐▌ ',
      '▐▀▀▌',
      '▐▒▒▌',
    ],
    paint: [
      ' pp ',
      'ItTi',
      'IrrI',
    ],
    ink: IRON_INK,
    shadow: 2,
  },
  // An iron box with a chain round it. Pried open, its lid stands up.
  strongbox: {
    art: [
      '▗▄▄▖',
      '▐╪╪▌',
    ],
    paint: [
      'tttT',
      'Icci',
    ],
    ink: IRON_INK,
    shadow: 2,
  },
  strongboxOpen: {
    art: [
      '╱▔▔╲',
      '▐▁▁▌',
    ],
    paint: [
      'tTTT',
      'IXXi',
    ],
    ink: IRON_INK,
    shadow: 2,
  },
  // A small canvas tent, torn open down one side. Searched, it's pulled down into a heap.
  tent: {
    art: [
      ' ▗▖ ',
      ' ▟▙ ',
      '▟▛╲▙',
      '▛  ▜',
    ],
    paint: [
      ' ab ',
      ' ab ',
      'aXtb',
      'aXXb',
    ],
    ink: CAMP_INK,
    shadow: 3,
  },
  tentDown: {
    art: [
      '▂▄▃▂',
    ],
    paint: [
      'abab',
    ],
    ink: CAMP_INK,
    shadow: 0,
  },
  oldPack: {
    art: [
      '▗▙',
    ],
    paint: [
      'Pq',
    ],
    ink: CAMP_INK,
    shadow: 0,
  },
  logSeat: {
    art: [
      '◖══◗',
    ],
    paint: [
      'eLLe',
    ],
    ink: CAMP_INK,
    shadow: 2,
  },
  // A headstone with a low mound of earth in front of it, and a plain wooden cross.
  grave: {
    art: [
      '▗▖',
      '▐▌',
      '▀▀',
    ],
    paint: [
      'tT',
      'cP',
      'mm',
    ],
    ink: STONE_INK,
    shadow: 1,
  },
  graveCross: {
    art: [
      ' ┼',
      ' │',
      '▀▀',
    ],
    paint: [
      ' w',
      ' w',
      'mm',
    ],
    ink: STONE_INK,
    shadow: 1,
  },
  standingStone: {
    art: [
      '▗▄',
      '█▓',
      '▓▒',
      '█▓',
    ],
    paint: [
      'tT',
      'Sq',
      'cQ',
      'sQ',
    ],
    ink: STONE_INK,
    shadow: 2,
  },
  // The flat stone in the middle of the ring, with two candles burning on it. The two pictures differ
  // only in the flames.
  altar: {
    art: [
      ' ¡ ¡',
      '▗▄▄▖',
      '▐▀▀▌',
    ],
    paint: [
      ' f f',
      'tyty',
      'SssP',
    ],
    ink: STONE_INK,
    shadow: 2,
  },
  altar2: {
    art: [
      ' ¡ ı',
      '▗▄▄▖',
      '▐▀▀▌',
    ],
    paint: [
      ' F f',
      'tyty',
      'SssP',
    ],
    ink: STONE_INK,
    shadow: 2,
  },
  // The lighthouse, in two halves side by side (each stands on its own tile): a lantern room with a
  // broken pane, a gallery, and the tower in red and white bands down to its door.
  lighthouseLeft: {
    art: [
      ' ▗',
      '▐▒',
      '▀▀',
      '▐█',
      '▐█',
      '▐█',
      '▐█',
      '▐█',
      '▐▛',
    ],
    paint: [
      ' c',
      'Fg',
      'kk',
      'WW',
      'RR',
      'WW',
      'RR',
      'WW',
      'WD',
    ],
    ink: LIGHTHOUSE_INK,
    shadow: 2,
  },
  lighthouseRight: {
    art: [
      '▖ ',
      '╳▌',
      '▀▀',
      '▓▌',
      '▓▌',
      '▓▌',
      '▓▌',
      '▓▌',
      '▜▌',
    ],
    paint: [
      'c ',
      'GF',
      'KK',
      'ww',
      'rr',
      'ww',
      'rr',
      'ww',
      'dw',
    ],
    ink: LIGHTHOUSE_INK,
    shadow: 3,
  },
  // A brute: a great hunched thing with a shaggy hide and a single amber eye, three tiles wide. Its
  // legs shift between the two pictures as it lumbers along.
  brute: {
    art: [
      ' ▗▄▄▖ ',
      '▟▓●▓▓▙',
      '▐#%#%▌',
      '▐▘  ▝▌',
    ],
    paint: [
      ' tttt ',
      'sbEbbs',
      'sffffs',
      'll  ll',
    ],
    ink: BRUTE_INK,
    shadow: 0,
  },
  brute2: {
    art: [
      ' ▗▄▄▖ ',
      '▟▓●▓▓▙',
      '▐%#%#▌',
      '▝▌  ▐▘',
    ],
    paint: [
      ' tttt ',
      'sbEbbs',
      'sffffs',
      'll  ll',
    ],
    ink: BRUTE_INK,
    shadow: 0,
  },
  // A lurker: something long and low that waits in the long grass. Crouched (lurkerLow), only its
  // back and eyes show above the grass; leaping, its legs reach out front and back. The eyes are in
  // the same cells in every picture (see `eyes` in CREATURES).
  lurkerLow: {
    art: [
      '▗••▖',
      '▐▓▓▌',
    ],
    paint: [
      'tEEt',
      'bbdd',
    ],
    ink: LURKER_INK,
    shadow: 0,
  },
  lurker: {
    art: [
      '▄••▄',
      '▘▀▀▝',
    ],
    paint: [
      'bEEd',
      'lbdl',
    ],
    ink: LURKER_INK,
    shadow: 0,
  },
  lurker2: {
    art: [
      '▄••▄',
      '▝▀▀▘',
    ],
    paint: [
      'bEEd',
      'lbdl',
    ],
    ink: LURKER_INK,
    shadow: 0,
  },
  // A shade: a hunched thing of shadow with pointed ears and red eyes. Its legs shift between the two
  // pictures as it walks.
  shade: {
    art: [
      '▚▄▄▞',
      '▐••▌',
      '▞▘▝▚',
    ],
    paint: [
      'wttw',
      'bEEd',
      'llll',
    ],
    ink: SHADE_INK,
    shadow: 0,
  },
  shade2: {
    art: [
      '▚▄▄▞',
      '▐••▌',
      '▝▚▞▘',
    ],
    paint: [
      'wttw',
      'bEEd',
      'llll',
    ],
    ink: SHADE_INK,
    shadow: 0,
  },
};

// The player: a survivor in a wide-brimmed straw hat with a pack on their back. Three characters
// wide and four rows tall, with a set of pictures for each way they can face:
//   stand    standing still          blink   the same, eyes shut for a moment
//   walk     four steps: a stride, legs passing (lifted a little, see WALK_BOB in render.js), the
//            other stride, legs passing; the arms swing against the legs
//   windup   tool raised, between swings      strike   the swing landing, or a hand reaching out
//   crouch   kneeling, to drink or put out a fire
//   fallen   lying on the ground, when health runs out (only facing left and right; facing up or
//            down they fall to the left or right, see playerPose() in render.js)
// `held` says where the tool in their hand is drawn in each pose, in characters from the picture's
// top-left corner (see ACTION_POSES for which tool). `torch` says the same for the torch, carried in
// the other hand all the time once you've made one: where the hand holding its stick is, standing
// (and walking and swinging) and kneeling. Its rag, or its flame, is drawn on the row above.
// The colors below are the player's before the game starts. The hat, hair, skin, shirt and trousers
// are then replaced by the colors picked on the Your look panel (see LOOKS and dressPlayer() below);
// the pack keeps these.
const PLAYER_INK = {
  T: ['#f0d27a'], // straw hat: the crown, in the light
  B: ['#d4a540'], // the brim
  b: ['#b8892e'], // the brim's shaded side
  r: ['#5a3a22'], // hair
  R: ['#2a1a10', '#5a3a22'], // the back of the head
  F: ['#3a2414', '#f0c290'], // face: eyes and mouth on skin
  f: ['#f0c290'], // skin: arms and hands, and the nose from the side
  g: ['#d9a878'], // skin on the shaded side
  C: ['#b84a2c', '#d9603b'], // shirt
  P: ['#5e4630', '#d9603b'], // pack straps over the shirt
  K: ['#5e4630', '#8a6a3c'], // the pack, from behind
  k: ['#8a6a3c'], // the pack, from the side
  p: ['#41557f'], // trousers
};

const PLAYER_SPRITES = {
  down: {
    stand: { art: ['▄█▄', '▐ü▌', '▐‖▌', ' Π '], paint: ['BTb', 'rFr', 'fPg', ' p '] },
    blink: { art: ['▄█▄', '▐ū▌', '▐‖▌', ' Π '], paint: ['BTb', 'rFr', 'fPg', ' p '] },
    walk: [
      { art: ['▄█▄', '▐ü▌', '▝‖▌', ' Λ '], paint: ['BTb', 'rFr', 'fPg', ' p '] },
      { art: ['▄█▄', '▐ü▌', '▐‖▌', ' Π '], paint: ['BTb', 'rFr', 'fPg', ' p '] },
      { art: ['▄█▄', '▐ü▌', '▐‖▘', ' Λ '], paint: ['BTb', 'rFr', 'fPg', ' p '] },
      { art: ['▄█▄', '▐ü▌', '▐‖▌', ' Π '], paint: ['BTb', 'rFr', 'fPg', ' p '] },
    ],
    windup: { art: ['▄█▄', '▐ü▌', '▐‖ ', ' Π '], paint: ['BTb', 'rFr', 'fP ', ' p '] },
    strike: { art: ['▄█▄', '▐ü▌', '▐‖▖', ' Π '], paint: ['BTb', 'rFr', 'fPg', ' p '] },
    crouch: { art: ['   ', '▄█▄', '▐ü▌', '▐‖▌'], paint: ['   ', 'BTb', 'rFr', 'fPg'] },
    held: { windup: [2, 1], strike: [2, 3], crouch: [2, 3] },
    torch: { stand: [-1, 2], crouch: [-1, 3] },
  },
  up: {
    stand: { art: ['▄█▄', '▐▓▌', '▐▣▌', ' Π '], paint: ['BTb', 'rRr', 'fKg', ' p '] },
    walk: [
      { art: ['▄█▄', '▐▓▌', '▝▣▌', ' Λ '], paint: ['BTb', 'rRr', 'fKg', ' p '] },
      { art: ['▄█▄', '▐▓▌', '▐▣▌', ' Π '], paint: ['BTb', 'rRr', 'fKg', ' p '] },
      { art: ['▄█▄', '▐▓▌', '▐▣▘', ' Λ '], paint: ['BTb', 'rRr', 'fKg', ' p '] },
      { art: ['▄█▄', '▐▓▌', '▐▣▌', ' Π '], paint: ['BTb', 'rRr', 'fKg', ' p '] },
    ],
    windup: { art: ['▄█▄', '▐▓▌', ' ▣▌', ' Π '], paint: ['BTb', 'rRr', ' Kg', ' p '] },
    strike: { art: ['▄█▄', '▐▓▌', '▝▣▌', ' Π '], paint: ['BTb', 'rRr', 'fKg', ' p '] },
    crouch: { art: ['   ', '▄█▄', '▐▓▌', '▐▣▌'], paint: ['   ', 'BTb', 'rRr', 'fKg'] },
    held: { windup: [0, 1], strike: [0, 0], crouch: [0, 1] },
    torch: { stand: [3, 2], crouch: [3, 3] },
  },
  left: {
    stand: { art: ['▄█▖', '▐·▌', '▐█▌', ' Π '], paint: ['BTb', 'fFr', 'fCk', ' p '] },
    blink: { art: ['▄█▖', '▐-▌', '▐█▌', ' Π '], paint: ['BTb', 'fFr', 'fCk', ' p '] },
    walk: [
      { art: ['▄█▖', '▐·▌', '▘█▌', ' Λ '], paint: ['BTb', 'fFr', 'fCk', ' p '] },
      { art: ['▄█▖', '▐·▌', '▐█▌', ' ║ '], paint: ['BTb', 'fFr', 'fCk', ' p '] },
      { art: ['▄█▖', '▐·▌', '▗█▌', ' Λ '], paint: ['BTb', 'fFr', 'fCk', ' p '] },
      { art: ['▄█▖', '▐·▌', '▐█▌', ' ║ '], paint: ['BTb', 'fFr', 'fCk', ' p '] },
    ],
    windup: { art: ['▄█▖', '▐·▌', ' █▌', ' Π '], paint: ['BTb', 'fFr', ' Ck', ' p '] },
    strike: { art: ['▄█▖', '▐·▌', '▀█▌', ' Π '], paint: ['BTb', 'fFr', 'fCk', ' p '] },
    crouch: { art: ['   ', '▄█▖', '▐·▌', '▐█▌'], paint: ['   ', 'BTb', 'fFr', 'fCk'] },
    fallen: { art: ['▗▄▖    ', '▐ū▓█▬▬▘'], paint: ['BTb    ', 'rFkCppp'] },
    held: { windup: [2, 0], strike: [-1, 2], crouch: [-1, 3] },
    torch: { stand: [3, 2], crouch: [3, 3] },
  },
  right: {
    stand: { art: ['▗█▄', '▐·▌', '▐█▌', ' Π '], paint: ['BTb', 'rFg', 'kCg', ' p '] },
    blink: { art: ['▗█▄', '▐-▌', '▐█▌', ' Π '], paint: ['BTb', 'rFg', 'kCg', ' p '] },
    walk: [
      { art: ['▗█▄', '▐·▌', '▐█▝', ' Λ '], paint: ['BTb', 'rFg', 'kCg', ' p '] },
      { art: ['▗█▄', '▐·▌', '▐█▌', ' ║ '], paint: ['BTb', 'rFg', 'kCg', ' p '] },
      { art: ['▗█▄', '▐·▌', '▐█▖', ' Λ '], paint: ['BTb', 'rFg', 'kCg', ' p '] },
      { art: ['▗█▄', '▐·▌', '▐█▌', ' ║ '], paint: ['BTb', 'rFg', 'kCg', ' p '] },
    ],
    windup: { art: ['▗█▄', '▐·▌', '▐█ ', ' Π '], paint: ['BTb', 'rFg', 'kC ', ' p '] },
    strike: { art: ['▗█▄', '▐·▌', '▐█▀', ' Π '], paint: ['BTb', 'rFg', 'kCg', ' p '] },
    crouch: { art: ['   ', '▗█▄', '▐·▌', '▐█▌'], paint: ['   ', 'BTb', 'rFg', 'kCg'] },
    fallen: { art: ['    ▗▄▖', '▝▬▬█▓ū▌'], paint: ['    BTb', 'pppCkFr'] },
    held: { windup: [0, 0], strike: [3, 2], crouch: [3, 3] },
    torch: { stand: [-1, 2], crouch: [-1, 3] },
  },
};

// The choices on the Your look panel (in the menu). Each part of the player has a row of colors to
// pick from; the first in each row is what a new player wears. Add a color and it gets its own
// button. Only the main color is given: the lighter and darker shades for the sunlit and shaded
// sides are worked out from it (see dressPlayer()).
const LOOKS = {
  hat: {
    name: 'Hat',
    colors: [
      { name: 'Straw', color: '#d4a540' },
      { name: 'Leather', color: '#8a5a32' },
      { name: 'Red', color: '#b8433a' },
      { name: 'Blue', color: '#3f6aa8' },
      { name: 'Green', color: '#4f8a3a' },
      { name: 'White', color: '#e0dac6' },
    ],
  },
  hair: {
    name: 'Hair',
    colors: [
      { name: 'Brown', color: '#5a3a22' },
      { name: 'Black', color: '#221c1a' },
      { name: 'Fair', color: '#c9a050' },
      { name: 'Red', color: '#a8502a' },
      { name: 'Grey', color: '#9a9690' },
    ],
  },
  skin: {
    name: 'Skin',
    colors: [
      { name: 'Light', color: '#f0c290' },
      { name: 'Pale', color: '#f6d8bc' },
      { name: 'Tan', color: '#d49a68' },
      { name: 'Brown', color: '#a8714a' },
      { name: 'Dark', color: '#6e4630' },
    ],
  },
  shirt: {
    name: 'Shirt',
    colors: [
      { name: 'Rust', color: '#d9603b' },
      { name: 'Blue', color: '#4a78c0' },
      { name: 'Green', color: '#5a9a48' },
      { name: 'Yellow', color: '#d8b040' },
      { name: 'Purple', color: '#8a5ab0' },
      { name: 'White', color: '#d8d4c8' },
    ],
  },
  trousers: {
    name: 'Trousers',
    colors: [
      { name: 'Denim', color: '#41557f' },
      { name: 'Brown', color: '#6e4a2c' },
      { name: 'Black', color: '#2e2c30' },
      { name: 'Green', color: '#3e5a34' },
      { name: 'Grey', color: '#76767a' },
    ],
  },
};

const PACK_STRAPS = '#5e4630'; // the pack's straps over the shirt, whatever color the shirt is

// The look a new player starts with: the first color in each row of LOOKS.
function defaultLook() {
  return Object.fromEntries(Object.entries(LOOKS).map(([part, { colors }]) => [part, colors[0].color]));
}

// Dresses the player in `look` ({ hat: color, hair: color, ... }): rewrites the colors in PLAYER_INK,
// which every picture of the player shares, then throws away the pictures drawn in the old colors
// so they're drawn again in the new ones.
function dressPlayer(look) {
  const { hat, hair, skin, shirt, trousers } = { ...defaultLook(), ...look };
  PLAYER_INK.T = [shade(hat, 0.22)]; // the hat's crown catches the light
  PLAYER_INK.B = [hat];
  PLAYER_INK.b = [shade(hat, -0.14)];
  PLAYER_INK.r = [hair];
  PLAYER_INK.R = [shade(hair, -0.5), hair];
  PLAYER_INK.F = [shade(skin, -0.75), skin]; // eyes and mouth: a deep shade of the skin
  PLAYER_INK.f = [skin];
  PLAYER_INK.g = [shade(skin, -0.12)];
  PLAYER_INK.C = [shade(shirt, -0.18), shirt]; // folds in the shirt
  PLAYER_INK.P = [PACK_STRAPS, shirt];
  PLAYER_INK.p = [trousers];
  forEachPlayerPicture((picture) => {
    picture.imageAtlas = null; // see spriteImage() in render.js
  });
}

function forEachPlayerPicture(visit) {
  for (const set of Object.values(PLAYER_SPRITES)) {
    for (const [pose, pictures] of Object.entries(set)) {
      if (pose !== 'held' && pose !== 'torch') [].concat(pictures).forEach(visit);
    }
  }
}

// A color made lighter (amount above 0, up to 1 for white) or darker (below 0, down to -1 for black).
function shade(color, amount) {
  return blendColor(color, amount > 0 ? '#ffffff' : '#000000', Math.abs(amount));
}

// Two colors like '#d4a540' mixed: `share` 0 gives the first, 1 the second.
function blendColor(a, b, share) {
  const parse = (hex) => [1, 3, 5].map((n) => parseInt(hex.slice(n, n + 2), 16));
  const [from, to] = [parse(a), parse(b)];
  return `#${from.map((value, n) => {
    const mixed = Math.round(value + (to[n] - value) * share);
    return mixed.toString(16).padStart(2, '0');
  }).join('')}`;
}

// How the player looks doing each thing, by the word on the action button (and Eat and Build).
//   pose     which picture: 'strike', 'windup' or 'crouch' (see PLAYER_SPRITES)
//   held     the character drawn in their hand, or null for an empty hand
//   seconds  how long the pose is held
//   aim      true to keep the pose (not the wind-up) while the button's held: a gun held out
// Anything not listed uses `default`: a swing of the rough tool. A crafted tool with power for the
// word (TOOLS in crafting.js) is drawn in place of `held`, so the axe shows when you chop.
const ACTION_POSES = {
  default: { pose: 'strike', held: '⚒', seconds: 0.2 },
  Pick: { held: null },
  Drink: { pose: 'crouch', held: null, seconds: 0.4 },
  'Put out': { pose: 'crouch', held: null, seconds: 0.4 },
  Light: { pose: 'crouch', held: null, seconds: 0.5 },
  Hit: { held: null },
  Open: { pose: 'crouch', held: null, seconds: 0.3 },
  'Roll up': { pose: 'crouch', held: null, seconds: 0.4 },
  Fill: { pose: 'windup', held: null, seconds: 0.4 },
  Fish: { pose: 'crouch', held: null, seconds: 0.3 }, // kneeling at the water, rod held out
  Shoot: { pose: 'strike', held: null, seconds: 0.35, aim: true }, // the gun held out, and kept there
  'Pick up': { pose: 'crouch', held: null, seconds: 0.4 },
  Search: { pose: 'crouch', held: null, seconds: 0.5 }, // rummaging through a cupboard or a pack
  'Cut up': { pose: 'crouch', held: null, seconds: 0.3 },
  'Dig up': { seconds: 0.25 }, // a swing of the spade (drawn in place of the rough tool)
  Plant: { pose: 'crouch', held: null, seconds: 0.4 },
  Water: { pose: 'crouch', held: null, seconds: 0.4 },
  Harvest: { pose: 'crouch', held: null, seconds: 0.4 },
  Clear: { pose: 'crouch', held: null, seconds: 0.3 },
  Eat:{ pose: 'windup', held: null, seconds: 0.4 },
};

// The torch in the player's hand: a stick with a rag wrapped round the top, which becomes a flame
// once it's lit, flickering through `flames` like the campfire. Each is [character, color].
const TORCH_LOOK = {
  stick: ['┃', '#a8763e'],
  rag: ['●', '#d8cdb4'],
  flames: [['♦', '#ffd75e'], ['▲', '#ff9a3a'], ['♦', '#ffb347'], ['▴', '#fff0a0']],
};

// Splits each drawing into rows of single characters, and checks that the art and paint line up so
// a typo in a drawing shows up in the browser console instead of as a garbled tree.
function prepareSprite(label, sprite, ink) {
  sprite.ink = sprite.ink || ink;
  sprite.cells = sprite.art.map((row) => Array.from(row));
  sprite.paintCells = sprite.paint.map((row) => Array.from(row));
  sprite.width = Math.max(...sprite.cells.map((row) => row.length));
  sprite.cells.forEach((row, r) => {
    const paint = sprite.paintCells[r];
    if (!paint || paint.length !== row.length) {
      console.warn(`Sprite "${label}": art and paint don't line up on row ${r + 1}.`);
    }
    for (const key of paint || []) {
      if (key !== ' ' && !sprite.ink[key]) console.warn(`Sprite "${label}": no ink called "${key}".`);
    }
  });
}

for (const [name, sprite] of Object.entries(SPRITES)) prepareSprite(name, sprite);
for (const [facing, set] of Object.entries(PLAYER_SPRITES)) {
  for (const [pose, pictures] of Object.entries(set)) {
    if (pose === 'held' || pose === 'torch') continue;
    [].concat(pictures).forEach((picture, n) => {
      const label = Array.isArray(pictures) ? `${pose} ${n + 1}` : pose;
      prepareSprite(`player ${facing} ${label}`, picture, PLAYER_INK);
      picture.bold = true; // so the player stands out from the world around them
    });
  }
}
