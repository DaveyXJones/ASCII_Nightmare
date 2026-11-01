// The garden: dig a bed with the spade, plant potatoes, pumpkin seeds or a cutting in it, and keep it
// watered, and it grows.
//
// A garden bed is `soil` in OBJECTS. Facing one with something to plant, the action button says
// Plant; the craft panel's Garden tab picks what (and plants a row of them in build mode). A plant
// is an object with `crop`: it only grows while it has water in it, and each watering lasts
// WET_SECONDS. Left dry for WILT_SECONDS, it wilts. Rain waters everything. Carry water in the
// bucket (TOOLS.bucket): fill it at the water's edge or a well, and the button says Water on a plant
// that wants it.
//
// How far each plant has got is kept in world.crops (tile index -> { grown, water, dry }, all in
// seconds), and saved with the world (see save.js).
//
// A rain barrel saves the walk to the water: it fills whenever it rains, and you can drink from it or
// fill the bucket at it. What's in each is kept in world.barrels (tile index -> waterings).

const WET_SECONDS = 240; // a watering keeps a plant growing for this long
const WILT_SECONDS = 300; // left dry this long, a plant wilts and dies
const WATER_WANTED = 0.5; // the button offers Water once a plant has less than this share of a watering left
const RAIN_WATERS = 0.3; // rain heavier than this (0 to 1) waters every plant
const FILL_THIRST = 75; // thirstier than this (water below it), facing water drinks instead of filling the bucket
const GARDEN_NEWS_REACH = 24; // what happens in a garden is news if you're within this many tiles of it
const GARDEN_NEWS_EVERY = 45; // seconds between reminders that the garden is drying out
const DRY_TINT = '#b89a5a'; // a plant gone dry is drawn with its colors pushed toward this straw color
const BARREL_HOLDS = 12; // waterings in a full rain barrel (a long drink counts as one): three bucketfuls
const BARREL_FILL_SECONDS = 120; // seconds of pouring rain to fill one from empty; lighter rain takes longer

let gardenToldAt = -Infinity; // when the game last said the garden was drying out

// What the Plant button would plant: the same as last time, if you've still got some, or else the
// first thing on the Garden tab you have. Returns a key in RECIPES, or null if you've nothing to plant.
function plantFor(survivor) {
  const keys = Object.keys(RECIPES).filter((key) => RECIPES[key].plants);
  if (survivor.planting) keys.unshift(survivor.planting);
  return keys.find((key) => canAfford(survivor.pack, RECIPES[key].cost)) || null;
}

// Puts what a planting recipe makes in the bed at (x, y). It starts dry: water it.
function plant(game, x, y, key) {
  const { world, player, survivor, fx } = game;
  const recipe = RECIPES[key];
  spend(survivor.pack, recipe.cost);
  setObject(world, x, y, recipe.builds);
  world.crops.set(y * world.width + x, { grown: 0, water: 0, dry: 0 });
  survivor.planting = key;
  player.act = { action: 'Plant', at: player.clock };
  burst(fx, x + 0.5, y + 0.5, 'dust', 6);
  playSound('dig');
  buzz(20);
  if (!survivor.warned.planted) {
    survivor.warned.planted = true;
    showMessage(game, 'Planted. Water it, or it will wilt.');
  }
}

// The Plant button, facing an empty garden bed.
function plantHere(game, target) {
  const key = plantFor(game.survivor);
  if (key) plant(game, target.x, target.y, key);
  else showMessage(game, target.object.empty);
}

// ---- Water ----

// True if a plant at (x, y) has less than WATER_WANTED of a watering left.
function cropWantsWater(world, x, y) {
  const crop = world.crops.get(y * world.width + x);
  return Boolean(crop) && crop.water < WET_SECONDS * WATER_WANTED;
}

// The color to tint a plant's picture with: straw, once it's dry and stopped growing, or null.
function cropTint(world, i) {
  const crop = world.crops.get(i);
  return crop && crop.water <= 0 ? DRY_TINT : null;
}

// True if you've a bucket that isn't full, and you're not so thirsty you'd rather drink.
function wantsToFill(survivor) {
  return (
    Boolean(survivor.tools.bucket) &&
    survivor.bucket < TOOLS.bucket.holds &&
    survivor.vitals.water >= FILL_THIRST
  );
}

function fillBucket(game, target) {
  const { survivor, fx } = game;
  survivor.bucket = TOOLS.bucket.holds;
  burst(fx, target.x + 0.5, target.y + 0.5, 'water', 6);
  playSound('drink');
  floatText(fx, game.player.x, game.player.y - 3, 'bucket filled', '#7ab4e8');
}

// Pours one bucketful's worth on a plant: it grows for WET_SECONDS from now.
function waterPlant(game, target) {
  const { world, survivor, fx } = game;
  if (!survivor.tools.bucket) {
    showMessage(game, 'You need a bucket to carry water. Make one in Craft.');
    return;
  }
  if (survivor.bucket <= 0) {
    showMessage(game, 'Your bucket is empty. Fill it at the water, or at a well.');
    return;
  }
  survivor.bucket--;
  const crop = world.crops.get(target.y * world.width + target.x);
  crop.water = WET_SECONDS;
  crop.dry = 0;
  burst(fx, target.x + 0.5, target.y + 0.5, 'water', 8);
  playSound('pour');
  floatText(fx, target.x + 0.5, target.y - 1, 'watered', '#7ab4e8');
  buzz(15);
}

