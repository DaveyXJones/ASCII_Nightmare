// Staying alive: health, food and water, what you're carrying, and what the action button does.

const ITEMS = {
  wood: { name: 'wood', glyph: '≡', color: '#d0a46a' },
  stone: { name: 'stone', glyph: '●', color: '#b4b8b0' },
  berries: { name: 'berries', glyph: '•', color: '#ff5a6e' },
};

const FOOD_PER_SECOND = 100 / 420; // a full stomach lasts seven minutes
const WATER_PER_SECOND = 100 / 300; // thirst comes faster: five minutes
const STARVING_DAMAGE = 2; // health lost each second with no food, and again with no water
const HEAL_PER_SECOND = 0.5; // health regained each second while fed and watered
const BERRY_FOOD = 12;
const SIP_WATER = 20;
const SWING_SECONDS = 0.42; // time between swings while the action button is held
const REACH = 0.95; // how far the player can reach, in tiles, from their feet to the edge of a tile
const LOW = 25; // below this, a vital is running low and the game warns you

const WARNINGS = {
  food: 'Your stomach growls. Find something to eat.',
  water: 'Your throat is dry. Find water to drink.',
  health: 'You feel weak.',
};

function newSurvivor() {
  return {
    vitals: { health: 100, food: 100, water: 100 },
    pack: Object.fromEntries(Object.keys(ITEMS).map((item) => [item, 0])),
    warned: { food: false, water: false, health: false },
    nextSwingAt: 0,
  };
}

function updateVitals(game, dt) {
  const vitals = game.survivor.vitals;
  vitals.food = Math.max(0, vitals.food - FOOD_PER_SECOND * dt);
  vitals.water = Math.max(0, vitals.water - WATER_PER_SECOND * dt);
  if (vitals.food === 0) vitals.health -= STARVING_DAMAGE * dt;
  if (vitals.water === 0) vitals.health -= STARVING_DAMAGE * dt;
  if (vitals.food > LOW && vitals.water > LOW) vitals.health += HEAL_PER_SECOND * dt;
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
// whatever the player is facing. Returns { x, y, label, object?, drink? } or null.
function findTarget(game) {
  const { world, player } = game;
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
      if (object && object.action) candidate = { x: tx, y: ty, label: object.action, object };
      else if (!object && ground && ground.drink) candidate = { x: tx, y: ty, label: 'Drink', drink: true };
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
  return best;
}

// One press (or one swing of a held button) of the action button.
function useTarget(game) {
  const { world, player, survivor } = game;
  const target = game.target;
  if (!target) return;
  player.swingUntil = player.clock + 0.2;
  faceToward(player, target.x + 0.5, target.y + 0.5);

  if (target.drink || (target.object && target.object.drink)) {
    drink(game, target);
    return;
  }

  const object = target.object;
  const index = target.y * world.width + target.x;
  if (!object.gives) {
    showMessage(game, object.empty || `Nothing to take from the ${object.name.toLowerCase()}.`);
    return;
  }

  const swings = (world.damage.get(index) || 0) + 1;
  game.fx.shake = { index, until: game.time + 0.18 };
  burst(game.fx, target.x + 0.5, target.y + 0.5, object.action === 'Mine' ? 'stone' : 'leaf', 4);
  buzz(12);

  if (swings < object.hits) {
    world.damage.set(index, swings);
    return;
  }

  // Done: into the pack it goes, and whatever's left takes its place.
  const parts = [];
  for (const [item, count] of Object.entries(object.gives)) {
    survivor.pack[item] += count;
    parts.push(`+${count} ${ITEMS[item].name}`);
  }
  const color = ITEMS[Object.keys(object.gives)[0]].color;
  floatText(game.fx, target.x + 0.5, target.y - 1, parts.join('  '), color);
  setObject(world, target.x, target.y, object.becomes);
  const regrow = object.becomes && OBJECTS[object.becomes].regrow;
  if (regrow) {
    world.regrowing.push({ index, at: game.time + regrow.after, from: object.becomes, into: regrow.into });
  }
  burst(game.fx, target.x + 0.5, target.y + 0.5, object.action === 'Mine' ? 'stone' : 'leaf', 10);
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
  floatText(game.fx, target.x + 0.5, target.y - 0.5, '+water', '#7ab4e8');
}

function eatBerry(game) {
  const { vitals, pack } = game.survivor;
  if (pack.berries === 0) {
    showMessage(game, 'You have nothing to eat. Berry bushes grow in the fields.');
    return;
  }
  if (vitals.food >= 99) {
    showMessage(game, "You're not hungry.");
    return;
  }
  pack.berries--;
  vitals.food = Math.min(100, vitals.food + BERRY_FOOD);
  floatText(game.fx, game.player.x, game.player.y - 3, '+food', ITEMS.berries.color);
}

// ---- Little effects ----

const BURSTS = {
  leaf: { glyphs: ['*', ',', '\'', '`'], colors: ['#82c257', '#a6d86f', '#8b6239'] },
  stone: { glyphs: ['.', '·', '\'', ','], colors: ['#c9ccc4', '#8c8f88'] },
  water: { glyphs: ['°', '·', '\''], colors: ['#9fcff5', '#ffffff'] },
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
