// Fishing. With a rod (TOOLS.rod), face water and hold the action button: the line goes out, a
// bobber floats on the water, and after a while something bites. The bobber dips, and a moment
// later you land a fish, or it gets away. Keep holding and you cast again. Let go, or walk, and you
// reel in.
//
// Which water has fish, and how often a bite ends in a catch, is `fish` in TILES. Raw fish can't
// be eaten: cook it at a campfire (RECIPES.cookFish).

const FISH_BITE_SECONDS = [3, 8]; // how long the bobber sits before a bite, at random between these
const FISH_HOOK_SECONDS = 0.7; // the bobber bobs under this long before the fish comes in
const FISH_CAST_TILES = 2; // the bobber lands this many tiles past the edge, if the water goes on
const FISH_THIRST = 75; // below this much water, facing water still offers Drink first
const FISH_LINE_STEP = 0.3; // the line is drawn as a dot every this many tiles
const BOBBER_COLOR = '#ff5a4a';
const LINE_COLOR = '#e8eef2';

// Whether facing this ground should offer Fish rather than Drink.
function wantsToFish(survivor, ground) {
  return Boolean(ground && ground.fish && survivor.tools.rod && survivor.vitals.water >= FISH_THIRST);
}

// One press (or swing) of Fish: casts the line, if it isn't out already.
function castLine(game, target) {
  if (game.fishing) return;
  const { world, player } = game;
  const facing = FACINGS[player.facing];
  // Out past the edge as far as the water goes, up to FISH_CAST_TILES further.
  let x = target.x;
  let y = target.y;
  for (let n = 0; n < FISH_CAST_TILES; n++) {
    const ground = groundAt(world, x + facing.x, y + facing.y);
    if (!ground || !ground.fish) break;
    x += facing.x;
    y += facing.y;
  }
  const [soonest, latest] = FISH_BITE_SECONDS;
  game.fishing = {
    x: x + 0.5,
    y: y + 0.5,
    ground: world.ground[y * world.width + x],
    castAt: game.time,
    biteAt: game.time + soonest + Math.random() * (latest - soonest),
    hookedAt: null,
  };
  playSound('cast');
  burst(game.fx, x + 0.5, y + 0.5, 'water', 3);
}

// Runs every update while the line is out: waits for a bite, then lands the fish (or loses it).
function updateFishing(game) {
  const fishing = game.fishing;
  if (!fishing) return;
  const { player, survivor, fx } = game;
  if (player.working !== 'Fish' || player.moving) {
    game.fishing = null;
    if (game.time - fishing.castAt < 1) showMessage(game, 'Hold the button to keep your line in the water.');
    return;
  }
  if (!fishing.hookedAt) {
    if (game.time < fishing.biteAt) return;
    fishing.hookedAt = game.time; // a bite: the bobber goes under
    playSoundAt(game, 'plop', fishing.x, fishing.y);
    burst(fx, fishing.x, fishing.y, 'water', 4);
    buzz(15);
    return;
  }
  if (game.time - fishing.hookedAt < FISH_HOOK_SECONDS) return;
  game.fishing = null; // the next swing casts again, if the button's still held
  if (Math.random() < TILES[fishing.ground].fish) {
    survivor.pack.fish++;
    playSound('catch');
    burst(fx, fishing.x, fishing.y, 'water', 10);
    floatText(fx, player.x, player.y - 3, '+1 fish', ITEMS.fish.color);
    if (!survivor.warned.fish) {
      survivor.warned.fish = true;
      showMessage(game, 'A fish! Cook it at a campfire before you eat it.');
    }
    buzz(30);
  } else {
    showMessage(game, 'It got away.');
  }
}