// ---- Rain barrels ----

// What the action button does at the rain barrel at (x, y), for findTarget (survival.js): with a
// bucket to fill and no great thirst, fill it; otherwise drink. Empty, it's the barrel's own action
// (Take down), so this says null.
function barrelTarget(world, survivor, x, y, object) {
  if ((world.barrels.get(y * world.width + x) || 0) < 1) return null;
  const fill = wantsToFill(survivor);
  return { x, y, label: fill ? 'Fill' : 'Drink', object, barrel: fill ? 'fill' : 'drink' };
}

// One press of the button at a barrel with water in it.
function useBarrel(game, target) {
  const { world, survivor, fx } = game;
  const i = target.y * world.width + target.x;
  const water = world.barrels.get(i) || 0;
  let left = water;
  if (target.barrel === 'fill') {
    left -= Math.min(TOOLS.bucket.holds - survivor.bucket, Math.floor(water));
    survivor.bucket += water - left;
    playSound('pour');
    floatText(fx, game.player.x, game.player.y - 3, 'bucket filled', '#7ab4e8');
  } else {
    if (survivor.vitals.water >= 99) {
      showMessage(game, `You've had your fill. The barrel has ${Math.floor(water)} of ${BARREL_HOLDS} left.`);
      return;
    }
    survivor.vitals.water = Math.min(100, survivor.vitals.water + SIP_WATER);
    left -= 1;
    playSound('drink');
    floatText(fx, target.x + 0.5, target.y - 3, '+water', '#7ab4e8');
  }
  world.barrels.set(i, left);
  burst(fx, target.x + 0.5, target.y - 1, 'water', 6);
  buzz(15);
  if (left < 1) showMessage(game, 'That\'s the last of the barrel. It will fill again when it rains.');
}

// Every moment: rain fills the barrels. A barrel that's just brimmed over is news if you're near it.
function updateBarrels(game, dt) {
  const { world, sky } = game;
  if (world.barrels.size === 0 || sky.weather.rain <= 0) return;
  const rise = (sky.weather.rain * BARREL_HOLDS * dt) / BARREL_FILL_SECONDS;
  for (const [i, water] of world.barrels) {
    if (water >= BARREL_HOLDS) continue;
    const now = Math.min(BARREL_HOLDS, water + rise);
    world.barrels.set(i, now);
    if (now < BARREL_HOLDS) continue;
    const x = i % world.width;
    gardenNews(game, x, (i - x) / world.width, 'Your rain barrel is full.', true);
  }
}

// Which picture a barrel uses, from its `levels`, emptiest first: dry, a little, and two thirds or more.
function barrelPicture(world, i, object) {
  const water = world.barrels.get(i) || 0;
  if (water < 1) return object.levels[0];
  return object.levels[water < (BARREL_HOLDS * 2) / 3 ? 1 : 2];
}

// ---- Growing ----

// Every moment: plants with water in them grow (rain keeps them all watered), and plants left dry
// for too long wilt.
function updateGarden(game, dt) {
  const { world, sky } = game;
  if (world.crops.size === 0) return;
  const raining = sky.weather.rain > RAIN_WATERS;
  for (const [i, crop] of world.crops) {
    const x = i % world.width;
    const y = (i - x) / world.width;
    const object = OBJECTS[world.objects[i]];
    if (!object || !object.crop) {
      world.crops.delete(i); // not a plant any more
      continue;
    }
    if (raining) {
      crop.water = WET_SECONDS;
      crop.dry = 0;
    }
    if (crop.water > 0) {
      crop.water = Math.max(0, crop.water - dt);
      crop.grown += dt;
      if (crop.water === 0) gardenNews(game, x, y, 'Your garden is drying out. Water it, or it will wilt.');
      if (crop.grown >= object.crop.grows) grow(game, i, x, y, object.crop);
    } else {
      crop.dry += dt;
      if (crop.dry >= WILT_SECONDS) {
        setObject(world, x, y, 'wilted');
        gardenNews(game, x, y, 'A plant in your garden has wilted for want of water.', true);
      }
    }
  }
}

// A plant grows into its next stage. If that's the last, it stops being a plant that needs watering:
// it's ready to harvest, or it's a berry bush or a cotton plant like the wild ones.
function grow(game, i, x, y, stage) {
  const { world, player, fx } = game;
  const next = OBJECTS[stage.into];
  // Something solid (a bush) can't grow up round your feet: it waits for you to step off.
  if (next.solid && feetOn(player, x, y)) return;
  if (next.crop) {
    world.objects[i] = stage.into; // the same plant, bigger, with the water it had
    world.crops.get(i).grown = 0;
  } else {
    setObject(world, x, y, stage.into);
  }
  burst(fx, x + 0.5, y + 0.5, 'leaf', 4);
  if (stage.says) gardenNews(game, x, y, stage.says, true);
}

// Says something about the garden at (x, y) if you're near enough to it. Reminders that it's drying
// out come at most every GARDEN_NEWS_EVERY seconds; `always` news comes every time.
function gardenNews(game, x, y, text, always = false) {
  const { player } = game;
  if (Math.hypot(x + 0.5 - player.x, y + 0.5 - player.y) > GARDEN_NEWS_REACH) return;
  if (!always && game.time - gardenToldAt < GARDEN_NEWS_EVERY) return;
  if (!always) gardenToldAt = game.time;
  showMessage(game, text);
}
