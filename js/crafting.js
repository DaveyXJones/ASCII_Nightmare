// Crafting: turning wood and stone into tools and things to build.
//
// The Craft button (or C) opens the craft panel. A tool goes straight into your pack. Something to
// build (a campfire, a wall) starts build mode instead: a see-through copy of it shows on the tile in
// front of you, the action button says Build, and the Craft button says Done.

// Tools you carry. `power` says, for each action word, how many swings one swing counts as.
const TOOLS = {
  axe: { name: 'Stone axe', glyph: '┮', power: { Chop: 2 } },
};

// Everything you can make, in the order the craft panel shows them.
//
//   name     what the panel calls it
//   about    one line on what it's for
//   cost     what it takes from your pack, e.g. { wood: 3, stone: 2 }
//   tool     a key in TOOLS: making it puts that tool in your pack (you only ever need one)
//   builds   a key in OBJECTS: making it starts build mode, to put one on the map
//   again    for things you build: stay in build mode afterwards, to build a row of them
//   done     message shown once it's made
const RECIPES = {
  axe: {
    name: 'Stone axe',
    about: 'Trees fall in half the swings.',
    cost: { wood: 3, stone: 2 },
    tool: 'axe',
    done: 'You lash a sharp stone to a stick. Trees fall twice as fast now.',
  },
  campfire: {
    name: 'Campfire',
    about: 'Rest beside it to heal faster.',
    cost: { wood: 4, stone: 3 },
    builds: 'campfire',
    done: 'The fire catches. Rest beside it to heal faster.',
  },
  wall: {
    name: 'Wooden wall',
    about: 'One stretch of wall. Build as many as you like.',
    cost: { wood: 2 },
    builds: 'woodWall',
    again: true,
  },
};

const BUILD_HINT = 'Face where it should go and press Build.';

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

// A recipe can be made if you can pay for it and it isn't a tool you already have.
function canMake(survivor, recipe) {
  return canAfford(survivor.pack, recipe.cost) && !(recipe.tool && survivor.tools[recipe.tool]);
}

// How many swings one swing counts as, with the best tool you have for the job.
function toolPower(survivor, action) {
  let power = 1;
  for (const tool of Object.keys(survivor.tools)) power = Math.max(power, TOOLS[tool].power[action] || 1);
  return power;
}

// ---- Making things ----

function craft(game, key) {
  const recipe = RECIPES[key];
  const survivor = game.survivor;
  if (!recipe || !canMake(survivor, recipe)) return;
  closeCraft();
  if (recipe.builds) {
    game.building = key;
    showMessage(game, BUILD_HINT);
    return;
  }
  spend(survivor.pack, recipe.cost);
  survivor.tools[recipe.tool] = true;
  showMessage(game, recipe.done);
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
  if (!ground || ground.solid) return "You can't build there.";
  if (insideHouse(world, x, y)) return "There's no room for that inside the cottage.";
  // Things you can walk through, like stumps, are cleared away to make room.
  if (object && object.solid) return `The ${object.name.toLowerCase()} is in the way.`;
  if (!canAfford(survivor.pack, recipe.cost)) return `You need ${shortfall(survivor.pack, recipe.cost)}.`;
  return null;
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
  player.swingUntil = player.clock + 0.2;
  burst(game.fx, spot.x + 0.5, spot.y + 0.5, object.burst, 10);
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
    } else {
      picture = document.createElement('span');
      picture.textContent = TOOLS[recipe.tool].glyph;
    }
    picture.className = 'recipe-picture';

    const name = document.createElement('span');
    name.className = 'recipe-name';
    name.textContent = recipe.name;
    const shortcut = document.createElement('kbd'); // the number key that makes it, on a keyboard
    shortcut.textContent = String(n + 1);
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
  const survivor = state.survivor;
  for (const card of elements.recipes.children) {
    const recipe = RECIPES[card.dataset.recipe];
    card.disabled = !canMake(survivor, recipe);
    card.classList.toggle('owned', Boolean(recipe.tool && survivor.tools[recipe.tool]));
    for (const part of card.querySelectorAll('.cost')) {
      part.classList.toggle('short', survivor.pack[part.dataset.item] < recipe.cost[part.dataset.item]);
    }
    if (recipe.builds) {
      drawRecipePicture(card.querySelector('canvas'), SPRITES[OBJECTS[recipe.builds].sprite]);
    }
  }
  state.paused = true;
  releaseAll();
  elements.craft.hidden = false;
}

function closeCraft() {
  if (elements.craft.hidden) return;
  elements.craft.hidden = true;
  state.paused = false;
}

// Copies a sprite's ready-drawn picture into a card, at the same size it has on the map.
function drawRecipePicture(canvas, sprite) {
  const image = spriteImage(sprite);
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.style.width = `${image.width / view.dpr}px`;
  canvas.style.height = `${image.height / view.dpr}px`;
  canvas.getContext('2d').drawImage(image, 0, 0);
}
