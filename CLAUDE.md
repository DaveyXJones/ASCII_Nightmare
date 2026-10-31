# ASCII Nightmare

A survival game drawn in text characters, played mainly on a phone held sideways (landscape) with
touch controls, and also on a computer with a keyboard. The world is seen in a three-quarter
(3/4) view: ground is flat, and trees, rocks, cliffs, the cottage and the player stand up off it
and overlap whatever is behind them. The owner is building toward a fuller survival game
(crafting, a day and night cycle with things that come out at night, saving, maybe multiplayer);
see "What's next" in README.md.

## Where things stand: the game is online (last updated 2026-10-31)

The game is live at **https://daveyxjones.github.io/ASCII_Nightmare/**. The repository
(`DaveyXJones/ASCII_Nightmare`) is public, its default branch is `main`, and GitHub Pages deploys
from `main`, `/ (root)`. **Every push to `main` updates the live game** within a couple of
minutes, so `main` must always be playable.

- **Checking a deploy.** Each push to `main` starts a "pages build and deployment" run; the GitHub
  `actions_list` tool (`list_workflow_runs`) shows whether it succeeded. Claude's cloud container
  can't open github.io itself (blocked by its network policy), so for what the page actually does,
  serve the game from a subfolder the way Pages does (see "Checking a change").
- **Browser cache.** Pages lets browsers keep files for up to 10 minutes, so right after a merge
  the owner may still see the old game, or briefly a mix of old and new files that misbehaves.
  If they report something broken just after an update, have them wait a few minutes and reload
  before hunting for a bug.
- **Settings live with the owner.** Claude can't change repository settings (visibility, Pages,
  default branch). **The owner finds GitHub hard to navigate**: if a setting needs changing, walk
  them through it one step at a time with direct links (e.g.
  https://github.com/DaveyXJones/ASCII_Nightmare/settings/pages) and exact button names, and ask
  what's on their screen if it doesn't match. GitHub's phone site and app don't show these
  settings; they need a computer.
- **Still to do, owner's side:** put it on the phone's home screen (Safari: Share → **Add to Home
  Screen**; Chrome: ⋮ → **Add to Home screen**). Opened from the icon, it runs full screen.
- **Old branches.** Finished `ccr-…` session branches can be deleted once merged (ask first). A
  Claude session can only push to its own branch (deleting another is cut off with "unexpected
  disconnect"), so the owner does it: https://github.com/DaveyXJones/ASCII_Nightmare/branches,
  trash-can icon at the right end of each branch's row, or **Delete branch** on a merged PR's page.

## Night and the torch (built 2026-10-29)

Crafting (PR #2), the redrawn, animated player (PR #3) and night and the torch (PR #5) are merged
and live. Night and the torch were built to the owner's spec: **a torch costs 2 wood and 1 cloth
(a new item) and must be lit at a campfire; night lasts 10 minutes, with varying darkness and
moonlight.** Choices Claude made that the owner hadn't specified, any of which they may want
changed:

- **Cloth comes from cotton plants** (`cotton` in `OBJECTS`): picked like berry bushes, regrow in
  two minutes. Two stand beside the cottage (`c` in `COTTAGE`) so a new player finds them, and
  more grow in open fields (`pickTerrain`).
- **The cycle:** 8 min day, 1 min dusk, 10 min night, 1 min dawn. Dying wakes you at the next
  morning (`nextMorning`); a new world starts on the first morning.
- **"Varying darkness":** the moon's shape changes nightly through `MOONS` (half, thin, none,
  thin, half, bright, full, bright); it rises and sets over the night, and clouds (noise) cross it.
- **The torch** burns 5 minutes, then goes out but stays in the pack; light it again at any fire.
  Once it's burnt halfway down a fire offers **Light** instead of **Put out**, to top it up.

## Things in the dark (built 2026-10-29)

The owner asked for "things that come out of the dark" with no further spec. Claude's design, all
of it tunable in `CREATURES`, the constants in `js/creatures.js` and `creatures` in `MOONS`:

- **Shades**: dark eared silhouettes with red eyes. Their eyes are drawn above the darkness, so on
  a black night pairs of red eyes are all you see.
- **Light keeps them back**: they never come within `fear.fire`/`fear.torch` (80%) of a light's
  reach, so a lit torch or a campfire means safety, and they pace at the edge. Without light they
  creep in, lunge, bite (8 health) and back off. **They never enter the cottage**, and walls stop
  them: they path round obstacles but can't get through a closed ring (since 2026-10-31, they claw
  through it in the end; see "More in the dark" above).
- **You can hit them**: the action button says **Hit** when one's in reach; 3 hits (2 with the
  axe, `power: { Hit: 2 }`) and it dissolves. Each hit knocks it back and sends it running.
