// Sound. Every noise in the game is made on the spot by the browser (Web Audio), out of hiss and
// simple tones, so there are no sound files to load and it works opened straight from disk.
//
// One-off sounds (a chop, a bite) are described in SOUNDS and played with playSound(). The sounds
// of the place you're in (wind, rain, birds by day, crickets at night, a campfire crackling) follow
// what's around you, in updateSound(), every frame.
//
// Browsers only let a page make sound after you've touched or clicked it, so nothing plays until
// the first tap (the Wake up button, usually).

const SOUND_VOLUME = 0.8; // everything at once, from 0 (silent) to 1
const SOUND_KEY = 'ascii-nightmare-sound'; // where the Sound on/off choice is kept (see save.js)
const WIND_DAY = 0.12; // how loud the wind is by day, and on the darkest night
const WIND_NIGHT = 0.32;
const WIND_INDOORS = 0.35; // indoors, the wind is this much as loud
const CRICKET_EVERY = [0.3, 1.2]; // seconds between cricket chirps at night, picked at random in this range
const SHOT_HUSH = 25; // seconds the crickets stay quiet after a gunshot
const CRICKET_HUSH = [4, 14]; // crickets fall silent when something from the dark is this close, in
// tiles (all of them at the first number, none at the second)
const BIRD_EVERY = [4, 11]; // seconds between birdsong by day
const CRACKLE_REACH = 8; // how far, in tiles, you can hear a campfire crackle
const HEAR_REACH = 30; // how far, in tiles, you can hear things out in the dark
const RAIN_LOUDNESS = 0.3; // the hiss of pouring rain
const RAIN_INDOORS = 0.5; // indoors, the rain on the roof is this much as loud, and duller
const PATTER_PER_SECOND = 30; // drops you hear land close by each second in pouring rain
const STORM_WIND = 1.2; // in a storm the wind is this much louder again
const QUIET_IN_RAIN = 0.3; // rain heavier than this (0 to 1) quietens the crickets and birds

