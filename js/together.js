// Playing together: other people on your island, over the internet.
//
// Each shared island is a "room" on a small server (the server/ folder), found by a five-letter code.
// Share the island you're on (a copy), or start a new one, and you get a code to share; type someone's
// code and you're on theirs. There are no accounts and no chat, so there's nothing to sign up for and
// nothing to moderate. Your own island is kept safe, and you go back to it when you leave.
//
// You see each other and share the time of day and the island itself. Every change anyone makes is told
// to the room (tellIsland), which keeps it and passes it on to everyone, and the changes are applied in
// the order the room saw them, so every phone ends up the same. Things that happen by themselves, like
// plants growing and lamps going out, are worked out on every phone so they look right, but only one
// phone at a time, the keeper (whoever's been there longest), says when they've happened
// (worldIsMine). Things in the dark are shared too: see "The hunt", below.
//
// On your phone, a shared island only saves your own part: you, what you've seen, your bed (see saveKey
// and saveGame in save.js).
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
const CHANGES_PER_SECOND = 15; // at most this many changes are sent each second, to stay under the room's limit
const TICK_SECONDS = 30; // how often the keeper says how the plants, lamps and barrels are getting on
const TICKS_MOST = 250; // ...about this many of each at most, to stay under the room's limit on a message
const NEWS_REACH = 40; // somebody else's change further off than this, in tiles, makes no sound or splash
const HAND_OVER_NEARER = 2.5; // someone else this many tiles nearer a creature than you, and it turns on them
const HAND_OVER_WALLED = 10; // a creature with no way round to you counts you as this many tiles further off
const HAND_OVER_SECONDS = 3; // after changing who it's after, it sticks with them for at least this long
const HAND_OVER_GRACE = 1; // how long, after being handed over, one can be left off its new phone's list
const THEIR_COMING_OUT = 0.5; // a creature first heard of while less solid than this has only just come out
const SLAIN_SECONDS = 2; // something you've just seen killed stays dead this long, whatever late news says
const SHARE_MOST = 20000; // the most changes an island can have and still be copied to a room (see the server)
const SHARE_PAGE_LENGTH = 12000; // copying an island sends its changes in pages of about this many characters
const SHARE_PAGE_SECONDS = 0.05; // ...one every this many seconds, to stay under the room's limit

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
  you: null, // your id, and the keeper's: the phone that says what happens by itself on the island
  keeper: null,
  arriving: null, // between the room's welcome and its ready: { welcome, part }, the island's changes so far
  greeted: false, // true once you've said hi on this line: the room ignores anything sent before that
  outbox: new Map(), // changes not sent yet: key -> value (a newer change to one thing replaces an older)
  waiting: new Map(), // changes sent that the room hasn't passed back yet: key -> how many
  budget: 0, // how many changes can be sent right now (see sendChanges)
  tickIn: TICK_SECONDS, // seconds until the keeper next says how things are getting on
  ticked: null, // what it said last
  slain: new Map(), // creatures just killed that the phone running them may not know about yet: id -> until when
  sharing: false, // true while your own island is being copied to a new room (see shareIsland)
  shareTimer: null,
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
  elements.togetherShare.addEventListener('click', shareIsland);
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
  together.greeted = false;
  together.sharing = false;
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
  clearTimeout(together.shareTimer);
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
  clearTimeout(together.shareTimer);
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
  else if (message.t === 'world') heardPart(message);
  else if (message.t === 'ready') heardReady(message);
  else if (message.t === 'set') heardChange(message);
  else if (message.t === 'ticks') heardTicks(message, true);
  else if (message.t === 'keeper') together.keeper = message.id;
  else if (message.t === 'no-island') turnedAway('There\'s no island with that code.');
  else if (message.t === 'full') turnedAway('That island is full.');
  else if (message.t === 'not-shared') turnedAway('Your island didn\'t copy across. Please try again.');
  else if (message.t === 'joined') heardJoined(message);
  else if (message.t === 'left') heardLeft(message);
  else if (message.t === 'at') {
    heardPlace(together.others.get(message.id), message);
    if (huntIsHere()) heardHunt(message.id, message.c);
  } else if (message.t === 'look' && together.others.has(message.id)) {
    together.others.get(message.id).look = cleanLook(message.look);
  } else if (HUNT_NEWS[message.t] && huntIsHere()) {
    HUNT_NEWS[message.t](message);
  }
  showTogether();
}

