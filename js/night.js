// Day and night. The sun is up for eight minutes, goes down, and then night falls for ten. How dark
// the night gets is up to the moon: its shape changes from one night to the next (a full moon
// lights up the island; with no moon you can hardly see your own feet), it climbs the sky and sinks
// again over the night, and now and then a cloud drifts across it.
//
// This file works out how dark it is and what color the dark is, with the weather (weather.js)
// laid over it. render.js draws it over the map, with holes where there's light: your torch,
// campfires, the candle in the cottage.

const DAY_SECONDS = 480; // full daylight: eight minutes
const DUSK_SECONDS = 60; // the sun going down
const NIGHT_SECONDS = 600; // the night itself: ten minutes
const DAWN_SECONDS = 60; // the sky growing light again
const CYCLE_SECONDS = DAY_SECONDS + DUSK_SECONDS + NIGHT_SECONDS + DAWN_SECONDS;

const DARKEST = 0.94; // how much of the picture a moonless night hides, from 0 (none of it) to 1 (all)
const MOONLIT = 0.6; // the same, under a clear full moon high in the sky
const MOON_LOW = 0.3; // the moon's light just after it rises and before it sets, compared to midnight
const CLOUD_SECONDS = 45; // about how long, in seconds, a cloud takes to drift past the moon
const CLOUD_SHADE = 0.8; // how much of the moonlight a thick cloud blocks, from 0 to 1

// The color of the dark: nearly black with no moon, blue by moonlight, and warmer while the sun goes
// down and comes up. Red, green and blue, each from 0 to 255.
const DARK_COLOR = [3, 5, 12];
const MOONLIGHT_COLOR = [18, 30, 66];
const SUNSET_COLOR = [110, 44, 22];
const SUNRISE_COLOR = [100, 62, 76];

// The moon's shape, one per night, in the order they come round. The first night has a half moon.
//   glyph      how it looks next to the health bars
//   light      how bright it is, from 0 (no moon) to 1 (full)
//   creatures  how many of each kind of thing can be out in the dark at once that night (see
//              CREATURES in creatures.js). Brutes only come on the darkest nights.
//   rises      what the game says as night falls
const MOONS = [
  {
    name: 'Half moon',
    glyph: '◐',
    light: 0.5,
    creatures: { shade: 2 },
    rises: 'A half moon rises.',
  },
  {
    name: 'Thin moon',
    glyph: '☾',
    light: 0.25,
    creatures: { shade: 3 },
    rises: 'A thin sliver of moon tonight.',
  },
  {
    name: 'No moon',
    glyph: '○',
    light: 0,
    creatures: { shade: 3, brute: 1 },
    rises: 'No moon tonight. Stay near the fire.',
  },
  {
    name: 'Thin moon',
    glyph: '☽',
    light: 0.25,
    creatures: { shade: 3, brute: 1 },
    rises: 'A thin new moon hangs low.',
  },
  {
    name: 'Half moon',
    glyph: '◑',
    light: 0.5,
    creatures: { shade: 2 },
    rises: 'A half moon rises.',
  },
  {
    name: 'Bright moon',
    glyph: '◕',
    light: 0.75,
    creatures: { shade: 2 },
    rises: 'A bright moon rises.',
  },
  {
    name: 'Full moon',
    glyph: '●',
    light: 1,
    creatures: { shade: 1 },
    rises: 'A full moon lights up the island.',
  },
  {
    name: 'Bright moon',
    glyph: '◕',
    light: 0.75,
    creatures: { shade: 2 },
    rises: 'A bright moon rises.',
  },
];

// What the sky is doing `clock` seconds after the first morning. Returns
//   phase     'day', 'dusk', 'night' or 'dawn'
//   moon      tonight's moon, from MOONS (by day, the one that will rise tonight)
//   darkness  how much of the picture the dark hides: 0 by day, up to DARKEST
//   color     the color of the dark, for the canvas
//   left      how much of the daylight is still to come (by day and at dusk), or of the night (at
//             night and dawn), from 1 down to 0
//   weather   what the weather is doing, from weatherAt() in weather.js
//   gloom     how much of `darkness` is the night's, leaving out the grey of a cloudy sky
function skyAt(clock, seed) {
  const weather = weatherAt(clock, seed);
  const sky = sunAndMoonAt(clock, seed, weather.cloud);
  // Cloud turns the light grey, by day as well as by night: a grey veil laid over the dark.
  const grey = weather.cloud * OVERCAST_DIM;
  const darkness = 1 - (1 - sky.darkness) * (1 - grey);
  const share = darkness > 0 ? ((1 - sky.darkness) * grey) / darkness : 0; // how much of it is the grey
  return {
    ...sky,
    darkness,
    gloom: sky.darkness,
    color: rgb(mixColor(sky.color, OVERCAST_COLOR, share)),
    weather,
  };
}

