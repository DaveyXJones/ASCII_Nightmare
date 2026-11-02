// The server for playing together. This isn't part of the game itself: Cloudflare runs it, and the game
// only talks to it over a WebSocket (see js/together.js). It can use `import`, unlike the game.
//
// Each island people are playing on is one "room" (an Island, below), found by its join code. A room
// remembers the island's seed, its size and when it began, keeps every change anyone has made to it,
// and passes along where everyone is and what the things in the dark are up to. It doesn't run the
// game: each phone does that, and one of them at a time (the keeper) looks after whatever happens by
// itself, like plants growing. While nobody's sending anything, Cloudflare lets the room sleep
// (hibernate) and doesn't charge for it.
//
// What people send is never trusted: only tidied-up copies of the fields below go on to anyone else.

import { DurableObject } from 'cloudflare:workers';

const ISLAND_MOST = 8; // how many people can be on one island at once
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0 or O, no 1 or I: they look alike
const CODE_LENGTH = 5;
const CODE_TRIES = 5; // how many new codes to try if one's already taken
const SEED_MOST = 1000000; // seeds run from 0 up to this, like New world's in the game
const SIZE_MOST = 2048; // the largest island anyone can ask for, along each side
const COORD_MOST = 4096; // positions further out than this are nonsense
const SENDS_PER_SECOND = 40; // anyone sending faster than this has the extra messages ignored
const MESSAGE_MOST = 16000; // the longest message accepted, in characters (the keeper's `ticks` are the long ones)
const PAGE_ENTRIES = 200; // a newcomer is sent the island's changes this many at a time
const THINGS_IN_CHEST_MOST = 64;
const NUMBER_MOST = 1000000; // seconds of growing, things in a chest: anything bigger is nonsense
const POSES = new Set(['stand', 'blink', 'walk', 'windup', 'strike', 'crouch', 'fallen']);
const FACINGS = new Set(['up', 'down', 'left', 'right']);
const LOOK_PARTS = ['hat', 'hair', 'skin', 'shirt', 'trousers'];
const COLOR = /^#[0-9a-f]{6}$/;
const NAME = /^[a-zA-Z0-9]{1,40}$/; // the name of a kind of object, item, tool or ground
const WORLD = 'w:'; // the changes to the island are stored under this and their key
const TICKS = 'ticks'; // the keeper's latest numbers, all in one row so they're cheap to store
const CREATURES_SENT_MOST = 16; // how many creatures one phone can say it's running at once
const CREATURE_ID_MOST = 2 ** 31; // a creature's number is below this
const CREATURE_HP_MOST = 100; // hits it can take, and how much one hit can do: anything bigger is nonsense
const DOINGS = new Set(['creep', 'lunge', 'run', 'claw', 'fade', 'lurk', 'hide']); // what a creature can be up to
const PERSON_ID = /^[0-9a-f]{8}$/; // see crypto.randomUUID below

// A look with only colors in it, or null if it isn't one.
function tidyLook(look) {
  if (!look || typeof look !== 'object') return null;
  const tidy = {};
  for (const part of LOOK_PARTS) {
    if (typeof look[part] !== 'string' || !COLOR.test(look[part])) return null;
    tidy[part] = look[part];
  }
  return tidy;
}

const fits = (value) => Number.isFinite(value) && value >= 0 && value <= COORD_MOST;

// Where someone is and what they're doing, with only what's expected in it, or null.
function tidyPlace(message) {
  const { x, y, f, n, h } = message;
  if (!fits(x) || !fits(y) || !FACINGS.has(f) || !POSES.has(n)) return null;
  const held = typeof h === 'string' && h.length <= 2 ? h : null;
  return { x, y, f, n, h: held, k: message.k === true, l: message.l === true };
}

const number = (value) => (Number.isFinite(value) && value >= 0 && value <= NUMBER_MOST ? value : null);

function tidyCounts(counts) {
  if (!counts || typeof counts !== 'object') return {};
  const tidy = {};
  for (const [name, count] of Object.entries(counts).slice(0, THINGS_IN_CHEST_MOST)) {
    if (NAME.test(name) && Number.isInteger(count) && number(count) !== null) tidy[name] = count;
  }
  return tidy;
}

