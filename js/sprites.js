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

// The colors of things built from wood: the wall and the door.
const WOOD_INK = {
  t: ['#d8b07a'], // tops, in the light
  T: ['#b08458'],
  L: ['#5e3d22', '#b08458'], // planks, with dark lines between them
  l: ['#5e3d22', '#9c7048'],
  D: ['#4a2f1c', '#8b6239'], // the lower planks, in shade
  d: ['#4a2f1c', '#7a5230'],
  P: ['#7a5230'], // a post seen edge-on
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
// Anything not listed uses `default`: a swing of the rough tool. A crafted tool with power for the
// word (TOOLS in crafting.js) is drawn in place of `held`, so the axe shows when you chop.
const ACTION_POSES = {
  default: { pose: 'strike', held: '⚒', seconds: 0.2 },
  Pick: { held: null },
  Drink: { pose: 'crouch', held: null, seconds: 0.4 },
  'Put out': { pose: 'crouch', held: null, seconds: 0.4 },
  Light: { pose: 'crouch', held: null, seconds: 0.5 },
  Hit: { held: null },
  Eat: { pose: 'windup', held: null, seconds: 0.4 },
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