// The sky with clear weather: the sun, the moon, and the night's own clouds over the moon. `cloud`
// is the weather's cloud cover, which hides the moon too.
function sunAndMoonAt(clock, seed, cloud) {
  const night = Math.floor(clock / CYCLE_SECONDS); // counts up by one every morning
  const moon = MOONS[night % MOONS.length];
  const t = clock - night * CYCLE_SECONDS; // seconds since this morning
  const daylight = DAY_SECONDS + DUSK_SECONDS;

  if (t < DAY_SECONDS) {
    return { phase: 'day', moon, darkness: 0, color: DARK_COLOR, left: 1 - t / daylight };
  }
  if (t < daylight) {
    // The sun going down: the dark creeps in, red at first, turning into tonight's sky.
    const fall = smoothstep((t - DAY_SECONDS) / DUSK_SECONDS);
    const dark = nightAt(moon, 0, night, seed, cloud);
    return {
      phase: 'dusk',
      moon,
      darkness: dark.darkness * fall,
      color: mixColor(SUNSET_COLOR, dark.color, fall),
      left: 1 - t / daylight,
    };
  }
  const left = (CYCLE_SECONDS - t) / (NIGHT_SECONDS + DAWN_SECONDS);
  if (t < daylight + NIGHT_SECONDS) {
    const dark = nightAt(moon, t - daylight, night, seed, cloud);
    return { phase: 'night', moon, darkness: dark.darkness, color: dark.color, left };
  }
  // Dawn: the night as it was at its end, fading out through a pink sunrise.
  const rise = smoothstep((t - daylight - NIGHT_SECONDS) / DAWN_SECONDS);
  const dark = nightAt(moon, NIGHT_SECONDS, night, seed, cloud);
  return {
    phase: 'dawn',
    moon,
    darkness: dark.darkness * (1 - rise),
    color: mixColor(dark.color, SUNRISE_COLOR, rise),
    left,
  };
}

// How dark it is `t` seconds into a night, and the color of the dark.
function nightAt(moon, t, night, seed, cloud) {
  const light = moonlightAt(moon, t, night, seed) * (1 - CLOUD_HIDES_MOON * cloud);
  return {
    darkness: DARKEST - (DARKEST - MOONLIT) * light,
    color: mixColor(DARK_COLOR, MOONLIGHT_COLOR, light),
  };
}

// How much moonlight there is `t` seconds into a night: from 0 (none) to 1 (a full moon in a clear
// sky at midnight). Rain clouds (see weather.js) come on top of this.
function moonlightAt(moon, t, night, seed) {
  // The moon rises as night falls and sets at dawn, so it gives the most light at midnight.
  const height = MOON_LOW + (1 - MOON_LOW) * Math.sin((Math.PI * t) / NIGHT_SECONDS);
  // Wisps of cloud come and go: smooth noise along the night, different every night and in every world.
  const cloud = clamp01((fractalNoise(t / CLOUD_SECONDS, night * 17, seed + 4919, 2) - 0.45) / 0.25);
  return moon.light * height * (1 - CLOUD_SHADE * cloud);
}

// The start of the next morning, or `clock` itself if it's the very start of one. You wake up then.
function nextMorning(clock) {
  return Math.ceil(clock / CYCLE_SECONDS) * CYCLE_SECONDS;
}

// What the game says as the sky changes.
function skyMessage(game, sky) {
  const survivor = game.survivor;
  if (sky.phase === 'dusk') {
    if (!survivor.tools.torch) return 'The sun is going down. Make a torch from wood and cloth before dark.';
    if (survivor.torchLeft <= 0) return 'The sun is going down. Light your torch at a campfire.';
    return 'The sun is going down.';
  }
  if (sky.phase === 'night') return `Night falls. ${sky.moon.rises}`;
  if (sky.phase === 'dawn') return 'The sky begins to grow light.';
  return 'Morning. You made it through the night.';
}

function mixColor(a, b, t) {
  return a.map((value, n) => Math.round(value + (b[n] - value) * t));
}

function rgb(color) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}