// The one-off sounds. Each is made of up to two parts played together:
//   noise   a burst of hiss through a filter: { seconds, filter, hz, q, to }. The filter is
//           'lowpass' (keeps the low part: thuds, rumbles), 'highpass' (keeps the high part:
//           rustles, hisses) or 'bandpass' (keeps around `hz`: knocks, scrapes); `q` is how narrow
//           (higher rings more), and `to` sweeps the filter to another pitch as it plays.
//   tone    a note: { seconds, wave, hz, to }. The wave is 'sine' (pure), 'triangle' (soft),
//           'square' (hollow) or 'sawtooth' (buzzy); `to` slides the pitch as it plays.
//   volume  how loud, next to the others. Hiss through a narrow filter comes out much quieter than a
//           tone, so those need bigger numbers.
//   vary    how much the pitch changes at random each time (0.1 is up to 10% either way), so the
//           same sound over and over doesn't sound like a machine
const SOUNDS = {
  chop: {
    volume: 1.8,
    vary: 0.08,
    noise: { seconds: 0.09, filter: 'bandpass', hz: 750, q: 2 },
    tone: { seconds: 0.08, wave: 'triangle', hz: 190, to: 90 },
  },
  fell: {
    volume: 1.3,
    noise: { seconds: 0.6, filter: 'lowpass', hz: 1200, to: 120 },
    tone: { seconds: 0.4, wave: 'sine', hz: 95, to: 40 },
  },
  mine: {
    volume: 1.35,
    vary: 0.1,
    noise: { seconds: 0.05, filter: 'bandpass', hz: 2600, q: 5 },
    tone: { seconds: 0.14, wave: 'triangle', hz: 1250, to: 1180 },
  },
  crumble: { volume: 2.2, noise: { seconds: 0.45, filter: 'bandpass', hz: 1600, q: 0.8, to: 300 } },
  pick: { volume: 0.8, vary: 0.15, noise: { seconds: 0.14, filter: 'highpass', hz: 2600, to: 4000 } },
  drink: { volume: 1.05, vary: 0.12, tone: { seconds: 0.13, wave: 'sine', hz: 320, to: 760 } },
  eat: { volume: 2.9, vary: 0.15, noise: { seconds: 0.08, filter: 'bandpass', hz: 1900, q: 1.5 } },
  build: {
    volume: 1.45,
    noise: { seconds: 0.08, filter: 'lowpass', hz: 700 },
    tone: { seconds: 0.12, wave: 'triangle', hz: 150, to: 70 },
  },
  // The spade biting into earth: a gritty scrape falling away, with a dull thud under it.
  dig: {
    volume: 1.6,
    vary: 0.12,
    noise: { seconds: 0.18, filter: 'bandpass', hz: 650, q: 1, to: 260 },
    tone: { seconds: 0.1, wave: 'triangle', hz: 110, to: 60 },
  },
  // An old cupboard door swinging open on rusty hinges (places.js): a buzzy note sliding down, with a
  // scrape of wood under it.
  creak: {
    volume: 1,
    vary: 0.12,
    noise: { seconds: 0.45, filter: 'bandpass', hz: 900, q: 3, to: 600 },
    tone: { seconds: 0.45, wave: 'sawtooth', hz: 210, to: 150 },
  },
  cast: { volume: 1.9, noise: { seconds: 0.3, filter: 'bandpass', hz: 1400, q: 1.2, to: 3200 } },
  plop: { volume: 1.05, tone: { seconds: 0.12, wave: 'sine', hz: 900, to: 260 } },
  catch: { volume: 2, noise: { seconds: 0.35, filter: 'bandpass', hz: 900, q: 0.8, to: 380 } },
  // Guns (guns.js): a crack with a thump under it; the rifle's longer and deeper. Then the clicks of
  // reloading.
  bang: {
    volume: 1,
    noise: { seconds: 0.45, filter: 'lowpass', hz: 6000, to: 300 },
    tone: { seconds: 0.25, wave: 'sine', hz: 150, to: 45 },
  },
  boom: {
    volume: 1.25,
    noise: { seconds: 0.9, filter: 'lowpass', hz: 4500, to: 120 },
    tone: { seconds: 0.45, wave: 'sine', hz: 110, to: 35 },
  },
  click: { volume: 0.45, noise: { seconds: 0.05, filter: 'highpass', hz: 3000 } },
  reload: { volume: 1.75, noise: { seconds: 0.09, filter: 'bandpass', hz: 1800, q: 2, to: 2600 } },
  craft: { volume: 0.85, tone: { seconds: 0.25, wave: 'triangle', hz: 660, to: 990 } },
  ignite: { volume: 2.7, noise: { seconds: 0.55, filter: 'bandpass', hz: 350, q: 0.7, to: 2400 } },
  snuff: { volume: 0.65, noise: { seconds: 0.4, filter: 'highpass', hz: 2500, to: 6000 } },
  hit: {
    volume: 2.1,
    vary: 0.1,
    noise: { seconds: 0.06, filter: 'lowpass', hz: 1400 },
    tone: { seconds: 0.1, wave: 'sawtooth', hz: 170, to: 60 },
  },
  dissolve: { volume: 3.7, noise: { seconds: 0.9, filter: 'bandpass', hz: 250, q: 1, to: 3200 } },
  bite: {
    volume: 2.4,
    noise: { seconds: 0.12, filter: 'bandpass', hz: 900, q: 1 },
    tone: { seconds: 0.2, wave: 'sawtooth', hz: 120, to: 70 },
  },
  growl: {
    volume: 1.1,
    vary: 0.15,
    noise: { seconds: 0.9, filter: 'lowpass', hz: 320 },
    tone: { seconds: 0.9, wave: 'sawtooth', hz: 75, to: 58 },
  },
  roar: {
    volume: 1.0,
    noise: { seconds: 1.5, filter: 'lowpass', hz: 240, to: 120 },
    tone: { seconds: 1.5, wave: 'sawtooth', hz: 52, to: 36 },
  },
  hiss: {
    volume: 2.4,
    vary: 0.12,
    noise: { seconds: 0.4, filter: 'bandpass', hz: 3200, q: 1.2, to: 5200 },
    tone: { seconds: 0.25, wave: 'sawtooth', hz: 150, to: 240 },
  },
  claw: { volume: 4.5, vary: 0.2, noise: { seconds: 0.2, filter: 'bandpass', hz: 2800, q: 3, to: 1700 } },
  crash: {
    volume: 1.4,
    noise: { seconds: 0.7, filter: 'lowpass', hz: 1800, to: 200 },
    tone: { seconds: 0.3, wave: 'triangle', hz: 130, to: 50 },
  },
  collapse: { volume: 0.85, tone: { seconds: 1.3, wave: 'sine', hz: 220, to: 50 } },
  thunder: {
    volume: 2.2,
    vary: 0.2,
    noise: { seconds: 3, filter: 'lowpass', hz: 420, to: 45 },
    tone: { seconds: 2.2, wave: 'sine', hz: 55, to: 28 },
  },
  // Footsteps, by what the ground kicks up (`step` in tiles.js); 'floor' is for indoors.
  'step:grass': { volume: 0.24, vary: 0.2, noise: { seconds: 0.05, filter: 'highpass', hz: 2000 } },
  'step:sand': { volume: 0.65, vary: 0.2, noise: { seconds: 0.07, filter: 'bandpass', hz: 1300, q: 0.8 } },
  'step:dust': { volume: 1.2, vary: 0.2, noise: { seconds: 0.04, filter: 'bandpass', hz: 950, q: 1 } },
  'step:floor': {
    volume: 0.47,
    vary: 0.15,
    noise: { seconds: 0.03, filter: 'lowpass', hz: 800 },
    tone: { seconds: 0.05, wave: 'triangle', hz: 190, to: 120 },
  },
};

