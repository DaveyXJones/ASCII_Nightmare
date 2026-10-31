// What the game keeps in the browser between visits: how you've dressed the player.
//
// It's kept in localStorage, which belongs to this one browser on this one device. Private
// browsing, or clearing the browser's data, forgets it. Every read and write is wrapped so that
// if the browser won't keep anything, the game still plays; it just won't remember.

const LOOK_KEY = 'ascii-nightmare-look';

// Keeps `value` under `key`, as text. Returns false if the browser wouldn't keep it.
function remember(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// What was kept under `key`, or null if nothing was (or it can't be read).
function recall(key) {
  try {
    const text = localStorage.getItem(key);
    return text === null ? null : JSON.parse(text);
  } catch {
    return null;
  }
}

// ---- Your look ----

// The look you picked last time, keeping only colors that are still in LOOKS (sprites.js), so a
// color taken out of the table falls back to the first one in its row.
function recallLook() {
  const look = defaultLook();
  const kept = recall(LOOK_KEY);
  if (!kept || typeof kept !== 'object') return look;
  for (const [part, { colors }] of Object.entries(LOOKS)) {
    if (colors.some(({ color }) => color === kept[part])) look[part] = kept[part];
  }
  return look;
}