function turnedAway(words) {
  hangUp();
  if (together.code) leaveIsland();
  sayTogether(words);
}

// The room says hello, and then sends the island's changes so far, a page at a time, then says ready.
function heardWelcome(welcome) {
  together.retry = RETRY_SECONDS[0];
  together.you = welcome.id;
  together.born = welcome.born;
  together.clockOffset = welcome.now - Date.now();
  together.arriving = { welcome, part: [] };
  together.others.clear();
  for (const other of welcome.others) addOther(other);
  if (together.sharing) sendMyIsland();
}

function heardPart(message) {
  if (together.arriving && Array.isArray(message.part)) together.arriving.part.push(...message.part);
}

function heardReady(message) {
  const arrival = together.arriving;
  if (!arrival) return;
  together.arriving = null;
  together.waiting.clear();
  if (together.code !== arrival.welcome.code) {
    enterIsland(arrival.welcome, arrival.part, message.ticks);
  } else {
    hearTheIsland(arrival.part, message.ticks);
    showMessage(state, 'Back in touch with the others.');
  }
  // Tell them what you look like and where you are, which is when they see you arrive.
  together.sent = null;
  say({ t: 'hi', look: state.look, print: state.world.print, ...whereIAm(state) });
  together.greeted = true;
}

function heardJoined(message) {
  addOther(message);
  together.sent = null; // say where you are and what's after you, so they know even if you're standing still
  showMessage(state, 'Somebody has come to the island.');
}

function heardLeft(message) {
  if (together.others.delete(message.id)) showMessage(state, 'Somebody has left the island.');
}

// ---- Coming and going ----

// Copies the island you're on to a new room, so friends can join it with a code. It's a copy: your own
// island stays as it is, for when you come back, and from now on the two go their separate ways.
//
// The room is told the seed, the size and the time of day, which is enough to build the island again.
// Then it's sent everything that's changed (sendMyIsland), and sends it all back just as it would to
// anyone arriving, so from there on this is the same as joining (heardReady, enterIsland).
function shareIsland() {
  const { world, dayClock } = state;
  saveGame(state);
  if (changesOnIsland(world).length > SHARE_MOST) {
    sayTogether('So much has changed on this island that it\'s too big to copy.');
    return;
  }
  sayTogether('Copying your island...');
  const size = `${world.width}x${world.height}`;
  connectTo(`/new?size=${size}&seed=${world.seed}&clock=${Math.floor(dayClock)}&places=${world.hasPlaces ? 1 : 0}`);
  together.sharing = true;
}

// Everything about an island that isn't just how its seed built it, as changes for the room, with the
// same keys as tellIsland (see CHANGES).
function changesOnIsland(world) {
  const changes = [];
  for (let i = 0; i < world.objects.length; i++) {
    if (world.objects[i] !== world.original[i]) changes.push([`o${i}`, world.objects[i]]);
  }
  for (const i of world.floors.keys()) changes.push([`g${i}`, world.ground[i]]);
  for (const [i, chest] of world.chests) changes.push([`c${i}`, chest]);
  for (const [i, crop] of world.crops) changes.push([`p${i}`, crop]);
  for (const [i, left] of world.fuel) changes.push([`f${i}`, left]);
  for (const [i, water] of world.barrels) changes.push([`b${i}`, water]);
  if (world.tower) changes.push(['t', { oil: world.tower.oil, kindled: world.tower.kindled }]);
  return changes;
}

// Sends the room all of your island's changes, a page at a time, then says how many that was.
function sendMyIsland() {
  const changes = changesOnIsland(state.world);
  const pages = [];
  let page = [];
  let length = 0;
  for (const change of changes) {
    const words = JSON.stringify(change).length;
    if (page.length && length + words > SHARE_PAGE_LENGTH) {
      pages.push(page);
      page = [];
      length = 0;
    }
    page.push(change);
    length += words;
  }
  if (page.length) pages.push(page);
  const sendNext = () => {
    const next = pages.shift();
    if (next) {
      say({ t: 'upload', part: next });
      together.shareTimer = setTimeout(sendNext, SHARE_PAGE_SECONDS * 1000);
    } else {
      say({ t: 'uploaded', n: changes.length });
    }
  };
  sendNext();
}