- **The moon sets the number** of each kind out at once (`creatures: { shade: 2 }` on each moon).
- Dying to them shows "The dark takes you." instead of "You collapse."

## The "What's next" list (built 2026-10-31)

The owner asked to build README's "What's next" list ("I like the ideas you have for it"). Items
1 to 5 were built, each its own commit; choices Claude made that the owner hadn't specified, any
of which they may want changed:

- **Your look**: a panel off the menu with a row of color squares each for hat, hair, skin, shirt
  and trousers (`LOOKS` in sprites.js; hair and skin were Claude's addition). Only the main color
  is listed; `dressPlayer` derives the lit and shaded inks into `PLAYER_INK` and marks every player
  picture for redrawing. Kept in localStorage (`LOOK_KEY`, js/save.js).
- **Hurt**: after a bite the player flickers red (`hurtFlash` in render.js: a tinted copy of the
  sprite, see `spriteImage`) and the screen's edges flash red (`.hud.hurt`); while starving, a short
  red flash every 1.5 s. Under reduced motion a bite is one steady flash.
- **Collapse**: when health runs out, `state.dying` holds the player for `COLLAPSE_SECONDS`: the
  `crouch` pose, then `fallen` (lying down), with the screen's edges closing in (`.collapsing`),
  then the death screen fades in. Nothing else updates meanwhile.
- **More to craft**: a stone pick (`TOOLS.pick`, `power: { Mine: 2 }`, held as `⌐`/`¬`); a wooden
  door (`woodDoor`, see below); cooked berries (`RECIPES.cook`, 2 berries → 1 `cooked`: 30 food and
  10 health, only beside a campfire). The Eat button eats the item with the most `food` (`eat`,
  `bestFood`). On short screens the craft cards are small and five to a row, with pictures capped
  at `RECIPE_PICTURE_ROWS_SHORT` rows, so ten fit on a 667×375 phone; keep card texts to about 40
  characters so they stay within three lines.
- **More in the dark**: brutes (`CREATURES.brute`): slow, 6 hp, bite 18, one amber eye, `fear: {
  fire: 0.8, torch: 0 }` so the torch doesn't stop them, out from 150 s into the no-moon and second
  thin-moon nights. Shut-out creatures claw at walls and doors (`claw` state, `scratch`, `claws`
  and `scarred` in OBJECTS); marks live in `world.clawed` and clear by day. A clawing creature
  presses right up to the wall, `HIT_REACH` is 1.9 (a creature against a wall to your side is about
  1.75 away), and a creature in reach always beats any object as the target, so you hit it through
  the wall instead of breaking your own. Nothing claws while you're in the cottage (the map of
  steps is one tile there, so everything looks cut off).
- **Saving** (js/save.js): `saveGame` keeps the seed, the clock, the player, the survivor, and only
  the objects that differ from `world.original` (the island as generated), plus `damage`,
  `clawed` and `regrowing`, in localStorage under `SAVE_KEY`. It runs every `SAVE_EVERY` seconds
  of play, on opening the menu, on hiding the page, on waking and on dying (a save made while dead
  or dying loads as a fresh morning). `loadGame` runs at startup instead of `newGame` when there's
  a save. `worldPrint` fingerprints the generated island: if the world code has changed so the
  seed builds a different island, the pack is kept but map changes are dropped. Creatures aren't
  saved; the night's hunt restarts. Bump `SAVE_VERSION` if the saved shape changes.
