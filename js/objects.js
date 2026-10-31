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
//   repair   what it costs to mend the claw marks on it, e.g. { wood: 1 }: while it has any, the
//            action button says Repair instead
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
//   loot     for something you search (an old cupboard, a tent): a key in LOOT (places.js), the
//            table of what you might find in it. What you find is worked out from the island's seed
//            and the tile, so it's the same however many times you load the game.
//   epitaph  true for a grave: walking into it reads its stone, a line from EPITAPHS (places.js)
//   thorns   how much it hurts a creature each time one claws at it or runs into it (the spiked
//            barricade; see prick in creatures.js)
//   plot     true for a garden bed: facing it with something to plant, the button says Plant
//   crop     for a plant in the garden (see garden.js): { grows, into, says? }. It grows into `into`
//            after `grows` seconds with water in it, saying `says` (if any) as it does
//   garden   true for a garden bed and everything that grows in one: building can't go over it
//   dig      { hits, gives, becomes }: with a spade (TOOLS.spade), the action button says Dig up on
//            it, once there's nothing else to take from it, and these replace its own `hits`,
//            `gives` and `becomes`

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
  stoneWall: { glyph: '#', color: '#b8b6b0', name: 'stone wall', rank: 1 },
  spikes: { glyph: '×', color: '#e8cf9a', name: 'barricade', rank: 1 },
  garden: { glyph: 'ψ', color: '#7ac25a', name: 'garden', rank: 1 },
  wreck: { glyph: '∪', color: '#c8b08a', name: 'wreck', rank: 2 },
  crate: { glyph: '☐', color: '#e0c080', name: 'crate', rank: 4 },
  dropped: { glyph: '!', color: '#ff5a4a', name: 'your gun', rank: 6 },
  // Places on the island to find (see places.js).
  ruin: { glyph: '⌂', color: '#b8a68c', name: 'ruined cabin', rank: 2 },
  camp: { glyph: 'Λ', color: '#d8c8a0', name: 'old camp', rank: 4 }, // over its cold campfire
  stones: { glyph: '∩', color: '#c8c4e0', name: 'standing stones', rank: 2 },
  lighthouse: { glyph: '♜', color: '#f0e8e0', name: 'lighthouse', rank: 5 },
  graves: { glyph: '†', color: '#a8a8a0', name: 'graves', rank: 1 },
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

// Everything growing in a garden bed (see garden.js): you walk through it, and it's marked on the map.
const GARDEN_PLANT = { mark: MARKS.garden, garden: true };

// A wall of an old cabin (see places.js): grey, rotting logs. It joins up with walls you build, so
// you can patch the gaps in one and make it yours.
const LOG_WALL = {
  name: 'Old log wall',
  sprite: 'logWall',
  solid: true,
  blocked: 'A wall of old logs, soft with rot.',
  action: 'Break',
  hits: 3,
  gives: { wood: 2 },
  becomes: null,
  burst: 'wood',
  sound: 'chop',
  soundDone: 'crash',
  claws: 10,
  repair: { wood: 1 },
  scarred: 'logWallScarred',
  fence: true,
  side: { sprite: 'logWallSide', scarred: 'logWallSideScarred' },
  map: ['#', '#9a8a72'],
};