// You're on a shared island now. Your own island is saved first, and stays as it is.
function enterIsland(welcome, part, ticks) {
  saveGame(state);
  together.code = welcome.code;
  remember(TOGETHER_KEY, welcome.code);
  // Sharing your own island? You start there just as you are: same pack, same spot, same map.
  if (together.sharing) remember(saveKey(), recall(SAVE_KEY));
  together.sharing = false;
  // Been here before on this phone? Carry on. If not, wake up in the island's cottage.
  if (loadGame(state)) {
    hearTheIsland(part, ticks);
    standWhereYouWere();
  } else {
    const island = { width: welcome.width, height: welcome.height, places: welcome.places !== false };
    state.world = generateWorld(welcome.seed, island);
    hearTheIsland(part, ticks);
    state.lifeStarted = state.time;
    wakeUp();
  }
  state.dayClock = togetherClock();
  state.sky = skyAt(state.dayClock, state.world.seed);
  snapCamera(state.world, state.player);
  showWorldButtons();
  closeTogether();
  closeMenu();
  const different = welcome.print && welcome.print !== state.world.print;
  showMessage(state, different
    ? 'This island was made by another version of the game, so things may have moved.'
    : `You're on island ${welcome.code}. Share the code from the menu.`);
}

// Puts you back where you were on this island. Before its changes came in, that spot may have looked
// blocked (if you'd chopped down the tree there, say), which would have sent you to the cottage.
function standWhereYouWere() {
  const save = recall(saveKey());
  const spot = save && !save.dead && save.print === state.world.print && save.player;
  if (!spot || !Number.isFinite(spot.x) || !Number.isFinite(spot.y) || blockerFor(spot.x, spot.y)) return;
  state.player.x = spot.x;
  state.player.y = spot.y;
}

