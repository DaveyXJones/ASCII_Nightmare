// Every kind of ground the world is made of. Ground is flat and drawn first. Anything that
// stands up off it (trees, rocks, walls, the player) is a sprite drawn on top, see sprites.js.
//
// Each tile is two characters wide and one row tall on screen.
//
//   name     what the game calls it
//   glyphs   characters to draw; each half of a tile picks one, so a field isn't a flat pattern
//   colors   glyph colors, picked the same way
//   bgs      background colors; patches of the world pick different ones (lighter and darker grass)
//   solid    true if the player can't walk onto it
//   blocked  message shown when the player bumps into it
//   animated true to cycle through the glyphs over time (water)
//   drink    true if the player can drink from it
//   tall     the glyphs stand up and are drawn over the player's feet (grass you wade through)
//   raised   drawn as a raised block with a cliff face (mountains), see drawMountain() in render.js
//   fish     for water with fish in it: the share of bites that end in a catch (see fishing.js)
//   map      [glyph, color, background] for the map (js/map.js); if left out, the first of each
//   step     what a footstep kicks up: a style in BURSTS (survival.js), like 'dust' or 'grass'

const TILES = {
  deepWater: {
    name: 'Deep water',
    fish: 0.85, // a fish on the line is landed this often (see fishing.js)
    map: ['≈', '#2f5f9e', '#0a1930'],
    glyphs: ['≈', '~', '≈', '∼'],
    colors: ['#3a6fb0', '#2f5f9e'],
    bgs: ['#0b1b33', '#0a1930'],
    solid: true,
    blocked: 'The water is too deep to cross.',
    animated: true,
    drink: true,
  },
  water: {
    name: 'Shallow water',
    fish: 0.6,
    map: ['~', '#7ab4e8', '#163a5e'],
    glyphs: ['~', '∼', '~', '≈'],
    colors: ['#7ab4e8', '#62a2dc'],
    bgs: ['#163a5e', '#143758'],
    solid: true,
    blocked: "You stop at the water's edge.",
    animated: true,
    drink: true,
  },
  sand: {
    name: 'Sand',
    map: ['·', '#c4ad74', '#5e5132'],
    glyphs: ['.', '·', ' ', ':', ' ', '.'],
    colors: ['#a8915c', '#b59e68', '#968150'],
    bgs: ['#5e5132', '#655736', '#584c2f'],
    step: 'sand',
  },
  grass: {
    name: 'Grass',
    map: ['.', '#5d9a45', '#284f1f'],
    glyphs: ['.', ',', ' ', '\'', '`', ' ', '.', ' '],
    colors: ['#5d9a45', '#6aa84f', '#4f8a3b'],
    bgs: ['#23461b', '#284f1f', '#2c5622', '#1f3f18'],
    step: 'grass',
  },
  tallGrass: {
    name: 'Tall grass',
    map: ['"', '#86c460', '#284f1f'],
    glyphs: ['"', 'ʷ', '"', ';', '\''],
    colors: ['#86c460', '#79b85a', '#93cf6b'],
    bgs: ['#23461b', '#284f1f', '#2c5622', '#1f3f18'],
    tall: true,
    step: 'grass',
  },
  flowers: {
    name: 'Wildflowers',
    map: ['*', '#e889b0', '#284f1f'],
    glyphs: ['✿', '*', ',', '❀', '.'],
    colors: ['#e889b0', '#efd25a', '#c3a0f0', '#f4f1e4'],
    bgs: ['#23461b', '#284f1f', '#2c5622'],
    step: 'grass',
  },
  hills: {
    name: 'Rocky hills',
    map: ['^', '#a49f8a', '#4f4a3a'],
    glyphs: ['.', ' ', '\'', ' ', '^', ' ', ',', '.'],
    colors: ['#a49f8a', '#8f8a76'],
    bgs: ['#4f4a3a', '#55503f', '#4a4536'],
    step: 'dust',
  },
  mountain: {
    name: 'Mountain',
    map: ['▲', '#e3e0d6', '#6f6b60'],
    glyphs: ['.', ' ', '\'', ' ', '`', ' ', ',', ' '],
    colors: ['#c4c0b2', '#aeaa9c'],
    bgs: ['#7c786d', '#8b877b', '#9a968a'], // tops of the lowest, middle and highest steps
    solid: true,
    blocked: 'The cliff is too steep to climb.',
    raised: true,
    // The cliff below each top: its upper row, the middle, and the shaded foot.
    face: {
      glyphs: ['│', '╎', ' ', '|', '┆', ' ', '│'],
      colors: ['#7a7468', '#55504a'],
      bgs: ['#575249', '#4a463e', '#37342e'],
    },
    // The highest step is capped with snow.
    peak: {
      glyphs: ['.', ' ', '\'', ' ', '*', ' '],
      colors: ['#ffffff', '#e3e9f0'],
      bgs: ['#d2d7dd', '#c8ced5'],
    },
  },
  path: {
    name: 'Dirt path',
    glyphs: ['.', ':', '·', ' '],
    colors: ['#b08e60', '#9c7d52'],
    bgs: ['#5a4329', '#604730'],
    step: 'dust',
  },
  floor: {
    name: 'Wooden floor',
    glyphs: ['═', '─', '═', '═'],
    colors: ['#6f5133', '#7a5a39'],
    bgs: ['#9a7448', '#93703f'],
  },
  // The floor of a ruined cabin (see places.js): grey, warped boards with gaps where they've rotted.
  boards: {
    name: 'Rotten boards',
    map: ['=', '#8f7c62', '#4a3c2c'],
    glyphs: ['═', '─', ' ', '═', '╌', '─'],
    colors: ['#4a3c2c', '#54442f'],
    bgs: ['#6e5a42', '#665339', '#5c4a35'],
    step: 'dust',
  },
  // A floor you've laid yourself (the Wooden floor in RECIPES): new boards, paler than the cottage's.
  // Grass doesn't grow through it, so nothing can lurk on it.
  planks: {
    name: 'Plank floor',
    map: ['=', '#d8b07a', '#7a5a39'],
    glyphs: ['═', '─', '═', '═'],
    colors: ['#7a5636', '#86603c'],
    bgs: ['#b48a5c', '#ac8455', '#b8905f'],
  },
  rug: {
    name: 'Rug',
    glyphs: ['░', '▒', '░'],
    colors: ['#a3424a', '#8f3a41'],
    bgs: ['#5e2228'],
  },
  wall: {
    name: 'Wall',
    glyphs: ['═'],
    colors: ['#8b6239'],
    bgs: ['#a87f4e'],
    solid: true,
    blocked: 'A sturdy log wall.',
  },
  door: {
    name: 'Doorway',
    glyphs: ['▁'],
    colors: ['#c49a62'],
    bgs: ['#7a5a39'],
  },
};
