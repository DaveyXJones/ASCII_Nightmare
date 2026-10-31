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
//   sound    what each swing sounds like: a name in SOUNDS (sound.js), like 'chop'
//   soundDone  the sound of the last swing, as it gives way (a tree falling); `sound` if left out
//   frames   a list of sprites to flicker between instead of one still picture (a campfire's flames)
//   warmth   how close, in tiles, you need to stand to feel its heat; beside it you heal faster
//   light    how far, in tiles, it lights up the dark at night (see night.js)
//   flame    true for an open fire: facing it with a torch that needs lighting, the button lights it
//   door     true for a door you've built: you walk through it (leave `solid` off), shades can't
//   opens    the picture in SPRITES to draw instead while you're beside it: the door standing open
//   claws    how many scratches it takes before something in the dark claws through it (see `claw`
//            in CREATURES, creatures.js). Claw marks are forgotten by day.
//   scarred  the picture to draw once it's been clawed halfway through
//   doused   what it turns into when rain puts it out (see weather.js): a fire with no roof
//   relight  { cost, into } for a fire that's gone out: the action lights it again with a little wood
//            (`cost`), turning it back `into` a fire, once the rain has stopped
//   bed      true for a bed you've built: you wake up on the newest one after you die (world.bed)
//   chest    true for a chest: the action opens it, to keep things in (see chest.js)
//   fence    true for walls and doors: pieces side by side join up into one fence
//   fuel     for a lamp: { burns, cost, into, empty }. It burns `burns` seconds of dark on a filling
//            (world.fuel keeps what's left), then turns into `empty`; Fill (`cost`) turns it back
//            `into` the lit lamp. Its light dims as it runs low.
//   map      [glyph, color]: how it shows on the map (js/map.js) where it covers most of the land,
//            like trees
//   mark     { glyph, color, name, rank }: something you built, always shown on the map (the
//            highest `rank` wins where two share a spot) and listed in the map's key by `name`
//   tool     a key in TOOLS that's yours once it gives (a gun in a crate)
//   says     message shown when it gives what it gives
//   found    true for things placed on the island for you to find (the wreck, the crates): they're
//            left out of the island's print (see worldPrint in save.js), so saves from before they
//            were added still fit
//   side     { sprite, opens, scarred }: the pictures to use instead in a fence running up the
//            screen (see runsUpAndDown in world.js), where it's seen from the side

// How a lamp burns (see `fuel` below): a filling lasts five minutes of dark, half a night.
const LAMP_FUEL = { burns: 300, cost: { cloth: 1 }, into: 'lamp', empty: 'lampOut' };

// How things you've built show on the map (see `mark` below).
const MARKS = {
  fire: { glyph: '♦', color: '#ff9a3a', name: 'campfire', rank: 3 },
  coldFire: { glyph: '♦', color: '#8a8478', name: 'campfire', rank: 3 },
  lamp: { glyph: '¡', color: '#ffd75e', name: 'lamp', rank: 2 },
  coldLamp: { glyph: '¡', color: '#8a8478', name: 'lamp', rank: 2 },
  chest: { glyph: '■', color: '#e0b070', name: 'chest', rank: 4 },
  bed: { glyph: '▬', color: '#ff8a70', name: 'bedroll', rank: 5 },
  wall: { glyph: '#', color: '#c49a62', name: 'wall', rank: 1 },
  wreck: { glyph: '∪', color: '#c8b08a', name: 'wreck', rank: 2 },
  crate: { glyph: '☐', color: '#e0c080', name: 'crate', rank: 4 },
  dropped: { glyph: '!', color: '#ff5a4a', name: 'your gun', rank: 6 },
};

// The wrecked boat, in three pieces side by side: bow, middle, stern. It can be broken up for wood.
const WRECK_PIECE = {
  name: 'Wrecked boat',
  solid: true,
  blocked: 'The broken hull of a boat, half buried in the sand.',
  action: 'Break',
  hits: 4,
  gives: { wood: 2 },
  becomes: null,
  burst: 'wood',
  sound: 'chop',
  soundDone: 'crash',
  found: true,
};

