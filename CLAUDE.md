# ASCII Nightmare

A survival game drawn in text characters, played mainly on a phone held sideways (landscape) with
touch controls, and also on a computer with a keyboard. The world is seen in a three-quarter
(3/4) view: ground is flat, and trees, rocks, cliffs, the cottage and the player stand up off it
and overlap whatever is behind them. The owner is building toward a fuller survival game
(crafting, a day and night cycle with things that come out at night, saving, maybe multiplayer);
see "What's next" in README.md.

## Where things stand: the game is online (last updated 2026-10-29)

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

Crafting (PR #2) and the redrawn, animated player (PR #3) are merged and live. Night and the torch
were built next, to the owner's spec: **a torch costs 2 wood and 1 cloth (a new item) and must be
lit at a campfire; night lasts 10 minutes, with varying darkness and moonlight.** Choices Claude
made that the owner hadn't specified, any of which they may want changed:

- **Cloth comes from cotton plants** (`cotton` in `OBJECTS`): picked like berry bushes, regrow in
  two minutes. Two stand beside the cottage (`c` in `COTTAGE`) so a new player finds them, and
  more grow in open fields (`pickTerrain`).
- **The cycle:** 8 min day, 1 min dusk, 10 min night, 1 min dawn. Dying wakes you at the next
  morning (`nextMorning`); a new world starts on the first morning.
- **"Varying darkness":** the moon's shape changes nightly through `MOONS` (half, thin, none,
  thin, half, bright, full, bright); it rises and sets over the night, and clouds (noise) cross it.
- **The torch** burns 5 minutes, then goes out but stays in the pack; light it again at any fire.
  Once it's burnt halfway down a fire offers **Light** instead of **Put out**, to top it up.

Next, the owner's plan: **things that come out of the dark** (walls from crafting are meant to
matter then). Character ideas the owner liked, for after that (none started):
1. **Choose your look:** hat, shirt and trouser colors picked from the menu. All of the player's
   colors are in `PLAYER_INK`; after changing them, clear the player sprites' cached `image` so
   `spriteImage` redraws them.
2. **Hurt and collapse:** a flash while hunger or thirst is hurting, and a fall before the death
   screen.
3. **Outline:** a thin dark edge so the player stands out on busy ground. It bends "Draw only
   characters on the map", so ask the owner before building it.

## Hard rules

- **No build step, no dependencies, no ES modules.** Plain `<script>` files loaded in order from
  `index.html`, sharing globals. The game must keep working when `index.html` is opened straight
  from disk (file://), where modules and font loading are blocked. Don't add a bundler, a
  framework, npm packages or `import`/`export`.
- **Relative paths only.** The live game sits in a subfolder (`/ASCII_Nightmare/`), not at the site
  root, so a path starting with `/` works on a local server but breaks online. Write `js/game.js`,
  `../fonts/…` in CSS, and keep the manifest's `start_url` and `scope` as `./`.
- **Load order matters** (see `index.html`): `random → tiles → sprites → objects → world → night →
  render → input → survival → crafting → game`. A file may use globals from files before it at load time,
  and from any file inside functions that run later.
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
| `js/sprites.js` | `SPRITES` (ASCII art for standing things), the player's `PLAYER_SPRITES`/`PLAYER_INK`, and `ACTION_POSES`. Validated at load by `prepareSprite`. |
| `js/objects.js` | `OBJECTS`: things standing on tiles and what the action button does to them (`action`, `hits`, `gives`, `becomes`, `regrow`, `drink`, `burst`), plus `frames` (flicker between sprites), `warmth` (heal faster nearby), `light` (reach at night, in tiles) and `flame` (a torch can be lit at it). |
| `js/world.js` | `generateWorld(seed)`, the `COTTAGE` layout, lookups: `groundAt`, `objectAt`, `blockerAt`, `insideHouse`, `setGround`, `setObject`. |
| `js/night.js` | The day and night cycle: phase lengths, `MOONS`, `skyAt(clock, seed)` (phase, darkness, color of the dark, share left), `nextMorning`, `skyMessage`. No drawing. |
| `js/render.js` | The renderer: sizing, glyph atlas, sprite images, ground cache, camera, draw order. |
| `js/input.js` | `input` state, `moveVector()`, `actionHeld()`, `takePress()`; floating thumbstick and hold buttons. |
| `js/survival.js` | `ITEMS`, vitals and drain rates, `besideFire`, the torch (`torchWantsFire`, `lightTorch`, `updateTorch`, `torchReach`), `findTarget`, `useTarget`, `eatBerry`, `BURSTS`, particles and floating text. |
| `js/crafting.js` | `TOOLS`, `RECIPES`, costs (`canAfford`, `spend`, `toolPower`), build mode (`findBuildSpot`, `build`), the craft panel. |
| `js/game.js` | `state`, player movement and collision, menus, death, HUD updates, the main loop. |
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
- `world.house` is the cottage's wall rectangle plus `doorX`. The cottage is drawn specially: a roof
  and front wall from outside, a cutaway with the back wall standing from inside.

## Crafting and build mode (js/crafting.js)

- `RECIPES` drives everything: the craft panel makes one card per recipe at startup
  (`setupCrafting`), in table order, and number keys pick by that order. A recipe with `tool` puts
  a key in `survivor.tools` (lost on death, like the pack); one with `builds` starts build mode.
  A tool's `power` multiplies swings for an action word (`toolPower`). Each tool needs a hidden
  `tool-<key>` slot in the pack in `index.html`, like each item's `count-<item>`.
- The craft panel pauses the game (`state.paused`). The Craft and menu buttons act on `click`, not
  `pointerdown`, so the tap that opens a panel can't land on the panel as it appears.
- Build mode is `state.building` (a recipe key) and `state.buildSpot` (`{ x, y, problem }`,
  recomputed each update). The spot is the tile one past the front edge of the feet, so it never
  overlaps the player. While building, `findTarget` is skipped and the action button builds once
  per press (the `'action'` press from `input.js`), not on hold. Anything built is an ordinary
  object with an `action` that takes it down again, so a misplaced wall is never a trap.
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

## Rendering (js/render.js)

- One tile is **two character cells wide and one row tall**. All drawing is in device pixels; cell
  sizes are integers, so nothing seams. The font is sized so `█` slightly overflows a cell and is
  clipped, which makes block characters tile without gaps.
- **Never call `fillText` per cell per frame.** Three caches keep phones fast:
  - **Glyph atlas** (`glyphSlot`): each (char, color, bold) is drawn once. Use `drawGlyph(ctx, …)`.
  - **Sprite images** (`spriteImage`): each sprite is rendered once to its own canvas and drawn with
    one `drawImage`. Cottage images are cached the same way. These rebuild automatically when the
    atlas changes (on resize or font load).
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
  the darkness (`drawShadows`).

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
  `strike`, `crouch` (top row empty, so it's the same height). `held` gives the cell, from the
  picture's top-left, where the tool glyph is drawn for each pose. `playerPose()` in render.js
  picks one: a recent `player.act` (`{ action, at }`, set by `useTarget`, `eatBerry` and `build`)
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
