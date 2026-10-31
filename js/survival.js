// Staying alive: health, food and water, what you're carrying, and what the action button does.

// Everything that goes in your pack. Each needs a counter in the pack in index.html, with the id
// count-<item>. Things you can eat say how much `food` they give, and `heals` how much health.
// The Eat button eats whatever fills you most. `hideEmpty` items only show in the pack while you
// have some, so the pack fits across a phone.
const ITEMS = {
  wood: { name: 'wood', glyph: '≡', color: '#d0a46a' },
  stone: { name: 'stone', glyph: '●', color: '#b4b8b0' },
  berries: { name: 'berries', glyph: '•', color: '#ff5a6e', food: 12 },
  cloth: { name: 'cloth', glyph: '▦', color: '#e6dcc4' },
  cooked: { name: 'cooked berries', glyph: '♨', color: '#ec8a4a', food: 30, heals: 10, hideEmpty: true },
  fish: { name: 'fish', glyph: '∝', color: '#a8cfe6', hideEmpty: true }, // raw: cook it to eat it
  cookedFish: { name: 'cooked fish', glyph: '∝', color: '#e8944e', food: 45, heals: 15, hideEmpty: true },
  bullets: { name: 'bullets', glyph: '‣', color: '#e0c060', hideEmpty: true }, // for both guns (guns.js)
  // Tinned food, found in the ruins (see LOOT in places.js). Eat it anywhere, no fire needed.
  tins: { name: 'tins', glyph: '◘', color: '#b8c4c8', food: 35, heals: 5, hideEmpty: true },
  // Dug up with the spade, to plant again in a garden bed (see garden.js).
  bushCutting: { name: 'berry cuttings', glyph: 'ψ', color: '#e0475a', hideEmpty: true },
  cottonCutting: { name: 'cotton cuttings', glyph: 'ψ', color: '#e6dcc4', hideEmpty: true },
};

const FOOD_PER_SECOND = 100 / 420; // a full stomach lasts seven minutes
const WATER_PER_SECOND = 100 / 300; // thirst comes faster: five minutes
const STARVING_DAMAGE = 2; // health lost each second with no food, and again with no water
const HEAL_PER_SECOND = 0.5; // health regained each second while fed and watered
const FIRE_HEAL_PER_SECOND = 2; // the same, resting beside a campfire
const SIP_WATER = 20;
const SWING_SECONDS = 0.42; // time between swings while the action button is held
const REACH = 0.95; // how far the player can reach, in tiles, from their feet to the edge of a tile
const LOW = 25; // below this, a vital is running low and the game warns you
const TORCH_LOW = 0.2; // share of its burn left when a torch starts to dim and the game warns you
const TORCH_RELIGHT = 0.5; // a fire offers to light your torch again once this share of it is left
const LAMP_LOW = 0.2; // share of its fuel left when a lamp starts to dim
const LAMP_REFILL = 0.5; // a lamp offers Fill (instead of Take down) once this share of it is left
const LAMP_BURNS_DARKER = 0.25; // a lamp only burns its fuel when the dark is deeper than this (0 to 1)
const LAMP_NEWS_REACH = 16; // a lamp going out is news if you're within this many tiles of it

// How digging something up with the spade goes, whatever it is (see `dig` in OBJECTS).
const DIGGING = { action: 'Dig up', burst: 'dust', sound: 'dig', soundDone: 'dig', says: null };

const WARNINGS = {
  food: 'Your stomach growls. Find something to eat.',
  water: 'Your throat is dry. Find water to drink.',
  health: 'You feel weak.',
  torch: 'Your torch is burning low.',
};

function newSurvivor() {
  return {
    vitals: { health: 100, food: 100, water: 100 },
    pack: Object.fromEntries(Object.keys(ITEMS).map((item) => [item, 0])),
    tools: {}, // tools you've made, by their key in TOOLS (crafting.js): { axe: true }
    torchLeft: 0, // seconds the torch will keep burning, or 0 when it isn't lit
    guns: {}, // for each gun you carry, shots left and when it's ready (see gunState in guns.js)
    warm: false, // standing beside a campfire
    hurtBy: null, // what last hurt you: 'hunger' or 'dark', for the words when you die
    hurtAt: -Infinity, // when something last bit you, in seconds of play: you flash red for a moment
    starving: false, // true while hunger or thirst is taking your health
    warned: { food: false, water: false, health: false, torch: false, fish: false },
    nextSwingAt: 0,
  };
}

