// Crafting: turning wood and stone into tools and things to build.
//
// The Craft button (or C) opens the craft panel. A tool goes straight into your pack. Something to
// build (a campfire, a wall) starts build mode instead: a see-through copy of it shows on the tile in
// front of you, the action button says Build, and the Craft button says Done.

// Tools you carry. `power` says, for each action word, how many swings one swing counts as.
// `glyph` is its picture in the pack, the craft panel and the chest, in `color`; `short` is its name
// in the pack and the chest; `held` is how it looks in the player's hand facing left, and facing
// any other way.
//
// The torch is carried in the other hand all the time (TORCH_LOOK in sprites.js). Light it at a
// campfire and it lights up the dark `light` tiles around you for `burns` seconds; then it goes
// out, and you light it again.
const TOOLS = {
  axe: {
    name: 'Stone axe',
    short: 'axe',
    glyph: '┮',
    color: '#c9ccc4',
    held: ['┭', '┮'],
    power: { Chop: 2, Hit: 2 },
  },
  pick: {
    name: 'Stone pick',
    short: 'pick',
    glyph: 'ϒ',
    color: '#c9ccc4',
    held: ['⌐', '¬'],
    power: { Mine: 2 },
  },
  torch: { name: 'Torch', short: 'torch', glyph: '¡', color: '#c49a62', burns: 300, light: 5 },
};

// Everything you can make, in the order the craft panel shows them.
//
//   name     what the panel calls it
//   about    one line on what it's for
//   cost     what it takes from your pack, e.g. { wood: 3, stone: 2 }
//   tool     a key in TOOLS: making it puts that tool in your pack (you only ever need one)
//   builds   a key in OBJECTS: making it starts build mode, to put one on the map
//   again    for things you build: stay in build mode afterwards, to build a row of them
//   over     for things you build onto something already there, like a roof over a campfire: the keys
//            in OBJECTS it can go on (it takes their place)
//   indoors  for things you build: true if it can go inside the cottage too (a chest)
//   gives    items it puts in your pack, e.g. { cooked: 1 }; the panel stays open to make more
//   byFire   true if you have to be standing beside a campfire to make it (cooking)
//   done     message shown once it's made
const RECIPES = {
  axe: {
    name: 'Stone axe',
    about: 'Halves the swings for trees and shades.',
    cost: { wood: 3, stone: 2 },
    tool: 'axe',
    done: 'You lash a sharp stone to a stick. Trees fall twice as fast now.',
  },
  pick: {
    name: 'Stone pick',
    about: 'Breaks boulders in half the swings.',
    cost: { wood: 2, stone: 3 },
    tool: 'pick',
    done: 'You bind a pointed stone to a handle. Boulders break twice as fast now.',
  },
  torch: {
    name: 'Torch',
    about: 'Light it at a fire to see in the dark.',
    cost: { wood: 2, cloth: 1 },
    tool: 'torch',
    done: 'You wrap a rag round a stick. Light it at a campfire.',
  },
  campfire: {
    name: 'Campfire',
    about: 'Rest beside it to heal faster.',
    cost: { wood: 4, stone: 3 },
    builds: 'campfire',
    done: 'The fire catches. Rest beside it to heal faster.',
  },
  roof: {
    name: 'Roof',
    about: 'Build over a campfire to keep rain off.',
    cost: { wood: 4 },
    builds: 'roofedFire',
    over: ['campfire', 'campfireOut'], // over a cold one, you light it again under the roof
    done: 'You raise a little roof over the fire. Rain won\'t put it out now.',
  },
  wall: {
    name: 'Wooden wall',
    about: 'Build a row of them into a fence.',
    cost: { wood: 2 },
    builds: 'woodWall',
    again: true,
  },
  door: {
    name: 'Wooden door',
    about: 'Goes in a wall. Opens only for you.',
    cost: { wood: 3 },
    builds: 'woodDoor',
    done: 'You hang the door. It swings open as you come near.',
  },
  chest: {
    name: 'Chest',
    about: 'What you put in it is kept when you die.',
    cost: { wood: 6 },
    builds: 'chest',
    indoors: true,
    done: 'You knock together a chest. Open it to keep things safe.',
  },
  bedroll: {
    name: 'Bedroll',
    about: 'You wake up on it after you die.',
    cost: { cloth: 2, wood: 1 },
    builds: 'bedroll',
    done: 'You spread out the bedroll. If you die, you\'ll wake up here.',
  },
  cook: {
    name: 'Cooked berries',
    about: 'More filling, and heals you a little.',
    cost: { berries: 2 },
    gives: { cooked: 1 },
    byFire: true,
  },
};

const BUILD_HINT = 'Press Build to place it. You keep facing this way: flick the stick to turn.';
const RECIPE_PICTURE_ROWS = 3; // pictures on the craft cards are at most this many rows tall
const RECIPE_PICTURE_ROWS_SHORT = 2; // ...and this many on a short screen, like a phone held sideways
const shortScreen = window.matchMedia('(max-height: 460px)'); // the same as in style.css

