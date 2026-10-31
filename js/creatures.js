// Things that come out of the dark. At night, shades creep out of the shadows and hunt you. They
// can't stand light: they won't come into the light of a campfire or of the torch in your hand,
// only prowl round its edge. They won't cross the cottage's threshold, and walls stop them, so you
// can shut yourself in, though not for good: shut out, they claw at the wall until it breaks. With
// no light they dart in, bite and back off again. Hit one and it runs; hit it enough and it comes
// apart into smoke. At dawn they slink away. On the darkest nights a brute comes out too: slow, hard
// to put down, and not afraid of a torch, only of firelight.
//
// To find their way to you round trees, rocks and walls they follow a map of steps that spreads
// out from wherever you're standing (`field`), worked out a few times a second.

// The kinds of thing that come out at night. How many of each can be out at once is up to the moon
// (`creatures` in MOONS, night.js).
//   frames  its pictures in SPRITES (sprites.js), swapped as it walks
//   eyes    the glyph and color of its eyes, and which cells of its picture they're in. They're
//           drawn again above the dark, so in the dark that's all you see of it.
//   hp      how many hits it takes (a tool with power to Hit, like the axe, counts for more)
//   bite    how much health each bite takes from you
//   speed   tiles per second as it creeps toward you
//   lunge   tiles per second as it darts in to bite
//   fear    how near it dares come to a light, as a share of how far the light reaches: `fire` for
//           campfires and the candle, `torch` for your torch. 0 means it isn't afraid at all.
//   flinch  seconds it runs off for after you hit it
//   knock   how far, in tiles, a hit knocks it back
//   claw    how much each scratch at a wall counts for (see `claws` in OBJECTS)
//   after   seconds after nightfall before one can come out
//   seen    what the game says the first time one comes out each night
//   sound   the noise it makes as it comes out, from where it is: a name in SOUNDS (sound.js)
const CREATURES = {
  shade: {
    name: 'Shade',
    frames: ['shade', 'shade2'],
    eyes: { glyph: '•', color: '#ff4a3d', cells: [[1, 1], [2, 1]] },
    hp: 3,
    bite: 8,
    speed: 3,
    lunge: 6.5,
    fear: { fire: 0.8, torch: 0.8 },
    flinch: 2,
    knock: 0.5,
    claw: 1,
    after: 0,
    seen: 'Something is moving out there in the dark.',
    sound: 'growl',
  },
  brute: {
    name: 'Brute',
    frames: ['brute', 'brute2'],
    eyes: { glyph: '●', color: '#ffb02e', cells: [[2, 1]] },
    hp: 6,
    bite: 18,
    speed: 1.8,
    lunge: 4.5,
    fear: { fire: 0.8, torch: 0 },
    flinch: 0.6,
    knock: 0.2,
    claw: 4,
    after: 150,
    seen: 'Something big is crashing about in the dark. A torch won\'t scare it off.',
    sound: 'roar',
  },
};

const FIRST_CREATURE_SECONDS = 25; // how long after nightfall the first one comes out
const CREATURE_EVERY = [12, 20]; // seconds between new ones coming out, picked at random in this range
const SPAWN_DISTANCE = [12, 18]; // how far from you, in tiles, they come out of the dark
const GONE_DISTANCE = 32; // further than this from you, in tiles, and one gives up and vanishes
const LUNGE_RANGE = 2.5; // how close, in tiles, one gets before it darts in to bite
const LUNGE_SECONDS = 1.2; // how long a dart lasts if it doesn't reach you
const BITE_REACH = 0.75; // how close, in tiles, it has to be to bite
const BACK_OFF = [1.5, 2.5]; // seconds it backs away after a bite, picked at random in this range
const RUN_SECONDS = 2; // seconds it runs after a light catches it
const RUN_SPEED = 4.5; // tiles per second as it backs off or runs
const PROWL_SPEED = 1.4; // tiles per second as it paces round the edge of a light
const KEEP_APART = 0.8; // how close, in tiles, two of them get before they shuffle apart
const HIT_REACH = 1.9; // how far, in tiles, you can reach to hit one: far enough to hit through a wall
const CLAW_SECONDS = 1; // time between scratches at a wall
const CLAW_REACH = 0.6; // how far ahead of its feet, in tiles, it reaches to claw at a wall
const FIELD_RADIUS = 20; // how far, in tiles, the map of steps toward you reaches
const FIELD_SECONDS = 0.4; // how often the map is worked out again
const FADE_SECONDS = 1.5; // how long one takes to come out of the dark, or melt back into it
const CREATURE_HALF_WIDTH = 0.3; // its feet, in tiles, like the player's
const CREATURE_HALF_DEPTH = 0.2;
const CREATURE_FRAME_TILES = 0.4; // how far it walks on each of its pictures
const EYE_BLINK_SECONDS = 0.15;

