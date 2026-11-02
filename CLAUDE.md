# ASCII Nightmare

A survival game drawn in text characters, played mainly on a phone held sideways (landscape) with
touch controls, and also on a computer with a keyboard. The world is seen in a three-quarter
(3/4) view: ground is flat, and trees, rocks, cliffs, the cottage and the player stand up off it
and overlap whatever is behind them. The owner is building toward a fuller survival game
(crafting, a day and night cycle with things that come out at night, saving, maybe multiplayer);
see "What's next" in README.md.

## Where things stand: the game is online (last updated 2026-11-01)

The game is live at **https://daveyxjones.github.io/ASCII_Nightmare/**. The repository
(`DaveyXJones/ASCII_Nightmare`) is public, its default branch is `main`, and GitHub Pages deploys
from `main`, `/ (root)`. **Every push to `main` updates the live game** within a couple of
minutes, so `main` must always be playable.

- **Checking a deploy.** Each push to `main` starts a "pages build and deployment" run; the GitHub
  `actions_list` tool (`list_workflow_runs`) shows whether it succeeded. Claude's cloud container
  can't open github.io itself (blocked by its network policy), so for what the page actually does,
  serve the game from a subfolder the way Pages does (see "Checking a change").
- **Browser cache.** Pages lets browsers keep files for up to 10 minutes, so right after a merge
  the owner may still see the old game. **Every script and the stylesheet carry `?v=N` in
  `index.html`: raise N in every PR that changes any js or css file**, all of them together. That
  makes a new `index.html` fetch the files that go with it. Without it, a new page could run an old
  cached `map.js`; that happened after PR #10, where the new map's + and − buttons showed but did
  nothing. (In Chromium they worked; the owner's phone had kept the old file.) If the owner reports
  something broken just after an update, have them wait a few minutes and reload before hunting
  for a bug.
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

## Working locally (from 2026-10-31)

The owner now also works on the game from a clone on their Windows PC
(`C:\Users\david\SideProjects\ASCII_Nightmare`, kept out of OneDrive on purpose), with Claude in
the desktop app, not only through cloud sessions. What's different there:

- **Pushing goes live.** A local session pushes as the owner, so it can push straight to `main`,
  and that updates the live game. Check the change in the browser first, raise `?v=N` as above,
  and ask the owner before every push.
- **Running it.** On that PC `python3` is a Microsoft Store placeholder; use
  `python -m http.server 8000`. A `.claude/launch.json` (config `game`) starts it for the desktop
  app's browser pane; it's kept out of git through `.git/info/exclude`.
- **Keeping cloud and local in step.** Cloud sessions still push to their own branches, merged on
  GitHub. Pull (`git pull`) before starting local work, and push local work before starting a
  cloud session, so neither side builds on an old copy.
- **No `gh` on that PC.** Pushes sign in through Git Credential Manager (a browser window the first
  time). To check a deploy, open https://github.com/DaveyXJones/ASCII_Nightmare/actions or the live
  game in the browser pane.

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
  `bestFood`). On short screens (since fishing) the craft cards lie on their side, four to a row:
  picture on the left, name, `about` and cost beside it, so up to sixteen fit on a 667×375 phone.
  Each `about` must stay within two lines of about 16 characters there. (Since building and
  gardening the cards are on tabs, and the chest panel is six to a row; see that section.)
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
  Rain was in the sound item but needs weather first; that came with the next list (below).

The owner then asked to "work on the Whats next" again (2026-10-31): items 2 to 4 of the new list
(weather, lurkers, chest and bedroll) were built, each its own commit, in the sections below. The
outline and multiplayer still wait on the owner. README's "What's next" now lists a map, fishing
and lamps as Claude's suggestions between them.

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

## Chest and bedroll (built 2026-10-31)

Item 4 ("A chest that keeps its contents when you die, and a bed to wake up beside"), Claude's
design:

- **Chest** (`RECIPES.chest`, 6 wood, `indoors: true`, so it's the one thing that can be built in
  the cottage; `keepClear` refuses the doorway, the floor inside it and the spawn tile). The object
  has `chest: true` and action **Open**: `useTarget` calls `openChest`, which pauses like the craft
  panel. Contents live in `world.chests` (tile index → `{ items, tools }` counts), saved and
  restored (`restoreChest`). Tapping a thing moves all of an item or one tool; **Put all in** moves
  items only, **Take all out** items and tools you don't carry (you only ever carry one of each).
  A torch put away goes out. **Take down** works only when empty (`CHEST_GIVES_BACK`). The action
  button acts on `pointerdown`, and some phones deliver the lift of that touch to whatever is now
  under the finger, so the panel ignores clicks until a `pointerdown` lands on it (`chestArmed`).
- **Bedroll** (2 cloth, 1 wood): not solid, `bed: true`, action **Roll up** (gives the cloth back).
  Building one sets `world.bed`; `wakeUp` puts you on `bedSpot(world)`: that tile if it still
  holds a bed, else any other bed on the map, else the cottage. Nothing can be built over a bed.
  `world.bed` is saved.
- **Quick taps**: a press of the action button sets `state.tapped`, which counts as held for one
  update, so a tap shorter than a frame isn't lost (it was, before; Playwright's taps showed it).

## Next: the owner's list (noted 2026-10-31)

After merging PR #8 the owner said: "i want the outline for the player i think, i also like the
fishing, map and lamps idea. Im also wondering about a pistol and a rifle, and i also notice that
when im trying to build walls there is no way to turn them and place them on the right or left
side, is that possible?" README's "What's next" lists these in this order; build them each as its
own commit, like the lists before. **All six were built on 2026-10-31** (each in its own section
below). For the guns the owner chose Claude's suggestions: found in crates (a wreck on a beach),
bullets scarce and not craftable, a short-range six-shot pistol and a long-range one-shot rifle,
and the bang drawing creatures in. Notes and suggestions (Claude's, not the owner's):

1. **Walls.** (Built; see "Walls that join" below.) Two problems, both real (checked in a screenshot): a line of `woodWall` running up
   the screen draws as a stack of `▲▲` spikes, and since walking turns you (`turnToward`), you
   can't walk along a line building beside you. Suggested: (a) walls pick a picture from their
   neighbours, like the cottage's `║`/`═` in `drawGroundTile`: a side-on fence (posts and rails)
   when the walls join above or below, the front-on stakes when they join left or right, and
   corners; doors the same, so a door in an up-and-down fence looks side-on. Keep it a field on
   the object (e.g. sprites for each join) rather than special-casing `woodWall` in render.js.
   (b) In build mode, walking keeps your facing (you strafe), and a quick flick of the stick
   (pushed and let go within a moment, without walking far) turns you in place. Then: face right,
   walk up, Build, walk up, Build. Check it one-thumbed on a phone size in Playwright.
2. **The outline.** (Built; see "The outline" below.) The owner said yes ("i think"), so build it with an **Outline on/off** in the
   menu (on by default, kept in localStorage like Sound) so they can compare. A thin dark edge
   around the player's sprite only: e.g. a cached silhouette of each picture (a tint-like key in
   `spriteImage`) drawn a device pixel or two out in each direction behind it. Update the "Draw
   only characters" hard rule to name the outline as an exception.
