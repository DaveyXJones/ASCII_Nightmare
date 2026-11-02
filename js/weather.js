// Weather. Now and then clouds roll in over the island: their shadows drift across the ground, then
// the whole sky turns grey and it rains. The heaviest rain brings thunder and lightning, and at
// night a flash of lightning shows, for a moment, whatever is out there in the dark.
//
// Like the moon, the weather is worked out from the clock and the world's seed (weatherAt), so it's
// never saved: the same world always has the same weather at the same time. skyAt() in night.js
// folds it into how dark it is, render.js draws the clouds and the rain, and sound.js plays it.
//
// What rain does (updateWeather): campfires out in the open slowly go out (`doused` in OBJECTS),
// unless you've built a roof over them, and a lit torch burns down faster outdoors.

const WEATHER_SECONDS = 240; // about how long a spell of weather lasts, in seconds
// The weather drifts between 0 (clear) and 1 (a storm) as smooth noise over time. These say where
// along that clouds start to come over, cover the sky, and where the rain starts and pours.
const CLOUDS_FROM = 0.56;
const OVERCAST_AT = 0.645;
const RAIN_FROM = 0.63;
const POURING_AT = 0.73;
const STORM_FROM = 0.85; // rain heavier than this (from 0 to 1) comes with thunder and lightning
const DRY_SECONDS = DAY_SECONDS; // a new world's first day stays dry, while you find your feet

const OVERCAST_DIM = 0.34; // how much of the picture a grey sky hides by day, like darkness at night
const OVERCAST_COLOR = [44, 52, 64]; // the grey of a rainy day: red, green and blue, 0 to 255
const CLOUD_HIDES_MOON = 0.85; // how much of the moonlight a sky full of cloud blocks, from 0 to 1
const CLOUD_DRIFT = 0.9; // how fast cloud shadows drift across the island, in tiles per second

const DOUSE_SECONDS = 30; // seconds of pouring rain it takes to put out a campfire with no roof
const DOUSE_FROM = 0.25; // rain lighter than this doesn't put fires out
const DRY_RATE = 0.5; // a fire that's been rained on dries this many seconds' worth each second
const SPUTTER_AT = 0.4; // share of DOUSE_SECONDS after which the game warns you that a fire is in trouble
const FIRE_NEWS_REACH = 24; // you only hear about fires going out within this many tiles of you
const TORCH_RAIN_BURN = 1; // in pouring rain a torch outdoors burns this much faster again (1: twice as fast)
const LIGHTNING_EVERY = 14; // seconds between flashes in the heaviest storm, on average
const THUNDER_DELAY = [0.4, 3]; // seconds from a flash to its thunder, picked at random in this range

// What the weather is doing `clock` seconds after the world's first morning. Returns
//   cloud  how much of the sky is covered, from 0 (clear) to 1 (grey all over)
//   rain   how hard it's raining, from 0 (dry) to 1 (pouring)
//   storm  how stormy, from 0 to 1: thunder and lightning
//   wind   which way the weather blows across the screen: -1 (to the left) or 1 (to the right)
function weatherAt(clock, seed) {
  const settled = clamp01((clock - DRY_SECONDS) / WEATHER_SECONDS); // eases in after the first day
  const w = fractalNoise(clock / WEATHER_SECONDS, 0.5, seed + 2741, 2);
  const rain = smoothstep(clamp01((w - RAIN_FROM) / (POURING_AT - RAIN_FROM))) * settled;
  return {
    cloud: smoothstep(clamp01((w - CLOUDS_FROM) / (OVERCAST_AT - CLOUDS_FROM))) * settled,
    rain,
    storm: clamp01((rain - STORM_FROM) / (1 - STORM_FROM)),
    wind: hash2(seed, 77, 13) < 0.5 ? -1 : 1,
  };
}

// The weather's moment-to-moment state: lightning, thunder on its way, and which messages have
// shown. Not saved; it starts afresh each life.
function newWeather() {
  return {
    flashAt: -Infinity, // when lightning last flashed, in seconds of play
    thunder: null, // thunder on its way: { at, volume }
    nextCheck: 0, // when the fires are next checked for rain
    raining: false, // whether it was raining last time, to say when it starts and stops
    told: {}, // the once-a-life messages that have been shown
  };
}