// The map of steps: for each tile around you, how many steps it is to get to you without going
// through anything solid, or below 0 if there's no way (or the tile is solid itself).
const field = {
  left: 0, // the tile at its top-left corner
  top: 0,
  size: FIELD_RADIUS * 2 + 1, // tiles along each side
  steps: new Int16Array((FIELD_RADIUS * 2 + 1) ** 2),
  queue: new Int32Array((FIELD_RADIUS * 2 + 1) ** 2),
  lights: [], // objects with `light` in the area: { x, y, reach }
  at: -Infinity, // when it was last worked out, in seconds of play
};

// What a night's hunt has done so far: when night fell and when the next one comes out, and which
// messages have shown, so each only shows once a night.
function newHunt() {
  return { nightAt: null, nextAt: null, seen: {}, bitten: false, clawed: false };
}

function updateCreatures(game, dt) {
  const { sky, hunt } = game;
  const night = sky.phase === 'night';
  // By day, claw marks on walls are forgotten: whatever was left standing is whole again.
  if (!night && game.world.clawed.size > 0) game.world.clawed.clear();
  if (!night && game.creatures.length === 0) {
    hunt.nextAt = null;
    return;
  }
  if (game.time >= field.at + FIELD_SECONDS) mapSteps(game);
  const fears = lightsToFear(game);

  // Coming out of the dark: the first a little while after nightfall, then more every so often,
  // up to however many of each kind tonight's moon allows (`creatures` in MOONS, night.js).
  if (!night) {
    hunt.nextAt = null;
  } else if (hunt.nextAt === null) {
    Object.assign(hunt, newHunt(), { nightAt: game.time, nextAt: game.time + FIRST_CREATURE_SECONDS });
  } else if (game.time >= hunt.nextAt) {
    hunt.nextAt = game.time + between(CREATURE_EVERY);
    const kind = kindToComeOut(game);
    if (kind) comeOut(game, fears, kind);
  }

  for (const creature of game.creatures) moveCreature(game, creature, dt, fears, night);
  keepApart(game, fears);
  game.creatures = game.creatures.filter((creature) => !creature.gone);
}

// Which kind comes out next: one that tonight's moon allows more of than are out now, and whose
// time has come (`after`). Picked at random if there's more than one, or null if there's none.
function kindToComeOut(game) {
  const allowed = game.sky.moon.creatures;
  const sinceNightfall = game.time - game.hunt.nightAt;
  const ready = Object.keys(allowed).filter((kind) => {
    const out = game.creatures.filter((c) => c.kind === kind && c.state !== 'fade').length;
    return out < allowed[kind] && sinceNightfall >= CREATURES[kind].after;
  });
  return ready.length ? ready[Math.floor(Math.random() * ready.length)] : null;
}