const audio = {
  ctx: null, // the browser's sound maker, made on the first tap
  out: null, // everything plays into this: the overall volume
  noise: null, // two seconds of hiss, shared by every sound made from noise
  wind: null, // the wind, playing all the time: { filter, gain }
  rain: null, // the hiss of rain, playing all the time and turned up when it rains: { filter, gain }
  on: true, // the player's choice, from the menu
  nextCricket: 0, // when the next cricket, bird and crackle come, in seconds of play
  nextBird: 0,
  nextCrackle: 0,
  lastAt: 0, // the sound maker's clock last frame, in seconds
};

// Called once at startup: remembers whether sound was on, and listens for the first tap.
function setupSound() {
  audio.on = recall(SOUND_KEY) !== false;
  // Some browsers (Safari on iPhone) only count the finger lifting as a tap that may start sound,
  // so listen for both. Waking it when it's already awake does nothing.
  const wake = () => wakeSound();
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown']) {
    window.addEventListener(type, wake, true);
  }
  document.addEventListener('visibilitychange', () => {
    if (!audio.ctx) return;
    if (document.visibilityState === 'hidden') audio.ctx.suspend();
    else if (audio.on) audio.ctx.resume();
  });
}

// Starts the sound maker, or wakes it up again. Browsers only allow this during a tap or key press.
function wakeSound() {
  if (!audio.on) return;
  if (!audio.ctx) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    audio.ctx = new Context();
    makeSoundParts();
  }
  if (audio.ctx.state !== 'running') audio.ctx.resume();
}

// After a gunshot the crickets stop singing for a while (see CRICKET_EVERY).
function hushCrickets(game) {
  audio.nextCricket = game.time + SHOT_HUSH;
}

function setSoundOn(on) {
  audio.on = on;
  remember(SOUND_KEY, on);
  if (on) wakeSound();
  else if (audio.ctx) audio.ctx.suspend();
}

// The parts every sound shares: the overall volume (through a compressor, so lots of sounds at once
// don't crackle), the noise, and the wind, which plays all the time and is only turned up and down.
function makeSoundParts() {
  const ctx = audio.ctx;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -10; // only the loudest moments are held back
  compressor.knee.value = 10;
  compressor.ratio.value = 6;
  compressor.connect(ctx.destination);
  audio.out = ctx.createGain();
  audio.out.gain.value = SOUND_VOLUME;
  audio.out.connect(compressor);

  const length = ctx.sampleRate * 2;
  audio.noise = ctx.createBuffer(1, length, ctx.sampleRate);
  const samples = audio.noise.getChannelData(0);
  for (let n = 0; n < length; n++) samples[n] = Math.random() * 2 - 1;

  audio.wind = loopNoise('lowpass', 400);
  audio.rain = loopNoise('lowpass', 5000);
  audio.rain.hiss = ctx.createBiquadFilter(); // rain is mostly the high part of the hiss
  audio.rain.hiss.type = 'highpass';
  audio.rain.hiss.frequency.value = 700;
  audio.rain.filter.disconnect();
  audio.rain.filter.connect(audio.rain.hiss).connect(audio.rain.gain);
}

// Hiss playing round and round through a filter, silent until it's turned up: { filter, gain }.
// Each starts at a different place in the noise so the wind and the rain don't hiss in step.
function loopNoise(type, hz) {
  const ctx = audio.ctx;
  const source = ctx.createBufferSource();
  source.buffer = audio.noise;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = hz;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  source.connect(filter).connect(gain).connect(audio.out);
  source.start(0, Math.random() * 2);
  return { filter, gain };
}

function soundReady() {
  return audio.on && audio.ctx && audio.ctx.state === 'running';
}