- **Sound** (js/sound.js): all synthesized with Web Audio, no files. `SOUNDS` holds one-off sounds
  (`playSound`, `playSoundAt` for panned, distance-faded ones); `updateSound` runs each frame for
  wind (louder at night, muffled indoors), birds by day, crickets at night that hush as creatures
  near (`CRICKET_HUSH`), and crackle near a `flame` object or a lit torch. The audio context is
  made on the first tap (`wakeSound`, browsers require a gesture); Sound on/off in the menu is
  kept under `SOUND_KEY`. Levels were set by rendering each sound offline and measuring peaks
  (actions about 0.35, footsteps 0.07); the compressor only limits the loudest moments.
- **Not built: the outline** (a thin dark edge so the player stands out on busy ground). It bends
  "Draw only characters on the map", so it waits for the owner's say. **Not built: multiplayer**:
  it needs a server, and GitHub Pages only hosts files, so it needs the owner to choose a host.
  Rain was in the sound item but needs weather first; README's "What's next" now lists that.

## Weather (built 2026-10-31)

Item 2 of the second "What's next" list ("Clouds that roll in, rain drawn as falling characters,
and the sound of it. Rain could put out campfires, so a roof starts to matter"). The owner said
"lets work on the Whats next" with no further spec; everything below is Claude's design, tunable in
the constants at the top of js/weather.js:

- **Deterministic, like the moon**: `weatherAt(clock, seed)` is 2-octave `fractalNoise` along the
  clock (`WEATHER_SECONDS` = 240 per unit) mapped through `CLOUDS_FROM`/`OVERCAST_AT` (cloud) and
  `RAIN_FROM`/`POURING_AT` (rain); `storm` is rain above `STORM_FROM`. Simulated over 20 cycles on
  four seeds: rain about 16% of the time, about one spell per day-night cycle, 2 to 4 minutes long;
  storms about 9%. The first day (`DRY_SECONDS`) is dry. Nothing about the weather is saved.
- **Grey light**: `skyAt` (night.js) folds cloud in: cloud hides the moon (`CLOUD_HIDES_MOON`), and
  a grey veil (`OVERCAST_DIM`, `OVERCAST_COLOR`) is laid over day or night. `sky.darkness` includes
  it; `sky.gloom` is the darkness without it (the "eyes" light only shows in gloom).
- **Cloud shadows** drift with `sky.weather.wind` when the sky is patchy (strongest at half cover):
  a 64×64 tileable noise picture (`makeCloudPicture`), one pixel per tile, stretched smooth onto the
  night canvas before the lights are cut out (`drawCloudShadows`).
- **Rain** (`stepRain`, `drawRain` in render.js): world-anchored drops falling 4 to 10 rows to a
  ground spot, bold `\`/`/` (by wind) and `'`, about `RAIN_DROPS` per visible tile; some splash
  into `fx.particles` (`°` on water). On the cottage they land on the roof (`WALL_ROWS` up); with you
  inside none fall there and drawing is clipped off the house. Drawn after the standing pass and
  before the night layer, so at night you only see rain in the light. Frozen under reduced motion.
  Pouring rain is about 240 extra glyph draws (all from the atlas, same alpha, so they batch).
- **Storms**: lightning at random (`LIGHTNING_EVERY` at full storm) sets `state.weather.flashAt`;
  `lightningAt` gives a double flash that takes most of the dark away and washes the screen white
  (`FLASH_LIGHTS`, `FLASH_WASH`), off under reduced motion. Thunder follows after `THUNDER_DELAY`.
- **Fires**: objects with `doused` (the campfire) soak up rain once a second in `soakFires`
  (`world.soaked`, not saved) and become `campfireOut` after `DOUSE_SECONDS` of pouring rain; they
  steam, and warn once past `SPUTTER_AT`. A cold campfire's action is **Light** (`relight`: 1 wood,
  refused while `tooWetToLight`). The **Roof** recipe (`over: ['campfire', 'campfireOut']`, 4
  wood) replaces either with `roofedFire`, which has no `doused`. A lit torch outdoors burns down
  `TORCH_RAIN_BURN` faster in rain (never put out by it directly).
