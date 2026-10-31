// Reads the controls into one place, `input`, which the game checks every frame.
//
// Touch: put your left thumb down anywhere on the left half of the screen and a thumbstick
// appears under it; the buttons on the right do things. Hold the action button to keep chopping.
// Keyboard: WASD or the arrow keys to walk, Space or E for the action button, F to eat, C to craft
// (and 1, 2, 3… 0, -, = to pick from the craft panel).

const STICK_RADIUS = 48; // CSS pixels the knob can travel from the middle of the stick
const STICK_DEADZONE = 0.15; // ignore tiny thumb wobbles

const KEY_MOVES = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};
const ACTION_KEYS = new Set(['Space', 'KeyE', 'Enter']);
const EAT_KEYS = new Set(['KeyF']);
const CRAFT_KEYS = new Set(['KeyC']);
const MENU_KEYS = new Set(['KeyP']);
const MAP_KEYS = new Set(['KeyM']);
const RECIPE_KEYS = [
  ...'1234567890'.split('').map((digit) => `Digit${digit}`),
  'Minus',
  'Equal',
];
const BACK_KEYS = new Set(['Escape']); // closes whatever's open, or opens the menu if nothing is

const input = {
  keys: new Set(), // movement keys held down
  stickX: 0, // the thumbstick, from -1 to 1 on each axis
  stickY: 0,
  actionKey: false,
  actionButton: false,
  // One-off presses for the game to handle: 'action' (the moment the action button goes down),
  // 'eat', 'craft', 'menu', 'map', 'back' (Esc), and 'recipe:0', 'recipe:1'… for the number keys.
  presses: [],
};

// Where the player wants to walk: a direction with a length from 0 (standing) to 1 (full speed).
function moveVector() {
  let x = input.stickX;
  let y = input.stickY;
  for (const code of input.keys) {
    x += KEY_MOVES[code][0];
    y += KEY_MOVES[code][1];
  }
  const length = Math.hypot(x, y);
  if (length < STICK_DEADZONE) return { x: 0, y: 0, length: 0 };
  if (length > 1) return { x: x / length, y: y / length, length: 1 };
  return { x, y, length };
}

function actionHeld() {
  return input.actionKey || input.actionButton;
}

function takePress() {
  return input.presses.shift();
}

function releaseAll() {
  input.keys.clear();
  input.actionKey = false;
  input.actionButton = false;
  input.stickX = 0;
  input.stickY = 0;
}

function setupInput({ stickZone, stick, knob, actionButton, eatButton, craftButton, menuButton, mapButton }) {
  window.addEventListener('keydown', (event) => {
    // Leave browser shortcuts like Ctrl+W alone.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const code = event.code;
    if (KEY_MOVES[code]) input.keys.add(code);
    else if (ACTION_KEYS.has(code)) {
      input.actionKey = true;
      if (!event.repeat) input.presses.push('action');
    } else if (EAT_KEYS.has(code)) {
      if (!event.repeat) input.presses.push('eat');
    } else if (CRAFT_KEYS.has(code)) {
      if (!event.repeat) input.presses.push('craft');
    } else if (MENU_KEYS.has(code)) {
      if (!event.repeat) input.presses.push('menu');
    } else if (MAP_KEYS.has(code)) {
      if (!event.repeat) input.presses.push('map');
    } else if (BACK_KEYS.has(code)) {
      if (!event.repeat) input.presses.push('back');
    } else if (RECIPE_KEYS.includes(code)) {
      // 1 is the first recipe, 9 the ninth, then 0, - and =, along the top row of the keyboard.
      if (!event.repeat) input.presses.push(`recipe:${RECIPE_KEYS.indexOf(code)}`);
    } else return;
    event.preventDefault(); // stop the arrow keys and space bar from scrolling the page
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
    if (ACTION_KEYS.has(event.code)) input.actionKey = false;
  });
  // If the window loses focus mid-step we never hear the key go up, so stop everything.
  window.addEventListener('blur', releaseAll);

  setupStick(stickZone, stick, knob);
  holdButton(actionButton, (down) => {
    input.actionButton = down;
    if (down) input.presses.push('action');
  });
  holdButton(eatButton, (down) => {
    if (down) input.presses.push('eat');
  });
  // These open a panel, so they wait for the finger to lift: otherwise the tap could land on the
  // panel as it appears.
  craftButton.addEventListener('click', () => input.presses.push('craft'));
  menuButton.addEventListener('click', () => input.presses.push('menu'));
  mapButton.addEventListener('click', () => input.presses.push('map'));

  // Stop iOS from zooming on a pinch or a double tap while playing.
  document.addEventListener('gesturestart', (event) => event.preventDefault());
  document.addEventListener('dblclick', (event) => event.preventDefault());
}

// Keeps sending a finger's moves to the element it started on, even after it slides off.
function capture(element, pointerId) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // The pointer is already gone (lifted in the same instant); its pointerup will still arrive.
  }
}

// A floating thumbstick: it appears wherever the thumb lands and follows it as it drags.
function setupStick(zone, stick, knob) {
  let pointerId = null;
  let centerX = 0;
  let centerY = 0;

  const moveKnob = (dx, dy) => {
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  zone.addEventListener('pointerdown', (event) => {
    if (pointerId !== null) return;
    event.preventDefault();
    pointerId = event.pointerId;
    capture(zone, pointerId);
    const rect = zone.getBoundingClientRect();
    centerX = event.clientX;
    centerY = event.clientY;
    stick.style.left = `${centerX - rect.left}px`;
    stick.style.top = `${centerY - rect.top}px`;
    stick.classList.add('active');
    moveKnob(0, 0);
  });

  zone.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > STICK_RADIUS) {
      // Dragging past the edge pulls the stick along, so the thumb never runs out of room.
      const pull = distance - STICK_RADIUS;
      centerX += (dx / distance) * pull;
      centerY += (dy / distance) * pull;
      const rect = zone.getBoundingClientRect();
      stick.style.left = `${centerX - rect.left}px`;
      stick.style.top = `${centerY - rect.top}px`;
      dx = event.clientX - centerX;
      dy = event.clientY - centerY;
    }
    moveKnob(dx, dy);
    input.stickX = dx / STICK_RADIUS;
    input.stickY = dy / STICK_RADIUS;
  });

  const end = (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    input.stickX = 0;
    input.stickY = 0;
    stick.classList.remove('active');
    stick.style.left = '';
    stick.style.top = '';
    moveKnob(0, 0);
  };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  zone.addEventListener('lostpointercapture', end);
}

// A button that reports when it's pressed and released, for touch, mouse and pen alike.
function holdButton(button, onChange) {
  let pointerId = null;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    pointerId = event.pointerId;
    capture(button, pointerId);
    button.classList.add('pressed');
    onChange(true);
  });
  const end = (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    button.classList.remove('pressed');
    onChange(false);
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(type, end);
  }
  button.addEventListener('contextmenu', (event) => event.preventDefault());
}
