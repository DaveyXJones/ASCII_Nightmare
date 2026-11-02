// The lighthouse. It stands dark on its point with the door rusted shut, and the notes round the
// island say it was the last thing keeping the things in the dark honest. You can light it again.
//
// Pry the door open and pour lamp oil into the tank at the foot of the stairs, then hold the button
// on the old pump to send it up the pipe to the lamp. The first time, what the keeper wrote about
// comes down the stairs while you pump, even by day, until the lamp catches and burns them away.
//
// Lit, it needs keeping. It burns about one oil a night, and goes dark again when the tank runs dry.
// While it burns, two beams sweep round the island at night and anything they catch runs; nothing
// comes near the tower itself; and fewer things come out anywhere (`lit` in CREATURES).
//
// Which state it's in is its objects on the map (TOWER_KEYS), saved like any other change. What's in
// the tank, and whether it's ever been lit, are in world.tower (made in placeLighthouse, places.js).

const OIL_BURNS = 720; // seconds of dark one oil burns for: about a night
const TANK_HOLDS = 5; // how much oil the tank holds
const FIRST_OIL = 3; // how much it wants in the tank before the lamp will catch for the first time
const PRY_HITS = 6; // swings to force the rusted door
const PUMPS_FIRST = 30; // strokes of the pump to light it the first time: about 13 seconds, held down
const PUMPS_AGAIN = 4; // ...and to light it again once it's gone out (the pipe's clear by then)
const TOWER_LOW = 1.2; // with less oil than this in the tank at nightfall, the game warns you

// What comes down the stairs the first time you pump.
const STAIRS_ORDER = ['shade', 'shade', 'brute', 'shade']; // in this order, and shades after that
const STAIRS_FIRST = 1.5; // seconds after the first stroke before the first one comes
const STAIRS_EVERY = 2.5; // seconds between one and the next
const STAIRS_MOST = 4; // no more than this many out at once
const STAIRS_SPAWN = [2.5, 6]; // how far from the door, in tiles, each one comes out
const STAIRS_LEAVE = 16; // get this many tiles from the door, and the stairs go quiet
const STAIRS_PATIENCE = 20; // ...or stop pumping for this many seconds

// What it does once it's lit.
const TOWER_REACH = 40; // nothing comes within `fear.fire` (80%) of this many tiles of the tower
const TOWER_LAMP_ROWS = 7.5; // how high the lamp is, in rows above the tower's foot
const TOWER_LAMP_GLOW = 5; // how far, in tiles, the light spills round the lamp
const TOWER_FOOT_GLOW = 9; // ...and round the foot of the tower
const BEAM_TURN_SECONDS = 24; // one whole turn. There are two beams, so one comes by every 12 seconds
const BEAM_SPREAD = 0.07; // how wide a beam is either side of its middle: an angle, in radians
const BEAM_REACH = 400; // how far, in tiles, a beam reaches before it's faded out
const BEAM_SCARES = 150; // anything a beam catches within this many tiles runs from it
const BEAM_STILL_AT = 1; // with motion turned down the beams hold still at this angle, in radians

// Which objects stand on the tower's two tiles in each state (see OBJECTS).
const TOWER_KEYS = {
  shut: ['lighthouseLeft', 'lighthouseRight'],
  dark: ['lighthouseOpenLeft', 'lighthouseOpenRight'],
  lit: ['lighthouseLitLeft', 'lighthouseLitRight'],
};

// Tells everyone on a shared island what's in the tank (see together.js).
function tellTank(tower) {
  tellIsland('t', { oil: tower.oil, kindled: tower.kindled });
}

// What's said as the oil climbs the pipe the first time, once this share of the strokes are done.
const PUMP_NEWS = [
  [0.3, 'Oil is climbing the pipe. Don\'t stop.'],
  [0.6, 'More than halfway up the tower.'],
  [0.85, 'Nearly there!'],
];