function leaveIsland() {
  sendChanges(0, true);
  saveGame(state);
  hangUp();
  together.code = null;
  together.keeper = null;
  together.arriving = null;
  together.outbox.clear();
  together.waiting.clear();
  together.others.clear();
  together.slain.clear();
  state.creatures = state.creatures.filter((creature) => !creature.owner); // that hunt stays on that island
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

// ---- The island itself ----

// True if what happens by itself on the island is this phone's to say: always on your own island, and
// on a shared one, if you're the keeper.
function worldIsMine() {
  return !together.code || together.keeper === together.you;
}

// The clock that things waiting to happen on the island go by. Your own seconds of play won't do on a
// shared island, since everybody's are different.
function worldTime(game) {
  return together.code ? game.dayClock : game.time;
}

// Whether somebody else is standing on tile (x, y).
function otherOnTile(x, y) {
  for (const other of together.others.values()) {
    if (Math.floor(other.toX) === x && Math.floor(other.toY) === y) return true;
  }
  return false;
}

// A change you've made: to be told to the room, and through it everyone. It does nothing except on a
// shared island. They wait in the outbox, so several to one chest in a moment only send the last, and
// nothing's lost if the line drops. See heardChange for what the keys mean.
function tellIsland(key, value) {
  if (state.world.shared) together.outbox.set(key, value);
}

// Sends what's in the outbox, a few at a time (or all of it, leaving the island).
function sendChanges(dt, all = false) {
  together.budget = Math.min(CHANGES_PER_SECOND, together.budget + dt * CHANGES_PER_SECOND);
  const socket = together.socket;
  if (!socket || socket.readyState !== WebSocket.OPEN || !together.greeted) return;
  for (const [k, v] of together.outbox) {
    if (!all && together.budget < 1) break;
    together.budget--;
    say({ t: 'set', k, v });
    together.waiting.set(k, (together.waiting.get(k) || 0) + 1);
    together.outbox.delete(k);
  }
}

// The island's changes so far, from the room. What stands on each tile goes first, since a chest or a
// plant needs its tile ready. Anything you've changed since and not sent yet stays as you have it.
function hearTheIsland(part, ticks) {
  const world = state.world;
  world.shared = false;
  const standing = part.filter(([key]) => key[0] === 'o');
  const rest = part.filter(([key]) => key[0] !== 'o');
  for (const [key, value] of [...standing, ...rest]) {
    if (!together.outbox.has(key)) applyChange(key, value, false);
  }
  if (ticks) heardTicks(ticks, false);
  world.shared = true;
  groundCache.world = null; // floors may have changed: draw the ground again
}

// A change from the room, in the order the room saw them all. Your own come back too. If you've
// changed the same thing again since, the newer one's on its way and this is out of date.
function heardChange({ k, v, by }) {
  if (together.arriving) {
    together.arriving.part.push([k, v]);
    return;
  }
  const mine = by === together.you;
  if (mine) {
    const left = (together.waiting.get(k) || 1) - 1;
    if (left > 0) together.waiting.set(k, left);
    else together.waiting.delete(k);
  }
  if (together.waiting.has(k) || together.outbox.has(k)) return;
  applyChange(k, v, !mine);
}

// Puts a change onto the island. A key is a letter and a tile (see CHANGES), or `t` for the lighthouse's
// tank. `live` if it's somebody else's and it's happening now, so it should look and sound like it.
function applyChange(key, value, live) {
  const world = state.world;
  const shared = world.shared;
  world.shared = false; // what you've just heard doesn't need telling back
  if (key === 't') {
    if (world.tower && value) {
      world.tower.oil = Math.max(0, Number(value.oil) || 0);
      world.tower.kindled = value.kindled === true;
    }
  } else {
    const i = Number(key.slice(1));
    const change = CHANGES[key[0]];
    if (change && Number.isInteger(i) && i >= 0 && i < world.objects.length) change(world, i, value, live);
  }
  world.shared = shared;
}

const CHANGES = {
  o: heardObject, // what stands on the tile (null if nothing)
  g: heardFloor, // a floor laid there (null if it's been taken up)
  c: heardChest, // what's in the chest there
  p: heardCrop, // how the plant there is getting on
  f: heardFuel, // a lamp's seconds of fuel
  b: heardBarrel, // a rain barrel's waterings
};

function heardObject(world, i, key, live) {
  if (key !== null && !OBJECTS[key]) return; // something this version of the game doesn't know about
  const before = world.objects[i];
  if (before === key) return;
  const x = i % world.width;
  const y = (i - x) / world.width;
  const was = before && OBJECTS[before];
  const now = key && OBJECTS[key];
  if (state.chest === i) closeChest(); // somebody's taken down the chest you were looking in
  if (was && was.crop && now && now.crop) {
    world.objects[i] = key; // the same plant, bigger, with the water it had
    if (world.crops.has(i)) world.crops.get(i).grown = 0;
  } else {
    setObject(world, x, y, key);
    if (now && now.chest) world.chests.set(i, newChest());
    if (now && now.fuel && now.light) world.fuel.set(i, now.fuel.burns);
    if (now && now.barrel) world.barrels.set(i, 0);
    if (now && now.crop) world.crops.set(i, { grown: 0, water: 0, dry: 0 });
    if (now && now.regrow) {
      world.regrowing.push({ index: i, at: worldTime(state) + now.regrow.after, from: key, into: now.regrow.into });
    }
  }
  if (!live) return;
  field.at = -Infinity; // there may be a new way through, or a new wall: creatures work it out again
  if (was && was.crop && was.crop.into === key && was.crop.says) gardenNews(state, x, y, was.crop.says, true);
  if (key === 'wilted') gardenNews(state, x, y, 'A plant in your garden has wilted for want of water.', true);
  if (Math.hypot(x + 0.5 - state.player.x, y + 0.5 - state.player.y) > NEWS_REACH) return;
  burst(state.fx, x + 0.5, y + 0.5, (was && was.burst) || (now && now.burst) || 'dust', 6);
  const sound = was ? was.soundDone || was.sound : 'build';
  if (sound) playSoundAt(state, sound, x + 0.5, y + 0.5);
}

function heardFloor(world, i, key, live) {
  const x = i % world.width;
  const y = (i - x) / world.width;
  if (key && TILES[key] && !world.floors.has(i)) {
    world.floors.set(i, world.ground[i]);
    world.ground[i] = key;
  } else if (!key && world.floors.has(i)) {
    world.ground[i] = world.floors.get(i);
    world.floors.delete(i);
  } else {
    return;
  }
  if (live) redrawGround(world, x, y);
}

function heardChest(world, i, value) {
  const key = world.objects[i];
  if (!key || !OBJECTS[key].chest) return;
  world.chests.set(i, restoreChest(value));
  if (state.chest === i) refreshChest();
}

function heardCrop(world, i, value) {
  const key = world.objects[i];
  if (!key || !OBJECTS[key].crop || !value) return;
  const seconds = (n) => Math.max(0, finite(n, 0));
  world.crops.set(i, { grown: seconds(value.grown), water: seconds(value.water), dry: seconds(value.dry) });
}

function heardFuel(world, i, value) {
  const key = world.objects[i];
  if (key && OBJECTS[key].fuel && OBJECTS[key].light) world.fuel.set(i, Math.max(0, finite(value, 0)));
}

function heardBarrel(world, i, value) {
  const key = world.objects[i];
  if (key && OBJECTS[key].barrel) world.barrels.set(i, Math.max(0, Math.min(BARREL_HOLDS, finite(value, 0))));
}

// Every phone works out plants growing, lamps burning and barrels filling for itself, and every so often
// the keeper says how they stand, so they don't drift apart and a newcomer starts close to right. While
// it's `live`, a number that's gone up here is left alone, in case it's somebody's watering that the
// keeper hadn't heard about yet when it spoke.
function heardTicks(ticks, live) {
  if (live && worldIsMine()) return;
  const { world } = state;
  const keep = (here, told) => (live ? Math.max(here, told) : told);
  const rows = (list) => (Array.isArray(list) ? list : []);
  for (const [i, grown, water, dry] of rows(ticks.crops)) {
    const crop = world.crops.get(i);
    if (!crop) continue;
    crop.grown = grown;
    crop.water = keep(crop.water, water);
    crop.dry = crop.water > 0 ? 0 : dry;
  }
  for (const [i, left] of rows(ticks.fuel)) {
    if (world.fuel.has(i)) world.fuel.set(i, keep(world.fuel.get(i), left));
  }
  for (const [i, water] of rows(ticks.barrels)) {
    if (world.barrels.has(i)) world.barrels.set(i, keep(world.barrels.get(i), water));
  }
  if (world.tower && Number.isFinite(ticks.oil)) world.tower.oil = keep(world.tower.oil, ticks.oil);
}

// The keeper says how things stand.
function sendTicks(world) {
  const tenth = (n) => Math.round(n * 10) / 10;
  const crops = [...world.crops].slice(0, TICKS_MOST).map(([i, c]) => [i, tenth(c.grown), tenth(c.water), tenth(c.dry)]);
  const fuel = [...world.fuel].slice(0, TICKS_MOST).map(([i, left]) => [i, tenth(left)]);
  const barrels = [...world.barrels].slice(0, TICKS_MOST).map(([i, water]) => [i, tenth(water)]);
  const ticks = { crops, fuel, barrels };
  if (world.tower && world.tower.oil > 0) ticks.oil = Math.round(world.tower.oil * 1000) / 1000;
  const words = JSON.stringify(ticks);
  if (words === together.ticked) return;
  together.ticked = words;
  say({ t: 'ticks', ...ticks });
}

// A phone put away stops running the game, so it hangs up, and the room picks a new keeper if it has
// to. It comes back when it's picked up again.
function togetherVisibility() {
  if (!together.code) return;
  if (document.visibilityState === 'hidden') hangUp();
  else if (!together.socket) connectTo(`/island/${together.code}`);
}

// ---- The hunt ----
//
// No one phone runs the night. Each creature is run by the phone of whoever it's after, exactly as it
// would be alone (creatures.js), so what bites you, and your hit on what's after you, happen at once
// with no waiting on the internet. That phone says where its creatures are (`c`, with where it says
// you are), and everyone else's phone draws them gliding there. `owner` says who's running one: their
// id, or null if it's you.
//
// If somebody else is nearer one, it turns on them, and its phone hands it over to theirs. If you go
// down, what was after you turns on whoever's nearest. If somebody's phone goes away, what it was
// running melts back into the dark, and more will come out.
//
// All of this is passed on by the room and never kept. By morning none of it matters.

// What's heard about the hunt from the room, besides the `c` on `at`.
const HUNT_NEWS = {
  give: heardGive,
  hurt: heardHurt,
  bit: heardBit,
  claw: heardClawed,
  bang: heardBang,
};

// False until you're really on the island: between hearing from the room and being ready, the world
// on your phone may still be your own.
function huntIsHere() {
  return Boolean(together.code) && !together.arriving;
}

// How many other people are within `reach` tiles of (at.x, at.y) and still on their feet.
function peopleNearby(at, reach = GONE_DISTANCE) {
  let count = 0;
  for (const other of together.others.values()) {
    if (other.pose !== 'fallen' && Math.hypot(other.toX - at.x, other.toY - at.y) <= reach) count++;
  }
  return count;
}

// The nearest person to a creature who's still on their feet: { id, away }, or null if there's nobody.
function nearestOther(creature) {
  let nearest = null;
  for (const [id, other] of together.others) {
    if (other.pose === 'fallen') continue;
    const away = Math.hypot(other.toX - creature.x, other.toY - creature.y);
    if (!nearest || away < nearest.away) nearest = { id, away };
  }
  return nearest;
}

// Other people's lit torches, for things in the dark to keep away from (see lightsToFear).
function torchesOfOthers() {
  const torches = [];
  for (const other of together.others.values()) {
    if (other.lit && other.pose !== 'fallen') {
      torches.push({ x: other.toX, y: other.toY, reach: TOOLS.torch.light, torch: true });
    }
  }
  return torches;
}

// One creature in as few characters as it can be. The room tidies these (tidyCreature, server/src/index.js).
function creatureRow(creature) {
  const { id, kind, x, y, hp } = creature;
  const fade = Math.round(creature.fade * 10) / 10;
  return [id, kind, hundredth(x), hundredth(y), creature.state, fade, hp];
}

// A position, in as few characters as still looks smooth.
function hundredth(n) {
  return Math.round(n * 100) / 100;
}

// A creature from a row somebody's phone sent, or null if it isn't one we can draw.
function creatureFromRow([id, kind, x, y, doing, fade, hp]) {
  const fair = Object.keys(CREATURES).includes(kind) && [id, x, y, fade, hp].every(Number.isFinite);
  if (!fair) return null;
  const creature = newCreature(kind, x, y, id);
  creature.state = doing;
  creature.fade = fade;
  creature.hp = hp;
  state.creatures.push(creature);
  return creature;
}

// Checks whether something this phone is running should turn on somebody else, because they're nearer
// (or it can't get to you, so they might as well be), and hands it over if so. Returns true if it did.
// Something off the lighthouse's stairs stays after whoever's pumping.
function turnsOnSomeoneElse(game, creature) {
  if (together.others.size === 0 || !together.greeted || creature.stairs) return false;
  if (creature.state !== 'creep' && creature.state !== 'lurk' && creature.state !== 'claw') return false;
  if (game.time - creature.changedAt < HAND_OVER_SECONDS) return false;
  const { player } = game;
  const shutOut = stepsAt(Math.floor(creature.x), Math.floor(creature.y)) < 0;
  const yours = Math.hypot(player.x - creature.x, player.y - creature.y) + (shutOut ? HAND_OVER_WALLED : 0);
  const nearest = nearestOther(creature);
  if (!nearest || nearest.away > yours - HAND_OVER_NEARER) return false;
  giveCreature(game, creature, nearest.id);
  return true;
}

// Hands something this phone is running to somebody else's. From here on it's only drawn here.
function giveCreature(game, creature, to) {
  if (creature.state !== 'lurk') creature.state = 'creep'; // they'll work out for themselves what it does next
  say({ t: 'give', to, c: creatureRow(creature) });
  creature.owner = to;
  creature.toX = creature.x;
  creature.toY = creature.y;
  creature.changedAt = game.time;
  creature.clawing = null;
  creature.den = null;
  creature.stairs = false;
}

// A creature's changed hands. If it's to you, this phone runs it from now on.
function heardGive({ to, c }) {
  if (slainJustNow(c[0])) return;
  const creature = state.creatures.find((one) => one.id === c[0]) || creatureFromRow(c);
  if (!creature) return;
  const [, , x, y, doing, fade, hp] = c;
  creature.owner = to === together.you ? null : to;
  creature.changedAt = state.time;
  creature.toX = x;
  creature.toY = y;
  creature.state = doing;
  creature.fade = fade;
  creature.hp = hp;
  if (to !== together.you) return;
  creature.x = x;
  creature.y = y;
  creature.timer = 0;
  field.at = -Infinity; // the map of steps may not reach it yet
  if (state.dead || state.dying) creaturesLoseYou(state); // you went down just as it was on its way to you
}

// You've gone down, and can't run anything until you're up again. Whatever was after you turns on
// whoever's nearest, or slinks off if there's nobody within reach of it.
function creaturesLoseYou(game) {
  for (const creature of game.creatures) {
    if (creature.owner) continue;
    const nearest = creature.state === 'fade' ? null : nearestOther(creature);
    if (nearest && nearest.away <= GONE_DISTANCE) giveCreature(game, creature, nearest.id);
    else creature.gone = true;
  }
  game.creatures = game.creatures.filter((creature) => !creature.gone);
}

// What's listed by the phone running them: where they are now, and any new ones. Any it was running
// and hasn't listed have gone.
function heardHunt(owner, rows) {
  if (!together.others.has(owner)) return;
  const listed = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    const [id, kind, x, y, doing, fade, hp] = row;
    listed.add(id);
    if (slainJustNow(id)) continue;
    const known = state.creatures.find((one) => one.id === id);
    if (known && !known.owner) continue; // it's been handed to you since they said this
    const creature = known || creatureFromRow(row);
    if (!creature) continue;
    if (!known) heardComingOut(creature);
    if (creature.state === 'lurk' && doing === 'lunge') heardSpring(creature);
    creature.owner = owner;
    creature.toX = x;
    creature.toY = y;
    creature.state = doing;
    creature.fade = fade;
    if (state.time - creature.hurtAt > 0.5) creature.hp = hp; // news of your own hit may not have got there yet
  }
  for (const creature of state.creatures) {
    if (creature.owner !== owner || listed.has(creature.id)) continue;
    // Just handed over? Its new phone may not have heard yet when it sent this.
    if (state.time - creature.changedAt > HAND_OVER_GRACE) creature.gone = true;
  }
}

