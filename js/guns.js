// Guns: a pistol and a rifle, found in crates washed up on the beaches (see placeFinds in world.js),
// never made. Face something in the dark, out past arm's reach, and the action button says Shoot.
// Each press is one shot. Both guns take the same bullets, which are scarce: a box in each crate,
// and now and then a tin washed up on a beach in the morning.
//
// The pistol shoots a short way, six shots and then a short reload. The rifle shoots a long way and
// hits harder, but reloads after every shot. (Their numbers are `gun` in TOOLS, crafting.js.)
//
// A shot is loud. Everything out in the dark within BANG_REACH hears it: lurkers stop waiting in
// the grass and come for you, the next thing comes out of the dark at once, and the crickets go
// quiet. A gun you're carrying when you die is dropped where you fell; go back for it.

const AIM_CONE = 0.88; // how squarely ahead something must be to shoot it (1 is dead ahead; about 28° off)
const BANG_REACH = 40; // tiles: things in the dark this close hear a shot and come
const BANG_SOONER = 2; // after a shot, the next thing comes out of the dark within this many seconds
const SHOT_SECONDS = 0.12; // how long the streak of a shot shows
const MUZZLE_FLASH_SECONDS = 0.08; // how long the flash lights the dark
const MUZZLE_FLASH_REACH = 6; // ...and how far, in tiles
const SHOT_COLOR = '#fff2b0';
const WASH_UP_CHANCE = 0.5; // each morning, the chance a tin of bullets washes up on a beach
const WASH_UP_MOST = 2; // never more than this many tins lying on the beaches at once
const WASH_UP_AWAY = 16; // tiles: one washes up at least this far from you, out of sight

// How a gun you carry stands: shots left before it needs reloading, and when it's ready to shoot
// again (seconds of play). Not saved: a gun is loaded again when you carry on.
function gunState(survivor, key) {
  if (!survivor.guns[key]) {
    survivor.guns[key] = { left: Math.min(TOOLS[key].gun.rounds, survivor.pack.bullets), readyAt: 0 };
  }
  return survivor.guns[key];
}

function gunReady(game, key) {
  const { survivor } = game;
  if (!survivor.tools[key] || survivor.pack.bullets <= 0) return false;
  const gun = gunState(survivor, key);
  return game.time >= gun.readyAt && gun.left > 0;
}

// The gun to shoot something `distance` tiles away with: the one with the shortest reach that
// reaches and is ready (so the rifle's slow shots are kept for things far off), or null.
function gunFor(game, distance) {
  let best = null;
  for (const [key, tool] of Object.entries(TOOLS)) {
    if (!tool.gun || distance > tool.gun.range || !gunReady(game, key)) continue;
    if (!best || tool.gun.range < TOOLS[best].gun.range) best = key;
  }
  return best;
}

// Something in the dark to shoot: past arm's reach (up close you hit it), in front of you, in range
// of a gun that's ready, with nothing solid in the way. The nearest such, as a target for the
// action button, or null.
function findShot(game) {
  const { player, world } = game;
  const facing = FACINGS[player.facing];
  let best = null;
  let bestDistance = Infinity;
  for (const creature of game.creatures) {
    if (creature.state === 'fade' || creature.fade < 0.5) continue;
    const toX = creature.x - player.x;
    const toY = creature.y - player.y;
    const distance = Math.hypot(toX, toY);
    if (distance <= HIT_REACH || distance >= bestDistance) continue;
    if ((toX * facing.x + toY * facing.y) / distance < AIM_CONE) continue;
    const gun = gunFor(game, distance);
    if (!gun || !clearShot(world, player, creature)) continue;
    best = { ...creatureTarget(creature, 'Shoot'), gun };
    bestDistance = distance;
  }
  return best;
}

// Whether a shot from the player to a creature gets there: nothing solid on the way (trees, rocks,
// walls, cliffs, the cottage), though it flies over water.
function clearShot(world, from, to) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const startTile = Math.floor(from.y) * world.width + Math.floor(from.x);
  for (let d = 0.25; d < length; d += 0.25) {
    const x = Math.floor(from.x + ((to.x - from.x) * d) / length);
    const y = Math.floor(from.y + ((to.y - from.y) * d) / length);
    if (y * world.width + x === startTile) continue;
    const ground = groundAt(world, x, y);
    const object = objectAt(world, x, y);
    if (!ground || (ground.solid && !ground.drink)) return false;
    if (object && (object.solid || object.door)) return false;
  }
  return true;
}