// What you find when the lamp catches for the first time.
const TOWER_NOTE = {
  title: 'The lamp catches',
  text: 'High above you the old lamp coughs, catches, and throws a white road out across the water. ' +
    'Whatever was on the stairs is gone. Just inside the door hangs a coat, with a page in its pocket, ' +
    'in the keeper\'s hand: "I had to come down. Keep it lit, whoever you are."',
};

// ---- What state it's in ----

function setTower(world, how) {
  const { x, y } = world.tower;
  setObject(world, x, y, TOWER_KEYS[how][0]);
  setObject(world, x + 1, y, TOWER_KEYS[how][1]);
}

function towerBurning(world) {
  const { tower } = world;
  return Boolean(tower) && world.objects[tower.y * world.width + tower.x] === TOWER_KEYS.lit[0];
}

// How much oil the tank needs before the pump will light the lamp.
function oilToLight(tower) {
  return tower.kindled ? 1 : FIRST_OIL;
}

function nightsOfOil(tower) {
  const nights = Math.max(1, Math.round(tower.oil));
  return nights === 1 ? 'about one night' : `about ${nights} nights`;
}

// ---- The action button ----

// What the action button does at the tower, for findTarget (survival.js). `object` is the half you're
// facing; either half does the same, and the brackets go round the foot of both.
function towerTarget(world, survivor, object) {
  const { tower } = world;
  let label = 'Look';
  if (object.tower === 'shut') label = 'Pry open';
  else if (survivor.pack.oil > 0 && tower.oil <= TANK_HOLDS - 1) label = 'Fill';
  else if (object.tower === 'dark' && tower.oil >= oilToLight(tower)) label = 'Pump';
  return { x: tower.x, y: tower.y, w: 2, label, object, tower: true };
}

// One press (or one swing of a held button) of the action button at the tower.
function useTower(game, target) {
  const { world } = game;
  const { tower } = world;
  if (target.label === 'Fill') {
    pourOil(game);
    return;
  }
  if (target.label === 'Look') {
    showMessage(game, towerWords(tower, target.object));
    return;
  }
  // Prying and pumping take a while, and stay done if you're driven off (world.damage is saved).
  const prying = target.label === 'Pry open';
  const hits = prying ? PRY_HITS : tower.kindled ? PUMPS_AGAIN : PUMPS_FIRST;
  const index = tower.y * world.width + tower.x;
  const strokes = (world.damage.get(index) || 0) + 1;
  buzz(12);
  if (strokes < hits) {
    world.damage.set(index, strokes);
    if (prying) prySwing(game);
    else pumpStroke(game, strokes, hits);
  } else if (prying) {
    forceDoor(game);
  } else {
    kindle(game);
  }
}

// What Look says: how the tank stands.
function towerWords(tower, object) {
  if (object.tower === 'lit') {
    const full = tower.oil > TANK_HOLDS - 1 ? 'The tank is nearly full.' : `Oil for ${nightsOfOil(tower)} in the tank.`;
    return `The light turns slowly, far above you. ${full}`;
  }
  const wants = oilToLight(tower) - Math.floor(tower.oil);
  return `The lamp is dry. The tank wants ${wants} more oil. Look for cans, or boil fish down at a fire.`;
}

function prySwing(game) {
  const { tower } = game.world;
  burst(game.fx, tower.x + 1, tower.y + 0.5, 'stone', 4);
  playSound('mine');
}

function forceDoor(game) {
  const { world, fx } = game;
  const { tower } = world;
  setTower(world, 'dark');
  burst(fx, tower.x + 1, tower.y + 0.5, 'stone', 12);
  playSound('crash');
  buzz(60);
  showMessage(game, 'The door gives with a shriek of rust. Stairs wind up into the dark. Something on them shifts.');
  saveGame(game);
}

