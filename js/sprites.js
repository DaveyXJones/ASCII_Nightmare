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
};

// The player: a survivor in a wide-brimmed hat with a pack on their back. Three characters wide,
// four rows tall, with a set of frames for each way they can face. Frame 0 is standing still;
// walking alternates frames 1 and 2. `swing` is shown mid-action, tool raised.
const PLAYER_INK = {
  h: ['#e2bd5f'], // straw hat
  H: ['#4a2f1c'], // hair, from behind
  s: ['#f0c290'], // skin
  c: ['#d9603b'], // shirt
  k: ['#7a5a32'], // pack
  p: ['#41557f'], // trousers
  x: ['#cfd4d8'], // tool
};

const PLAYER_SPRITES = {
  down: {
    frames: [
      { art: ['▗█▖', ' ☻ ', '▐█▌', ' Π '], paint: ['hhh', ' s ', 'scs', ' p '] },
      { art: ['▗█▖', ' ☻ ', '▐█▌', ' Λ '], paint: ['hhh', ' s ', 'scs', ' p '] },
      { art: ['▗█▖', ' ☻ ', '▐█▌', ' Π '], paint: ['hhh', ' s ', 'scs', ' p '] },
    ],
    swing: { art: ['▗█▖', ' ☻⚒', '▐█▌', ' Π '], paint: ['hhh', ' sx', 'scs', ' p '] },
  },
  up: {
    frames: [
      { art: ['▗█▖', ' ● ', '▐█▌', ' Π '], paint: ['hhh', ' H ', 'sks', ' p '] },
      { art: ['▗█▖', ' ● ', '▐█▌', ' Λ '], paint: ['hhh', ' H ', 'sks', ' p '] },
      { art: ['▗█▖', ' ● ', '▐█▌', ' Π '], paint: ['hhh', ' H ', 'sks', ' p '] },
    ],
    swing: { art: ['▗█▖', '⚒● ', '▐█▌', ' Π '], paint: ['hhh', 'xH ', 'sks', ' p '] },
  },
  left: {
    frames: [
      { art: ['▄█▖', ' ☻ ', '▐█▌', ' Π '], paint: ['hhh', ' s ', 'sck', ' p '] },
      { art: ['▄█▖', ' ☻ ', '▐█▌', ' Λ '], paint: ['hhh', ' s ', 'sck', ' p '] },
      { art: ['▄█▖', ' ☻ ', '▐█▌', ' Π '], paint: ['hhh', ' s ', 'sck', ' p '] },
    ],
    swing: { art: ['▄█▖', '⚒☻ ', '▐█▌', ' Π '], paint: ['hhh', 'xs ', 'sck', ' p '] },
  },
  right: {
    frames: [
      { art: ['▗█▄', ' ☻ ', '▐█▌', ' Π '], paint: ['hhh', ' s ', 'kcs', ' p '] },
      { art: ['▗█▄', ' ☻ ', '▐█▌', ' Λ '], paint: ['hhh', ' s ', 'kcs', ' p '] },
      { art: ['▗█▄', ' ☻ ', '▐█▌', ' Π '], paint: ['hhh', ' s ', 'kcs', ' p '] },
    ],
    swing: { art: ['▗█▄', ' ☻⚒', '▐█▌', ' Π '], paint: ['hhh', ' sx', 'kcs', ' p '] },
  },
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
  for (const [i, frame] of [...set.frames, set.swing].entries()) {
    prepareSprite(`player ${facing} ${i < set.frames.length ? i : 'swing'}`, frame, PLAYER_INK);
    frame.bold = true; // so the player stands out from the world around them
  }
}
