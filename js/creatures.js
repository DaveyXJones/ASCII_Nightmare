// Things that come out of the dark. At night, shades creep out of the shadows and hunt you. They
// can't stand light: they won't come into the light of a campfire or of the torch in your hand,
// only prowl round its edge. They won't cross the cottage's threshold, and walls stop them, so you
// can shut yourself in. With no light they dart in, bite and back off again. Hit one and it runs;
// hit it enough and it comes apart into smoke. At dawn they slink away.
//
// To find their way to you round trees, rocks and walls they follow a map of steps that spreads
// out from wherever you're standing (`field`), worked out a few times a second.

// The kinds of thing that come out at night. There's one so far.
//   frames  its pictures in SPRITES (sprites.js), swapped as it walks
//   eyes    the glyph and color of its eyes, and which cells of its picture they're in. They're
//           drawn again above the dark, so in the dark that's all you see of it.
//   hp      how many hits it takes (a tool with power to Hit, like the axe, counts for more)
//   bite    how much health each bite takes from you
//   speed   tiles per second as it creeps toward you
//   lunge   tiles per second as it darts in to bite
const CREATURES = {
  shade: {
    name: 'Shade',
    frames: ['shade', 'shade2'],
    eyes: { glyph: '•', color: '#ff4a3d', cells: [[1, 1], [2, 1]] },
    hp: 3,
    bite: 8,
    speed: 3,
    lunge: 6.5,
  },
};

const FIRST_CREATURE_SECONDS = 25; // how long after nightfall the first one comes out
const CREATURE_EVERY = [12, 20]; // seconds between new ones coming out, picked at random in this range
const SPAWN_DISTANCE = [12, 18]; // how far from you, in tiles, they come out of the dark
const GONE_DISTANCE = 32; // further than this from you, in tiles, and one gives up and vanishes
const FEAR_SHARE = 0.8; // they won't come nearer a light than this share of how far it reaches
const LUNGE_RANGE = 2.5; // how close, in tiles, one gets before it darts in to bite
const LUNGE_SECONDS = 1.2; // how long a dart lasts if it doesn't reach you
const BITE_REACH = 0.75; // how close, in tiles, it has to be to bite
const BACK_OFF = [1.5, 2.5]; // seconds it backs away after a bite, picked at random in this range
const RUN_SECONDS = 2; // seconds it runs after you hit it, or after a light catches it
const RUN_SPEED = 4.5; // tiles per second as it backs off or runs
const PROWL_SPEED = 1.4; // tiles per second as it paces round the edge of a light
const KEEP_APART = 0.8; // how close, in tiles, two of them get before they shuffle apart
const HIT_REACH = 1.3; // how far, in tiles, you can reach to hit one
const KNOCK_BACK = 0.5; // how far, in tiles, a hit knocks one back
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

// What a night's hunt has done so far, so each message only shows once a night.
function newHunt() {
  return { nextAt: null, seen: false, bitten: false };
}

function updateCreatures(game, dt) {
  const { sky, hunt } = game;
  const night = sky.phase === 'night';
  if (!night && game.creatures.length === 0) {
    hunt.nextAt = null;
    return;
  }
  if (game.time >= field.at + FIELD_SECONDS) mapSteps(game);
  const fears = lightsToFear(game);

  // Coming out of the dark: the first a little while after nightfall, then more every so often,
  // up to however many tonight's moon allows (`creatures` in MOONS, night.js).
  if (!night) {
    hunt.nextAt = null;
  } else if (hunt.nextAt === null) {
    Object.assign(hunt, newHunt(), { nextAt: game.time + FIRST_CREATURE_SECONDS });
  } else if (game.time >= hunt.nextAt) {
    hunt.nextAt = game.time + between(CREATURE_EVERY);
    const out = game.creatures.filter((creature) => creature.state !== 'fade').length;
    if (out < sky.moon.creatures) comeOut(game, fears);
  }

  for (const creature of game.creatures) moveCreature(game, creature, dt, fears, night);
  keepApart(game, fears);
  game.creatures = game.creatures.filter((creature) => !creature.gone);
}

// A new one somewhere in the dark around you, on open ground, out of reach of any light.
function comeOut(game, fears) {
  const { world, player } = game;
  for (let tries = 0; tries < 20; tries++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = between(SPAWN_DISTANCE);
    const tx = Math.floor(player.x + Math.cos(angle) * distance);
    const ty = Math.floor(player.y + Math.sin(angle) * distance);
    if (!creatureCanStand(world, tx, ty) || inLight(fears, tx + 0.5, ty + 0.5, 1)) continue;
    const kind = 'shade';
    game.creatures.push({
      kind,
      x: tx + 0.5,
      y: ty + 0.5,
      hp: CREATURES[kind].hp,
      state: 'creep', // creep toward you, 'lunge' at you, 'run' away, or 'fade' at dawn
      timer: 0, // seconds left of a lunge or a run
      fade: 0, // how solid it is, from 0 (not there) to 1
      stride: 0, // distance walked, for its walking pictures
      side: Math.random() < 0.5 ? -1 : 1, // which way it paces round a light
      blink: Math.random() * 10, // so they don't all blink together
      hurtAt: -Infinity,
    });
    if (!game.hunt.seen) {
      game.hunt.seen = true;
      showMessage(game, 'Something is moving out there in the dark.');
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
  const light = lightAround(fears, creature.x, creature.y, FEAR_SHARE);
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
    if (creature.timer <= 0 || inLight(fears, creature.x + dx, creature.y + dy, FEAR_SHARE)) {
      // Missed, or the light's in the way: back off and try again.
      creature.state = 'run';
      creature.timer = between(BACK_OFF);
    } else {
      stepCreature(game, creature, dx, dy);
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
    const step = kind.speed * dt;
    const dx = way.x * step;
    const dy = way.y * step;
    // At the edge of a light it stops and paces back and forth instead.
    if (inLight(fears, creature.x + dx, creature.y + dy, FEAR_SHARE)) prowl(game, creature, dt, fears);
    else stepCreature(game, creature, dx, dy);
  }
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
  if (inLight(fears, creature.x + dx, creature.y + dy, FEAR_SHARE) || !stepCreature(game, creature, dx, dy)) {
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
  buzz(80);
  if (!game.hunt.bitten) {
    game.hunt.bitten = true;
    showMessage(game, 'Something bites you! Get to the light.');
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
    showMessage(game, `The ${kind.name.toLowerCase()} comes apart into smoke.`);
    return;
  }
  moveAway(game, creature, player.x, player.y, KNOCK_BACK);
  creature.state = 'run';
  creature.timer = RUN_SECONDS;
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
      if (!inLight(fears, one.x - dx * push, one.y - dy * push, FEAR_SHARE)) {
        stepCreature(game, one, -dx * push, -dy * push);
      }
      if (!inLight(fears, two.x + dx * push, two.y + dy * push, FEAR_SHARE)) {
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

// Every light they keep away from: the campfires and candles noted by mapSteps(), and your torch.
function lightsToFear(game) {
  const reach = torchReach(game.survivor);
  if (reach <= 0) return field.lights;
  return [...field.lights, { x: game.player.x, y: game.player.y, reach }];
}

// The light whose `share` of its reach covers (x, y), or null if none does.
function lightAround(lights, x, y, share) {
  for (const light of lights) {
    if (Math.hypot(x - light.x, y - light.y) < light.reach * share) return light;
  }
  return null;
}

function inLight(lights, x, y, share) {
  return lightAround(lights, x, y, share) !== null;
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
