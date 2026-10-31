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
//   burst    what flies off when you work on it: a style in BURSTS (survival.js), like 'leaf' or 'stone'
//   frames   a list of sprites to flicker between instead of one still picture (a campfire's flames)
//   warmth   how close, in tiles, you need to stand to feel its heat; beside it you heal faster
//   light    how far, in tiles, it lights up the dark at night (see night.js)
//   flame    true for an open fire: facing it with a torch that needs lighting, the button lights it
//   door     true for a door you've built: you walk through it (leave `solid` off), shades can't
//   opens    the picture in SPRITES to draw instead while you're beside it: the door standing open
//   claws    how many scratches it takes before something in the dark claws through it (see `claw`
//            in CREATURES, creatures.js). Claw marks are forgotten by day.
//   scarred  the picture to draw once it's been clawed halfway through

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
    burst: 'leaf',
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
    burst: 'leaf',
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
    burst: 'stone',
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
    burst: 'leaf',
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
  cotton: {
    name: 'Cotton plant',
    sprite: 'cotton',
    solid: true,
    blocked: 'A cotton plant, heavy with soft white bolls.',
    action: 'Pick',
    hits: 1,
    gives: { cloth: 1 },
    becomes: 'cottonBare',
    burst: 'fluff',
  },
  cottonBare: {
    name: 'Picked cotton',
    sprite: 'cottonBare',
    solid: true,
    blocked: 'A cotton plant, picked bare.',
    action: 'Pick',
    empty: 'Nothing left to pick. The cotton will grow back.',
    regrow: { after: 120, into: 'cotton' },
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
    light: 5,
  },

  // Things you build (see RECIPES in crafting.js). Taking them down gives some of the cost back.
  campfire: {
    name: 'Campfire',
    sprite: 'campfire',
    frames: ['campfire', 'campfire2', 'campfire', 'campfire3'],
    solid: true,
    blocked: 'The fire crackles. Too hot to walk through.',
    action: 'Put out',
    hits: 2,
    gives: { stone: 3 },
    becomes: null,
    burst: 'spark',
    warmth: 2.5,
    light: 6.5,
    flame: true,
  },
  woodWall: {
    name: 'Wooden wall',
    sprite: 'woodWall',
    solid: true,
    blocked: 'Your wall. Break it to get through.',
    action: 'Break',
    hits: 2,
    gives: { wood: 2 },
    becomes: null,
    burst: 'wood',
    claws: 15,
    scarred: 'woodWallScarred',
  },
  woodDoor: {
    name: 'Wooden door',
    sprite: 'woodDoor',
    opens: 'woodDoorOpen',
    door: true,
    action: 'Break',
    hits: 2,
    gives: { wood: 3 },
    becomes: null,
    burst: 'wood',
    claws: 20,
    scarred: 'woodDoorScarred',
  },
};