// Pours what you carry into the tank at the foot of the stairs, as much as it'll take. Once it's in
// there it's safe: you lose what's in your pack if you die, but not what's in the tank.
function pourOil(game) {
  const { world, survivor, fx, player } = game;
  const { tower } = world;
  const poured = Math.min(survivor.pack.oil, Math.floor(TANK_HOLDS - tower.oil));
  survivor.pack.oil -= poured;
  tower.oil += poured;
  tellTank(tower);
  burst(fx, tower.x + 1, tower.y + 0.5, 'water', 6);
  playSound('pour');
  floatText(fx, player.x, player.y - 3, `-${poured} ${ITEMS.oil.name}`, ITEMS.oil.color);
  buzz(15);
  if (towerBurning(world)) {
    showMessage(game, `The tank takes it. Oil for ${nightsOfOil(tower)} now.`);
  } else if (tower.oil < oilToLight(tower)) {
    showMessage(game, `The tank takes it. It wants ${oilToLight(tower) - Math.floor(tower.oil)} more before the lamp will catch.`);
  } else {
    showMessage(game, 'The tank takes it. Now hold the button on the old pump, to send it up to the lamp.');
  }
  saveGame(game);
}

// One stroke of the pump: oil climbs the tower, and the first time, the stairs wake up.
function pumpStroke(game, strokes, hits) {
  const { fx } = game;
  const { tower } = game.world;
  const climbed = strokes / hits;
  burst(fx, tower.x + 1, tower.y - TOWER_LAMP_ROWS * climbed, 'spark', 3);
  playSound('creak');
  if (tower.kindled) return;
  if (!game.stairs) {
    game.stairs = { nextAt: game.time + STAIRS_FIRST, sent: 0, pumpedAt: game.time };
    showMessage(game, 'Hold the button to keep pumping. Something on the stairs has started down.');
    return;
  }
  game.stairs.pumpedAt = game.time;
  const news = PUMP_NEWS.find(([share]) => (strokes - 1) / hits < share && climbed >= share);
  if (news) showMessage(game, news[1]);
}

// The oil reaches the lamp, and it catches. Whatever's near is burnt away.
function kindle(game) {
  const { world, fx, player } = game;
  const { tower } = world;
  const first = !tower.kindled;
  tower.kindled = true;
  tellTank(tower);
  setTower(world, 'lit');
  game.stairs = null;
  for (const creature of game.creatures) {
    if (Math.hypot(creature.x - player.x, creature.y - player.y) > TOWER_REACH) continue;
    creature.gone = true;
    burst(fx, creature.x, creature.y - 1, 'shadow', 14);
  }
  burst(fx, tower.x + 1, tower.y - TOWER_LAMP_ROWS, 'spark', 24);
  playSound('ignite');
  playSound('foghorn');
  buzz(200);
  saveGame(game);
  const left = `It will burn for ${nightsOfOil(tower)} on what's in the tank.`;
  if (first) openNote(game, TOWER_NOTE, `${left} Feed it with cans of oil, or fish boiled down at a fire.`);
  else showMessage(game, `The light comes back on. ${left}`);
}

// ---- As time goes by ----

// Every moment: what's on the stairs keeps coming, and a lit lamp burns its oil in the dark (by day
// it's turned down, like a lamp on a post) until the tank runs dry.
function updateTower(game, dt) {
  const { world, sky } = game;
  const { tower } = world;
  if (!tower) return;
  if (game.stairs) updateStairs(game);
  if (!towerBurning(world) || sky.darkness < LAMP_BURNS_DARKER) return;
  tower.oil = Math.max(0, tower.oil - dt / OIL_BURNS);
  if (tower.oil > 0 || !worldIsMine()) return; // on a shared island, one phone says when it's run dry
  setTower(world, 'dark');
  showMessage(game, 'Far off, the light on the point gutters and goes out. They will be bolder now.');
  playSound('foghorn', { volume: 0.2 });
}