function updateVitals(game, dt) {
  const vitals = game.survivor.vitals;
  vitals.food = Math.max(0, vitals.food - FOOD_PER_SECOND * dt);
  vitals.water = Math.max(0, vitals.water - WATER_PER_SECOND * dt);
  if (vitals.food === 0) vitals.health -= STARVING_DAMAGE * dt;
  if (vitals.water === 0) vitals.health -= STARVING_DAMAGE * dt;
  game.survivor.starving = vitals.food === 0 || vitals.water === 0;
  if (game.survivor.starving) game.survivor.hurtBy = 'hunger';
  game.survivor.warm = besideFire(game);
  if (vitals.food > LOW && vitals.water > LOW) {
    vitals.health += (game.survivor.warm ? FIRE_HEAL_PER_SECOND : HEAL_PER_SECOND) * dt;
  }
  vitals.health = Math.max(0, Math.min(100, vitals.health));

  // Warn once as each one runs low, and again only after it's been topped back up.
  const warned = game.survivor.warned;
  for (const name of ['food', 'water', 'health']) {
    if (!warned[name] && vitals[name] < LOW) {
      warned[name] = true;
      showMessage(game, WARNINGS[name]);
    } else if (warned[name] && vitals[name] > LOW + 15) {
      warned[name] = false;
    }
  }
}

// The furthest any object's warmth reaches, in tiles, so besideFire() knows how far to look.
const WARMTH_REACH = Math.ceil(Math.max(0, ...Object.values(OBJECTS).map((object) => object.warmth || 0)));

// True if the player is close enough to something warm, like a campfire, to feel its heat.
function besideFire(game) {
  const { world, player } = game;
  const footX = Math.floor(player.x);
  const footY = Math.floor(player.y);
  for (let ty = footY - WARMTH_REACH; ty <= footY + WARMTH_REACH; ty++) {
    for (let tx = footX - WARMTH_REACH; tx <= footX + WARMTH_REACH; tx++) {
      const object = objectAt(world, tx, ty);
      if (!object || !object.warmth) continue;
      if (Math.hypot(tx + 0.5 - player.x, ty + 0.5 - player.y) <= object.warmth) return true;
    }
  }
  return false;
}

// ---- The torch ----

// True if you carry a torch that isn't lit, or has burnt down far enough to want lighting again.
function torchWantsFire(survivor) {
  return Boolean(survivor.tools.torch) && survivor.torchLeft < TOOLS.torch.burns * TORCH_RELIGHT;
}

// Holding the torch to a fire: it burns for its full time from now.
function lightTorch(game, target) {
  const survivor = game.survivor;
  const relit = survivor.torchLeft > 0;
  survivor.torchLeft = TOOLS.torch.burns;
  survivor.warned.torch = false;
  burst(game.fx, target.x + 0.5, target.y + 0.5, 'spark', 8);
  playSound('ignite');
  floatText(game.fx, game.player.x, game.player.y - 3, relit ? 'torch relit' : 'torch lit', '#ffb347');
  const minutes = Math.round(TOOLS.torch.burns / 60);
  showMessage(game, `Your torch catches. It will burn for about ${minutes} minutes.`);
  buzz(30);
}

// A lit torch burns down, warns you when it's getting low, and goes out.
function updateTorch(game, dt) {
  const survivor = game.survivor;
  if (survivor.torchLeft <= 0) return;
  survivor.torchLeft = Math.max(0, survivor.torchLeft - dt);
  if (survivor.torchLeft === 0) {
    showMessage(game, 'Your torch gutters out. Light it again at a campfire.');
    playSound('snuff');
  } else if (!survivor.warned.torch && survivor.torchLeft < TOOLS.torch.burns * TORCH_LOW) {
    survivor.warned.torch = true;
    showMessage(game, WARNINGS.torch);
  }
}