// A new one somewhere in the dark around you, on open ground, out of reach of any light.
function comeOut(game, fears, kind) {
  const { world, player } = game;
  for (let tries = 0; tries < 20; tries++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = between(SPAWN_DISTANCE);
    const tx = Math.floor(player.x + Math.cos(angle) * distance);
    const ty = Math.floor(player.y + Math.sin(angle) * distance);
    if (!creatureCanStand(world, tx, ty) || inLight(fears, tx + 0.5, ty + 0.5, { fire: 1, torch: 1 })) continue;
    game.creatures.push({
      kind,
      x: tx + 0.5,
      y: ty + 0.5,
      hp: CREATURES[kind].hp,
      state: 'creep', // creep toward you, 'lunge' at you, 'run' away, 'claw' at a wall, or 'fade' at dawn
      timer: 0, // seconds left of a lunge or a run, or until the next scratch at a wall
      clawing: null, // the wall it's clawing at: { x, y, index, key }
      fade: 0, // how solid it is, from 0 (not there) to 1
      stride: 0, // distance walked, for its walking pictures
      side: Math.random() < 0.5 ? -1 : 1, // which way it paces round a light
      blink: Math.random() * 10, // so they don't all blink together
      hurtAt: -Infinity,
    });
    playSoundAt(game, CREATURES[kind].sound, tx + 0.5, ty + 0.5);
    if (!game.hunt.seen[kind]) {
      game.hunt.seen[kind] = true;
      showMessage(game, CREATURES[kind].seen);
    }
    return;
  }
}

function moveCreature(game, creature, dt, fears, night) {
  const { player } = game;
  const kind = CREATURES[creature.kind];
  creature.timer -= dt;

  // At dawn they back away from you and melt into what's left of the dark.
  if (!night) creature.state = 'fade';
  if (creature.state === 'fade') {
    creature.fade -= dt / FADE_SECONDS;
    if (creature.fade <= 0) creature.gone = true;
    moveAway(game, creature, player.x, player.y, RUN_SPEED * dt);
    return;
  }
  creature.fade = Math.min(1, creature.fade + dt / FADE_SECONDS);

  const distance = Math.hypot(player.x - creature.x, player.y - creature.y);
  if (distance > GONE_DISTANCE) {
    creature.gone = true;
    return;
  }

  // Caught in the light (you lit a torch beside it, or walked up with one): it runs.
  const light = lightAround(fears, creature.x, creature.y, kind.fear);
  if (light && creature.state !== 'run') {
    creature.state = 'run';
    creature.timer = RUN_SECONDS;
  }

  if (creature.state === 'run') {
    const from = light || player;
    moveAway(game, creature, from.x, from.y, RUN_SPEED * dt);
    if (creature.timer <= 0) creature.state = 'creep';
  } else if (creature.state === 'lunge') {
    if (distance < BITE_REACH) {
      bite(game, creature);
      return;
    }
    const way = towards(creature, player.x, player.y);
    const dx = way.x * kind.lunge * dt;
    const dy = way.y * kind.lunge * dt;
    if (creature.timer <= 0 || inLight(fears, creature.x + dx, creature.y + dy, kind.fear)) {
      // Missed, or the light's in the way: back off and try again.
      creature.state = 'run';
      creature.timer = between(BACK_OFF);
    } else {
      stepCreature(game, creature, dx, dy);
    }
  } else if (creature.state === 'claw') {
    const wall = creature.clawing;
    const steps = stepsAt(Math.floor(creature.x), Math.floor(creature.y));
    // The wall's gone (broken, or you took it down), or there's a way round to you now: hunt again.
    if (game.world.objects[wall.index] !== wall.key || steps >= 0) {
      creature.state = 'creep';
      creature.clawing = null;
      return;
    }
    // It presses right up against the wall (close enough for you to hit it from the other side).
    const way = towards(creature, wall.x + 0.5, wall.y + 0.5);
    stepCreature(game, creature, way.x * kind.speed * dt, way.y * kind.speed * dt);
    if (creature.timer <= 0) {
      scratch(game, creature, wall);
      creature.timer = CLAW_SECONDS;
    }
  } else {
    // Creeping toward you. Close enough, with a clear way to you, and it darts in.
    const steps = stepsAt(Math.floor(creature.x), Math.floor(creature.y));
    if (distance < LUNGE_RANGE && steps >= 0 && steps <= 3) {
      creature.state = 'lunge';
      creature.timer = LUNGE_SECONDS;
      return;
    }
    const way = wayToPlayer(game, creature, steps);
    // No way round to you because you've walled yourself in, and a wall right in front: it claws at
    // it. (Indoors there's no way to you either, but that's the cottage, which nothing gets into, so
    // there's no point clawing down fences on the way.)
    const indoors = insideHouse(game.world, Math.floor(player.x), Math.floor(player.y));
    const walledIn = steps < 0 && distance < FIELD_RADIUS && !indoors;
    const wall = walledIn ? wallAhead(game, creature, way) : null;
    if (wall) {
      creature.state = 'claw';
      creature.clawing = wall;
      creature.timer = CLAW_SECONDS;
      return;
    }
    const step = kind.speed * dt;
    const dx = way.x * step;
    const dy = way.y * step;
    // At the edge of a light it stops and paces back and forth instead.
    if (inLight(fears, creature.x + dx, creature.y + dy, kind.fear)) prowl(game, creature, dt, fears);
    else stepCreature(game, creature, dx, dy);
  }
}