// Something has come out of the dark on somebody else's phone. It sounds and warns as it would on yours,
// but one you're only just hearing about that's been out a while (you've arrived, say) doesn't.
function heardComingOut(creature) {
  const { player, hunt } = state;
  const kind = CREATURES[creature.kind];
  const near = Math.hypot(creature.x - player.x, creature.y - player.y) <= GONE_DISTANCE;
  if (creature.fade < THEIR_COMING_OUT && kind.sound) playSoundAt(state, kind.sound, creature.x, creature.y);
  if (near && !hunt.seen[creature.kind]) {
    hunt.seen[creature.kind] = true;
    showMessage(state, kind.seen);
  }
}

function heardSpring(creature) {
  playSoundAt(state, CREATURES[creature.kind].spring, creature.x, creature.y);
  burst(state.fx, creature.x, creature.y, 'grass', 6);
}

// A wound to a creature, by you. Everyone hears, and the phone running it does the rest.
function tellWound(creature, damage, from) {
  if (together.code) say({ t: 'hurt', i: creature.id, d: damage, x: from.x, y: from.y });
}

function heardHurt({ i, d, x, y }) {
  const creature = state.creatures.find((one) => one.id === i);
  if (creature) hurtCreature(state, creature, d, { x, y });
}

// A creature's been killed, but it's on somebody else's phone that may not have heard yet.
function rememberSlain(game, creature) {
  if (creature.owner) together.slain.set(creature.id, game.time + SLAIN_SECONDS);
}