// One press of Shoot. Holding the button doesn't keep firing: each shot is a press.
function shoot(game, target) {
  const { player, survivor } = game;
  if (player.triggerHeld) return;
  player.triggerHeld = true;
  const key = target.gun;
  const tool = TOOLS[key];
  const gun = gunState(survivor, key);
  const creature = target.creature;
  player.act = { action: 'Shoot', at: player.clock, tool: key };
  faceToward(player, creature.x, creature.y);
  survivor.pack.bullets--;
  gun.left--;
  game.shot = { x: creature.x, y: creature.y - 0.8, at: game.time };
  playSound(tool.gun.sound);
  buzz(60);
  woundCreature(game, creature, tool.gun.damage);
  hearShot(game);
  if (survivor.pack.bullets === 0) showMessage(game, 'That was your last bullet.');
}

// Everything out in the dark hears a shot.
function hearShot(game) {
  const { player, hunt } = game;
  for (const creature of game.creatures) {
    if (creature.gone || Math.hypot(creature.x - player.x, creature.y - player.y) > BANG_REACH) continue;
    // Lurkers stop waiting in the grass and come for you, like the rest.
    if (creature.state === 'lurk' || creature.state === 'hide') {
      creature.state = 'creep';
      creature.den = null;
    }
  }
  if (game.sky.phase !== 'night') return;
  if (hunt.nextAt !== null) hunt.nextAt = Math.min(hunt.nextAt, game.time + BANG_SOONER);
  hushCrickets(game);
  if (!hunt.seen.bang) {
    hunt.seen.bang = true;
    showMessage(game, 'The shot rings out across the island. Things in the dark heard it.');
  }
}

// Runs every update: a gun that's out of shots reloads, if there are bullets to load.
function updateGuns(game) {
  const { survivor } = game;
  for (const key of Object.keys(survivor.guns)) {
    const gun = survivor.guns[key];
    if (!survivor.tools[key]) {
      delete survivor.guns[key]; // put away in a chest, or lost: it's loaded again when it's back
      continue;
    }
    if (gun.reloading && game.time >= gun.readyAt) {
      gun.reloading = false;
      playSound('reload');
    }
    if (gun.left > 0 || gun.reloading || survivor.pack.bullets <= 0) continue;
    const { rounds, reload } = TOOLS[key].gun;
    gun.left = Math.min(rounds, survivor.pack.bullets);
    gun.readyAt = game.time + reload;
    gun.reloading = true;
    playSound('click');
  }
}

// Whether a gun you carry is reloading right now (the pack shows it).
function gunReloading(survivor, key) {
  const gun = survivor.guns[key];
  return Boolean(gun && gun.reloading);
}

// When you die, the guns you carry fall where you do, each on the nearest bare tile.
function dropGuns(game) {
  const { world, player, survivor } = game;
  let dropped = 0;
  for (const key of Object.keys(survivor.tools)) {
    const tool = TOOLS[key];
    if (!tool.dropped) continue;
    const spot = bareTileNear(world, Math.floor(player.x), Math.floor(player.y));
    if (!spot) continue;
    setObject(world, spot.x, spot.y, tool.dropped);
    delete survivor.tools[key];
    dropped++;
  }
  return dropped;
}

// The nearest tile to (x, y) with nothing on it that you can stand on, or null.
function bareTileNear(world, x, y) {
  for (let r = 0; r <= 6; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const ground = groundAt(world, x + dx, y + dy);
        if (ground && !ground.solid && !objectAt(world, x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
    }
  }
  return null;
}

// Some mornings a tin of bullets washes up on a beach you can walk to, out of sight.
function washUp(game) {
  const { world, player } = game;
  if (Math.random() >= WASH_UP_CHANCE) return;
  const lying = world.objects.reduce((count, key) => count + (key === 'bulletBox' ? 1 : 0), 0);
  if (lying >= WASH_UP_MOST) return;
  for (let tries = 0; tries < 30; tries++) {
    const i = world.beaches[Math.floor(Math.random() * world.beaches.length)];
    if (i === undefined) return;
    const x = i % world.width;
    const y = (i - x) / world.width;
    if (world.objects[i] || Math.hypot(x + 0.5 - player.x, y + 0.5 - player.y) < WASH_UP_AWAY) continue;
    setObject(world, x, y, 'bulletBox');
    return;
  }
}
