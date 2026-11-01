// Playing together: other people on your island, over the internet.
//
// Each shared island is a "room" on a small server (the server/ folder), found by a five-letter code.
// Start an island and you get a code to share; type someone's code and you're on theirs. There are no
// accounts and no chat, so there's nothing to sign up for and nothing to moderate. Your own island is
// kept safe, and you go back to it when you leave.
//
// So far you see each other and share the time of day. Everything else (trees chopped, walls built,
// things in the dark) still happens only on your own phone: that's the next job. What you do on a
// shared island is saved on your phone under its code, apart from your own island (see saveKey in
// save.js).
//
// This only uses the WebSocket that's built into every browser, so the game still has no add-ons.

// Where the rooms are: on your own PC while working on the game (see server/), otherwise online.
const TOGETHER_ON_THIS_PC = ['localhost', '127.0.0.1'].includes(location.hostname);
const TOGETHER_SERVER = TOGETHER_ON_THIS_PC ? 'ws://localhost:8787' : 'wss://ascii-nightmare.daveyxjones.workers.dev';
// Whether the Play together button shows for everyone. Set this to false to hide it again: then it only
// shows on your own PC, or once you've opened the game with ?together on the end of its address (that
// browser remembers).
const TOGETHER_OPEN = true;
const TOGETHER_ON_KEY = 'ascii-nightmare-together-on'; // true once this browser has used that address
const TOGETHER_KEY = 'ascii-nightmare-together'; // the code of the island you were last on
const TOGETHER_SAVE = 'ascii-nightmare-island-'; // each shared island is saved under this and its code
const CODE_PATTERN = /^[A-Z2-9]{5}$/; // see CODE_LETTERS in server/src/index.js
const SEND_SECONDS = 0.2; // how often your phone says where you are, if you've moved
const PING_SECONDS = 30; // how often it checks the line's still open, when you haven't
const RETRY_SECONDS = [2, 15]; // lose the line, and it tries again after this long, up to this long
const OTHER_FOLLOW = 8; // how quickly others glide to where they last said they were (higher is quicker)
const OTHER_JUMP = 8; // further than this from where they said, in tiles, and they just appear there
const OTHERS_KEPT = 32; // how many different looks to keep pictures of (see picturesFor in sprites.js)

const together = {
  code: null, // the island you're on, or null when you're on your own
  socket: null,
  born: 0, // when the island began, and how far your phone's clock is from the server's, in ms
  clockOffset: 0,
  others: new Map(), // the other people here: id -> { look, x, y, toX, toY, facing, pose, held, ... }
  sendIn: 0, // seconds until your phone next says where you are
  pingIn: PING_SECONDS,
  sent: null, // what it said last, so it says nothing if nothing's changed
  retry: RETRY_SECONDS[0],
  retryTimer: null,
};

// Things someone can be holding (TOOLS in crafting.js, and the rough tool). Anything else is ignored,
// so nobody can make your phone draw whatever they like.
const HELD_GLYPHS = new Set([ACTION_POSES.default.held]);
for (const tool of Object.values(TOOLS)) (tool.held || []).forEach((glyph) => HELD_GLYPHS.add(glyph));

// ---- The panel ----

function setupTogether(elements) {
  if (new URLSearchParams(location.search).has('together')) remember(TOGETHER_ON_KEY, true);
  elements.togetherButton.hidden = !(TOGETHER_OPEN || TOGETHER_ON_THIS_PC || recall(TOGETHER_ON_KEY));
  elements.togetherButton.addEventListener('click', openTogether);
  elements.togetherClose.addEventListener('click', closeTogether);
  elements.together.addEventListener('click', (event) => {
    if (event.target === elements.together) closeTogether();
  });
  elements.togetherStart.addEventListener('click', () => {
    sayTogether('Making an island...');
    connectTo(`/new?size=${WORLD_SIZE.width}x${WORLD_SIZE.height}`);
  });
  elements.togetherForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const code = elements.togetherCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!CODE_PATTERN.test(code)) {
      sayTogether('A code is five letters and numbers.');
      return;
    }
    sayTogether('Looking for that island...');
    connectTo(`/island/${code}`);
  });
  // While you're typing a code, the keys are for the box, not for walking about.
  elements.togetherCode.addEventListener('keydown', (event) => {
    if (event.code !== 'Escape') event.stopPropagation();
  });
  elements.togetherLeave.addEventListener('click', leaveIsland);
}

