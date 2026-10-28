// Things that stand on the map: what they look like and what the player can do with them.
//
//   name     what the game calls it
//   sprite   which picture in SPRITES (sprites.js) to draw
//   solid    true if the player can't walk through it
//   blocked  message shown when the player bumps into it
//   action   the word on the action button when you face it (Chop, Mine, Pick, Drink)
//   hits     how many swings it takes before it gives anything
//   gives    what lands in your pack when it's done, e.g. { wood: 3 }
//   becomes  what's left standing afterwards: another key in OBJECTS, or null for nothing
//   regrow   { after: seconds, into: key } to turn back into something later (berries growing back)
//   drink    true if the action drinks from it, as many times as you like (the well)
//   empty    message when you try to use it and there's nothing to take

const OBJECTS = {
  oak: {
    name: 'Oak tree',
    sprite: 'oak',
    solid: true,
    blocked: 'A broad oak blocks your way.',
    action: 'Chop',
    hits: 4,
    gives: { wood: 3 },
    becomes: 'stump',
  },
  pine: {
    name: 'Pine tree',
    sprite: 'pine',
    solid: true,
    blocked: 'A pine tree blocks your way.',
    action: 'Chop',
    hits: 3,
    gives: { wood: 2 },
    becomes: 'stump',
  },
  boulder: {
    name: 'Boulder',
    sprite: 'boulder',
    solid: true,
    blocked: 'A boulder is in the way.',
    action: 'Mine',
    hits: 5,
    gives: { stone: 3 },
    becomes: null,
  },
  bush: {
    name: 'Berry bush',
    sprite: 'bush',
    solid: true,
    blocked: 'A thick berry bush.',
    action: 'Pick',
    hits: 1,
    gives: { berries: 3 },
    becomes: 'bushBare',
  },
  bushBare: {
    name: 'Picked bush',
    sprite: 'bushBare',
    solid: true,
    blocked: 'A thick bush.',
    action: 'Pick',
    empty: 'No berries left. They will grow back.',
    regrow: { after: 90, into: 'bush' },
  },
  stump: {
    name: 'Tree stump',
    sprite: 'stump',
    solid: false,
  },
  well: {
    name: 'Well',
    sprite: 'well',
    solid: true,
    blocked: 'An old stone well. You hear water far below.',
    action: 'Drink',
    drink: true,
  },
  bedHead: {
    name: 'Bed',
    sprite: 'bedHead',
    solid: true,
    blocked: 'Your bed. Still warm.',
  },
  bedFoot: {
    name: 'Bed',
    sprite: 'bedFoot',
    solid: true,
    blocked: 'Your bed. Still warm.',
  },
  table: {
    name: 'Table',
    sprite: 'table',
    solid: true,
    blocked: 'A rough wooden table with a candle on it.',
  },
};