// A wall or door right in front of a creature, on its way to you, that it could claw down: one with
// `claws` in OBJECTS. Returns { x, y, index, key } or null.
function wallAhead(game, creature, way) {
  const { world } = game;
  const x = Math.floor(creature.x + way.x * CLAW_REACH);
  const y = Math.floor(creature.y + way.y * CLAW_REACH);
  const object = objectAt(world, x, y);
  if (!object || !object.claws) return null;
  const index = y * world.width + x;
  return { x, y, index, key: world.objects[index] };
}

// One scratch at a wall. Each one counts for the creature's `claw`; once they add up to the wall's
// `claws`, it breaks. The marks are kept in world.clawed, and forgotten by day.
function scratch(game, creature, wall) {
  const { world, fx, hunt } = game;
  const object = OBJECTS[wall.key];
  const scratches = (world.clawed.get(wall.index) || 0) + CREATURES[creature.kind].claw;
  creature.stride += CREATURE_FRAME_TILES; // its legs shift as it rakes at the wall
  fx.shake = { index: wall.index, until: game.time + 0.18 };
  burst(fx, wall.x + 0.5, wall.y + 0.5, object.burst || 'wood', 3);
  playSoundAt(game, 'claw', wall.x + 0.5, wall.y + 0.5);
  if (!hunt.clawed) {
    hunt.clawed = true;
    showMessage(game, 'Something is clawing at your wall.');
  }
  if (scratches < object.claws) {
    world.clawed.set(wall.index, scratches);
    return;
  }
  setObject(world, wall.x, wall.y, null);
  burst(fx, wall.x + 0.5, wall.y + 0.5, object.burst || 'wood', 12);
  playSoundAt(game, 'crash', wall.x + 0.5, wall.y + 0.5);
  showMessage(game, `Something breaks through your ${object.name.toLowerCase()}!`);
  buzz(60);
  field.at = -Infinity; // there's a way through now: work out the map of steps again
}

// Which way to go to reach you: downhill on the map of steps, round whatever's in the way. If the
// map doesn't reach it (you're shut in behind walls or indoors, or it's too far off), it just
// heads straight for you, and presses up against whatever stops it.
function wayToPlayer(game, creature, steps) {
  const { player } = game;
  const tx = Math.floor(creature.x);
  const ty = Math.floor(creature.y);
  if (steps > 1) {
    let best = steps;
    let toX = 0;
    let toY = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const next = stepsAt(tx + dx, ty + dy);
        if (next < 0 || next >= best) continue;
        // No cutting corners between two things that touch diagonally.
        if (dx && dy && (stepsAt(tx + dx, ty) < 0 || stepsAt(tx, ty + dy) < 0)) continue;
        best = next;
        toX = dx;
        toY = dy;
      }
    }
    if (best < steps) return towards(creature, tx + toX + 0.5, ty + toY + 0.5);
  }
  return towards(creature, player.x, player.y);
}