- **Sound**: a second looping noise (`audio.rain`, highpass then lowpass, duller indoors), random
  `patter` ticks, wind up in storms (`STORM_WIND`), `SOUNDS.thunder`; crickets and birds stop in
  rain heavier than `QUIET_IN_RAIN` (so you lose the crickets' warning: lightning makes up for it).
- **HUD**: by day the sky icon shows ☂ in rain and ☁ when overcast.

## Lurkers (built 2026-10-31)

Item 3 ("Lurkers that sit still in the tall grass, eyes open, and spring when you walk too close"),
Claude's design: `CREATURES.lurker` with `lurks: true` comes out (`spawn: [7, 15]` tiles away) only
on `tall` ground, in state `lurk`, drawn with its `crouched` sprite (2 rows; `drawGrassOver` puts
the grass blades back over its lower row, and over every creature's and the player's feet). Its
eyes are yellow-green and never blink (`eyes.stare`). Within `SPRING_RANGE` (2.4) and ≤ 4 steps it
`spring`s: a `lunge` at 9 tiles/s with the `hiss` sound. After the bite and `run` it goes to `hide`:
`findDen` picks the nearest tall grass within `DEN_REACH` that's at least `DEN_AWAY` from you; it
walks there and lurks again, or fades out if there's none or it gets stuck (another may come out
later). 2 hp, bite 10, `fear: { fire: 0.8, torch: 0 }` (the torch doesn't help; watch for eyes).
Moons: none on the first half moon or the two brute nights; 1 on the first thin moon, 2 on the
half and bright moons, 3 under the full moon, so bright nights have their own danger.

## Hard rules

- **No build step, no dependencies, no ES modules.** Plain `<script>` files loaded in order from
  `index.html`, sharing globals. The game must keep working when `index.html` is opened straight
  from disk (file://), where modules and font loading are blocked. Don't add a bundler, a
  framework, npm packages or `import`/`export`.
- **Relative paths only.** The live game sits in a subfolder (`/ASCII_Nightmare/`), not at the site
  root, so a path starting with `/` works on a local server but breaks online. Write `js/game.js`,
  `../fonts/…` in CSS, and keep the manifest's `start_url` and `scope` as `./`.
- **Load order matters** (see `index.html`): `random → tiles → sprites → objects → world → night →
  weather → render → input → sound → survival → crafting → creatures → save → game`. A file may use globals from files
  before it at load time, and from any file inside functions that run later.
- **Phone first.** Every feature needs a touch control that works one-thumb-each-side in landscape
  (left thumb walks, right thumb acts). Keep tap targets large and inside the safe-area insets.
  Keyboard controls are the desktop equivalent, not the primary design.
- **Draw only characters on the map.** Everything in the world is a glyph from a monospace font,
  optionally on a background-color cell. Shadows, dimming and the target brackets are the only
  non-glyph drawing. Block and quadrant characters (`▀▄▌▐▗▖▝▘▙▟▛▜█`) are fine for silhouettes,
  as long as they're mixed with ASCII texture.

## Files

| File | Holds |
| --- | --- |
| `js/random.js` | `hash2`, `valueNoise`, `fractalNoise`. Seeded: same seed, same world. |
| `js/tiles.js` | `TILES`: ground types (glyphs, colors, background shades, `solid`, `animated`, `drink`, `tall`, `raised`, `step`). |
| `js/sprites.js` | `SPRITES` (ASCII art for standing things), the player's `PLAYER_SPRITES`/`PLAYER_INK`, `ACTION_POSES`, and `LOOKS` with `dressPlayer` (the Your look colors). Validated at load by `prepareSprite`. |
| `js/objects.js` | `OBJECTS`: things standing on tiles and what the action button does to them (`action`, `hits`, `gives`, `becomes`, `regrow`, `drink`, `burst`), plus `frames` (flicker between sprites), `warmth` (heal faster nearby), `light` (reach at night, in tiles), `flame` (a torch can be lit at it), `door` and `opens` (a door you've built), `doused` and `relight` (rain putting a fire out, and lighting it again). |
| `js/world.js` | `generateWorld(seed)`, the `COTTAGE` layout, lookups: `groundAt`, `objectAt`, `blockerAt`, `insideHouse`, `setGround`, `setObject`. |
| `js/night.js` | The day and night cycle: phase lengths, `MOONS` (each with how many of each kind of `creatures` come out), `skyAt(clock, seed)` (phase, darkness, color of the dark, share left, the weather), `nextMorning`, `skyMessage`. No drawing. |
| `js/weather.js` | `weatherAt(clock, seed)` (cloud, rain, storm, wind), `updateWeather` (rain messages, the torch in rain, lightning and thunder, `soakFires`), `relightFire`, `lightningAt`. No drawing. |
| `js/render.js` | The renderer: sizing, glyph atlas, sprite images, ground cache, camera, draw order, the night layer (with cloud shadows and lightning), rain. |
| `js/input.js` | `input` state, `moveVector()`, `actionHeld()`, `takePress()`; floating thumbstick and hold buttons. |
| `js/sound.js` | `SOUNDS` (synthesized: noise through a filter and/or a sliding tone), `playSound`, `playSoundAt`, `updateSound` (wind, rain, birds, crickets, crackle), `setSoundOn`. |
| `js/survival.js` | `ITEMS` (with `food`/`heals` for things you eat), vitals and drain rates, `besideFire`, the torch (`torchWantsFire`, `lightTorch`, `updateTorch`, `torchReach`), `findTarget`, `useTarget`, `eat`, `BURSTS`, particles and floating text. |
| `js/crafting.js` | `TOOLS`, `RECIPES`, costs (`canAfford`, `spend`, `toolPower`), build mode (`findBuildSpot`, `build`), the craft panel. |
| `js/creatures.js` | `CREATURES` (shade, brute, lurker), the night's hunt (`updateCreatures`: coming out, creeping, lunging, biting, running, clawing walls, lurking and springing, fading at dawn), the map of steps (`field`, `mapSteps`, `stepsAt`), what they fear (`lightsToFear`, `inLight`), `hitCreature`. |
| `js/save.js` | localStorage: `remember`/`recall` (wrapped so a browser that won't store still plays), `recallLook`, `saveGame`/`loadGame` (the world as changes from its seed), `worldPrint`. |
| `js/game.js` | `state`, player movement and collision, menus (and the Your look panel), collapse and death, HUD updates, the main loop. |
| `css/style.css` | HUD overlay, buttons, menus, the portrait "turn sideways" screen. |
| `fonts/` | DejaVu Sans Mono (regular and bold) as WOFF2, with its license. |
| `manifest.webmanifest`, `icons/` | Home-screen install: full screen, landscape. |
| `.nojekyll` | Empty. Tells GitHub Pages to publish files as they are instead of running Jekyll over them (which would drop anything named `_…`). |

## World model

- A grid of `WORLD_WIDTH × WORLD_HEIGHT` tiles in parallel arrays on `world`: `ground` (keys into
  `TILES`), `objects` (keys into `OBJECTS` or `null`), `heights` (rows of cliff for mountains),
  `shades` (background patch index), `variants` (random byte per tile for glyph and color picks).
- Positions are in tile units. The player's `x, y` is the middle of their feet; collision uses a
  small foot box (`FOOT_HALF_WIDTH`, `FOOT_HALF_DEPTH`), moving one axis at a time with corner
  slipping so thumbstick movement slides through doorways.
- A tile is solid if its ground or its object is `solid` (`blockerAt`).
- `world.original` is `objects` as generated (saving keeps only the differences); `damage`,
  `clawed` and `soaked` are Maps of tile index to swings, scratches or seconds of rain taken
  (`setObject` clears all three; `soaked` isn't saved). **Anything new that should survive
  a reload** (a survivor field, a world Map) needs adding to `saveGame` and `loadGame`.
- `world.house` is the cottage's wall rectangle plus `doorX`. The cottage is drawn specially: a roof
  and front wall from outside, a cutaway with the back wall standing from inside.

## Crafting and build mode (js/crafting.js)

- `RECIPES` drives everything: the craft panel makes one card per recipe at startup
  (`setupCrafting`), in table order, and number keys pick by that order. A recipe with `tool` puts
  a key in `survivor.tools` (lost on death, like the pack); one with `builds` starts build mode; one
  with `gives` adds items to the pack and keeps the panel open (`refreshCraft`). `byFire` recipes
  need `survivor.warm` (beside a campfire), checked in `canMake`. A `builds` recipe with `over` (the
  roof) must be built onto one of those objects and replaces it, instead of going on clear ground.
  Number keys: `1`–`9` then `0` for the tenth (input.js).
  A tool's `power` multiplies swings for an action word (`toolPower`). Each tool needs a hidden
  `tool-<key>` slot in the pack in `index.html`, like each item's `count-<item>`.
- The craft panel pauses the game (`state.paused`). The Craft and menu buttons act on `click`, not
  `pointerdown`, so the tap that opens a panel can't land on the panel as it appears.
- Build mode is `state.building` (a recipe key) and `state.buildSpot` (`{ x, y, problem }`,
  recomputed each update). The spot is the tile one past the front edge of the feet, so it never
  overlaps the player. While building, `findTarget` is skipped and the action button builds once
  per press (the `'action'` press from `input.js`), not on hold. Anything built is an ordinary
  object with an `action` that takes it down again, so a misplaced wall is never a trap.
- **Doors** are objects with `door: true` and no `solid`: the player walks through (`blockerAt`
  ignores them), creatures can't (`creatureCanStand`), and nothing can be built over one. While the
  player is within `DOOR_OPEN_REACH` it's drawn with its `opens` sprite (`objectSprite`).
- `.game > canvas` is the map; the panel's previews are canvases too, copied from `spriteImage`.
- **The torch** is a tool with no `power`: `TOOLS.torch` has `burns` (seconds) and `light` (tiles).
  `survivor.torchLeft` counts down while it's lit (0 = unlit). Facing an object with `flame` while
  `torchWantsFire`, `findTarget` returns a `Light` target instead of the object's own action.
- **Holding the action button keeps doing one thing** (`player.holding`): if the target's label
  changes under the thumb (Light becoming Put out), working stops until the button is released.

## Day and night (js/night.js)

- `state.dayClock` is seconds since the world's first morning; it only runs while playing.
  `update()` recomputes `state.sky = skyAt(...)` every frame and shows `skyMessage` when the phase
  changes. Night `n` (counting from 0) has `MOONS[n % MOONS.length]`.
- Moonlight is the moon's `light` × its height (a sine over the night, never below `MOON_LOW`) ×
  clouds (`fractalNoise` along the night). Darkness runs from `MOONLIT` (full moon) to `DARKEST`.
  Dusk and dawn fade between day and the night's first or last darkness, so it never jumps.
- The HUD's fourth vital (`.vital.sky`) shows ☼ and the daylight left, or the moon and the night
  left.

## Creatures (js/creatures.js)

- `state.creatures` is a list of free-moving things (`{ kind, x, y, hp, state, timer, fade, … }`,
  feet position in tiles like the player), cleared on waking. `state.hunt` remembers when night
  fell, when the next one comes out and which once-a-night messages have shown. `updateCreatures`
  runs every update after the vitals; it does nothing by day once they've all gone. Each tick of
  `CREATURE_EVERY`, `kindToComeOut` picks a kind the moon allows more of whose `after` has passed.
- States: `creep` (follow the map of steps; lunge when within `LUNGE_RANGE` and ≤ 3 steps; claw
  when off the map and a wall with `claws` is `CLAW_REACH` ahead), `lunge` (dart straight at you;
  bite within `BITE_REACH`, then `run`), `run` (away from you or the light that caught it, for a
  time), `claw` (scratch every `CLAW_SECONDS` until the wall breaks or a way opens), `fade` (dawn:
  back away while fading, then removed). Kinds that `lurks` use `lurk` (sit still; `spring` into a
  lunge) and `hide` (walk to a `den` of tall grass) instead of `creep`, and never claw.
- **The map of steps** (`field`) is a breadth-first flood from the player's tile over a square of
  `FIELD_RADIUS`, through tiles where `creatureCanStand` (not solid, not inside the house), no
  diagonal squeezing between corners. Recomputed every `FIELD_SECONDS`; ~0.3 ms. If a creature's
  tile isn't on it (you're walled in or indoors), it heads straight for you and presses against
  whatever stops it, and never lunges. That's what makes walls and the cottage safe.
- **Fear of light**: `lightsToFear` is the objects with `light` found by `mapSteps` plus the torch
  (`torchReach`, marked `torch: true`). A creature never steps to within its kind's `fear` share of
  any light's reach (`fear.torch` for the torch, `fear.fire` for the rest; 0 = not afraid); at
  that edge it `prowl`s sideways. If a light appears on top of it, it runs.
- **Hitting**: `findTarget` (survival.js) puts any creature within `HIT_REACH` ahead of the player
  before every other target, as `{ x, y, w, label: 'Hit', creature }` (brackets round its face, sized
  from its sprite and eye row); `useTarget` hands it to `hitCreature`, which uses
  `toolPower(survivor, 'Hit')` and the kind's `knock` and `flinch`.
- `survivor.hurtBy` (`'dark'` from a bite, `'hunger'` from starving) picks the death screen's words.

## Rendering (js/render.js)

- One tile is **two character cells wide and one row tall**. All drawing is in device pixels; cell
  sizes are integers, so nothing seams. The font is sized so `█` slightly overflows a cell and is
  clipped, which makes block characters tile without gaps.
- **Never call `fillText` per cell per frame.** Three caches keep phones fast:
  - **Glyph atlas** (`glyphSlot`): each (char, color, bold) is drawn once. Use `drawGlyph(ctx, …)`.
  - **Sprite images** (`spriteImage`): each sprite is rendered once to its own canvas and drawn with
    one `drawImage`, kept in `sprite.images` by tint (`'plain'`, or a color every ink is pushed
    toward, like `HURT_COLOR`). Cottage images are cached the same way. These rebuild automatically
    when the atlas changes (on resize or font load); `sprite.imageAtlas = null` forces it.
  - **Ground cache** (`groundCache`): ground, cliff-foot shadows and mountains for the screen plus a
    margin. When the camera moves, the old image is shifted and only the newly exposed strips are
    drawn (`drawGroundRegion`). Water tiles are redrawn when `waterFrame` ticks.
- **If you change ground or mountains during play, invalidate the cache** (`groundCache.world =
  null`) or it will keep showing the old tiles. Objects are not in the cache, so `setObject` needs
  nothing extra.
- **Draw order** (`drawStanding`) is row by row from top to bottom of the screen. Within a row:
  cliffs, then the player if their feet are above the row's middle, then objects, then the
  cottage, then the player if not drawn yet. Mountains already sit in the ground cache underneath;
  a cliff is drawn again only where something standing behind it was drawn over it (the `cover`
  grid). Anything new that's drawn in this pass must call `noteDrawn` so cliffs and the player's
  ghost outline stay correct.
- Tall grass is in the ground cache and drawn again over the player's feet (`drawPlayer`).
- Objects with `frames` pick a sprite by `state.flameFrame` plus the tile index (`objectSprite`);
  the counter stops under reduced motion, like `waterFrame`.
- The build-mode ghost (`drawBuildSpot`) is drawn translucent after the standing pass, on top of
  everything, so it's visible even behind a tree.
- **Creatures** are drawn in the standing pass like the player: sorted by `y`, each placed as soon
  as its feet are behind the row's line (`placeCreatures`), with `noteDrawn`. `drawCreature`
  records where its eyes are in `view.shades`; anything drawn over them later in the pass (a tree,
  the roof) marks them hidden in `noteDrawn`. After the night layer, `drawEyes` redraws visible,
  unblinking eyes (`eyesOpen`) on top of the dark.
- **Night** (`drawNight`): after the standing pass, the player's ghost and particles, and before
  the target brackets, the build ghost and floating text. The dark is drawn on a small canvas
  (`NIGHT_SCALE` times smaller than the screen): one fill in `sky.color` at `sky.darkness`, then a
  pre-drawn soft brush per light with `destination-out`, then an orange `glow` brush over
  firelight, then one `drawImage` to stretch it over the screen **with smoothing off** (with
  smoothing, headless Chromium spent ~11 ms more per frame on the stretch; off, it costs about the
  same as one plain fill, and the steps don't show). Lights come from `findLights`: the torch (or
  dim `EYES_REACH` without one), objects with `light` within `LIGHT_REACH` of the screen (indoor
  ones only when you're inside), and the cottage's front windows from outside. Their reach
  flickers with `state.flameFrame`, so it holds still under reduced motion. Sun shadows fade with
  the darkness (`drawShadows`). The same layer carries the weather: it also runs by day when it's
  cloudy (the grey is part of `sky.darkness`), cloud shadows go on before the lights are cut, and
  lightning (`lightningAt`) thins the dark and adds a white wash after the stretch.
- **Rain** (`drawRain`) is drawn right after the standing pass, before `dimOutside`, the ghost and
  the night layer; `stepRain` moves it each frame (from `frame()` in game.js, not while paused).

## Sprites (js/sprites.js)

- `art` and `paint` are arrays of strings with the same shape; each `paint` letter keys into
  `ink: { letter: [glyphColor, backgroundColor?] }`. A space in `paint` is see-through.
- The bottom row stands on the object's tile; the sprite is centered on the tile, so **use even
  widths** for objects. The player is 3 wide and positioned freely.
- Light comes from the top left: lighter tops and left sides, darker fronts and right sides, and
  `shadow` (in tiles) for the oval cast to the bottom right.
- **Only use characters DejaVu Sans Mono has**, or they'll fall back to another font and look
  different on every phone. Check with fontTools:
  `python3 -c "from fontTools.ttLib import TTFont; c=TTFont('fonts/DejaVuSansMono.woff2').getBestCmap(); print([ch for ch in 'YOUR CHARS' if ord(ch) not in c])"`
  (`pip install fonttools brotli` first).
- Reload and check the browser console: `prepareSprite` warns if `art` and `paint` don't line up or
  a paint letter has no ink.
- **The player** has a picture per pose per facing: `stand`, `blink` (not for `up`), `walk` (four:
  stride, legs passing, other stride, legs passing; arms shorten on the swinging side), `windup`,
  `strike`, `crouch` (top row empty, so it's the same height), and `fallen` (left and right only,
  2 rows, 7 wide: lying down, for the collapse). `held` gives the cell, from the
  picture's top-left, where the tool glyph is drawn for each pose. `playerPose()` in render.js
  picks one: a recent `player.act` (`{ action, at }`, set by `useTarget`, `eat` and `build`)
  for its `ACTION_POSES` seconds, then `windup` while `player.working` (the button held on a
  target), then walking (lifted `WALK_BOB` on passing steps), then blinking or standing. A crafted
  tool with `held` glyphs and power for the action replaces the default `⚒`.
- Footsteps (`footstep()` in survival.js) kick up one particle in the ground's `step` style every
  other walk picture.
- **The torch in the hand:** once made, it's drawn in every pose by `drawTorch`, at the facing's
  `torch` spot (`stand`, or `crouch` a row lower), on the side away from the tool so they never
  overlap. `TORCH_LOOK` gives the stick, the unlit rag, and the `flames` it flickers through by
  `state.flameFrame`; the head is drawn one row above the stick.

## Code style

Match what's there: 2-space indent, single quotes, semicolons, trailing commas in multi-line
literals, lines up to about 110 characters, `const`/`let` only. Tunable numbers live as named
constants at the top of the file that uses them, with a comment giving the unit. Comments are plain
English for someone learning (the owner reads and tinkers with this code): explain what a thing is
for and why, not the obvious mechanics. Data tables (`TILES`, `OBJECTS`, `SPRITES`, `ITEMS`,
`COTTAGE`) are where new content goes; prefer adding a field to a table over special-casing a key
in code.

When something changes how to play, the controls, or the file layout, update README.md (written
for the owner) and this file.

## Checking a change

There are no automated tests. Run it and look:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

To check it the way GitHub Pages serves it, run the server from the folder *above* the repo and
open http://localhost:8000/ASCII_Nightmare/ — a missing file there (a 404 in the console) means a
path isn't relative.

To see it as a phone would, use the preinstalled Playwright (`require('playwright')`) with
`viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true`,
call `closeMenu()` through `page.evaluate`, and take screenshots. Top-level `const`s like `state`,
`view` and `TILES` are reachable from `page.evaluate`, so you can teleport the player
(`state.player.x = …; snapCamera(state.world, state.player)`) to check a spot. Also check:

- the browser console has no errors or sprite warnings;
- portrait on a phone shows the "turn sideways" screen;
- an iPhone SE landscape size (667×375) still fits the HUD;
- walking behind trees, cliffs and the cottage hides the player behind them, with the ghost outline;
- frame cost: time `drawFrame(state)` while moving the camera. Headless Chromium has no GPU, so
  the absolute numbers are pessimistic; the number of draw calls per frame is what to keep low.