// A change to the island: its key says what it's a change to, and is a letter and a tile.
//   o  what stands on the tile (null if nothing)      g  a floor laid there (null if taken up)
//   c  what's in the chest there                      p  how the plant there is getting on
//   f  a lamp's seconds of fuel                       b  a rain barrel's waterings
// And `t` on its own is the lighthouse's tank. Returns the tidied value (null is a value, meaning
// nothing there), or undefined if it isn't a change this room should keep.
function tidyChange(key, value, tiles) {
  if (key === 't') {
    if (!value || number(value.oil) === null) return undefined;
    return { oil: value.oil, kindled: value.kindled === true };
  }
  const match = typeof key === 'string' ? /^([ogcpfb])(\d{1,7})$/.exec(key) : null;
  if (!match || Number(match[2]) >= tiles) return undefined;
  const kind = match[1];
  if (value === null) return null;
  if (kind === 'o' || kind === 'g') return typeof value === 'string' && NAME.test(value) ? value : undefined;
  if (kind === 'c') {
    return value && typeof value === 'object' ? { items: tidyCounts(value.items), tools: tidyCounts(value.tools) } : undefined;
  }
  if (kind === 'p') {
    if (!value || [value.grown, value.water, value.dry].some((n) => number(n) === null)) return undefined;
    return { grown: value.grown, water: value.water, dry: value.dry };
  }
  return number(value) === null ? undefined : value;
}

// The keeper's numbers: [tile, ...numbers] for each plant, lamp and barrel, and the lighthouse's oil.
function tidyTicks(message, tiles) {
  const rows = (list, numbers) => (Array.isArray(list) ? list : []).filter((row) => (
    Array.isArray(row) && row.length === numbers + 1 && Number.isInteger(row[0]) && row[0] >= 0 && row[0] < tiles &&
    row.slice(1).every((n) => number(n) !== null)
  ));
  const ticks = { crops: rows(message.crops, 3), fuel: rows(message.fuel, 1), barrels: rows(message.barrels, 1) };
  if (number(message.oil) !== null) ticks.oil = message.oil;
  return ticks;
}

// One creature, as a phone says it: [its number, its kind, x, y, what it's doing, how solid it is, its
// hp]. Null if it isn't one.
function tidyCreature(row) {
  if (!Array.isArray(row) || row.length !== 7) return null;
  const [id, kind, x, y, doing, fade, hp] = row;
  if (!Number.isInteger(id) || id < 0 || id >= CREATURE_ID_MOST) return null;
  if (typeof kind !== 'string' || !NAME.test(kind) || !fits(x) || !fits(y) || !DOINGS.has(doing)) return null;
  if (!Number.isFinite(fade) || fade < 0 || fade > 1 || !Number.isFinite(hp) || hp > CREATURE_HP_MOST) return null;
  return [id, kind, x, y, doing, fade, hp];
}

// The creatures a phone says it's running (`c` on its `at` messages): a tidy list, or null for none.
function tidyCreatures(rows) {
  if (!Array.isArray(rows)) return null;
  const tidy = rows.slice(0, CREATURES_SENT_MOST).map(tidyCreature).filter(Boolean);
  return tidy.length ? tidy : null;
}

// News of the hunt: passed straight on and never kept, since by morning it won't matter. Each of these
// returns a tidy copy to pass on, or null if it isn't what it should be. (See "The hunt" in js/together.js.)
const HUNT_NEWS = {
  // A creature's phone hands it to the phone of whoever it's turned on.
  give({ to, c }) {
    const creature = tidyCreature(c);
    return creature && typeof to === 'string' && PERSON_ID.test(to) ? { to, c: creature } : null;
  },
  // Somebody's hurt a creature, from (x, y).
  hurt({ i, d, x, y }) {
    const fair = Number.isInteger(i) && i >= 0 && i < CREATURE_ID_MOST && Number.isFinite(d) && d > 0 && d <= CREATURE_HP_MOST;
    return fair && fits(x) && fits(y) ? { i, d, x, y } : null;
  },
  // Something's bitten the sender, for this much.
  bit({ n }) {
    return Number.isFinite(n) && n > 0 && n <= CREATURE_HP_MOST ? { n } : null;
  },
  // A wall on tile `i` now has this many claw marks (0: it's been repaired).
  claw({ i, n }, person) {
    return Number.isInteger(i) && i >= 0 && i < person.tiles && number(n) !== null ? { i, n } : null;
  },
  // The sender fired a gun, at (tx, ty), from (x, y).
  bang({ g, x, y, tx, ty }) {
    return typeof g === 'string' && NAME.test(g) && [x, y, tx, ty].every(fits) ? { g, x, y, tx, ty } : null;
  },
};