// Pacing round the edge of a light: sideways around you, turning back when the light (or something
// solid) is in the way.
function prowl(game, creature, dt, fears) {
  const { player } = game;
  const way = towards(creature, player.x, player.y);
  const step = PROWL_SPEED * dt;
  const dx = -way.y * creature.side * step;
  const dy = way.x * creature.side * step;
  const fear = CREATURES[creature.kind].fear;
  if (inLight(fears, creature.x + dx, creature.y + dy, fear) || !stepCreature(game, creature, dx, dy)) {
    creature.side = -creature.side;
  }
}

function moveAway(game, creature, x, y, step) {
  const way = towards(creature, x, y);
  stepCreature(game, creature, -way.x * step, -way.y * step);
}

function bite(game, creature) {
  const { player, survivor } = game;
  const kind = CREATURES[creature.kind];
  survivor.vitals.health = Math.max(0, survivor.vitals.health - kind.bite);
  survivor.hurtBy = 'dark';
  survivor.hurtAt = game.time;
  floatText(game.fx, player.x, player.y - 3, `-${kind.bite}`, '#ff5a4e');
  burst(game.fx, player.x, player.y - 1, 'shadow', 4);
  playSound('bite');
  buzz(80);
  if (!game.hunt.bitten) {
    game.hunt.bitten = true;
    const advice = kind.fear.torch ? 'Get to the light.' : 'Hit back, or get to a fire.';
    showMessage(game, `Something bites you! ${advice}`);
  }
  creature.state = 'run';
  creature.timer = between(BACK_OFF);
}

// You hit one (see useTarget in survival.js). It's knocked back and runs, or comes apart.
function hitCreature(game, creature) {
  const { player, survivor } = game;
  const kind = CREATURES[creature.kind];
  player.act = { action: 'Hit', at: player.clock };
  faceToward(player, creature.x, creature.y);
  creature.hp -= toolPower(survivor, 'Hit');
  creature.hurtAt = game.time;
  burst(game.fx, creature.x, creature.y - 1, 'shadow', 5);
  buzz(20);
  if (creature.hp <= 0) {
    creature.gone = true;
    burst(game.fx, creature.x, creature.y - 1, 'shadow', 14);
    playSound('dissolve');
    showMessage(game, `The ${kind.name.toLowerCase()} comes apart into smoke.`);
    return;
  }
  playSound('hit');
  moveAway(game, creature, player.x, player.y, kind.knock);
  creature.state = 'run';
  creature.timer = kind.flinch;
  creature.clawing = null;
}

// Two of them don't stand in the same spot: any that are too close shuffle apart.
function keepApart(game, fears) {
  const creatures = game.creatures;
  for (let a = 0; a < creatures.length; a++) {
    for (let b = a + 1; b < creatures.length; b++) {
      const one = creatures[a];
      const two = creatures[b];
      const dx = two.x - one.x;
      const dy = two.y - one.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= KEEP_APART || distance === 0) continue;
      const push = (KEEP_APART - distance) / 2 / distance;
      if (!inLight(fears, one.x - dx * push, one.y - dy * push, CREATURES[one.kind].fear)) {
        stepCreature(game, one, -dx * push, -dy * push);
      }
      if (!inLight(fears, two.x + dx * push, two.y + dy * push, CREATURES[two.kind].fear)) {
        stepCreature(game, two, dx * push, dy * push);
      }
    }
  }
}

// Whether its eyes are open right now: they blink every few seconds.
function eyesOpen(game, creature) {
  return (game.time + creature.blink) % 3.7 > EYE_BLINK_SECONDS;
}

// ---- Getting about ----

// Shades can stand anywhere you could, except indoors and in a doorway you've built: doors open
// for you, never for them.
function creatureCanStand(world, tx, ty) {
  const object = objectAt(world, tx, ty);
  return !blockerAt(world, tx, ty) && !insideHouse(world, tx, ty) && !(object && object.door);
}