function slainJustNow(id) {
  const until = together.slain.get(id);
  if (until === undefined) return false;
  if (state.time < until) return true;
  together.slain.delete(id);
  return false;
}

// Something's bitten you: the others see and hear it, if they're near enough.
function tellBitten(amount) {
  if (together.code) say({ t: 'bit', n: amount });
}

function heardBit({ by, n }) {
  const other = together.others.get(by);
  if (!other) return;
  other.hurtAt = state.time;
  burst(state.fx, other.x, other.y - 1, 'shadow', 4);
  floatText(state.fx, other.x, other.y - 3, `-${n}`, '#ff5a4e');
  playSoundAt(state, 'bite', other.x, other.y);
  if (!state.hunt.heardCry) {
    state.hunt.heardCry = true;
    showMessage(state, 'Somebody cries out in the dark.');
  }
}

// Claw marks on a wall: on a shared island everyone sees them, and anyone can repair them.
function tellClawed(index, scratches) {
  if (state.world.shared) say({ t: 'claw', i: index, n: scratches });
}

function heardClawed({ i, n }) {
  const { world, fx } = state;
  const key = world.objects[i];
  if (!key || !OBJECTS[key].claws) return;
  if (n <= 0) {
    world.clawed.delete(i);
    return;
  }
  world.clawed.set(i, n);
  const x = i % world.width;
  const y = (i - x) / world.width;
  if (Math.hypot(x + 0.5 - state.player.x, y + 0.5 - state.player.y) > NEWS_REACH) return;
  fx.shake = { index: i, until: state.time + 0.18 };
  burst(fx, x + 0.5, y + 0.5, OBJECTS[key].burst || 'wood', 3);
  playSoundAt(state, 'claw', x + 0.5, y + 0.5);
}

