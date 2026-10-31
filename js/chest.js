// The chest: somewhere to keep things safe. What you carry is lost when you die, but a chest stays
// where you built it, and so does everything in it.
//
// Face a chest and the action button says Open. The chest panel shows your pack on one side and
// the chest on the other: tap something to move all of it across. Tools go in and out one at a
// time, and you only ever carry one of each. The game pauses while the panel is open.
//
// What's in each chest is kept in world.chests, by the tile it stands on, and saved with the world
// (see save.js).

const CHEST_GIVES_BACK = { wood: 4 }; // what taking an empty chest down gives back

// An empty chest: how many of each item (keys in ITEMS) and each tool (keys in TOOLS) are in it.
function newChest() {
  return { items: {}, tools: {} };
}

// Only a tap that starts on the chest panel counts. The action button opens the chest the moment
// it's touched, and some phones send that same touch on to whatever is under the finger when it
// lifts, which by then is the panel.
let chestArmed = false;

// Two rows of buttons, one for your pack and one for the chest, with a button for each item and
// tool. Made once at startup.
function setupChest(elements) {
  for (const [side, row] of [['pack', elements.chestPack], ['chest', elements.chestHeld]]) {
    const things = [
      ...Object.keys(ITEMS).map((key) => ({ kind: 'item', key, glyph: ITEMS[key].glyph, color: ITEMS[key].color })),
      ...Object.keys(TOOLS).map((key) => ({ kind: 'tool', key, glyph: TOOLS[key].glyph, color: TOOLS[key].color })),
    ];
    for (const thing of things) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `thing ${thing.kind}`;
      button.dataset.kind = thing.kind;
      button.dataset.key = thing.key;
      const glyph = document.createElement('span');
      glyph.className = 'thing-glyph';
      glyph.textContent = thing.glyph;
      glyph.style.color = thing.color;
      const count = document.createElement('span');
      count.className = 'thing-count';
      button.append(glyph, count);
      button.addEventListener('click', () => {
        if (chestArmed) moveThing(thing.kind, thing.key, side === 'pack');
      });
      row.append(button);
    }
  }
  const armed = (action) => () => {
    if (chestArmed) action();
  };
  elements.chest.addEventListener('pointerdown', () => {
    chestArmed = true;
  }, true);
  elements.chestPut.addEventListener('click', armed(() => moveAll(true)));
  elements.chestTake.addEventListener('click', armed(() => moveAll(false)));
  elements.chestRemove.addEventListener('click', armed(takeDownChest));
  elements.chestClose.addEventListener('click', armed(closeChest));
  // Tapping the dark space around the panel closes it too.
  elements.chest.addEventListener('click', (event) => {
    if (chestArmed && event.target === elements.chest) closeChest();
  });
}

// Opens the chest standing on tile `index`.
function openChest(game, index) {
  if (!game.world.chests.has(index)) game.world.chests.set(index, newChest());
  game.chest = index;
  game.paused = true;
  chestArmed = false;
  releaseAll();
  playSound('build');
  refreshChest();
  elements.chest.hidden = false;
}

function closeChest() {
  if (elements.chest.hidden) return;
  elements.chest.hidden = true;
  state.chest = null;
  state.paused = false;
  saveGame(state); // what's in a chest matters: keep it now rather than in a few seconds
}

// What's in the open chest.
function openedChest() {
  return state.world.chests.get(state.chest);
}

// Shows how many of each thing are on each side, and dims what there's none of.
function refreshChest() {
  const { pack, tools } = state.survivor;
  const chest = openedChest();
  for (const button of elements.chestPack.children) {
    const { kind, key } = button.dataset;
    const count = kind === 'item' ? pack[key] : tools[key] ? 1 : 0;
    showThing(button, kind, key, count, count > 0);
  }
  for (const button of elements.chestHeld.children) {
    const { kind, key } = button.dataset;
    const count = (kind === 'item' ? chest.items[key] : chest.tools[key]) || 0;
    // You can't take out a tool you already carry: you only ever need one.
    showThing(button, kind, key, count, count > 0 && !(kind === 'tool' && tools[key]));
  }
  const empty = isEmpty(chest);
  elements.chestPut.disabled = !Object.keys(ITEMS).some((item) => pack[item] > 0);
  elements.chestTake.disabled = empty;
  elements.chestRemove.disabled = !empty;
}

function showThing(button, kind, key, count, enabled) {
  const label = kind === 'item' ? String(count) : count > 1 ? `${TOOLS[key].short} ×${count}` : TOOLS[key].short;
  const name = kind === 'item' ? ITEMS[key].name : TOOLS[key].name.toLowerCase();
  button.querySelector('.thing-count').textContent = label;
  button.classList.toggle('none', count === 0);
  button.disabled = !enabled;
  button.setAttribute('aria-label', `${count} ${name}`);
}

function isEmpty(chest) {
  return Object.values(chest.items).every((n) => !n) && Object.values(chest.tools).every((n) => !n);
}

// Moves all of an item, or one tool, into the chest (`intoChest`) or out of it into your pack.
function moveThing(kind, key, intoChest) {
  const survivor = state.survivor;
  const chest = openedChest();
  if (kind === 'item') {
    if (intoChest) {
      chest.items[key] = (chest.items[key] || 0) + survivor.pack[key];
      survivor.pack[key] = 0;
    } else {
      survivor.pack[key] += chest.items[key] || 0;
      delete chest.items[key];
    }
  } else if (intoChest) {
    if (!survivor.tools[key]) return;
    delete survivor.tools[key];
    if (key === 'torch') survivor.torchLeft = 0; // a torch shut in a chest goes out
    chest.tools[key] = (chest.tools[key] || 0) + 1;
  } else {
    if (survivor.tools[key] || !chest.tools[key]) return;
    survivor.tools[key] = true;
    chest.tools[key]--;
    if (chest.tools[key] <= 0) delete chest.tools[key];
  }
  playSound('pick');
  refreshChest();
}

// Put all in: every item in your pack (tools stay in your hands; tap one to put it away). Take all
// out: every item, and every tool you don't already carry.
function moveAll(intoChest) {
  if (intoChest) {
    for (const item of Object.keys(ITEMS)) if (state.survivor.pack[item] > 0) moveThing('item', item, true);
    return;
  }
  const chest = openedChest();
  for (const item of Object.keys(chest.items)) moveThing('item', item, false);
  for (const tool of Object.keys(chest.tools)) moveThing('tool', tool, false);
}

// An empty chest can be taken down again, giving back some of its wood.
function takeDownChest() {
  if (!isEmpty(openedChest())) return;
  const { world, survivor, fx } = state;
  const x = state.chest % world.width;
  const y = (state.chest - x) / world.width;
  closeChest();
  setObject(world, x, y, null);
  const parts = [];
  for (const [item, count] of Object.entries(CHEST_GIVES_BACK)) {
    survivor.pack[item] += count;
    parts.push(`+${count} ${ITEMS[item].name}`);
  }
  burst(fx, x + 0.5, y + 0.5, 'wood', 10);
  floatText(fx, x + 0.5, y - 1, parts.join('  '), ITEMS.wood.color);
  playSound('build');
  buzz(30);
  saveGame(state);
}