// The panel opens over the menu, and closing it goes back to the menu.
function openTogether() {
  sayTogether('');
  showTogether();
  elements.togetherCode.value = recall(TOGETHER_KEY) || '';
  elements.together.hidden = false;
}

function closeTogether() {
  elements.together.hidden = true;
}

// Shows the right half of the panel, for whether you're on a shared island or not.
function showTogether() {
  elements.togetherOff.hidden = Boolean(together.code);
  elements.togetherOn.hidden = !together.code;
  if (!together.code) return;
  elements.togetherShown.textContent = together.code;
  const here = together.others.size + 1;
  elements.togetherCount.textContent = here === 1 ? 'Nobody else is here yet.' : `${here} people here.`;
}

function sayTogether(words) {
  elements.togetherStatus.textContent = words;
}

// ---- The line to the room ----

function connectTo(path) {
  hangUp();
  let socket;
  try {
    socket = new WebSocket(TOGETHER_SERVER + path);
  } catch {
    sayTogether('Can\'t reach the island. Check your connection and try again.');
    return;
  }
  together.socket = socket;
  socket.addEventListener('message', (event) => {
    if (socket === together.socket) hear(event.data);
  });
  socket.addEventListener('close', () => {
    if (socket === together.socket) lineLost();
  });
}

function hangUp() {
  clearTimeout(together.retryTimer);
  const socket = together.socket;
  together.socket = null;
  if (socket) socket.close();
}