// You've fired: everyone hears it, and sees the streak if it's on their screen.
function tellShot(gun, from, shot) {
  if (!together.code) return;
  const [x, y, tx, ty] = [from.x, from.y, shot.x, shot.y].map(hundredth);
  say({ t: 'bang', g: gun, x, y, tx, ty });
}

function heardBang({ by, g, x, y, tx, ty }) {
  const gun = TOOLS[g] && TOOLS[g].gun;
  if (!gun) return;
  const other = together.others.get(by);
  if (other) other.shot = { x: tx, y: ty, at: state.time };
  playSoundAt(state, gun.sound, x, y);
  hearShot(state, { x, y });
}

// Every frame: what other phones are running glides to where they last said it was. If whoever was
// running one has gone, it melts away (though if they're only reconnecting, it's back on their next word).
function stepTheirCreatures(game, dt) {
  let anyGone = false;
  for (const creature of game.creatures) {
    if (creature.owner && !together.others.has(creature.owner)) {
      creature.state = 'fade';
      creature.fade -= dt / FADE_SECONDS;
      if (creature.fade <= 0) creature.gone = true;
    } else if (creature.owner) {
      const dx = creature.toX - creature.x;
      const dy = creature.toY - creature.y;
      const away = Math.hypot(dx, dy);
      const t = away > OTHER_JUMP ? 1 : 1 - Math.exp(-OTHER_FOLLOW * dt);
      creature.x += dx * t;
      creature.y += dy * t;
      if (away <= OTHER_JUMP) creature.stride += away * t;
    }
    anyGone = anyGone || creature.gone;
  }
  if (anyGone) game.creatures = game.creatures.filter((creature) => !creature.gone);
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
  other.hurtAt = -Infinity; // when something last bit them, in your seconds of play, to flash them red
  other.shot = null; // their last gunshot: where it went and when, { x, y, at }, for its streak and flash
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
  if (place.n === 'fallen' && other.pose !== 'fallen') showMessage(state, 'Somebody has fallen.');
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
  stepTheirCreatures(game, dt);
  sendChanges(dt);
  together.tickIn -= dt;
  if (together.tickIn <= 0) {
    together.tickIn = TICK_SECONDS;
    if (worldIsMine() && together.greeted) sendTicks(game.world);
  }
  together.sendIn -= dt;
  if (together.sendIn <= 0) {
    together.sendIn = SEND_SECONDS;
    const place = whereIAm(game);
    const words = JSON.stringify(place);
    if (words !== together.sent && together.greeted) {
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
  const place = {
    x: hundredth(player.x),
    y: hundredth(player.y),
    f: player.facing,
    n: game.dead ? 'fallen' : pose.name === 'blink' ? 'stand' : pose.name,
    h: pose.held || null,
    k: Boolean(survivor.tools.torch),
    l: survivor.torchLeft > 0,
  };
  // And what's after you (see "The hunt", above). Standing still with nothing after you sends nothing.
  const mine = game.creatures.filter((creature) => !creature.owner && !creature.gone);
  if (mine.length) place.c = mine.map(creatureRow);
  return place;
}