// ---- Costs ----

function canAfford(pack, cost) {
  return Object.entries(cost).every(([item, count]) => pack[item] >= count);
}

// What's missing, in words: "2 more wood and 1 more stone".
function shortfall(pack, cost) {
  return Object.entries(cost)
    .filter(([item, count]) => pack[item] < count)
    .map(([item, count]) => `${count - pack[item]} more ${ITEMS[item].name}`)
    .join(' and ');
}

function spend(pack, cost) {
  for (const [item, count] of Object.entries(cost)) pack[item] -= count;
}

// A recipe can be made if you can pay for it, it isn't a tool you already have, and you're beside
// a fire if it needs one (`warm` is worked out each moment by updateVitals() in survival.js).
function canMake(survivor, recipe) {
  return (
    canAfford(survivor.pack, recipe.cost) &&
    !(recipe.tool && survivor.tools[recipe.tool]) &&
    !(recipe.byFire && !survivor.warm)
  );
}

// How many swings one swing counts as, with the best tool you have for the job.
function toolPower(survivor, action) {
  let power = 1;
  for (const key of Object.keys(survivor.tools)) {
    const tool = TOOLS[key];
    if (tool.power && tool.power[action]) power = Math.max(power, tool.power[action]);
  }
  return power;
}

// ---- Making things ----

function craft(game, key) {
  const recipe = RECIPES[key];
  const survivor = game.survivor;
  if (!recipe || !canMake(survivor, recipe)) return;
  if (recipe.builds) {
    closeCraft();
    game.building = key;
    showMessage(game, BUILD_HINT);
    return;
  }
  spend(survivor.pack, recipe.cost);
  if (recipe.gives) {
    // Things for the pack, like cooked berries: the panel stays open so you can make another.
    const parts = [];
    for (const [item, count] of Object.entries(recipe.gives)) {
      survivor.pack[item] += count;
      parts.push(`+${count} ${ITEMS[item].name}`);
    }
    showMessage(game, recipe.done || parts.join(', '));
    playSound('craft');
    buzz(20);
    refreshCraft();
    return;
  }
  closeCraft();
  survivor.tools[recipe.tool] = true;
  showMessage(game, recipe.done);
  playSound('craft');
  buzz(30);
}

// ---- Build mode ----

// Where build mode would put something: the tile just in front of the player's feet, always a
// whole tile clear of them so you can't build on top of yourself. Returns { x, y, problem }, where
// `problem` says why it can't go there, or is null if it can.
function findBuildSpot(game) {
  const { player } = game;
  const facing = FACINGS[player.facing];
  // Find the tile the front edge of the feet is on, then step one tile further.
  const x = Math.floor(player.x + facing.x * FOOT_HALF_WIDTH) + facing.x;
  const y = Math.floor(player.y + facing.y * FOOT_HALF_DEPTH) + facing.y;
  return { x, y, problem: buildProblem(game, x, y, RECIPES[game.building]) };
}

function buildProblem(game, x, y, recipe) {
  const { world, survivor } = game;
  const ground = groundAt(world, x, y);
  const object = objectAt(world, x, y);
  if (recipe.over) {
    // Something that goes onto something else, like a roof over a campfire.
    if (!inBounds(world, x, y) || !recipe.over.includes(world.objects[y * world.width + x])) {
      return `Face a ${OBJECTS[recipe.over[0]].name.toLowerCase()} to build this over it.`;
    }
    if (!canAfford(survivor.pack, recipe.cost)) return `You need ${shortfall(survivor.pack, recipe.cost)}.`;
    return null;
  }
  if (!ground || ground.solid) return "You can't build there.";
  if (insideHouse(world, x, y)) {
    if (!recipe.indoors) return "There's no room for that inside the cottage.";
    if (keepClear(world, x, y)) return 'Leave the way to the door and the bed clear.';
  }
  // Things you can walk through, like stumps, are cleared away to make room. Doors and beds aren't.
  if (object && (object.solid || object.door || object.bed)) {
    return `The ${object.name.toLowerCase()} is in the way.`;
  }
  if (!canAfford(survivor.pack, recipe.cost)) return `You need ${shortfall(survivor.pack, recipe.cost)}.`;
  return null;
}

// The tiles in the cottage that must stay clear: the doorway, the floor just inside it, and the spot
// by the bed where you wake up.
function keepClear(world, x, y) {
  const { house, spawn } = world;
  const doorY = house.top + house.height - 1;
  if (x === house.doorX && (y === doorY || y === doorY - 1)) return true;
  return x === Math.floor(spawn.x) && y === Math.floor(spawn.y);
}