function send(socket, message) {
  try {
    socket.send(JSON.stringify(message));
  } catch {
    // It's gone. Its close will be along in a moment.
  }
}

// What someone looks like and where they are, to tell the others.
function otherFrom(person) {
  return { id: person.id, look: person.look, place: person.place };
}

// One island's room.
export class Island extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // The game pings every so often to keep the line open. This answers without waking the room.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request) {
    const url = new URL(request.url);
    const code = url.pathname.slice(1);
    let island = await this.ctx.storage.get('island');
    const creating = url.searchParams.has('new');
    if (creating && island) return new Response('That code is taken.', { status: 409 });

    const [theirs, ours] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(ours);
    const answer = new Response(null, { status: 101, webSocket: theirs });
    if (creating) {
      const [width, height] = (url.searchParams.get('size') || '').split('x').map(Number);
      const fits = (n) => Number.isInteger(n) && n >= 32 && n <= SIZE_MOST;
      if (!fits(width) || !fits(height)) return this.turnAway(ours, 'no-island', answer);
      island = { code, seed: Math.floor(Math.random() * SEED_MOST), width, height, born: Date.now() };
      await this.ctx.storage.put('island', island);
    }
    if (!island) return this.turnAway(ours, 'no-island', answer);
    const everyone = this.ctx.getWebSockets();
    if (everyone.length > ISLAND_MOST) return this.turnAway(ours, 'full', answer);

    const id = crypto.randomUUID().slice(0, 8);
    ours.serializeAttachment({
      id,
      look: null,
      place: null,
      sends: 0,
      second: 0,
      since: Date.now(),
      tiles: island.width * island.height,
    });
    // Only people who've said what they look like count as here yet (see 'hi' below).
    const others = this.people(ours).filter((person) => person.look).map(otherFrom);
    send(ours, { t: 'welcome', id, code, seed: island.seed, width: island.width, height: island.height,
      born: island.born, now: Date.now(), print: island.print || null, others });
    await this.sendTheIsland(ours);
    return answer;
  }

  // Everything that's changed on the island so far, a page at a time, then the keeper's latest numbers.
  async sendTheIsland(socket) {
    const rows = await this.ctx.storage.list({ prefix: WORLD });
    let page = [];
    for (const [key, value] of rows) {
      page.push([key.slice(WORLD.length), value]);
      if (page.length >= PAGE_ENTRIES) {
        send(socket, { t: 'world', part: page });
        page = [];
      }
    }
    if (page.length) send(socket, { t: 'world', part: page });
    const ticks = await this.ctx.storage.get(TICKS);
    send(socket, { t: 'ready', ticks: ticks || null });
  }

  turnAway(socket, why, answer) {
    send(socket, { t: why });
    socket.close(1000, why);
    return answer;
  }

  // Everyone in the room but `except`, as the notes kept on their sockets.
  people(except) {
    return this.ctx.getWebSockets().filter((socket) => socket !== except).map((socket) => socket.deserializeAttachment());
  }

  tellOthers(from, message) {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket !== from) send(socket, message);
    }
  }

  // The keeper: whoever's been here longest looks after what happens by itself on the island.
  keeperId(leaving) {
    let keeper = null;
    for (const person of this.people(leaving)) {
      if (person && person.look && (!keeper || person.since < keeper.since)) keeper = person;
    }
    return keeper ? keeper.id : null;
  }

  // A change to the island, kept and passed on to everyone, the sender too: everyone applying every
  // change in the order the room saw them is what stops two phones ending up different.
  async heardChange(socket, person, message) {
    const value = tidyChange(message.k, message.v, person.tiles);
    if (value === undefined) return;
    const storage = this.ctx.storage;
    const key = WORLD + message.k;
    // Only `o` needs to remember "nothing": anything else missing just means there's nothing there.
    if (value === null && message.k[0] !== 'o') await storage.delete(key);
    else await storage.put(key, value);
    // Whatever was on a tile takes its chest, its plant and so on with it (see setObject in world.js).
    if (message.k[0] === 'o') {
      const tile = message.k.slice(1);
      await storage.delete(['c', 'p', 'f', 'b'].map((kind) => `${WORLD}${kind}${tile}`));
    }
    const change = { t: 'set', k: message.k, v: value, by: person.id };
    send(socket, change);
    this.tellOthers(socket, change);
  }

  async heardArrival(socket, person, message) {
    const look = tidyLook(message.look);
    if (!look) return;
    const arriving = !person.look;
    person.look = look;
    if (message.t === 'hi') {
      person.place = tidyPlace(message) || person.place;
      // The first to arrive says what the island's fingerprint is, so a later visitor whose version
      // of the game builds a different island from this seed can be told.
      if (Number.isInteger(message.print)) {
        const island = await this.ctx.storage.get('island');
        if (island && !island.print) await this.ctx.storage.put('island', { ...island, print: message.print });
      }
    }
    socket.serializeAttachment(person);
    this.tellOthers(socket, arriving ? { t: 'joined', ...otherFrom(person) } : { t: 'look', id: person.id, look });
    if (arriving) {
      const keeper = { t: 'keeper', id: this.keeperId() };
      send(socket, keeper);
      this.tellOthers(socket, keeper);
    }
  }

  async webSocketMessage(socket, text) {
    if (typeof text !== 'string' || text.length > MESSAGE_MOST) return;
    let message;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    if (!message || typeof message !== 'object') return;
    const person = socket.deserializeAttachment();
    if (!person) return;
    const second = Math.floor(Date.now() / 1000);
    person.sends = person.second === second ? person.sends + 1 : 1;
    person.second = second;
    if (person.sends > SENDS_PER_SECOND) {
      socket.serializeAttachment(person);
      return;
    }

    if (message.t === 'hi' || message.t === 'look') {
      await this.heardArrival(socket, person, message);
      return;
    }
    if (message.t === 'at' && person.look) {
      const place = tidyPlace(message);
      if (place) {
        person.place = place;
        const at = { t: 'at', id: person.id, ...place };
        const creatures = tidyCreatures(message.c);
        if (creatures) at.c = creatures;
        this.tellOthers(socket, at);
      }
    } else if (Object.keys(HUNT_NEWS).includes(message.t) && person.look) {
      const news = HUNT_NEWS[message.t](message, person);
      if (news) this.tellOthers(socket, { t: message.t, by: person.id, ...news });
    } else if (message.t === 'set' && person.look) {
      await this.heardChange(socket, person, message);
    } else if (message.t === 'ticks' && person.look && this.keeperId() === person.id) {
      const ticks = tidyTicks(message, person.tiles);
      await this.ctx.storage.put(TICKS, ticks);
      this.tellOthers(socket, { t: 'ticks', ...ticks });
    }
    socket.serializeAttachment(person);
  }

  async webSocketClose(socket, code) {
    const person = socket.deserializeAttachment();
    if (person && person.look) {
      this.tellOthers(socket, { t: 'left', id: person.id });
      this.tellOthers(socket, { t: 'keeper', id: this.keeperId(socket) });
    }
    try {
      socket.close(code === 1005 || code === 1006 ? 1000 : code, 'bye');
    } catch {
      // Already closed.
    }
  }

  async webSocketError(socket) {
    await this.webSocketClose(socket, 1000);
  }
}

