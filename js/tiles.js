// Every kind of ground the world can be made of.
//
//   name     what the status bar calls it
//   glyphs   characters to draw; each spot in the world picks one, so a field isn't a flat pattern
//   colors   glyph colors, picked the same way
//   bg       the cell's background color
//   solid    true if the player can't walk onto it
//   blocked  message shown when the player bumps into it
//   animated true to cycle through the glyphs over time (used for water)

const TILES = {
  deepWater: {
    name: 'Deep water',
    glyphs: ['≈', '≈', '~', '≈'],
    colors: ['#2f5f9e', '#28548e'],
    bg: '#07101d',
    solid: true,
    blocked: 'The water is too deep to cross.',
    animated: true,
  },
  water: {
    name: 'Shallow water',
    glyphs: ['~', '~', '≈', '~'],
    colors: ['#4f8fd0', '#5a9ad8'],
    bg: '#0a1828',
    solid: true,
    blocked: "You stop at the water's edge.",
    animated: true,
  },
  sand: {
    name: 'Sand',
    glyphs: ['.', '.', ':', '·'],
    colors: ['#c8b07a', '#b9a06a', '#d4bd88'],
    bg: '#16130c',
  },
  grass: {
    name: 'Grass',
    glyphs: ['.', ',', '.', '\'', '`', '.'],
    colors: ['#4c8a3c', '#5a9946', '#3f7533', '#67a650'],
    bg: '#0b120c',
  },
  tallGrass: {
    name: 'Tall grass',
    glyphs: ['"', ';', '"', '\''],
    colors: ['#6aab4f', '#5c9c44', '#79b85c'],
    bg: '#0c150d',
  },
  flowers: {
    name: 'Wildflowers',
    glyphs: ['*', '❀', '*'],
    colors: ['#e07aa5', '#e8c94a', '#b48be3', '#f0f0e0'],
    bg: '#0b120c',
  },
  tree: {
    name: 'Tree',
    glyphs: ['♣', '♠', '♣'],
    colors: ['#2f7a35', '#3a8a3c', '#266a2c'],
    bg: '#09100a',
    solid: true,
    blocked: 'A tree blocks your way.',
  },
  rock: {
    name: 'Boulder',
    glyphs: ['o', 'O', '0'],
    colors: ['#8b8f88', '#7a7e77'],
    bg: '#0f110f',
    solid: true,
    blocked: 'A boulder is in the way.',
  },
  hills: {
    name: 'Rocky hills',
    glyphs: ['^', 'n', '^', '.'],
    colors: ['#8f8a78', '#7d7867', '#a09a86'],
    bg: '#12120e',
  },
  mountain: {
    name: 'Mountain',
    glyphs: ['▲', '^', '▲'],
    colors: ['#b4b0a4', '#9a9689', '#d8d6cf'],
    bg: '#151513',
    solid: true,
    blocked: 'The mountain is too steep to climb.',
  },
  path: {
    name: 'Dirt path',
    glyphs: ['.', ':', '.'],
    colors: ['#9a7a50', '#8a6c45'],
    bg: '#17110a',
  },
  wall: {
    name: 'Wall',
    glyphs: ['#'],
    colors: ['#a08d76'],
    bg: '#2a221a',
    solid: true,
    blocked: 'A sturdy wooden wall.',
  },
  floor: {
    name: 'Wooden floor',
    glyphs: ['.', '_', '.'],
    colors: ['#8a6a46', '#7a5d3d'],
    bg: '#1d150d',
  },
  door: {
    name: 'Doorway',
    glyphs: ['+'],
    colors: ['#d79a52'],
    bg: '#1d150d',
  },
  well: {
    name: 'Well',
    glyphs: ['O'],
    colors: ['#7fb3e0'],
    bg: '#1a1a1a',
    solid: true,
    blocked: 'An old stone well. You hear water far below.',
  },
};