// How far the torch lights the dark around you, in tiles: nothing unless it's lit, and less and
// less once it's burning low, down to half.
function torchReach(survivor) {
  if (survivor.torchLeft <= 0) return 0;
  const torch = TOOLS.torch;
  return torch.light * (0.5 + 0.5 * Math.min(1, survivor.torchLeft / (torch.burns * TORCH_LOW)));
}

// How far the thing at tile index `i` lights the dark, in tiles (0 for nothing). A lamp dims as it
// runs low, down to half, like the torch.
function objectLight(world, i) {
  const key = world.objects[i];
  const object = key && OBJECTS[key];
  if (!object || !object.light) return 0;
  if (!object.fuel) return object.light;
  const left = world.fuel.get(i) || 0;
  return object.light * (0.5 + 0.5 * Math.min(1, left / (object.fuel.burns * LAMP_LOW)));
}

// Lamps burn their fuel in the dark (by day they're turned down, and use none), and go out when
// it's gone.
function updateLamps(game, dt) {
  const { world, player } = game;
  if (game.sky.darkness < LAMP_BURNS_DARKER) return;
  for (const [i, left] of world.fuel) {
    if (left > dt) {
      world.fuel.set(i, left - dt);
      continue;
    }
    const x = i % world.width;
    const y = Math.floor(i / world.width);
    setObject(world, x, y, OBJECTS[world.objects[i]].fuel.empty);
    if (Math.hypot(x + 0.5 - player.x, y + 0.5 - player.y) < LAMP_NEWS_REACH) {
      showMessage(game, 'A lamp flickers and goes out. Fill it with cloth.');
      playSoundAt(game, 'snuff', x + 0.5, y + 0.5);
    }
  }
}

// Fills a lamp to the top, lighting it again if it had gone out.
function fillLamp(game, target) {
  const { world, survivor, fx } = game;
  const { burns, cost, into } = target.object.fuel;
  if (!canAfford(survivor.pack, cost)) {
    showMessage(game, `You need ${shortfall(survivor.pack, cost)} to fill the lamp.`);
    return;
  }
  spend(survivor.pack, cost);
  const index = target.y * world.width + target.x;
  if (world.objects[index] !== into) {
    setObject(world, target.x, target.y, into);
    playSound('ignite');
  } else {
    playSound('pick');
  }
  world.fuel.set(index, burns);
  burst(fx, target.x + 0.5, target.y - 1, 'spark', 6);
  floatText(fx, target.x + 0.5, target.y - 2, 'filled', '#ffd75e');
  showMessage(game, `The lamp burns bright. It's good for ${Math.round(burns / 60)} minutes of dark.`);
  buzz(30);
}

// Picked bushes grow their berries back after a while.
function updateRegrowth(world, time) {
  for (let n = world.regrowing.length - 1; n >= 0; n--) {
    const entry = world.regrowing[n];
    if (time < entry.at) continue;
    if (world.objects[entry.index] === entry.from) world.objects[entry.index] = entry.into;
    world.regrowing.splice(n, 1);
  }
}