// Moves one, a step along each axis in turn so it slides along walls. Returns true if it moved.
function stepCreature(game, creature, dx, dy) {
  const { world } = game;
  const startX = creature.x;
  const startY = creature.y;
  if (dx && creatureFits(world, creature.x + dx, creature.y)) creature.x += dx;
  if (dy && creatureFits(world, creature.x, creature.y + dy)) creature.y += dy;
  const moved = Math.hypot(creature.x - startX, creature.y - startY);
  creature.stride += moved;
  return moved > 0;
}

function creatureFits(world, x, y) {
  for (let ty = Math.floor(y - CREATURE_HALF_DEPTH); ty <= Math.floor(y + CREATURE_HALF_DEPTH); ty++) {
    for (let tx = Math.floor(x - CREATURE_HALF_WIDTH); tx <= Math.floor(x + CREATURE_HALF_WIDTH); tx++) {
      if (!creatureCanStand(world, tx, ty)) return false;
    }
  }
  return true;
}

// Works out the map of steps: a flood outward from your tile, one step at a time, never through
// anything solid or into the cottage. Also notes which objects nearby give light.
function mapSteps(game) {
  const { world, player } = game;
  const { size, steps, queue } = field;
  field.left = Math.floor(player.x) - FIELD_RADIUS;
  field.top = Math.floor(player.y) - FIELD_RADIUS;
  field.at = game.time;
  steps.fill(-1);
  const start = FIELD_RADIUS * size + FIELD_RADIUS;
  steps[start] = 0;
  queue[0] = start;
  let head = 0;
  let tail = 1;
  while (head < tail) {
    const i = queue[head++];
    const col = i % size;
    const row = (i - col) / size;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const c = col + dx;
        const r = row + dy;
        if (c < 0 || r < 0 || c >= size || r >= size) continue;
        const n = r * size + c;
        if (steps[n] !== -1) continue;
        const tx = field.left + c;
        const ty = field.top + r;
        // No squeezing between two things that touch at the corners.
        const open = (x, y) => creatureCanStand(world, x, y);
        if (dx && dy && !(open(tx, ty - dy) && open(tx - dx, ty))) continue;
        if (!creatureCanStand(world, tx, ty)) {
          steps[n] = -2;
          continue;
        }
        steps[n] = steps[i] + 1;
        queue[tail++] = n;
      }
    }
  }

  field.lights.length = 0;
  for (let ty = field.top; ty < field.top + size; ty++) {
    for (let tx = field.left; tx < field.left + size; tx++) {
      const object = objectAt(world, tx, ty);
      if (object && object.light) field.lights.push({ x: tx + 0.5, y: ty + 0.5, reach: object.light });
    }
  }
}

// Steps from a tile to you on the map, or below 0 if there's no way from there.
function stepsAt(tx, ty) {
  const c = tx - field.left;
  const r = ty - field.top;
  if (c < 0 || r < 0 || c >= field.size || r >= field.size) return -1;
  return field.steps[r * field.size + c];
}

// ---- Light ----

// Every light they might keep away from: the campfires and candles noted by mapSteps(), and your
// torch (marked `torch`, since a brute isn't afraid of it).
function lightsToFear(game) {
  const reach = torchReach(game.survivor);
  if (reach <= 0) return field.lights;
  return [...field.lights, { x: game.player.x, y: game.player.y, reach, torch: true }];
}

// The light that scares a creature off (x, y), or null if none does. `fear` is the creature's (see
// CREATURES): how much of each kind of light's reach it keeps out of.
function lightAround(lights, x, y, fear) {
  for (const light of lights) {
    const share = light.torch ? fear.torch : fear.fire;
    if (Math.hypot(x - light.x, y - light.y) < light.reach * share) return light;
  }
  return null;
}

function inLight(lights, x, y, fear) {
  return lightAround(lights, x, y, fear) !== null;
}

// ---- Little helpers ----

// A direction of length 1 from a creature toward (x, y).
function towards(creature, x, y) {
  const dx = x - creature.x;
  const dy = y - creature.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

// A random number within [low, high].
function between([low, high]) {
  return low + Math.random() * (high - low);
}