function updateStairs(game) {
  const { world, player, stairs } = game;
  const { tower } = world;
  const away = Math.hypot(player.x - (tower.x + 1), player.y - (tower.y + 1));
  // Somebody else got the lamp lit, on a shared island, or you've left it alone. What came down is
  // just part of the dark now (by day, it melts away).
  const lit = towerBurning(world);
  if (lit || away > STAIRS_LEAVE || game.time - stairs.pumpedAt > STAIRS_PATIENCE) {
    for (const creature of game.creatures) creature.stairs = false;
    game.stairs = null;
    if (!lit) showMessage(game, 'The stairs go quiet. For now.');
    return;
  }
  if (game.time < stairs.nextAt) return;
  stairs.nextAt = game.time + STAIRS_EVERY;
  if (game.creatures.filter((creature) => creature.stairs).length >= STAIRS_MOST) return;
  if (stairsComeOut(game, STAIRS_ORDER[stairs.sent] || 'shade')) stairs.sent++;
}

// One comes out of the door, in a puff of smoke, and makes for you. Daylight won't send this one off.
// It picks from every spot round the door it could stand on, since the tower may be out on a thin
// spit of sand. Returns false if there's none.
function stairsComeOut(game, kind) {
  const { world, fx } = game;
  const doorX = world.tower.x + 1;
  const doorY = world.tower.y + 1;
  const [near, far] = STAIRS_SPAWN;
  const spots = [];
  for (let y = Math.floor(doorY - far); y <= doorY + far; y++) {
    for (let x = Math.floor(doorX - far); x <= doorX + far; x++) {
      const away = Math.hypot(x + 0.5 - doorX, y + 0.5 - doorY);
      if (away >= near && away <= far && creatureFits(world, x + 0.5, y + 0.5)) spots.push([x + 0.5, y + 0.5]);
    }
  }
  if (spots.length === 0) return false;
  const [x, y] = spots[Math.floor(Math.random() * spots.length)];
  burst(fx, doorX, doorY, 'shadow', 10);
  addCreature(game, kind, x, y).stairs = true;
  return true;
}

// What the game adds to its words at nightfall while the light's burning.
function towerNews(world) {
  if (!towerBurning(world)) return '';
  if (world.tower.oil < TOWER_LOW) return ' The light on the point is low on oil.';
  return ' The light on the point comes on.';
}

// The horn at nightfall, carrying across the island while the light's burning.
function towerAtNightfall(game) {
  if (towerBurning(game.world)) playSound('foghorn', { volume: 0.25 });
}

// ---- The light ----

// The tower as a light that things in the dark keep away from, or null while it's dark. Made once
// for each island and kept, since this is asked every moment.
function towerLight(world) {
  if (!towerBurning(world)) return null;
  const { tower } = world;
  tower.light = tower.light || { x: tower.x + 1, y: tower.y + 0.5, reach: TOWER_REACH };
  return tower.light;
}

// Where the beams point: an angle in radians, in tiles on the ground. The other beam's opposite it.
function beamAngle(game) {
  if (reducedMotion.matches) return BEAM_STILL_AT;
  return ((game.dayClock / BEAM_TURN_SECONDS) * Math.PI * 2) % (Math.PI * 2);
}

// Whether a beam is sweeping over (x, y) right now. Returns the tower's light to run from, or null.
// Only in the dark: by day there's nothing to see, and nothing out to catch.
function beamCatches(game, x, y) {
  const light = towerLight(game.world);
  if (!light || game.sky.darkness < LAMP_BURNS_DARKER) return null;
  const dx = x - light.x;
  const dy = y - light.y;
  if (Math.hypot(dx, dy) > BEAM_SCARES) return null;
  const off = (Math.atan2(dy, dx) - beamAngle(game) + Math.PI * 4) % Math.PI; // two beams, half a turn apart
  return Math.min(off, Math.PI - off) < BEAM_SPREAD ? light : null;
}