3. **Lamps.** (Built; see "Lamps" below.) A lantern on a post (wood and cloth, say): a `light` smaller than a campfire's, no
   `warmth`, not put out by rain (it's behind glass), feared like firelight. It burns for a few
   minutes of night and needs refilling (an action like **Fill**, costing cloth); the fuel left
   per lamp needs a world Map that's saved.
4. **The map.** (Built; see "The map" below.) A panel like the craft panel (pauses the game), the island drawn in characters at
   one cell per few tiles (192×128 tiles won't fit a phone at one each), only what you've seen (a
   saved bitmap of explored tiles, kept compact), with you, the cottage, fires, chests and the
   bedroll marked. Needs a touch control that fits the HUD on 667×375 (and a key, e.g. `M`).
5. **Fishing.** (Built; see "Fishing" below.) A rod (a tool, like the axe), **Fish** when facing water with it: hold, a bobber
   glyph on the water, a bite after a few seconds, then a fish (a new item with a pack slot).
   Cook fish at the fire (a `byFire` recipe) for more food than berries.
6. **A pistol and a rifle.** (Built; see "Guns" below.) Ask the owner before building: these change how nights play. Points
   to settle: found (a wreck on the beach? a crate?) or crafted (the game is stone tools so far),
   how scarce bullets are, ranges (pistol short, rifle long and slow to reload), whether the bang
   draws creatures toward you (a good horror trade-off). On a phone the action button would say
   **Shoot** with a creature in line ahead; the shot is drawn in characters with a flash in the
   night layer.

Multiplayer still waits on the owner choosing a server host.

## Walls that join, and turning in build mode (built 2026-10-31)

Item 1 of the owner's list, built as the notes above suggested:

- **Joins**: objects with `fence: true` (wall, door) join up. `runsUpAndDown` (world.js) is true
  for a piece with a fence above or below and none left or right; `objectLook` then returns its
  `side` set (`{ sprite, opens, scarred }`) instead of the object's own pictures. `objectSprite`,
  the shadows and the build ghost all go through `objectLook`. Corners and T-joins keep the
  front-on stakes: the side pieces above and below overlap them cleanly.
- **Side pictures** (`woodWallSide`, `woodDoorSide`…): one cell wide, centered (`▗▖` over `▐▌`),
  with see-through edges, so in a column only each piece's top row shows (the tip of each stake
  over the one behind) and the nearest piece shows all the way down.
- **Strafing**: in build mode `movePlayer` doesn't turn you. `flickOrWalk` holds a push back for
  `FLICK_SECONDS` (0.22): let go before then and you turn that way without moving; hold longer and
  you walk, still facing the same way. Checked one-thumbed at 667×375 with CDP touch events.

## The outline (built 2026-10-31)

Item 2. `drawPlayer` draws `outlinedFigure` when `outline.on`: the figure (sprite, tool in hand,
torch; `drawFigure`) goes on a spare canvas, is copied `OUTLINE_CSS` (1 CSS px) out in eight
directions onto a second, filled `OUTLINE_COLOR` with `source-in`, and the figure goes back on top.
`outline.drawn` remembers what's on the canvases, so most frames reuse them (measured: no frame
cost). The ghost behind trees gets the edge too. **Outline on/off** in the menu, kept under
`OUTLINE_KEY`, on by default.

## Lamps (built 2026-10-31)

Item 3. `OBJECTS.lamp` (lit, with `frames` flickering the glass) and `lampOut`, both with `fuel:
LAMP_FUEL` (`{ burns: 300, cost: { cloth: 1 }, into, empty }`). Recipe: 2 wood, 2 cloth. Light 4.5
(campfire 6.5), no `warmth`, no `flame` (no lighting the torch at it), no `doused` (rain can't touch
it). Choices that were Claude's:

- **Fuel** lives in `world.fuel` (tile index → seconds; set by `build`, cleared by `setObject`,
  saved as `fuel`; a lit lamp with nothing saved starts full). `updateLamps` burns it only while
  `sky.darkness` is above `LAMP_BURNS_DARKER`, so a filling is five minutes of night whatever the
  hour you fill it, and swaps in `lampOut` when it's gone (news within `LAMP_NEWS_REACH`).
- **Light** goes through `objectLight(world, i)` (survival.js) everywhere a light's reach is read
  (`findLights`, `mapSteps`): a lamp dims to half over its last `LAMP_LOW` share, like the torch.
  Creatures fear it with `fear.fire`, so it holds back brutes and lurkers, which ignore the torch.
- **Fill**: `findTarget` offers `{ label: 'Fill', fill: true }` on a lamp under `LAMP_REFILL` (half)
  full (`lampWantsFuel`), else its `action` (**Take down**, gives back 2 wood and 1 cloth). An out
  lamp's action is always Fill, like a cold campfire's Light. `fillLamp` tops it up for 1 cloth.

## The map (built 2026-10-31)

Item 4, in js/map.js. Choices that were Claude's:

- (Since 2026-11-01 the panel zooms and drags; see "A bigger island" below. `MAP_BLOCKS` is gone.)
- **What you've seen**: `world.seen` (a `Uint8Array`, 1 per tile seen), filled by `markSeen` every
  `MAP_MARK_SECONDS` within a circle of `MAP_SIGHT` (11) tiles by day, shrinking with
  `sky.darkness` to `MAP_NIGHT_SIGHT` or the torch's reach. Saved as `seen`, packed to a bit per
  tile in base64 (`packSeen`, about 4 KB), restored only on the same island. Kept when you die.
- **The panel** (`#island-map`; the game's canvas already has `id="map"`) pauses like the craft
  panel. It's drawn with `fillText`, only when it opens or moves, never per game frame.
- **What a cell shows** (`readCell`): the most common seen ground, as its `map` field in `TILES`
  (`[glyph, color, background]`, else its first glyph and colors); trees or rocks (`map` in
  `OBJECTS`) if they cover at least half of it; a built thing's `mark` (from `MARKS` in
  objects.js, highest `rank` wins) over either. The cottage (`MAP_COTTAGE`) and you (`MAP_YOU`) go
  on last. The key is built from the marks, one line per `name`.
- **Controls**: a **Map** button under ☰ (`.corner-buttons`) and `M`; Esc or ✕ or a tap outside
  closes it.

## Fishing (built 2026-10-31)

Item 5, in js/fishing.js. Choices that were Claude's:

- **The rod** (`TOOLS.rod`, 2 wood and 1 cloth) has `power: { Fish: 1 }` only so `heldGlyph`
  draws it (`╲`/`╱`) in the `crouch` pose (`ACTION_POSES.Fish`: kneeling at the water).
- **Fish or drink**: `findTarget` offers `{ label: 'Fish', fish: true }` on ground with `fish`
  (`TILES`: the share of bites landed, 0.85 deep water, 0.6 shallow) when you have the rod and
  water ≥ `FISH_THIRST` (75); otherwise Drink, as before.
- **The line** (`state.fishing`): `castLine` (from `useTarget`) puts the bobber up to
  `FISH_CAST_TILES` past the edge and picks a bite time in `FISH_BITE_SECONDS` (3 to 8).
  `updateFishing` reels in as soon as `player.working` isn't Fish or you move (a tap shorter than
  a second gets a hint to hold), dips the bobber at the bite (`plop`), and after
  `FISH_HOOK_SECONDS` lands a fish or loses it; the next swing of a held button casts again.
  `drawBobber` goes before the standing pass, `drawFishingLine` after it, from `view.rodTip`
  (where `drawPlayer` drew the rod this frame). Sounds `cast`, `plop` and `catch` were levelled by
  rendering them offline beside `drink`.
- **Fish** can't be eaten raw (no `food`); `RECIPES.cookFish` (1 fish, by a fire) gives
  `cookedFish` (45 food, 15 health), the best food. `fish`, `cookedFish` and `cooked` have
  `hideEmpty`, so the pack fits across a 667-wide phone with everything in it (tools show only
  their glyph on short screens).