function say(message) {
  const socket = together.socket;
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

// The line's gone. On a shared island, keep trying: phones drop out all the time, and the game carries
// on meanwhile. Otherwise you were only trying to get on one, so say so.
function lineLost() {
  together.socket = null;
  if (!together.code) {
    sayTogether('Can\'t reach the island. Check your connection and try again.');
    return;
  }
  together.others.clear();
  showMessage(state, 'You\'ve lost touch with the others. Trying again...');
  together.retryTimer = setTimeout(() => connectTo(`/island/${together.code}`), together.retry * 1000);
  together.retry = Math.min(RETRY_SECONDS[1], together.retry * 2);
}

function hear(text) {
  if (text === 'pong') return;
  let message;
  try {
    message = JSON.parse(text);
  } catch {
    return;
  }
  if (message.t === 'welcome') heardWelcome(message);
  else if (message.t === 'no-island') turnedAway('There\'s no island with that code.');
  else if (message.t === 'full') turnedAway('That island is full.');
  else if (message.t === 'joined') heardJoined(message);
  else if (message.t === 'left') heardLeft(message);
  else if (message.t === 'at') heardPlace(together.others.get(message.id), message);
  else if (message.t === 'look' && together.others.has(message.id)) {
    together.others.get(message.id).look = cleanLook(message.look);
  }
  showTogether();
}

function turnedAway(words) {
  hangUp();
  if (together.code) leaveIsland();
  sayTogether(words);
}

function heardWelcome(welcome) {
  together.retry = RETRY_SECONDS[0];
  together.born = welcome.born;
  together.clockOffset = welcome.now - Date.now();
  if (together.code !== welcome.code) enterIsland(welcome);
  else showMessage(state, 'Back in touch with the others.');
  together.others.clear();
  for (const other of welcome.others) addOther(other);
  // Tell them what you look like and where you are, which is when they see you arrive.
  together.sent = null;
  say({ t: 'hi', look: state.look, ...whereIAm(state) });
}

function heardJoined(message) {
  addOther(message);
  showMessage(state, 'Somebody has come to the island.');
}

function heardLeft(message) {
  if (together.others.delete(message.id)) showMessage(state, 'Somebody has left the island.');
}

// ---- Coming and going ----

// You're on a shared island now. Your own island is saved first, and stays as it is.
function enterIsland(welcome) {
  saveGame(state);
  together.code = welcome.code;
  remember(TOGETHER_KEY, welcome.code);
  // Been here before on this phone? Carry on. If not, wake up in the island's cottage.
  if (!loadGame(state)) {
    state.world = generateWorld(welcome.seed, { width: welcome.width, height: welcome.height, places: true });
    state.lifeStarted = state.time;
    wakeUp();
  }
  state.dayClock = togetherClock();
  state.sky = skyAt(state.dayClock, state.world.seed);
  snapCamera(state.world, state.player);
  showWorldButtons();
  closeTogether();
  closeMenu();
  showMessage(state, `You're on island ${welcome.code}. Share the code from the menu.`);
}

function leaveIsland() {
  saveGame(state);
  hangUp();
  together.code = null;
  together.others.clear();
  if (!loadGame(state)) newGame(DEFAULT_SEED);
  snapCamera(state.world, state.player);
  showWorldButtons();
  showTogether();
  openMenu();
}

// On a shared island, New world isn't yours to press: leave it first.
function showWorldButtons() {
  elements.newWorldButton.hidden = Boolean(together.code);
  elements.deathNewWorldButton.hidden = Boolean(together.code);
}

// Your look has changed: tell the others.
function togetherLookChanged() {
  if (together.code) say({ t: 'look', look: state.look });
}

// ---- Everyone else ----

// Only colors that are really in LOOKS (sprites.js), whatever somebody's phone says.
function cleanLook(sent) {
  const look = defaultLook();
  for (const [part, { colors }] of Object.entries(LOOKS)) {
    if (sent && colors.some(({ color }) => color === sent[part])) look[part] = sent[part];
  }
  return look;
}

function addOther({ id, look, place }) {
  const other = { look: cleanLook(look), x: 0, y: 0, toX: 0, toY: 0, stride: 0, facing: 'down', pose: 'stand' };
  other.held = null;
  other.hasTorch = false;
  other.lit = false;
  together.others.set(id, other);
  if (place) {
    heardPlace(other, place);
    other.x = other.toX;
    other.y = other.toY;
  }
}

// Where someone says they are now, and what they're up to.
function heardPlace(other, place) {
  if (!other) return;
  other.toX = place.x;
  other.toY = place.y;
  other.facing = FACINGS[place.f] ? place.f : 'down';
  other.pose = place.n;
  other.held = HELD_GLYPHS.has(place.h) ? place.h : null;
  other.hasTorch = place.k === true;
  other.lit = place.l === true;
}

// Someone glides toward where they last said they were, and walks as they go.
function stepOther(other, dt) {
  const dx = other.toX - other.x;
  const dy = other.toY - other.y;
  const away = Math.hypot(dx, dy);
  if (away > OTHER_JUMP) {
    other.x = other.toX;
    other.y = other.toY;
    return;
  }
  const t = 1 - Math.exp(-OTHER_FOLLOW * dt);
  other.x += dx * t;
  other.y += dy * t;
  other.stride += away * t;
}

// ---- Every frame ----

// The time of day on a shared island: the same for everyone, however long anyone's been away.
function togetherClock() {
  return Math.max(0, (Date.now() + together.clockOffset - together.born) / 1000);
}

// Keeps the clock, moves everyone else along, and says where you are if you've moved. This runs even
// while a menu's open: the others don't stop because you have.
function updateTogether(game, dt) {
  if (!together.code) return;
  game.dayClock = togetherClock();
  for (const other of together.others.values()) stepOther(other, dt);
  together.sendIn -= dt;
  if (together.sendIn <= 0) {
    together.sendIn = SEND_SECONDS;
    const place = whereIAm(game);
    const words = JSON.stringify(place);
    if (words !== together.sent) {
      together.sent = words;
      say({ t: 'at', ...place });
      together.pingIn = PING_SECONDS;
    }
  }
  together.pingIn -= dt;
  if (together.pingIn <= 0) {
    together.pingIn = PING_SECONDS;
    const socket = together.socket;
    if (socket && socket.readyState === WebSocket.OPEN) socket.send('ping');
  }
}

// Where you are and what you're doing, for everyone else: in as few characters as it can be.
function whereIAm(game) {
  const { player, survivor } = game;
  const pose = playerPose(game);
  return {
    x: Math.round(player.x * 100) / 100,
    y: Math.round(player.y * 100) / 100,
    f: player.facing,
    n: game.dead ? 'fallen' : pose.name === 'blink' ? 'stand' : pose.name,
    h: pose.held || null,
    k: Boolean(survivor.tools.torch),
    l: survivor.torchLeft > 0,
  };
}