// Rain and storms doing their work, called every update.
function updateWeather(game, dt) {
  const { sky, survivor, player, world } = game;
  const weather = game.weather;
  const { rain, storm } = sky.weather;
  const indoors = insideHouse(world, Math.floor(player.x), Math.floor(player.y));

  // Say when the rain starts and stops. A little either way, so a shower at the edge doesn't
  // keep saying it.
  if (!weather.raining && rain > 0.15) {
    weather.raining = true;
    const hint = weather.told.rain ? '' : ' Campfires without a roof will go out.';
    weather.told.rain = true;
    showMessage(game, `It starts to rain.${hint}`);
  } else if (weather.raining && rain < 0.03) {
    weather.raining = false;
    showMessage(game, 'The rain stops.');
  }

  // Rain on a lit torch outdoors: it hisses and burns down faster (on top of its usual burning).
  if (survivor.torchLeft > 0 && !indoors && rain > DOUSE_FROM) {
    survivor.torchLeft = Math.max(0.01, survivor.torchLeft - rain * TORCH_RAIN_BURN * dt);
    if (!weather.told.torch) {
      weather.told.torch = true;
      showMessage(game, 'The rain hisses on your torch. It burns down faster out here.');
    }
  }

  // Lightning: at random, more often the stormier it is. Its thunder follows a moment later.
  if (storm > 0 && Math.random() < (storm * dt) / LIGHTNING_EVERY) {
    weather.flashAt = game.time;
    const delay = between(THUNDER_DELAY);
    weather.thunder = { at: game.time + delay, volume: 1 - (delay / THUNDER_DELAY[1]) * 0.6 };
  }
  if (weather.thunder && game.time >= weather.thunder.at) {
    playSound('thunder', { volume: weather.thunder.volume, pan: Math.random() - 0.5 });
    weather.thunder = null;
    if (!weather.told.storm) {
      weather.told.storm = true;
      showMessage(game, 'Thunder rolls across the island.');
    }
  }

  // Once a second, the rain soaks every campfire out in the open, and ones it's been off dry out.
  if (game.time < weather.nextCheck) return;
  weather.nextCheck = game.time + 1;
  soakFires(game, rain >= DOUSE_FROM ? rain : 0);
}

// Each fire with somewhere to go when it's rained out (`doused` in OBJECTS) soaks up `rain` seconds'
// worth of rain; once it's had DOUSE_SECONDS, it goes out. Out of the rain, they dry off again.
function soakFires(game, rain) {
  const { world, player, fx } = game;
  for (let i = 0; i < world.objects.length; i++) {
    const key = world.objects[i];
    const object = key && OBJECTS[key];
    if (!object || !object.doused) continue;
    const before = world.soaked.get(i) || 0;
    const soaked = rain > 0 ? before + rain : before - DRY_RATE;
    if (soaked <= 0) {
      world.soaked.delete(i);
      continue;
    }
    const x = i % world.width;
    const y = (i - x) / world.width;
    const near = Math.hypot(x + 0.5 - player.x, y + 0.5 - player.y) < FIRE_NEWS_REACH;
    if (soaked < DOUSE_SECONDS) {
      world.soaked.set(i, soaked);
      if (near && rain > 0) burst(fx, x + 0.5, y + 0.2, 'steam', 2); // it steams as the rain hits it
      if (near && rain > 0 && before < DOUSE_SECONDS * SPUTTER_AT && soaked >= DOUSE_SECONDS * SPUTTER_AT) {
        const name = object.name.toLowerCase();
        showMessage(game, `The rain hisses on your ${name}. It won't last long without a roof.`);
      }
      continue;
    }
    if (!worldIsMine()) continue; // on a shared island, one phone says when a fire's gone out
    setObject(world, x, y, object.doused);
    if (near) {
      burst(fx, x + 0.5, y + 0.2, 'steam', 10);
      playSoundAt(game, 'snuff', x + 0.5, y + 0.5);
      showMessage(game, `The rain puts out your ${object.name.toLowerCase()}.`);
    }
  }
}

// True if it's raining on (tx, ty) hard enough to keep a fire from lighting: out in the rain, not
// under the cottage roof.
function tooWetToLight(game, tx, ty) {
  return game.sky.weather.rain >= DOUSE_FROM && !insideHouse(game.world, tx, ty);
}

// Lighting a fire that's gone out (an object with `relight` in OBJECTS), with a little fresh wood.
function relightFire(game, target) {
  const { survivor, world, fx } = game;
  const object = target.object;
  const { cost, into } = object.relight;
  if (tooWetToLight(game, target.x, target.y)) {
    showMessage(game, 'Too wet to light. Wait for the rain to stop, or build a roof over it.');
    return;
  }
  if (!canAfford(survivor.pack, cost)) {
    showMessage(game, `You need ${shortfall(survivor.pack, cost)} to light it.`);
    return;
  }
  spend(survivor.pack, cost);
  setObject(world, target.x, target.y, into);
  burst(fx, target.x + 0.5, target.y + 0.5, 'spark', 10);
  playSound('ignite');
  floatText(fx, target.x + 0.5, target.y - 1, 'lit', '#ffb347');
  buzz(30);
}

// How bright lightning is lighting the island right now, from 0 to 1: a quick double flash that
// fades. None with motion turned down, since flashing can be hard to look at.
function lightningAt(game) {
  if (reducedMotion.matches) return 0;
  const since = game.time - game.weather.flashAt;
  if (since < 0 || since > 0.6) return 0;
  if (since < 0.07) return 1;
  if (since < 0.15) return 0.25;
  if (since < 0.22) return 0.85;
  return 0.85 * (1 - (since - 0.22) / 0.38);
}
