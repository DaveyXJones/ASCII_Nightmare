// The server for playing together. This isn't part of the game itself: Cloudflare runs it, and the game
// only talks to it over a WebSocket (see js/together.js). It can use `import`, unlike the game.
//
// Each island people are playing on is one "room" (an Island, below), found by its join code. A room
// remembers the island's seed, its size and when it began, and passes along where everyone is. It
// doesn't run the game: each phone does that. While nobody's sending anything, Cloudflare lets the
// room sleep (hibernate) and doesn't charge for it.
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
const SENDS_PER_SECOND = 30; // anyone sending faster than this has the extra messages ignored
const POSES = new Set(['stand', 'blink', 'walk', 'windup', 'strike', 'crouch', 'fallen']);
const FACINGS = new Set(['up', 'down', 'left', 'right']);
const LOOK_PARTS = ['hat', 'hair', 'skin', 'shirt', 'trousers'];
const COLOR = /^#[0-9a-f]{6}$/;

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

// Where someone is and what they're doing, with only what's expected in it, or null.
function tidyPlace(message) {
  const { x, y, f, n, h } = message;
  const fits = (value) => Number.isFinite(value) && value >= 0 && value <= COORD_MOST;
  if (!fits(x) || !fits(y) || !FACINGS.has(f) || !POSES.has(n)) return null;
  const held = typeof h === 'string' && h.length <= 2 ? h : null;
  return { x, y, f, n, h: held, k: message.k === true, l: message.l === true };
}

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
    ours.serializeAttachment({ id, look: null, place: null, sends: 0, second: 0 });
    // Only people who've said what they look like count as here yet (see 'hi' below).
    const others = this.people(ours).filter((person) => person.look).map(otherFrom);
    send(ours, { t: 'welcome', id, code, seed: island.seed, width: island.width, height: island.height,
      born: island.born, now: Date.now(), others });
    return answer;
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

  async webSocketMessage(socket, text) {
    if (typeof text !== 'string' || text.length > 1000) return;
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
      const look = tidyLook(message.look);
      if (!look) return;
      const arriving = !person.look;
      person.look = look;
      if (message.t === 'hi') person.place = tidyPlace(message) || person.place;
      this.tellOthers(socket, arriving ? { t: 'joined', ...otherFrom(person) } : { t: 'look', id: person.id, look });
    } else if (message.t === 'at' && person.look) {
      const place = tidyPlace(message);
      if (!place) return;
      person.place = place;
      this.tellOthers(socket, { t: 'at', id: person.id, ...place });
    }
    socket.serializeAttachment(person);
  }

  async webSocketClose(socket, code) {
    const person = socket.deserializeAttachment();
    if (person && person.look) this.tellOthers(socket, { t: 'left', id: person.id });
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