// A crate washed up from the wreck, with a gun inside.
const GUN_CRATE = {
  name: 'Crate',
  sprite: 'crate',
  solid: true,
  blocked: 'A crate, washed up by the sea.',
  action: 'Open',
  hits: 1,
  becomes: 'crateOpen',
  burst: 'wood',
  sound: 'chop',
  found: true,
  mark: MARKS.crate,
};

const OBJECTS = {
  oak: {
    name: 'Oak tree',
    map: ['♣', '#6aa84f'],
    sprite: 'oak',
    solid: true,
    blocked: 'A broad oak blocks your way.',
    action: 'Chop',
    hits: 4,
    gives: { wood: 3 },
    becomes: 'stump',
    burst: 'leaf',
    sound: 'chop',
    soundDone: 'fell',
  },
  pine: {
    name: 'Pine tree',
    map: ['♠', '#4f9a5a'],
    sprite: 'pine',
    solid: true,
    blocked: 'A pine tree blocks your way.',
    action: 'Chop',
    hits: 3,
    gives: { wood: 2 },
    becomes: 'stump',
    burst: 'leaf',
    sound: 'chop',
    soundDone: 'fell',
  },
  boulder: {
    name: 'Boulder',
    map: ['●', '#b4b8b0'],
    sprite: 'boulder',
    solid: true,
    blocked: 'A boulder is in the way.',
    action: 'Mine',
    hits: 5,
    gives: { stone: 3 },
    becomes: null,
    burst: 'stone',
    sound: 'mine',
    soundDone: 'crumble',
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
    sound: 'pick',
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
    sound: 'pick',
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
    mark: MARKS.fire,
    sprite: 'campfire',
    frames: ['campfire', 'campfire2', 'campfire', 'campfire3'],
    solid: true,
    blocked: 'The fire crackles. Too hot to walk through.',
    action: 'Put out',
    hits: 2,
    gives: { stone: 3 },
    becomes: null,
    burst: 'spark',
    sound: 'snuff',
    warmth: 2.5,
    light: 6.5,
    flame: true,
    doused: 'campfireOut',
  },
  // A campfire the rain has put out. Light it again with a piece of wood once the rain stops.
  campfireOut: {
    name: 'Cold campfire',
    mark: MARKS.coldFire,
    sprite: 'campfireOut',
    solid: true,
    blocked: 'A ring of stones round wet ashes.',
    action: 'Light',
    relight: { cost: { wood: 1 }, into: 'campfire' },
  },
  // A campfire with a roof built over it (the Roof in RECIPES): the rain can't put it out.
  roofedFire: {
    name: 'Campfire under a roof',
    mark: MARKS.fire,
    sprite: 'roofedFire',
    frames: ['roofedFire', 'roofedFire2', 'roofedFire', 'roofedFire3'],
    solid: true,
    blocked: 'The fire crackles under its roof. Too hot to walk through.',
    action: 'Put out',
    hits: 2,
    gives: { stone: 3, wood: 3 },
    becomes: null,
    burst: 'spark',
    sound: 'snuff',
    warmth: 2.5,
    light: 6.5,
    flame: true,
  },
  woodWall: {
    name: 'Wooden wall',
    mark: MARKS.wall,
    sprite: 'woodWall',
    solid: true,
    blocked: 'Your wall. Break it to get through.',
    action: 'Break',
    hits: 2,
    gives: { wood: 2 },
    becomes: null,
    burst: 'wood',
    sound: 'chop',
    soundDone: 'build',
    claws: 15,
    scarred: 'woodWallScarred',
    fence: true,
    side: { sprite: 'woodWallSide', scarred: 'woodWallSideScarred' },
  },
  // A chest keeps what's in it when you die (see chest.js). It's taken down from its own panel, once
  // it's empty.
  chest: {
    name: 'Chest',
    mark: MARKS.chest,
    sprite: 'chest',
    solid: true,
    blocked: 'Your chest. Open it to put things in.',
    action: 'Open',
    chest: true,
    burst: 'wood',
  },
  // A bedroll on the ground: you walk over it, and wake up on it after you die.
  bedroll: {
    name: 'Bedroll',
    mark: MARKS.bed,
    sprite: 'bedroll',
    bed: true,
    action: 'Roll up',
    hits: 1,
    gives: { cloth: 2 },
    becomes: null,
    burst: 'fluff',
    sound: 'pick',
  },
  // A lantern on a post (see LAMP_FUEL in survival.js): it lights the dark around it like a small
  // fire, and the rain can't put it out, since the flame's behind glass. It burns oil (a rag soaked
  // in it, really: cloth), and goes out when it's used up, until you fill it again.
  lamp: {
    name: 'Lamp',
    mark: MARKS.lamp,
    sprite: 'lamp',
    frames: ['lamp', 'lamp2', 'lamp', 'lamp3'],
    solid: true,
    blocked: 'Your lamp, on its post.',
    action: 'Take down',
    hits: 2,
    gives: { wood: 2, cloth: 1 },
    becomes: null,
    burst: 'wood',
    sound: 'chop',
    soundDone: 'build',
    light: 4.5,
    fuel: LAMP_FUEL,
  },
  lampOut: {
    name: 'Lamp',
    mark: MARKS.coldLamp,
    sprite: 'lampOut',
    solid: true,
    blocked: 'Your lamp. It has gone out.',
    action: 'Fill',
    fuel: LAMP_FUEL,
  },
  wreckBow: { ...WRECK_PIECE, sprite: 'wreckBow' },
  wreckMid: { ...WRECK_PIECE, sprite: 'wreckMid', mark: MARKS.wreck },
  wreckStern: { ...WRECK_PIECE, sprite: 'wreckStern' },
  pistolCrate: {
    ...GUN_CRATE,
    tool: 'pistol',
    gives: { bullets: 8 },
    says: 'Inside, wrapped in oilcloth: a pistol and a box of bullets. The bang will carry.',
  },
  rifleCrate: {
    ...GUN_CRATE,
    tool: 'rifle',
    gives: { bullets: 6 },
    says: 'Inside, packed in straw: a rifle and a few bullets. It shoots a long way.',
  },
  crateOpen: {
    name: 'Empty crate',
    sprite: 'crateOpen',
    solid: true,
    blocked: 'An empty crate.',
    action: 'Break',
    hits: 1,
    gives: { wood: 2 },
    becomes: null,
    burst: 'wood',
    sound: 'chop',
  },
  // Washed up on a beach some mornings (see washUp in guns.js). You walk over it.
  bulletBox: {
    name: 'Tin box',
    sprite: 'bulletBox',
    action: 'Pick up',
    hits: 1,
    gives: { bullets: 3 },
    becomes: null,
    burst: 'stone',
    sound: 'pick',
    says: 'A tin box the sea brought in. Bullets, still dry.',
  },
  // A gun you were carrying when you died, lying where you fell (see dropGuns in guns.js).
  pistolDropped: {
    name: 'Pistol',
    sprite: 'pistolDropped',
    action: 'Pick up',
    hits: 1,
    tool: 'pistol',
    becomes: null,
    burst: 'dust',
    sound: 'pick',
    says: 'You pick your pistol up again.',
    mark: MARKS.dropped,
  },
  rifleDropped: {
    name: 'Rifle',
    sprite: 'rifleDropped',
    action: 'Pick up',
    hits: 1,
    tool: 'rifle',
    becomes: null,
    burst: 'dust',
    sound: 'pick',
    says: 'You pick your rifle up again.',
    mark: MARKS.dropped,
  },
  woodDoor: {
    name: 'Wooden door',
    mark: MARKS.wall,
    sprite: 'woodDoor',
    opens: 'woodDoorOpen',
    door: true,
    action: 'Break',
    hits: 2,
    gives: { wood: 3 },
    becomes: null,
    burst: 'wood',
    sound: 'chop',
    soundDone: 'build',
    claws: 20,
    scarred: 'woodDoorScarred',
    fence: true,
    side: { sprite: 'woodDoorSide', opens: 'woodDoorSideOpen', scarred: 'woodDoorSideScarred' },
  },
};