// Plays one of SOUNDS. `volume` (0 to 1) makes it quieter, as for things far off; `pan` places it
// from -1 (all the way left) to 1 (all the way right).
function playSound(name, { volume = 1, pan = 0 } = {}) {
  const sound = SOUNDS[name];
  if (!sound || !soundReady() || volume <= 0) return;
  const ctx = audio.ctx;
  const start = ctx.currentTime;
  const pitch = 1 + (sound.vary || 0) * (Math.random() * 2 - 1);
  const out = withPan(ctx.createGain(), pan);
  out.gain.value = sound.volume * volume;

  if (sound.noise) {
    const { seconds, filter: type, hz, q = 1, to } = sound.noise;
    const source = ctx.createBufferSource();
    source.buffer = audio.noise;
    source.loop = true; // so a long sound that starts late in the noise doesn't run off its end
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(hz * pitch, start);
    if (to) filter.frequency.exponentialRampToValueAtTime(to * pitch, start + seconds);
    filter.Q.value = q;
    source.connect(filter).connect(envelope(start, seconds)).connect(out);
    source.start(start, Math.random() * 1.5, seconds + 0.05);
  }
  if (sound.tone) {
    const { seconds, wave, hz, to } = sound.tone;
    const oscillator = ctx.createOscillator();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(hz * pitch, start);
    if (to) oscillator.frequency.exponentialRampToValueAtTime(to * pitch, start + seconds);
    oscillator.connect(envelope(start, seconds)).connect(out);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }
}