// Finds what the action button would use right now: the nearest thing within reach, preferring
// whatever the player is facing. A shade in reach comes before anything else. Returns
// { x, y, w?, label, object?, drink?, light?, creature? } or null, where x, y (and w, the width
// in tiles, if it isn't 1) say where to draw the brackets.
function findTarget(game) {
  const { world, player, survivor } = game;
  const wantsFire = torchWantsFire(survivor);
  const facing = FACINGS[player.facing];
  const footX = Math.floor(player.x);
  const footY = Math.floor(player.y);
  let best = null;
  let bestScore = Infinity;

  for (let ty = footY - 1; ty <= footY + 1; ty++) {
    for (let tx = footX - 1; tx <= footX + 1; tx++) {
      const object = objectAt(world, tx, ty);
      const ground = groundAt(world, tx, ty);
      let candidate = null;
      if (object && object.flame && wantsFire) {
        // Facing a fire with a torch that needs lighting, the button lights it instead of putting it out.
        candidate = { x: tx, y: ty, label: 'Light', object, light: true };
      } else if (object && object.fuel && lampWantsFuel(world, tx, ty, object)) {
        // A lamp burning low (or gone out) offers to be filled instead of taken down.
        candidate = { x: tx, y: ty, label: 'Fill', object, fill: true };
      } else if (object && object.repair && world.clawed.get(ty * world.width + tx)) {
        // Something has been clawing at this wall: mend it before it gives way.
        candidate = { x: tx, y: ty, label: 'Repair', object, repair: true };
      } else if (object && object.dig && survivor.tools.spade && !object.gives) {
        // With the spade, something with nothing left to take (a picked bush, a stump) is dug up.
        candidate = { x: tx, y: ty, label: 'Dig up', object, dig: true };
      } else if (object && object.action) {
        candidate = { x: tx, y: ty, label: object.action, object };
      } else if (!object && wantsToFish(survivor, ground)) {
        // With a rod, and not thirsty, facing water fishes (see fishing.js).
        candidate = { x: tx, y: ty, label: 'Fish', fish: true };
      } else if (!object && ground && ground.drink) {
        candidate = { x: tx, y: ty, label: 'Drink', drink: true };
      }
      if (!candidate) continue;

      // How far the feet are from the nearest edge of the tile, and how squarely it's in front.
      const nearX = Math.max(tx, Math.min(tx + 1, player.x));
      const nearY = Math.max(ty, Math.min(ty + 1, player.y));
      const distance = Math.hypot(nearX - player.x, nearY - player.y);
      const toX = tx + 0.5 - player.x;
      const toY = ty + 0.5 - player.y;
      const ahead = (toX * facing.x + toY * facing.y) / (Math.hypot(toX, toY) || 1);
      if (distance > REACH || ahead < -0.2) continue;
      const score = distance - ahead * 0.6;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
  }

  // A creature in reach comes before anything else, even a wall right in front of you (so you can
  // hit one clawing at the other side of it, instead of breaking the wall).
  let bestCreatureScore = Infinity;
  for (const creature of game.creatures) {
    if (creature.state === 'fade') continue;
    const toX = creature.x - player.x;
    const toY = creature.y - player.y;
    const distance = Math.hypot(toX, toY);
    const ahead = (toX * facing.x + toY * facing.y) / (distance || 1);
    if (distance > HIT_REACH || ahead < -0.2) continue;
    const score = distance - ahead * 0.6;
    if (score < bestCreatureScore) {
      best = creatureTarget(creature, 'Hit');
      bestCreatureScore = score;
    }
  }
  // Out past arm's reach, with a gun: something in the dark ahead to shoot (see guns.js).
  if (!best || !best.creature) best = findShot(game) || best;
  return best;
}

// A creature as the action button's target, with brackets round its face: as wide as its picture,
// on the row its eyes are on.
function creatureTarget(creature, label) {
  const kind = CREATURES[creature.kind];
  const sprite = SPRITES[kind.frames[0]];
  const w = sprite.width / 2;
  const y = creature.y + 0.25 - sprite.cells.length + kind.eyes.cells[0][1];
  return { x: creature.x - w / 2, y, w, label, creature };
}

function lampWantsFuel(world, x, y, object) {
  return (world.fuel.get(y * world.width + x) || 0) < object.fuel.burns * LAMP_REFILL;
}

// Whether the player's feet are on tile (x, y), even partly.
function feetOn(player, x, y) {
  return (
    player.x + FOOT_HALF_WIDTH > x &&
    player.x - FOOT_HALF_WIDTH < x + 1 &&
    player.y + FOOT_HALF_DEPTH > y &&
    player.y - FOOT_HALF_DEPTH < y + 1
  );
}

// Mends the claw marks on a wall (or a door, or spikes) for a little of what it's made of (`repair`
// in OBJECTS), so it holds out as long again.
function repairWall(game, target) {
  const { world, survivor, fx } = game;
  const cost = target.object.repair;
  if (!canAfford(survivor.pack, cost)) {
    showMessage(game, `You need ${shortfall(survivor.pack, cost)} to repair it.`);
    return;
  }
  spend(survivor.pack, cost);
  world.clawed.delete(target.y * world.width + target.x);
  burst(fx, target.x + 0.5, target.y + 0.5, target.object.burst || 'wood', 8);
  playSound('build');
  floatText(fx, target.x + 0.5, target.y - 2, 'repaired', '#ffd75e');
  buzz(30);
}

// One press (or one swing of a held button) of the action button.
function useTarget(game) {
  const { world, player, survivor } = game;
  const target = game.target;
  if (!target) return;
  if (target.creature) {
    if (target.gun) shoot(game, target);
    else hitCreature(game, target.creature);
    return;
  }
  player.act = { action: target.label, at: player.clock };
  faceToward(player, target.x + 0.5, target.y + 0.5);

  if (target.fish) {
    castLine(game, target);
    return;
  }
  if (target.drink || (target.object && target.object.drink)) {
    drink(game, target);
    return;
  }
  if (target.light) {
    lightTorch(game, target);
    return;
  }
  if (target.fill) {
    fillLamp(game, target);
    return;
  }
  if (target.repair) {
    repairWall(game, target);
    return;
  }
  if (target.object.relight) {
    relightFire(game, target);
    return;
  }
  if (target.object.chest) {
    openChest(game, target.y * world.width + target.x);
    return;
  }

  // Digging something up works like any other job, with its `dig` numbers in place of its own.
  const object = target.dig ? { ...target.object, ...DIGGING, ...target.object.dig } : target.object;
  const index = target.y * world.width + target.x;
  if (!object.gives && !object.tool && !object.loot) {
    showMessage(game, object.empty || `Nothing to take from the ${object.name.toLowerCase()}.`);
    return;
  }
  // Something you can walk over that's about to stand up solid (fallen logs stacked back into a
  // wall) would shut you inside it.
  const after = object.becomes && OBJECTS[object.becomes];
  if (after && after.solid && !object.solid && feetOn(player, target.x, target.y)) {
    showMessage(game, `Step off the ${object.name.toLowerCase()} first.`);
    return;
  }

  // A good tool makes each swing count for more: with an axe, one chop counts as two.
  const swings = (world.damage.get(index) || 0) + toolPower(survivor, object.action);
  game.fx.shake = { index, until: game.time + 0.18 };
  burst(game.fx, target.x + 0.5, target.y + 0.5, object.burst, 4);
  buzz(12);

  if (swings < object.hits) {
    world.damage.set(index, swings);
    playSound(object.sound);
    return;
  }
  playSound(object.soundDone || object.sound);

  // Done: into the pack it goes (and a tool into your hands), and whatever's left takes its place.
  // Something you search has its own table of what might be in it (see searchLoot in places.js).
  if (object.loot) {
    searchLoot(game, target, object, index);
  } else {
    const parts = [];
    if (object.tool) {
      survivor.tools[object.tool] = true;
      parts.push(TOOLS[object.tool].short);
    }
    for (const [item, count] of Object.entries(object.gives || {})) {
      survivor.pack[item] += count;
      parts.push(`+${count} ${ITEMS[item].name}`);
    }
    if (parts.length > 0) {
      const color = object.tool ? TOOLS[object.tool].color : ITEMS[Object.keys(object.gives)[0]].color;
      floatText(game.fx, target.x + 0.5, target.y - 1, parts.join('  '), color);
    }
    if (object.says) showMessage(game, object.says);
  }
  setObject(world, target.x, target.y, object.becomes);
  if (object.loot) saveGame(game); // so reloading the page can't put back what you just took
  const regrow = object.becomes && OBJECTS[object.becomes].regrow;
  if (regrow) {
    world.regrowing.push({ index, at: game.time + regrow.after, from: object.becomes, into: regrow.into });
  }
  burst(game.fx, target.x + 0.5, target.y + 0.5, object.burst, 10);
  buzz(30);
}

function drink(game, target) {
  const vitals = game.survivor.vitals;
  if (vitals.water >= 99) {
    showMessage(game, "You've had your fill of water.");
    return;
  }
  vitals.water = Math.min(100, vitals.water + SIP_WATER);
  burst(game.fx, target.x + 0.5, target.y + 0.5, 'water', 6);
  playSound('drink');
  floatText(game.fx, target.x + 0.5, target.y - 0.5, '+water', '#7ab4e8');
}

// The best thing in your pack to eat: whatever gives the most food, or null if there's nothing.
function bestFood(pack) {
  let best = null;
  for (const [item, { food }] of Object.entries(ITEMS)) {
    if (food && pack[item] > 0 && (!best || food > ITEMS[best].food)) best = item;
  }
  return best;
}

function eat(game) {
  const { vitals, pack } = game.survivor;
  const item = bestFood(pack);
  if (!item) {
    showMessage(game, 'You have nothing to eat. Berry bushes grow in the fields.');
    return;
  }
  if (vitals.food >= 99) {
    showMessage(game, "You're not hungry.");
    return;
  }
  const { food, heals, color } = ITEMS[item];
  pack[item]--;
  vitals.food = Math.min(100, vitals.food + food);
  if (heals) vitals.health = Math.min(100, vitals.health + heals);
  game.player.act = { action: 'Eat', at: game.player.clock };
  playSound('eat');
  floatText(game.fx, game.player.x, game.player.y - 3, heals ? '+food +health' : '+food', color);
}

// ---- Little effects ----

const BURSTS = {
  leaf: { glyphs: ['*', ',', '\'', '`'], colors: ['#82c257', '#a6d86f', '#8b6239'] },
  stone: { glyphs: ['.', '·', '\'', ','], colors: ['#c9ccc4', '#8c8f88'] },
  water: { glyphs: ['°', '·', '\''], colors: ['#9fcff5', '#ffffff'] },
  wood: { glyphs: ['\'', ',', '·', '`'], colors: ['#d0a46a', '#8b6239'] },
  spark: { glyphs: ['*', '·', '\'', '°'], colors: ['#ffd75e', '#ff8a2a', '#a3a69e'] },
  fluff: { glyphs: ['°', '·', '\'', '˚'], colors: ['#f6f2e6', '#cdc6b6'] },
  shadow: { glyphs: ['░', '▒', '·', '°'], colors: ['#5a4870', '#3b2d4a', '#2a1d36'] },
  steam: { glyphs: ['°', '˚', '·', '\''], colors: ['#d8dde2', '#a9b0b6'] }, // rain hissing on a fire
  // Footsteps (see `step` in tiles.js).
  dust: { glyphs: ['.', '·', ','], colors: ['#b08e60', '#8f7552'] },
  sand: { glyphs: ['.', '·', ','], colors: ['#c9b27a', '#a8915c'] },
  grass: { glyphs: ['\'', ',', '`'], colors: ['#86c460', '#5d9a45'] },
};

// Throws a handful of characters into the air, like chips flying off an axe.
function burst(fx, x, y, kind, count) {
  const style = BURSTS[kind];
  for (let n = 0; n < count; n++) {
    fx.particles.push({
      x: x + (Math.random() - 0.5) * 0.6,
      y,
      z: 0.5 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 1.5,
      vz: 2 + Math.random() * 3,
      glyph: style.glyphs[n % style.glyphs.length],
      color: style.colors[n % style.colors.length],
      life: 0.5 + Math.random() * 0.4,
    });
  }
}

// A footstep: its sound, and one speck kicked up from the ground where the player's foot lands, if
// the ground has a `step`. Ground without one (the cottage floor) sounds like floorboards.
function footstep(game) {
  const { world, player, fx } = game;
  const ground = groundAt(world, Math.floor(player.x), Math.floor(player.y));
  if (!ground) return;
  playSound(`step:${ground.step || 'floor'}`);
  if (!ground.step) return;
  const style = BURSTS[ground.step];
  const n = Math.floor(Math.random() * 6);
  fx.particles.push({
    x: player.x + (Math.random() - 0.5) * 0.4,
    y: player.y + 0.1,
    z: 0.05,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.3,
    vz: 1 + Math.random(),
    glyph: style.glyphs[n % style.glyphs.length],
    color: style.colors[n % style.colors.length],
    life: 0.3,
  });
}

function floatText(fx, x, y, text, color) {
  fx.floaters.push({ x, y, text, color, life: 1 });
}

function updateEffects(fx, dt) {
  for (const p of fx.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vz -= 14 * dt;
    p.z = Math.max(0, p.z + p.vz * dt);
    p.life -= dt;
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);
  for (const f of fx.floaters) f.life -= dt / 1.2;
  fx.floaters = fx.floaters.filter((f) => f.life > 0);
}

// A tiny vibration on phones that support it, so a chop feels like a chop.
function buzz(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}