// One half of the lighthouse (see places.js): it stands two tiles wide.
const LIGHTHOUSE_HALF = {
  name: 'Lighthouse',
  solid: true,
  blocked: 'The lighthouse. Its door has rusted shut, and its lamp went out long ago.',
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
    empty: 'No berries left. They will grow back, or a spade would dig it up.',
    regrow: { after: 90, into: 'bush' },
    // Dug up, it leaves a cutting to plant in a garden bed (see garden.js).
    dig: { hits: 3, gives: { bushCutting: 1 }, becomes: null },
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
    empty: 'Nothing left to pick. The cotton will grow back, or a spade would dig it up.',
    regrow: { after: 120, into: 'cotton' },
    dig: { hits: 2, gives: { cottonCutting: 1 }, becomes: null },
  },
  stump: {
    name: 'Tree stump',
    sprite: 'stump',
    solid: false,
    dig: { hits: 3, gives: { wood: 1 }, becomes: null },
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
    repair: { wood: 1 },
    scarred: 'woodWallScarred',
    fence: true,
    side: { sprite: 'woodWallSide', scarred: 'woodWallSideScarred' },
  },
  // A stretch of stone wall: it takes things in the dark three times as long to claw through as a
  // wooden one.
  stoneWall: {
    name: 'Stone wall',
    mark: MARKS.stoneWall,
    sprite: 'stoneWall',
    solid: true,
    blocked: 'Your stone wall. Break it to get through.',
    action: 'Break',
    hits: 4,
    gives: { stone: 2 },
    becomes: null,
    burst: 'stone',
    sound: 'mine',
    soundDone: 'crumble',
    claws: 45,
    repair: { stone: 1 },
    scarred: 'stoneWallScarred',
    fence: true,
    side: { sprite: 'stoneWallSide', scarred: 'stoneWallSideScarred' },
  },
  // A heavy plank gate between stone posts: a door that holds out as long as the stone wall.
  stoneGate: {
    name: 'Gate',
    mark: MARKS.stoneWall,
    sprite: 'stoneGate',
    opens: 'stoneGateOpen',
    door: true,
    action: 'Break',
    hits: 4,
    gives: { stone: 1, wood: 2 },
    becomes: null,
    burst: 'wood',
    sound: 'chop',
    soundDone: 'crash',
    claws: 45,
    repair: { wood: 1 },
    scarred: 'stoneGateScarred',
    fence: true,
    side: { sprite: 'stoneGateSide', opens: 'stoneGateSideOpen', scarred: 'stoneGateSideScarred' },
  },
  // Sharpened stakes, crossed: anything that claws at them, or runs into them, gets cut.
  spikes: {
    name: 'Spiked barricade',
    mark: MARKS.spikes,
    sprite: 'spikes',
    solid: true,
    blocked: 'Sharpened stakes. You keep your hands well clear.',
    action: 'Break',
    hits: 2,
    gives: { wood: 2 },
    becomes: null,
    burst: 'wood',
    sound: 'chop',
    soundDone: 'build',
    claws: 12,
    repair: { wood: 1 },
    scarred: 'spikesScarred',
    thorns: 1,
  },
  // ---- The garden (see garden.js) ----
  // A garden bed: dug earth with a board along its edge, ready for planting.
  soil: {
    ...GARDEN_PLANT,
    name: 'Garden bed',
    sprite: 'soil',
    action: 'Plant',
    plot: true,
    empty: 'Nothing to plant. Potatoes, pumpkin seeds and cuttings grow in a garden bed.',
    dig: { hits: 2, gives: { wood: 1 }, becomes: null },
  },
  potatoSprout: {
    ...GARDEN_PLANT,
    name: 'Potato shoots',
    sprite: 'potatoSprout',
    crop: { grows: 150, into: 'potatoPlant' },
  },
  potatoPlant: {
    ...GARDEN_PLANT,
    name: 'Potato plant',
    sprite: 'potatoPlant',
    crop: { grows: 210, into: 'potatoRipe', says: 'The potatoes in your garden are ready to dig up.' },
  },
  potatoRipe: {
    ...GARDEN_PLANT,
    name: 'Potatoes',
    sprite: 'potatoRipe',
    action: 'Harvest',
    hits: 1,
    gives: { potato: 3 },
    becomes: 'soil',
    burst: 'dust',
    sound: 'dig',
  },
  pumpkinSprout: {
    ...GARDEN_PLANT,
    name: 'Pumpkin shoots',
    sprite: 'pumpkinSprout',
    crop: { grows: 150, into: 'pumpkinVine' },
  },
  pumpkinVine: {
    ...GARDEN_PLANT,
    name: 'Pumpkin vine',
    sprite: 'pumpkinVine',
    crop: { grows: 240, into: 'pumpkinRipe', says: 'A pumpkin in your garden is ripe.' },
  },
  pumpkinRipe: {
    ...GARDEN_PLANT,
    name: 'Pumpkin',
    sprite: 'pumpkinRipe',
    action: 'Harvest',
    hits: 1,
    gives: { pumpkin: 1, pumpkinSeeds: 2 },
    becomes: 'soil',
    burst: 'leaf',
    sound: 'pick',
  },
  // A cutting from a wild berry bush or cotton plant, taking root: it grows into one like the wild ones.
  bushSprout: {
    ...GARDEN_PLANT,
    name: 'Berry seedling',
    sprite: 'bushSprout',
    crop: { grows: 240, into: 'bush', says: 'The berry bush in your garden has grown, and fruited.' },
  },
  cottonSprout: {
    ...GARDEN_PLANT,
    name: 'Cotton seedling',
    sprite: 'cottonSprout',
    crop: { grows: 180, into: 'cotton', says: 'The cotton in your garden is ready to pick.' },
  },
  // A plant left dry too long. Pull it up to plant something else.
  wilted: {
    ...GARDEN_PLANT,
    name: 'Wilted plant',
    sprite: 'wilted',
    action: 'Clear',
    hits: 1,
    gives: {},
    becomes: 'soil',
    burst: 'leaf',
    sound: 'pick',
    says: 'You pull up the dead plant. The bed is ready again.',
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
  // ---- Places to find (see places.js) ----
  logWall: LOG_WALL,
  // Where an old wall has fallen: a heap of logs you can step over. Repair stacks them back up into
  // the wall (break that again for the wood, if it's wood you're after).
  logPile: {
    name: 'Fallen logs',
    sprite: 'logPile',
    action: 'Repair',
    hits: 3,
    gives: {},
    becomes: 'logWall',
    burst: 'wood',
    sound: 'chop',
    soundDone: 'build',
    says: 'You stack the logs back up into the wall.',
  },
  cupboard: {
    name: 'Old cupboard',
    mark: MARKS.ruin,
    sprite: 'cupboard',
    solid: true,
    blocked: 'A cupboard, its paint long gone. The doors are still shut.',
    action: 'Search',
    hits: 1,
    loot: 'cupboard',
    becomes: 'cupboardOpen',
    burst: 'dust',
    sound: 'creak',
  },
  cupboardOpen: {
    name: 'Empty cupboard',
    mark: MARKS.ruin,
    sprite: 'cupboardOpen',
    solid: true,
    blocked: 'An empty cupboard. Mouse droppings, and a smell of damp.',
  },
  oldBed: {
    name: 'Old bed',
    sprite: 'oldBed',
    solid: true,
    blocked: 'A sagging bed. The mattress is black with mould.',
  },
  oldTable: {
    name: 'Old table',
    sprite: 'oldTable',
    solid: true,
    blocked: 'A table, set for a meal nobody finished. The plates are green.',
  },
  stove: {
    name: 'Iron stove',
    sprite: 'stove',
    solid: true,
    blocked: 'An iron stove, cold for years. Rust flakes off at a touch.',
  },
  // A strongbox in the village hall: it takes some prying open.
  strongbox: {
    name: 'Strongbox',
    mark: MARKS.ruin,
    sprite: 'strongbox',
    solid: true,
    blocked: 'An iron strongbox, chained shut. The chain looks weaker than the box.',
    action: 'Pry open',
    hits: 5,
    loot: 'strongbox',
    becomes: 'strongboxOpen',
    burst: 'stone',
    sound: 'mine',
    soundDone: 'crash',
  },
  strongboxOpen: {
    name: 'Open strongbox',
    mark: MARKS.ruin,
    sprite: 'strongboxOpen',
    solid: true,
    blocked: 'The strongbox hangs open, empty.',
  },
  tent: {
    name: 'Torn tent',
    mark: MARKS.camp,
    sprite: 'tent',
    solid: true,
    blocked: 'A canvas tent, torn open down one side. From the inside.',
    action: 'Search',
    hits: 1,
    loot: 'tent',
    becomes: 'tentDown',
    burst: 'fluff',
    sound: 'pick',
  },
  // A searched tent, pulled down: cut it up for cloth.
  tentDown: {
    name: 'Fallen tent',
    mark: MARKS.camp,
    sprite: 'tentDown',
    action: 'Cut up',
    hits: 2,
    gives: { cloth: 2 },
    becomes: null,
    burst: 'fluff',
    sound: 'pick',
  },
  // Somebody's pack, dropped and left. You walk over it.
  oldPack: {
    name: 'Dropped pack',
    sprite: 'oldPack',
    action: 'Search',
    hits: 1,
    loot: 'pack',
    becomes: null,
    burst: 'fluff',
    sound: 'pick',
  },
  logSeat: {
    name: 'Log seat',
    sprite: 'logSeat',
    solid: true,
    blocked: 'A log somebody sat on by the fire.',
    action: 'Break',
    hits: 2,
    gives: { wood: 3 },
    becomes: null,
    burst: 'wood',
    sound: 'chop',
    soundDone: 'crash',
  },
  grave: {
    name: 'Grave',
    mark: MARKS.graves,
    sprite: 'grave',
    solid: true,
    epitaph: true,
  },
  graveCross: {
    name: 'Grave',
    mark: MARKS.graves,
    sprite: 'graveCross',
    solid: true,
    epitaph: true,
  },
  standingStone: {
    name: 'Standing stone',
    mark: MARKS.stones,
    sprite: 'standingStone',
    solid: true,
    blocked: 'A standing stone, taller than you. Something was carved on it once.',
  },
  // The flat stone in the middle of a ring: candles burn on it every night, and nobody you can see
  // lights them. Like any light, it keeps the things in the dark back.
  altar: {
    name: 'Altar stone',
    mark: MARKS.stones,
    sprite: 'altar',
    frames: ['altar', 'altar2'],
    solid: true,
    blocked: 'Candles burn on the flat stone. You didn\'t light them.',
    action: 'Search',
    hits: 1,
    loot: 'altar',
    becomes: 'altarBare',
    burst: 'spark',
    sound: 'pick',
    light: 4,
  },
  altarBare: {
    name: 'Altar stone',
    mark: MARKS.stones,
    sprite: 'altar',
    frames: ['altar', 'altar2'],
    solid: true,
    blocked: 'Candles burn on the flat stone. Somebody lit them fresh.',
    light: 4,
  },
  lighthouseLeft: { ...LIGHTHOUSE_HALF, sprite: 'lighthouseLeft', mark: MARKS.lighthouse },
  lighthouseRight: { ...LIGHTHOUSE_HALF, sprite: 'lighthouseRight' },
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
    repair: { wood: 1 },
    scarred: 'woodDoorScarred',
    fence: true,
    side: { sprite: 'woodDoorSide', opens: 'woodDoorSideOpen', scarred: 'woodDoorSideScarred' },
  },
};
