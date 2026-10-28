// Seeded randomness and smooth noise.
// The same seed always produces the same numbers, so the same seed always builds the same world.

// Turns a grid position plus a seed into a stable random number in [0, 1).
function hash2(x, y, seed) {
  let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

// Value noise: random heights on a grid, blended smoothly in between.
function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const sx = smoothstep(x - x0);
  const sy = smoothstep(y - y0);
  const top = lerp(hash2(x0, y0, seed), hash2(x0 + 1, y0, seed), sx);
  const bottom = lerp(hash2(x0, y0 + 1, seed), hash2(x0 + 1, y0 + 1, seed), sx);
  return lerp(top, bottom, sy);
}

// Layers of value noise at finer and finer detail. Gives terrain broad shapes plus small bumps.
function fractalNoise(x, y, seed, octaves = 4) {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxTotal = 0;
  for (let i = 0; i < octaves; i++) {
    total += valueNoise(x * frequency, y * frequency, seed + i * 1013) * amplitude;
    maxTotal += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total / maxTotal;
}
