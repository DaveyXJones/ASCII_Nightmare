# ASCII Nightmare

A survival game drawn in text characters, played mainly on a phone held sideways (landscape) with
touch controls, and also on a computer with a keyboard. The world is seen in a three-quarter
(3/4) view: ground is flat, and trees, rocks, cliffs, the cottage and the player stand up off it
and overlap whatever is behind them. The owner is building toward a fuller survival game
(crafting, a day and night cycle with things that come out at night, saving, maybe multiplayer);
see "What's next" in README.md.

## Where things stand: the game is online (last updated 2026-10-28)

The game is live at **https://daveyxjones.github.io/ASCII_Nightmare/**. The repository
(`DaveyXJones/ASCII_Nightmare`) is public, its default branch is `main`, and GitHub Pages deploys
from `main`, `/ (root)`. **Every push to `main` updates the live game** within a couple of
minutes, so `main` must always be playable.

- **Checking a deploy.** Each push to `main` starts a "pages build and deployment" run; the GitHub
  `actions_list` tool (`list_workflow_runs`) shows whether it succeeded. Claude's cloud container
  can't open github.io itself (blocked by its network policy), so for what the page actually does,
  serve the game from a subfolder the way Pages does (see "Checking a change").
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

## Hard rules

- **No build step, no dependencies, no ES modules.** Plain `<script>` files loaded in order from
  `index.html`, sharing globals. The game must keep working when `index.html` is opened straight
  from disk (file://), where modules and font loading are blocked. Don't add a bundler, a
  framework, npm packages or `import`/`export`.
- **Relative paths only.** The live game sits in a subfolder (`/ASCII_Nightmare/`), not at the site
  root, so a path starting with `/` works on a local server but breaks online. Write `js/game.js`,
  `../fonts/…` in CSS, and keep the manifest's `start_url` and `scope` as `./`.
- **Load order matters** (see `index.html`): `random → tiles → sprites → objects → world → render →
  input → survival → crafting → game`. A file may use globals from files before it at load time,
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
| `js/objects.js` | `OBJECTS`: things standing on tiles and what the action button does to them (`action`, `hits`, `gives`, `becomes`, `regrow`, `drink`, `burst`), plus `frames` (flicker between sprites) and `warmth` (heal faster nearby). |
| `js/world.js` | `generateWorld(seed)`, the `COTTAGE` layout, lookups: `groundAt`, `objectAt`, `blockerAt`, `insideHouse`, `setGround`, `setObject`. |
| `js/render.js` | The renderer: sizing, glyph atlas, sprite images, ground cache, camera, draw order. |
| `js/input.js` | `input` state, `moveVector()`, `actionHeld()`, `takePress()`; floating thumbstick and hold buttons. |
| `js/survival.js` | `ITEMS`, vitals and drain rates, `besideFire`, `findTarget`, `useTarget`, `eatBerry`, `BURSTS`, particles and floating text. |
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