// A volume that jumps up at `start` and dies away over `seconds`, like something struck.
function envelope(start, seconds) {
  const gain = audio.ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(1, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  return gain;
}

// Sends `node` to the speakers, placed left or right. Returns `node`, to connect sounds into.
function withPan(node, pan) {
  const ctx = audio.ctx;
  if (pan && ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(panner).connect(audio.out);
  } else {
    node.connect(audio.out);
  }
  return node;
}

// A sound coming from (x, y) in the world: quieter the further it is from you, and to the left or
// right of you.
function playSoundAt(game, name, x, y) {
  const { player } = game;
  const distance = Math.hypot(x - player.x, y - player.y);
  playSound(name, { volume: 1 - Math.min(1, distance / HEAR_REACH) * 0.85, pan: (x - player.x) / 12 });
}

// ---- The sounds of the place ----

// Turns the wind up and down, and now and then a bird, a cricket or a crackle, to suit where you
// are and what time it is. `playing` is false while a menu is open, and everything quietens.
function updateSound(game, playing) {
  if (!soundReady()) return;
  const { sky, player, world } = game;
  const now = audio.ctx.currentTime;
  const indoors = insideHouse(world, Math.floor(player.x), Math.floor(player.y));

  // The wind gusts (smooth noise over time), louder at night and in a storm, and muffled indoors.
  const { rain, storm } = sky.weather;
  const gust = fractalNoise(game.time / 5, 0, 911, 2);
  const dark = Math.min(1, sky.darkness / MOONLIT);
  const wind = (WIND_DAY + (WIND_NIGHT - WIND_DAY) * dark) * (0.4 + gust) * (1 + STORM_WIND * storm) *
    (indoors ? WIND_INDOORS : 1);
  audio.wind.gain.gain.setTargetAtTime(playing ? wind : 0, now, 0.4);
  audio.wind.filter.frequency.setTargetAtTime(250 + 600 * gust, now, 0.4);
  // The rain: a steady hiss outdoors, a dull drumming on the roof indoors.
  const rainLoudness = RAIN_LOUDNESS * rain * (indoors ? RAIN_INDOORS : 1);
  audio.rain.gain.gain.setTargetAtTime(playing ? rainLoudness : 0, now, 0.6);
  audio.rain.filter.frequency.setTargetAtTime(indoors ? 1100 : 5000, now, 0.3);
  if (!playing) return;

  // Drops landing close by, one here and one there: on average PATTER_PER_SECOND of them in a downpour.
  const since = Math.min(0.1, now - audio.lastAt);
  audio.lastAt = now;
  if (!indoors && rain > 0 && Math.random() < rain * PATTER_PER_SECOND * since) patter(rain);

  // Crickets sing at night, and fall silent when something from the dark comes close, or in the rain.
  if (sky.phase === 'night' && rain < QUIET_IN_RAIN && game.time >= audio.nextCricket) {
    audio.nextCricket = game.time + between(CRICKET_EVERY);
    let nearest = Infinity;
    for (const creature of game.creatures) {
      nearest = Math.min(nearest, Math.hypot(creature.x - player.x, creature.y - player.y));
    }
    const [hushed, singing] = CRICKET_HUSH;
    const singers = Math.min(1, Math.max(0, (nearest - hushed) / (singing - hushed))); // 0 to 1
    if (Math.random() < singers) chirp(indoors ? 0.4 : 1);
  }

  // Birds by day, outdoors.
  if (sky.phase === 'day' && !indoors && rain < QUIET_IN_RAIN && game.time >= audio.nextBird) {
    audio.nextBird = game.time + between(BIRD_EVERY);
    tweet();
  }

  // A campfire crackles; so does a lit torch, closer and quieter.
  if (game.time >= audio.nextCrackle) {
    audio.nextCrackle = game.time + 0.05 + Math.random() * 0.2;
    const fire = nearestFire(game);
    const loudness = Math.max(
      fire ? 1 - fire.distance / CRACKLE_REACH : 0,
      game.survivor.torchLeft > 0 ? 0.35 : 0,
    );
    if (loudness > 0 && Math.random() < 0.6) crackle(loudness, fire ? (fire.x - player.x) / 12 : 0);
  }
}

// The nearest campfire (anything with `flame`) you can hear: { x, y, distance }, or null.
function nearestFire(game) {
  const { world, player } = game;
  const footX = Math.floor(player.x);
  const footY = Math.floor(player.y);
  let best = null;
  for (let ty = footY - CRACKLE_REACH; ty <= footY + CRACKLE_REACH; ty++) {
    for (let tx = footX - CRACKLE_REACH; tx <= footX + CRACKLE_REACH; tx++) {
      const object = objectAt(world, tx, ty);
      if (!object || !object.flame) continue;
      const distance = Math.hypot(tx + 0.5 - player.x, ty + 0.5 - player.y);
      if (distance < CRACKLE_REACH && (!best || distance < best.distance)) {
        best = { x: tx + 0.5, y: ty + 0.5, distance };
      }
    }
  }
  return best;
}

// One cricket: three quick high pulses, from somewhere off to one side.
function chirp(volume) {
  const ctx = audio.ctx;
  const start = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  oscillator.frequency.value = 4200 + Math.random() * 600;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  for (let pulse = 0; pulse < 3; pulse++) {
    const at = start + pulse * 0.06;
    gain.gain.linearRampToValueAtTime(0.06 * volume, at + 0.006);
    gain.gain.linearRampToValueAtTime(0, at + 0.03);
  }
  oscillator.connect(gain).connect(withPan(ctx.createGain(), Math.random() * 2 - 1));
  oscillator.start(start);
  oscillator.stop(start + 0.2);
}

// A bird: a few quick rising whistles.
function tweet() {
  const ctx = audio.ctx;
  const start = ctx.currentTime;
  const notes = 2 + Math.floor(Math.random() * 3);
  const base = 2400 + Math.random() * 900;
  const out = withPan(ctx.createGain(), Math.random() * 1.6 - 0.8);
  out.gain.value = 0.07;
  for (let note = 0; note < notes; note++) {
    const at = start + note * 0.13;
    const oscillator = ctx.createOscillator();
    oscillator.frequency.setValueAtTime(base, at);
    oscillator.frequency.exponentialRampToValueAtTime(base * 1.4, at + 0.08);
    oscillator.connect(envelope(at, 0.09)).connect(out);
    oscillator.start(at);
    oscillator.stop(at + 0.12);
  }
}

// One raindrop landing nearby: a tiny tick of high hiss, from somewhere to one side.
function patter(rain) {
  const ctx = audio.ctx;
  const start = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = audio.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2500 + Math.random() * 4000;
  filter.Q.value = 2;
  const out = withPan(ctx.createGain(), Math.random() * 2 - 1);
  out.gain.value = (0.12 + Math.random() * 0.2) * rain;
  source.connect(filter).connect(envelope(start, 0.015 + Math.random() * 0.02)).connect(out);
  source.start(start, Math.random() * 1.5, 0.05);
}

// One pop from a fire.
function crackle(volume, pan) {
  const ctx = audio.ctx;
  const start = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = audio.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1500 + Math.random() * 2500;
  const out = withPan(ctx.createGain(), pan);
  out.gain.value = 0.18 * volume;
  source.connect(filter).connect(envelope(start, 0.02 + Math.random() * 0.03)).connect(out);
  source.start(start, Math.random() * 1.5, 0.06);
}