// One press of Build.
function build(game) {
  const spot = game.buildSpot;
  if (!spot) return;
  if (spot.problem) {
    showMessage(game, spot.problem);
    return;
  }
  const { player, survivor } = game;
  const recipe = RECIPES[game.building];
  const object = OBJECTS[recipe.builds];
  spend(survivor.pack, recipe.cost);
  setObject(game.world, spot.x, spot.y, recipe.builds);
  const index = spot.y * game.world.width + spot.x;
  if (object.bed) game.world.bed = index; // the newest bed is where you'll wake up
  if (object.chest) game.world.chests.set(index, newChest());
  player.act = { action: 'Build', at: player.clock };
  if (object.burst) burst(game.fx, spot.x + 0.5, spot.y + 0.5, object.burst, 10);
  playSound('build');
  buzz(30);
  if (recipe.done) showMessage(game, recipe.done);

  if (!recipe.again) {
    stopBuilding(game);
  } else if (!canAfford(survivor.pack, recipe.cost)) {
    stopBuilding(game);
    showMessage(game, `You'd need ${shortfall(survivor.pack, recipe.cost)} for another.`);
  }
}

function stopBuilding(game) {
  game.building = null;
  game.buildSpot = null;
}

// ---- The craft panel ----

// One card per recipe, made once at startup. Each card is a big button: tap it to make that thing.
function setupCrafting(elements) {
  Object.entries(RECIPES).forEach(([key, recipe], n) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'recipe';
    card.dataset.recipe = key;

    let picture;
    if (recipe.builds) {
      picture = document.createElement('canvas'); // filled in by drawRecipePicture() when the panel opens
    } else if (recipe.gives) {
      const item = ITEMS[Object.keys(recipe.gives)[0]];
      picture = document.createElement('span');
      picture.textContent = item.glyph;
      picture.style.color = item.color;
    } else {
      picture = document.createElement('span');
      picture.textContent = TOOLS[recipe.tool].glyph;
    }
    picture.className = 'recipe-picture';

    const name = document.createElement('span');
    name.className = 'recipe-name';
    name.textContent = recipe.name;
    const shortcut = document.createElement('kbd'); // the number key that makes it, on a keyboard
    shortcut.textContent = String((n + 1) % 10); // the tenth is 0
    name.append(' ', shortcut);

    const about = document.createElement('span');
    about.className = 'recipe-about';
    about.textContent = recipe.about;

    const cost = document.createElement('span');
    cost.className = 'recipe-cost';
    for (const [item, count] of Object.entries(recipe.cost)) {
      const part = document.createElement('span');
      part.className = `cost ${item}`;
      part.dataset.item = item;
      part.textContent = `${ITEMS[item].glyph} ${count}`;
      cost.append(part);
    }

    if (recipe.byFire) {
      const need = document.createElement('span'); // shown while you're not beside a fire
      need.className = 'recipe-need';
      need.textContent = 'Needs a fire';
      cost.append(need);
    }
    card.append(picture, name, about, cost);
    card.addEventListener('click', () => craft(state, key));
    elements.recipes.append(card);
  });

  elements.craftClose.addEventListener('click', closeCraft);
  // Tapping the dark space around the panel closes it too.
  elements.craft.addEventListener('click', (event) => {
    if (event.target === elements.craft) closeCraft();
  });
}

function openCraft() {
  refreshCraft();
  for (const card of elements.recipes.children) {
    const recipe = RECIPES[card.dataset.recipe];
    if (recipe.builds) {
      drawRecipePicture(card.querySelector('canvas'), SPRITES[OBJECTS[recipe.builds].sprite]);
    }
  }
  state.paused = true;
  releaseAll();
  elements.craft.hidden = false;
}

// Shows which cards you can make right now, and what you're short of.
function refreshCraft() {
  const survivor = state.survivor;
  for (const card of elements.recipes.children) {
    const recipe = RECIPES[card.dataset.recipe];
    card.disabled = !canMake(survivor, recipe);
    card.classList.toggle('owned', Boolean(recipe.tool && survivor.tools[recipe.tool]));
    card.classList.toggle('cold', Boolean(recipe.byFire && !survivor.warm));
    for (const part of card.querySelectorAll('.cost')) {
      part.classList.toggle('short', survivor.pack[part.dataset.item] < recipe.cost[part.dataset.item]);
    }
  }
}

function closeCraft() {
  if (elements.craft.hidden) return;
  elements.craft.hidden = true;
  state.paused = false;
}

// Copies a sprite's ready-drawn picture into a card, at the same size it has on the map, or smaller
// if it's taller than RECIPE_PICTURE_ROWS (the roof), so every card stays the same height. On a
// phone held sideways the cards are small, and so are the pictures.
function drawRecipePicture(canvas, sprite) {
  const image = spriteImage(sprite);
  const rows = shortScreen.matches ? RECIPE_PICTURE_ROWS_SHORT : RECIPE_PICTURE_ROWS;
  const scale = Math.min(1, (rows * view.th) / image.height);
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.style.width = `${(image.width * scale) / view.dpr}px`;
  canvas.style.height = `${(image.height * scale) / view.dpr}px`;
  canvas.getContext('2d').drawImage(image, 0, 0);
}