function newCode() {
  const picks = crypto.getRandomValues(new Uint32Array(CODE_LENGTH));
  return Array.from(picks, (pick) => CODE_LETTERS[pick % CODE_LETTERS.length]).join('');
}

function roomFor(env, code) {
  return env.ISLANDS.get(env.ISLANDS.idFromName(code));
}

// Every request starts here: /new makes an island with a new code, and /island/CODE joins one. Both
// are WebSockets; anything else just gets a line to say what this is.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isSocket = request.headers.get('Upgrade') === 'websocket';
    if (!isSocket) return new Response('ASCII Nightmare: the rooms for playing together.\n');

    if (url.pathname === '/new') {
      const size = encodeURIComponent(url.searchParams.get('size') || '');
      for (let tries = 0; tries < CODE_TRIES; tries++) {
        const code = newCode();
        const answer = await roomFor(env, code).fetch(new Request(`https://island/${code}?new=1&size=${size}`, request));
        if (answer.status !== 409) return answer;
      }
      return new Response('No code free. Try again.', { status: 503 });
    }

    const code = url.pathname.startsWith('/island/') ? url.pathname.slice(8).toUpperCase() : '';
    const valid = code.length === CODE_LENGTH && [...code].every((letter) => CODE_LETTERS.includes(letter));
    // A code that can't exist still gets an answer the game can read, instead of a failed connection.
    return roomFor(env, valid ? code : 'NONE').fetch(new Request(`https://island/${valid ? code : 'NONE'}`, request));
  },
};