## Guns (built 2026-10-31)

Item 6, in js/guns.js, to the owner's choice of Claude's suggestions. Choices beyond those:

- **Finding them**: `placeFinds` (world.js, run in `generateWorld` before `world.original` is
  taken) puts the wreck (`wreckBow`/`wreckMid`/`wreckStern`, breakable for wood) with the
  `pistolCrate` beside it on the beach whose walk from the door (`stepsFromDoor`) is nearest
  `WRECK_STEPS` (40), and the `rifleCrate` on the beach furthest away. A beach is open sand within
  `SEA_REACH` of the sea (`findSea`: water joined to the map's edge), so never a riverbank. Crates
  are objects with `tool` (the gun) and `gives` (8 or 6 bullets), `says` a message, and become
  `crateOpen`. **Keeping old saves**: these objects have `found: true`, which `worldPrint` leaves
  out, and only go on tiles where nothing was generated, so every island's print is unchanged
  (checked against the previous commit on six seeds, and a save from it loads with its changes).
  Change `placeFinds` and finds move on existing islands (old crates stay where saved).
- **Guns** are `TOOLS.pistol`/`rifle` with `gun: { range, damage, rounds, reload, sound }` and
  `power: { Shoot: 1 }` (only so `heldGlyph` draws them; `prefer` picks the one just fired).
  Pistol: 6 tiles, 2 damage, 6 rounds, 1.5 s. Rifle: 14 tiles, 3 damage, 1 round, 2.5 s. Both use
  `ITEMS.bullets`. `survivor.guns[key]` (`gunState`: shots `left`, `readyAt`, `reloading`) isn't
  saved: a gun is loaded again on carrying on. `updateGuns` reloads an empty gun when there are
  bullets.
- **Shoot** (`findShot`, from `findTarget` when no creature is in `HIT_REACH`): the nearest
  creature past arm's reach within `AIM_CONE` of the facing, in range of a ready gun (`gunFor`: the
  shortest range that reaches), with `clearShot` (solid objects, doors and solid ground block;
  water doesn't). One shot per press: `player.triggerHeld`, cleared when the button is let go.
  `woundCreature` (creatures.js, shared with `hitCreature`) does the damage. Shots always hit.
- **The bang** (`hearShot`): creatures within `BANG_REACH` that `lurk`/`hide` switch to `creep`;
  at night `hunt.nextAt` comes within `BANG_SOONER`; `hushCrickets` (sound.js) holds the crickets
  for `SHOT_HUSH`; a once-a-night message. The shot is drawn by `drawShot` (render.js) above the
  dark, from `view.heldAt` (the gun's cell) to the target, for `SHOT_SECONDS`, with a muzzle
  light in `findLights` (not under reduced motion). Sounds `bang`, `boom`, `click`, `reload`,
  levelled offline (the pistol about a falling tree's peak, the rifle louder, thunder loudest).
- **Death**: `collapse` calls `dropGuns`: each gun becomes `pistolDropped`/`rifleDropped` on the
  nearest bare tile (action **Pick up**, `mark: MARKS.dropped`), and waking says where they are.
  This was Claude's call: tools are lost on death, but these are one of a kind.
- **Bullet tins**: on each change to day, `washUp` places a `bulletBox` (3 bullets, walk-over) on a
  random beach in `world.beaches` at least `WASH_UP_AWAY` from you, with `WASH_UP_CHANCE`, never
  more than `WASH_UP_MOST` at once. Saved as ordinary object changes.
- **Room on a phone**: the pack wraps onto a second row on short screens when it would reach the
  health bars (`max-width` on `.pack`); the chest panel shows five to a row there, tool names
  hidden (`.thing-name`), and leaves out things neither side has. A gun dims in the pack while
  reloading (`.tool.reloading`).

## A bigger island, and a map to zoom (built 2026-11-01)

After merging PR #9 the owner asked "Can we make the map a lot bigger?", and when asked which, chose
both: a bigger island and a bigger map picture.

- **The island** (now 768×512, see "Places to find" below): new worlds were `WORLD_SIZE` (384×256,
  four times the land; `pickTerrain` shapes the island relative to the size while the noise keeps
  its scale, so features are the same size and there are more of them). `generateWorld(seed,
  island)` takes the size; `saveGame` stores it as `size`, and `loadGame` rebuilds with
  `savedSize(save.size)`, which is `FIRST_WORLD_SIZE` (192×128) for saves without it, so every world
  saved before keeps its size, print and changes (checked with a save made by `main`'s code).
  Generation takes about 50 ms; a save is about 17 KB. Everything else reads
  `world.width`/`world.height`; don't use a fixed size anywhere.
- **The map panel** is now a window (`mapView`: `scale` in CSS px per tile, `cx`/`cy` the tile in
  the middle, `width`/`height` of the window). `drawMap` draws only the characters in the window,
  each standing for `block` tiles across and twice that down, `block` being the fewest that keeps
  characters `MAP_MIN_GLYPH_CSS` wide at that zoom (about 0.3 to 4.5 ms a draw). Zoom runs from
  `mapView.fit` (the whole island) to `MAP_MOST_ZOOM`; `centreMap` keeps the window inside the
  island. Gestures (`setupMapGestures`): one pointer drags, two pinch (zooming about the point
  between them), the wheel zooms about the cursor; redraws are coalesced to one per frame
  (`drawMapSoon`). Buttons **−**, **+** (`zoomMapAboutYou`: about you when you're in view) and
  **@** (`centreMap` on you); keys `+`/`-` and the arrows (`mapKey`). It opens centred on you at
  the last zoom (`MAP_FIRST_ZOOM` the first time on an island). On short screens the side column
  is tightened to fit 667×375.

## Places to find, and a bigger island again (built 2026-11-01)

After merging PR #10 the owner reported the map's + and − did nothing (most likely a cached old
`map.js` with the new page: they work in Chromium with touch taps; fixed for the future with the
`?v=` numbers, see "Browser cache" above) and asked: "I would like to make the island a lot bigger
still, with points of interest and dilapidated cabins that can be spots to find loot. You can be
creative with it." Everything below beyond that is Claude's design, all in js/places.js:

- **Size**: `WORLD_SIZE` is 768×512 with `places: true`. Saves store `places` beside `size`;
  `savedIsland(save)` (save.js) rebuilds an island with places only if its save says so, so
  192×128 and 384×256 worlds load unchanged (checked with saves made by `main`'s code: same print,
  same changes). Generation is about 250 ms in headless Chromium (`pickTerrain` now skips ridge and
  moisture for the sea, which changes no tile; `findSea` runs once and is passed in); a save is
  about 66 KB, mostly `seen`.
- **The places** (`PLACES`, placed in that order): the lighthouse (`site: 'coast'`: the sand spot
  with the most sea round it among those with room for the keeper's hut within
  `KEEPER_HUT_REACH`; revealed on the map from the start), the village (`fromHome` 160, furthest
  spots tried first: a hall with a strongbox, four cabins round a path square with a `well`, a
  graveyard), standing stones (`site: 'hills'`, a ring round an `altar` with candles: `light` 4, so
  creatures fear it like firelight), ruined cabins (four layouts, flipped at random, door at the top
  sometimes) and camps (`site: 'water'`: tent, `oldPack`, a `campfireOut` you can relight, a
  `logSeat`). Counts are per 100,000 land tiles (`count`) or `exactly`; on six seeds every island got
  1 lighthouse, 1 keeper's hut, 1 village, 3 stone rings, 12 cabins and 8 camps. Each place is
  tried at shuffled grid spots (`PLACE_TRY_EVERY`) with `siteFits`: right ground, every tile and
  its margin walkable (`steps`), at most `PLACE_MOST_TREES` trees, `PLACE_SPACING` from others.
  `buildPlace` clears `PLACE_CLEARS` objects in a `CLEARING` (wider below, where trees would stand
  in front of it in the 3/4 view and hide it), lays the layout, drops walls (`WALL_FALLEN` into a
  `logPile`, `WALL_GONE` to nothing, never corners) and grows `WEEDS` (tall grass, so lurkers can
  sit in a cabin).
- **Old walls** (`logWall`) have `fence` and `side` pictures, so they join up with walls you build:
  patch the gaps and a cabin is shelter. `claws: 10` (yours are 15). Building replaces a `logPile`
  (it isn't solid), but nothing is built over an object with `loot` (`buildProblem`).
- **Searching**: objects with `loot` (`cupboard`, `tent`, `oldPack`, `strongbox`, `altar`) go
  through `useTarget` as usual (hits, swings), then `searchLoot` instead of `gives`: `rolls` picks
  from `LOOT[...].finds` by `hash2(tile, roll, seed + LOOT_SALT)`, so it's fixed per island; a
  `tool` you have becomes its `or` items. `useTarget` saves right after a search so a reload can't
  repeat it. New item `tins` (food 35, heals 5, `hideEmpty`). A `map` find (`readScrap`) reveals
  `SCRAP_REACH` round the nearest unseen place and names its direction.
- **Notes**: `handOutNotes` gives each place's first cupboard, tent or pack (`NOTE_HOLDERS`) a note:
  the keeper's hut and the village hall their own (`PLACE_NOTES`), the rest `NOTES` in order of
  their walk from the cottage, so the story runs outward. Twelve notes, 23 holders: the far ones get
  none. `openNote` pauses like the chest panel and arms on a `pointerdown` the same way; a scrap
  found with a note is said once the note's put away. Esc closes it.
- **Graves** have `epitaph`: walking into one shows a line from `EPITAPHS` picked by its tile
  (`epitaphNear`, from `movePlayer` in game.js).
- **The map** marks places through `MARKS` (`ruin` on cupboards and the strongbox, `camp` on tents
  ranked over its cold fire, `stones`, `graves`, `lighthouse`); `logWall` has `map` like trees. The
  key only lists names whose marks are on seen land (`showKeyLines`, on opening), so it grows as you
  explore; all fifteen lines fit 667×375. Drawing the map zoomed all the way out with the whole
  768×512 island seen takes about 14 ms in headless Chromium (0.6 ms zoomed in), so a pinch at full
  zoom-out may be choppy on a slow phone.
- **Sounds**: `creak` (searching a cupboard), levelled offline against `pick` and `drink`.
- **Ideas the README offers next**: lighting the lighthouse (the notes hint at it), a book of
  found notes, and a Repair action on fallen logs (built since; see below).

## Building and gardening (built 2026-10-31, on the owner's PC)

After Places to find the owner asked: "Id like to add to the crafting for some base building action
and i was also wondering if we could add gardening and the ability to uproot a bush or tree so the
player can build there". Offered choices, they picked all four building ideas (stone wall and gate,
wooden floor, spiked barricade, a Repair action), digging up **only with a spade**, gardening with
**both** replanted cuttings and new crops from seeds, and plants that **need watering**. Each part is
its own commit. Everything beyond those answers is Claude's design:

- **Craft tabs**: each recipe has a `tab` (`CRAFT_TABS`: tools, build, garden, cook). `setupCrafting`
  makes a tab button for each tab that has recipes; `showCraftTab` hides the other cards; number keys
  pick within the tab (`tabRecipes()`), and ←/→ (A/D) switch tabs (`side:` presses from input.js,
  `turnCraftTab`). A tab with something you can make has a dot (`.ready`). `openCraft` sets
  `.recipes` to the fullest tab's height so the tabs don't jump; the grid is `auto-fill`, so a tab
  with few cards keeps them card-sized. The Build tab (11 cards, three rows) is the fullest: the
  panel takes 298 of 375 px at 667×375.
- **The spade** (`TOOLS.spade`, `power: { 'Dig up': 1 }` only so it's drawn in the hand): objects
  with `dig: { hits, gives, becomes }` (`bushBare` → a berry cutting, `cottonBare` → a cotton
  cutting, `stump` → 1 wood, `soil` → 1 wood) say **Dig up** with the spade when they have no
  `gives` of their own, so a full bush still says Pick. `useTarget` lays `DIGGING` and `dig` over
  the object. Without the spade nothing digs; the bare bush's `empty` message hints at it.
- **Stone wall, gate, spikes**: `stoneWall` (3 stone, `claws: 45`, a `fence` with `side`
  pictures), `stoneGate` (a `door`, `claws: 45`), `spikes` (3 wood, `claws: 12`, `thorns: 1`, not a
  fence). `prick` (creatures.js) wounds a creature on each scratch at something with `thorns`, and
  when its lunge is stopped dead by one; `woundCreature` takes a `from` point to knock it away from.
- **Repair**: things with `claws` have `repair` (a cost). While `world.clawed` has marks on one,
  `findTarget` offers Repair (`repairWall`, survival.js), which clears them. `logPile` is now
  `action: 'Repair'` and becomes a `logWall` for nothing (`gives: {}`; `useTarget` skips the
  floating text when nothing's given). `useTarget` won't turn something you're standing on solid
  (`feetOn`).
- **Floors**: `RECIPES.floor` has `floor: 'planks'` (a key in TILES) instead of `builds`.
  `buildFloor` lays it as the ground, keeping what was there in `world.floors` (saved as tile
  indexes; on loading, what was there is read from the regenerated island). Facing your own board,
  `findBuildSpot` returns `lift: true, label: 'Take up'`. A floor goes under things you've built
  (anything with a `mark`) and things you walk over, not under natural solid things or the garden,
  and not in the cottage. `redrawGround` (render.js) redraws the one tile in the ground cache.
  `build()` now works out its spot again on each press, so two presses before an update can't
  build twice on one tile.
- **The garden** (js/garden.js): a garden bed is `soil` (`plot`; the recipe `needs` the spade).
  Plants have `crop: { grows, into, says }`: `potatoSprout` → `potatoPlant` → `potatoRipe` (Harvest:
  3 potatoes, back to soil); `pumpkinSprout` → `pumpkinVine` → `pumpkinRipe` (a pumpkin and 2
  seeds); `bushSprout` → `bush`; `cottonSprout` → `cotton`; and `wilted` (Clear: back to soil).
  `world.crops` (tile index → `{ grown, water, dry }`, seconds) is saved. A plant grows only while
  `water` > 0; a watering is `WET_SECONDS` (240); dry for `WILT_SECONDS` (300) it wilts; rain over
  `RAIN_WATERS` waters everything. A stage that's solid (a bush) waits until your feet are off the
  tile. Dry plants are drawn with `cropTint` (`DRY_TINT`, through `drawSprite`'s `tint`).
  Everything in a garden has `garden`, so building (and floors) won't go over it, and
  `MARKS.garden` on the map. News (`gardenNews`) only within `GARDEN_NEWS_REACH`; "drying out" at
  most every `GARDEN_NEWS_EVERY` seconds.
- **Planting**: facing a bed, Plant uses `plantFor(survivor)`: what you planted last
  (`survivor.planting`) if you still have some, else the first on the Garden tab you have. The
  Garden tab's cards (`plants: true`, `over: ['soil']`, `again`, and `picture` to show the grown
  plant) plant rows in build mode, where the button says Plant.
- **The bucket** (`TOOLS.bucket`, `holds: 4`): `survivor.bucket` counts waterings left (saved;
  emptied when it goes in a chest; gone with the tool when you die). Facing water or the well, not
  thirsty (`FILL_THIRST`) and not full: **Fill** (a `bucket: true` target). Its pack slot shows the
  count even on a phone (`#bucket-water`) and turns blue with water in it.
- **Items**: `bushCutting`, `cottonCutting`, `potato` (planted, or baked: `RECIPES.bakePotato`),
  `bakedPotato` (35 food, 10 health), `pumpkinSeeds`, `pumpkin` (30, 5), all `hideEmpty`. Potatoes
  and pumpkin seeds were added to `LOOT` (cupboard, tent, dropped pack). Adding finds shifts what
  cupboards not yet searched give on existing islands.
- **Sounds**: `dig` (about `chop`'s peak) and `pour` (about `drink`'s), levelled offline.
- **Room on a phone**: with nearly everything the pack wraps onto three rows; game.js keeps
  `--pack-bottom` up to date (a ResizeObserver) and `.toast` sits below it. The chest panel on short
  screens is six to a row, each count under its glyph, so 23 things fit (357 of 375 px).

## The rain barrel and the lighthouse (built 2026-11-01, on the owner's PC)

The owner said "light the lighthouse sounds fun, and the water barrel would be a great addition". For
the lighthouse they chose, from offered options: a beam plus safe coast plus a calmer island; oil
upkeep ("you're the keeper"); and a fight the first time ("force the door, survive the stairs"). Each
is its own commit. Everything beyond those answers is Claude's design:

- **The rain barrel** (`OBJECTS.rainBarrel`, `RECIPES.rainBarrel`, 5 wood, on the Garden tab, in
  js/garden.js): `world.barrels` (tile index -> waterings, fractional, saved as `barrels`, cleared by
  `setObject`). `updateBarrels` adds `rain * BARREL_HOLDS / BARREL_FILL_SECONDS` a second; simulated
  over 20 cycles on four seeds, most day-night cycles fill it and about one in five leaves it empty.
  `barrelTarget` (from `findTarget`) gives Fill when `wantsToFill`, else Drink; under 1 watering it
  says null, so the object's own action (Take down) shows. A long drink counts as one watering; Fill
  takes up to what the bucket has room for. `levels` in OBJECTS picks the picture (`barrelPicture`,
  through `objectSprite`). It uses `MARKS.garden`, so the map's key didn't grow.
- **Oil** (`ITEMS.oil`): `placeOilCans` (places.js), at the end of `placePlaces`, puts `oilCans` (2 oil)
  beside the keeper's cupboard, beside the village strongbox and by the wreck. **It uses no random
  numbers and only empty tiles**, because the village shares one stream of them with every place after
  it: changing a layout would move places on saved islands. That's why cans aren't in the layouts, and
  why `LOOT` wasn't touched. `RECIPES.boilOil`: 2 fish to 1 oil, by a fire. Checked on six seeds:
  every island got a tower and three lots of cans, each with an open side to reach them from.
- **The tower's state** is its objects (`TOWER_KEYS`: shut, dark, lit, a pair of each, with `tower` in
  OBJECTS), so it's saved as ordinary object changes. `world.tower` (`{ x, y, oil, kindled }`, the left
  half's tile, made in `placeLighthouse`, saved as `tower` with just `oil` and `kindled`) holds the
  tank, in oil. `towerTarget`/`useTower` (lighthouse.js) drive the button: Pry open, Fill, Pump or
  Look, with `w: 2` so the brackets go round both halves (`useTarget`'s `faceToward` allows for `w`).
  Strokes count in `world.damage` on the left half, so they survive dying and reloading.
- **The stairs** (`game.stairs`, not saved, cleared by `startLife`): the first stroke of the first
  lighting starts it; `updateStairs` sends `STAIRS_ORDER` (then shades) every `STAIRS_EVERY`, at most
  `STAIRS_MOST` at once, and stops if you go `STAIRS_LEAVE` away or don't pump for `STAIRS_PATIENCE`.
  These creatures have `stairs: true`, which `moveCreature` lets past the daylight fade.
  `stairsComeOut` picks from every spot in the ring that fits, since the tower is often on a thin spit
  of sand (random tries missed there). `kindle` removes every creature within `TOWER_REACH`. Measured
  holding Pump from full health with no torch and no fighting back: about 13 s, 21 health left.
- **Lit**: `towerLight` adds the tower to `lightsToFear` with reach `TOWER_REACH` (40; the object has no
  `light`, since `LIGHT_REACH` sets how far `findLights` scans each frame and 40 would make that scan
  far bigger). `findLights` adds two ordinary lights, at the lamp and the foot. `kindToComeOut` scales
  each kind by `lit` in CREATURES (rounded up): half for shades and lurkers, none for brutes.
- **The beams**: `beamAngle` (held still under reduced motion), `beamCatches` (from `moveCreature`, sends
  anything within `BEAM_SCARES` running) and `paintBeams` (render.js, inside `drawNight`): each beam
  rubs out a wedge in `BEAM_LAYERS` for a soft edge, then a pale haze goes back along it, all on the
  small night canvas. It's skipped when a beam can't reach the screen, so it usually costs nothing.
- **Burning**: `updateTower` burns `dt / OIL_BURNS` of oil while `sky.darkness` is over
  `LAMP_BURNS_DARKER`, and sets it back to `dark` when the tank's empty. Relighting needs 1 oil and
  `PUMPS_AGAIN` strokes, with nothing on the stairs. `towerNews` adds to the nightfall message.
- **Sound**: `foghorn` has `held: true`, a new field that gives `envelope` a swell and a hold instead of
  a strike. Levelled offline: its peak sits under thunder's. It plays at full on lighting, at 0.25 at
  each nightfall, and at 0.2 when the lamp runs dry.
- **Islands without places** have no tower (`world.tower` is null), so everything here does nothing on
  them, though the Lamp oil card still shows on the Cook tab.

## Playing together, stage one (built 2026-11-01, on the owner's PC)

The owner asked for options, then said it's "for whoever downloads it, eventually the island can keep
going when no one is playing, but for now i don't have a dedicated server to run it on 24/7". They
chose Cloudflare Durable Objects and islands with join codes. Stage one: join by code and see each
other. **It's online and open to everyone**: the rooms run at
`wss://ascii-nightmare.daveyxjones.workers.dev` (`TOGETHER_SERVER`, together.js; on localhost it uses
`npx wrangler dev` instead). The owner tried it behind a special link first, with three players in one
cottage, then asked for the button to show for everyone, since a home-screen icon drops the link's
`?together`. Set `TOGETHER_OPEN` to false to hide it again: then it only shows on localhost, or once a
browser has opened the game with `?together` on its address (`TOGETHER_ON_KEY`). To put a change to
the rooms online: `cd server`, `npx wrangler deploy`. On the Free plan, going over a daily limit stops
the rooms until midnight UTC; solo play doesn't touch them.

- **The rooms** (`server/`, run with `npx wrangler dev`): one `Island` Durable Object per code (`/new`
  makes one, `/island/CODE` joins; both WebSockets, so the game needs no CORS). It keeps `{ code, seed,
  width, height, born }` and passes on where everyone is, using the hibernation API, so an idle room
  costs nothing. It doesn't run the game. Each person's notes are in their socket's attachment.
  Everything is tidied before it's passed on (`tidyLook`, `tidyPlace`), with at most `ISLAND_MOST` (8)
  people and `SENDS_PER_SECOND` (30) each. Known gaps, for later: anyone with a code can hold slots open
  without saying `hi`, and a turned-away socket only closes once the client closes it (the game does).
- **The messages**: from the game, `hi` (look and place), `at` (place: `x, y, f, n, h, k, l` for
  position, facing, pose, what's in hand, has a torch, torch lit) and `look`. From the room, `welcome`
  (with the island and `others`), `joined`, `left`, `at`, `look`, `no-island` and `full`.
- **The game** (js/together.js): `enterIsland` saves your own island first, then sets `together.code`,
  which `saveKey` (save.js) uses to save the shared island apart (`TOGETHER_SAVE` + code). `leaveIsland`
  goes back. New world is hidden on a shared island (`showWorldButtons`). The last code is kept under
  `TOGETHER_KEY` to fill the box next time, but you aren't rejoined automatically on reloading.
- **The clock**: `togetherClock` works out `dayClock` from the island's `born` and the server's time, so
  everyone shares the time of day, and moon and weather follow. `updateTogether` sets it every frame,
  so menus don't stop it, and dying no longer skips to the next morning there. This is also what will
  let an island "go on" with nobody connected.
- **Sending**: `updateTogether` runs from `frame()` even while paused, says where you are every
  `SEND_SECONDS` (0.2) only if something changed (`together.sent`), so standing still sends nothing
  (blinks are sent as `stand`). A `ping` every `PING_SECONDS` keeps the line open; the room answers
  without waking. `lineLost` retries after `RETRY_SECONDS`, doubling, and the game carries on meanwhile.
- **Drawing others**: `picturesFor(look)` (sprites.js) copies the player's pictures with their own `ink`
  (`lookInk`, now shared with `dressPlayer`), made once per look. `drawOtherPlayer` (render.js) is placed
  in `drawStanding` like creatures (`placeOthers`). No outline or ghost, to keep the frame cost down.
  They glide toward where they last said they were (`stepOther`). `findLights` adds their lit torches.
  What arrives is checked again on the phone: `cleanLook` keeps only colors in `LOOKS`, and `HELD_GLYPHS`
  only things someone can hold, so nobody can make your phone draw whatever they like. `MAP_OTHER`
  (map.js) marks them, with a key line only while someone's here.
- **The cost**, as my sums: at 5 updates a second a player-hour is 900 billed requests while walking, and
  nothing while still. Prices and limits as read on 2026-11-01 are in the brain, not here.
- **Stage two** (below) shares the world, stops panels pausing it there, and compares the print.
- **Going online**: `npx wrangler login` opened a Cloudflare page the owner allowed themselves. Cloudflare
  names a new account's workers.dev address after its email, so the name was changed to `daveyxjones`,
  their public GitHub name, before it went into this public code. The API won't rename: it's `DELETE` then
  `PUT` on `/accounts/{id}/workers/subdomain`, then `npx wrangler deploy` again to attach the worker.
- **Checked** with a script talking to the server (join, leaving, rubbish ignored, a flood cut down, a
  full room) and in the browser pane with two tabs, with no login needed: real clicks and typing,
  reconnecting, leaving and coming back. A background tab gets no frames, so one tab was stepped by hand
  (`update(0.05); updateTogether(state, 0.05)`). Not checked: two real phones, or the phone's on-screen
  keyboard over the code box.

## Playing together, stage two: a shared world (built 2026-11-01, on the owner's PC)

The owner said "Start stage two". The design is Claude's:

- **The room keeps the island.** Every change is a key and a value: a letter and a tile (`o` object, `g`
  floor, `c` chest, `p` plant, `f` lamp fuel, `b` barrel; `CHANGES` in together.js, `tidyChange` in the
  server), or `t` for the lighthouse's tank. It stores them under `w:` (one row each), and sends them all
  to a newcomer in `world` pages, then `ready`. `o` remembers null, since "nothing there" differs from the
  generated island; the rest delete their row. Changing an `o` deletes its tile's `c`, `p`, `f` and `b`,
  as `setObject` does.
- **Telling the room**: `setObject` calls `tellIsland` if `world.shared`, so nearly everything is shared
  without knowing it, and the few things that don't go through it (`buildFloor`, `moveThing`, `waterPlant`,
  `useBarrel`, `fillLamp`, `pourOil`, `kindle`, `grow`) call `tellIsland` themselves. On your own island it
  does nothing. **Anything new that changes the world needs this**, as well as the `saveGame` note in World
  model. `tellIsland` puts it in `together.outbox` (a newer change to one thing replaces an older), and
  `sendChanges` sends `CHANGES_PER_SECOND` from `updateTogether`, so nothing's lost if the line drops.
- **Hearing the room**: it sends every change to everyone, the sender too, and they're applied in the order
  it saw them, which is what makes phones agree. `heardChange` skips a change while one of yours to the same
  key is still on its way (`together.waiting`, `together.outbox`), since that's about to replace it.
  `applyChange` turns `world.shared` off meanwhile, so what you hear isn't told back. `heardObject` sets up
  what a new object needs (a chest, a lamp's fuel, a plant's numbers, a regrow timer), and with `live` makes
  a sound and a burst near you and resets the creatures' map of steps. It closes a chest panel if that chest
  has gone. Two people chopping one tree both get the wood; nobody minded that in a survival game.
- **The keeper** (`keeperId` in the server: whoever's been there longest; `worldIsMine` in the game) is the
  only phone that says when something happens by itself: a plant grows or wilts, a lamp or the lighthouse
  runs dry, the rain douses a fire, a bush regrows, a tin washes up. Every phone still runs the numbers, so
  the buttons and tints are right. Without this, phones would double up, and an old "it's ripe" could bring
  back a plant someone had just harvested. Every `TICK_SECONDS` it sends those numbers (`sendTicks`), kept
  in one row so they're cheap to store, and `heardTicks` lets a number that's gone up here stand, in case
  it's a watering the keeper hadn't heard about. `worldIsMine` is true on your own island.
- **A phone put away hangs up** (`togetherVisibility`), so the keeper is always one that's running; on
  picking it up, it reconnects and gets the whole island again. The others see it leave.
- **Shared islands don't pause**: `frame()` runs `update` on a shared island even with a panel open or in
  portrait; `update` then skips movement and the action button (`free`). `collapse` closes every panel
  (`closeEverything`), since dying could otherwise wait behind one. While dead, `frame()` still runs
  `updateIsland`, so a dead keeper keeps the island going. Your own island pauses just as it always did.
- **What each phone saves**: on a shared island `saveGame` leaves out the world's changes, and `loadGame`
  only takes `damage`, `seen` and `bed` back, whatever a stage-one save held. Your survivor is your own.
- **Others on your tile**: `buildProblem` refuses to build on someone (`otherOnTile`), and `movePlayer` lets
  you walk out of something solid, on a shared island, in case it's built on you anyway.
- **The print**: the first to arrive tells the room `world.print`, and `enterIsland` warns if yours differs.
- **Time for waiting things**: `worldTime` is `dayClock` on a shared island, since everyone's `game.time`
  differs. `regrowing` entries use it.
- **Per phone still**: `damage` (swings, and pump strokes), `clawed`, `soaked`, `seen`, `bed`, creatures and
  the stairs. A wall a creature breaks is shared, through `setObject`. Stage three shares the hunt.
- **While nobody's there nothing runs**: the clock goes on, but plants, lamps and the tank wait. Stage four.
- **Known gaps**: anyone with a code can wreck an island, and phones are trusted, so a cheat could send
  anything `tidyChange` allows. No limit yet on how much one island stores. An island from stage one drops
  what its phones saved locally, since the room never heard about it.
- **Deploy the rooms before the game.** A new game on the old rooms would wait forever for `ready`. An old
  game on the new rooms only misses what it doesn't know about.
- **Checked** with `servertest2` (scratch script: changes kept, tidied, paged to newcomers, keeper handover,
  numbers only from the keeper) and with two tabs in the browser pane, the second stepped by hand: chopping,
  chests both ways, floors, lamps, barrels, a plant grown on the keeper and harvested by the other, keeper
  handover, a change made offline, both changing one tile, walking out of a wall, a menu not pausing, dying
  with a panel open, and your own island staying paused and unshared. Testing found one real bug: changes
  sent the moment the line reopened arrived before `hi` and were lost (`together.greeted` now holds them
  back). Not checked: real phones, a long session, or eight people.

## Hard rules

- **No build step, no dependencies, no ES modules.** Plain `<script>` files loaded in order from
  `index.html`, sharing globals. The game must keep working when `index.html` is opened straight
  from disk (file://), where modules and font loading are blocked. Don't add a bundler, a
  framework, npm packages or `import`/`export`. (`server/` isn't the game: it runs on Cloudflare, and
  it may use `import` and its one npm tool, Wrangler. The game must never need anything from it to
  play alone.)
- **Relative paths only.** The live game sits in a subfolder (`/ASCII_Nightmare/`), not at the site
  root, so a path starting with `/` works on a local server but breaks online. Write `js/game.js`,
  `../fonts/…` in CSS, and keep the manifest's `start_url` and `scope` as `./`.
- **Load order matters** (see `index.html`): `random → tiles → sprites → objects → world → places →
  night → weather → render → input → sound → survival → crafting → chest → fishing → garden → lighthouse →
  guns → map → creatures → save → together → game`. A file
  may use globals from files before it at load time, and from any file inside functions that run
  later.
- **Phone first.** Every feature needs a touch control that works one-thumb-each-side in landscape
  (left thumb walks, right thumb acts). Keep tap targets large and inside the safe-area insets.
  Keyboard controls are the desktop equivalent, not the primary design.
- **Draw only characters on the map.** Everything in the world is a glyph from a monospace font,
  optionally on a background-color cell. Shadows, dimming, the target brackets and the player's
  outline (which the owner asked for, with a switch) are the only non-glyph drawing. Block and quadrant characters (`▀▄▌▐▗▖▝▘▙▟▛▜█`) are fine for silhouettes,
  as long as they're mixed with ASCII texture.

## Files

| File | Holds |
| --- | --- |
| `js/random.js` | `hash2`, `valueNoise`, `fractalNoise`. Seeded: same seed, same world. |
| `js/tiles.js` | `TILES`: ground types (glyphs, colors, background shades, `solid`, `animated`, `drink`, `tall`, `raised`, `step`). |
| `js/sprites.js` | `SPRITES` (ASCII art for standing things), the player's `PLAYER_SPRITES`/`PLAYER_INK`, `ACTION_POSES`, and `LOOKS` with `dressPlayer` (the Your look colors) and `picturesFor` (other people's). Validated at load by `prepareSprite`. |
| `js/objects.js` | `OBJECTS`: things standing on tiles and what the action button does to them (`action`, `hits`, `gives`, `becomes`, `regrow`, `drink`, `burst`), plus `frames` (flicker between sprites), `warmth` (heal faster nearby), `light` (reach at night, in tiles), `flame` (a torch can be lit at it), `door` and `opens` (a door you've built), `doused` and `relight` (rain putting a fire out, and lighting it again), `bed` and `chest`, `fuel` (lamps), `map` and `mark` (the map), `fence` and `side` (walls that join), `tool` and `says` (a crate with a gun), `found` (left out of the island's print), `loot` (searched: a table in `LOOT`, places.js), `epitaph` (a grave), `repair` and `thorns` (mending claw marks; spikes), `dig` (with the spade), `plot`, `crop` and `garden` (the garden), `barrel` and `levels` (a rain barrel), and `tower` (the lighthouse). |
| `js/world.js` | `WORLD_SIZE` and `FIRST_WORLD_SIZE`, `generateWorld(seed, island)`, the `COTTAGE` layout, `placeFinds` (the wreck and gun crates, `world.beaches`), lookups: `groundAt`, `objectAt`, `blockerAt`, `insideHouse`, `setGround`, `setObject`, `bedSpot`, `objectLook` (which pictures a wall in a fence uses). |
| `js/places.js` | Places to find on islands with `places`: `PLACES` (layouts as text, how many, where), `PLACE_LEGEND`, `LOOT`, `NOTES`, `PLACE_NOTES`, `EPITAPHS`; `placePlaces` (and `placeLighthouse`, `siteFits`, `buildPlace`, `handOutNotes`), `searchLoot`, `readScrap`, `epitaphNear`, the note panel (`setupNote`, `openNote`, `closeNote`). |
| `js/night.js` | The day and night cycle: phase lengths, `MOONS` (each with how many of each kind of `creatures` come out), `skyAt(clock, seed)` (phase, darkness, color of the dark, share left, the weather), `nextMorning`, `skyMessage`. No drawing. |
| `js/weather.js` | `weatherAt(clock, seed)` (cloud, rain, storm, wind), `updateWeather` (rain messages, the torch in rain, lightning and thunder, `soakFires`), `relightFire`, `lightningAt`. No drawing. |
| `js/render.js` | The renderer: sizing, glyph atlas, sprite images, ground cache, camera, draw order, the night layer (with cloud shadows and lightning), rain. |
| `js/input.js` | `input` state, `moveVector()`, `actionHeld()`, `takePress()`; floating thumbstick and hold buttons. |
| `js/sound.js` | `SOUNDS` (synthesized: noise through a filter and/or a sliding tone), `playSound`, `playSoundAt`, `updateSound` (wind, rain, birds, crickets, crackle), `setSoundOn`. |
| `js/guns.js` | Shooting (`findShot`, `clearShot`, `gunFor`, `shoot`, `hearShot`), reloading (`gunState`, `updateGuns`), `dropGuns` on death, `washUp` of bullet tins. Placement of the wreck and crates is `placeFinds` in world.js; the streak and flash are `drawShot` and `findLights` in render.js. |
| `js/fishing.js` | `wantsToFish`, `castLine`, `updateFishing` (bite, hook, catch or lose). The bobber and line are drawn in render.js (`drawBobber`, `drawFishingLine`). |
| `js/garden.js` | The garden: `plantFor`, `plant`, `plantHere`, the bucket (`wantsToFill`, `fillBucket`, `waterPlant`), `cropWantsWater`, `cropTint`, `updateGarden` (growing, drying, wilting) and `grow`; rain barrels (`barrelTarget`, `useBarrel`, `updateBarrels`, `barrelPicture`). |
| `js/lighthouse.js` | Lighting the lighthouse: `towerTarget`, `useTower`, `pourOil`, `pumpStroke`, `kindle`; `updateTower` (burning oil), `updateStairs` and `stairsComeOut`; `towerLight`, `beamAngle`, `beamCatches`. The beams are drawn by `paintBeams` in render.js. |
| `js/survival.js` | `ITEMS` (with `food`/`heals` for things you eat, `hideEmpty` for pack slots shown only while you have some), vitals and drain rates, `besideFire`, the torch (`torchWantsFire`, `lightTorch`, `updateTorch`, `torchReach`), `findTarget`, `useTarget`, `eat`, `BURSTS`, particles and floating text. |
| `js/crafting.js` | `TOOLS`, `CRAFT_TABS`, `RECIPES`, costs (`canAfford`, `spend`, `toolPower`, `recipeNeed`), build mode (`findBuildSpot`, `build`, `buildFloor`, `keepClear`), the craft panel and its tabs. |
| `js/chest.js` | `newChest`, the chest panel (`setupChest`, `openChest`, `closeChest`, `refreshChest`, `moveThing`, `moveAll`, `takeDownChest`). |
| `js/map.js` | What you've seen (`markSeen`, `packSeen`/`unpackSeen` for saving) and the map panel (`setupMap`, `openMap`, `closeMap`, `layoutMap`, `centreMap`, `zoomMap`, `panMap`, `setupMapGestures`, `drawMap`, `readCell`). |
| `js/creatures.js` | `CREATURES` (shade, brute, lurker), the night's hunt (`updateCreatures`: coming out, creeping, lunging, biting, running, clawing walls, lurking and springing, fading at dawn), the map of steps (`field`, `mapSteps`, `stepsAt`), what they fear (`lightsToFear`, `inLight`), `hitCreature`. |
| `js/together.js` | Playing together: `together`, the panel (`setupTogether`, `openTogether`), the line (`connectTo`, `say`, `hear`, `lineLost`), `enterIsland`, `leaveIsland`, the island (`worldIsMine`, `worldTime`, `tellIsland`, `sendChanges`, `hearTheIsland`, `heardChange`, `applyChange`, `CHANGES`, `heardTicks`, `sendTicks`), everyone else (`addOther`, `heardPlace`, `stepOther`), `togetherClock`, `updateTogether`, `whereIAm`. Drawn by `drawOtherPlayer` in render.js. |
| `server/` | The rooms for playing together, run by Cloudflare: `src/index.js` (`Island`, a Durable Object per join code), `wrangler.toml`. Not part of the game, and not loaded by it. |
| `js/save.js` | localStorage: `remember`/`recall` (wrapped so a browser that won't store still plays), `recallLook`, `saveGame`/`loadGame` (the world as changes from its seed), `worldPrint`. |
| `js/game.js` | `state`, player movement and collision, menus (and the Your look panel), collapse and death, HUD updates, the main loop. |
| `css/style.css` | HUD overlay, buttons, menus, the portrait "turn sideways" screen. |
| `fonts/` | DejaVu Sans Mono (regular and bold) as WOFF2, with its license. |
| `manifest.webmanifest`, `icons/` | Home-screen install: full screen, landscape. |
| `.nojekyll` | Empty. Tells GitHub Pages to publish files as they are instead of running Jekyll over them (which would drop anything named `_…`). |

## World model

- A grid of `world.width × world.height` tiles in parallel arrays on `world`: `ground` (keys into
  `TILES`), `objects` (keys into `OBJECTS` or `null`), `heights` (rows of cliff for mountains),
  `shades` (background patch index), `variants` (random byte per tile for glyph and color picks).
- Positions are in tile units. The player's `x, y` is the middle of their feet; collision uses a
  small foot box (`FOOT_HALF_WIDTH`, `FOOT_HALF_DEPTH`), moving one axis at a time with corner
  slipping so thumbstick movement slides through doorways.
- A tile is solid if its ground or its object is `solid` (`blockerAt`).
- `world.original` is `objects` as generated, including the wreck, crates and places (saving keeps
  only the differences). `world.print` (`worldPrint`) is taken in `generateWorld` right after the
  cottage, before `placeFinds` and `placePlaces`, so finds and places can change without saved
  islands losing their changes (`found` objects are also left out, since prints were once taken
  after the wreck). `damage`, `clawed` and `soaked` are Maps of tile index to swings, scratches or
  seconds of rain taken; `fuel` holds each lamp's seconds left; `seen` is the map's explored tiles
  (`setObject` clears `damage`, `clawed`, `soaked`, `chests`, `fuel` and `crops`; `soaked` isn't
  saved). `chests` holds what's in each chest and `bed` the newest bedroll's tile. `crops` holds how
  each plant in the garden is getting on, `barrels` the water in each rain barrel, `tower` the
  lighthouse's tank, and `floors` the ground under each board you've laid (the
  only ground that changes in play; the floor itself is `planks` in `ground`). `beaches` (open sand by
  the sea you can walk to) is rebuilt with the island, not saved; so are `places` (`{ kind, x, y,
  search }`) and `notes` (tile index → note), and `hasPlaces` comes from the save's `places` flag.
  **Anything new that should survive a reload** (a survivor field, a world Map) needs adding to
  `saveGame` and `loadGame`.
- `world.house` is the cottage's wall rectangle plus `doorX`. The cottage is drawn specially: a roof
  and front wall from outside, a cutaway with the back wall standing from inside.

## Crafting and build mode (js/crafting.js)

- `RECIPES` drives everything: the craft panel makes one card per recipe at startup
  (`setupCrafting`), in table order, on the tab its `tab` names, and number keys pick by that order
  within the tab showing. A recipe with `tool` puts
  a key in `survivor.tools` (lost on death, like the pack); one with `builds` (or `floor`) starts
  build mode; one
  with `gives` adds items to the pack and keeps the panel open (`refreshCraft`). `byFire` recipes
  need `survivor.warm` (beside a campfire), and `needs` recipes a tool, checked in `canMake`; the
  card says which (`recipeNeed`). A `builds` recipe with `over` (the
  roof, a planting) must be built onto one of those objects and replaces it, instead of going on
  clear ground.
  Number keys: `1`–`9`, then `0`, `-` and `=` for the tenth to twelfth (`RECIPE_KEYS`, input.js),
  so a tab can hold twelve with a key each (the fullest, Build, has eleven).
  A tool's `power` multiplies swings for an action word (`toolPower`). Each tool needs a hidden
  `tool-<key>` slot in the pack in `index.html`, like each item's `count-<item>`.
- The craft panel pauses the game (`state.paused`), except on a shared island, where it only stops you
  acting (see "Playing together, stage two"). The Craft and menu buttons act on `click`, not
  `pointerdown`, so the tap that opens a panel can't land on the panel as it appears.
- Build mode is `state.building` (a recipe key) and `state.buildSpot` (`{ x, y, problem }`,
  recomputed each update). The spot is the tile one past the front edge of the feet, so it never
  overlaps the player. Walking doesn't turn you in build mode; a flick does (`flickOrWalk`). While
  building, `findTarget` is skipped and the action button builds once per press (the `'action'`
  press from `input.js`), not on hold. Anything built is an ordinary
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
  A press always counts for at least one update (`state.tapped`), however quick.

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
  feet position in tiles like the player; `addCreature` makes one), cleared on waking. `state.hunt` remembers when night
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
  null`, or `redrawGround(world, x, y)` for one tile, as floors do) or it will keep showing the old
  tiles. Objects are not in the cache, so `setObject` needs nothing extra.
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
python3 -m http.server 8000   # then open http://localhost:8000 (`python` on the owner's Windows PC)
```

To check it the way GitHub Pages serves it, run the server from the folder *above* the repo and
open http://localhost:8000/ASCII_Nightmare/ — a missing file there (a 404 in the console) means a
path isn't relative.

To check playing together, also run the rooms: `cd server`, `npm install` the first time, then
`npx wrangler dev`. No Cloudflare login is needed for that. Open the game in two browser windows side
by side (a hidden window or background tab gets no frames).

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
