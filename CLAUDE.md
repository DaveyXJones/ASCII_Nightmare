# ASCII Nightmare

A survival game drawn in text characters, played mainly on a phone held sideways (landscape) with
touch controls, and also on a computer with a keyboard. The world is seen in a three-quarter
(3/4) view: ground is flat, and trees, rocks, cliffs, the cottage and the player stand up off it
and overlap whatever is behind them. The owner is building toward a fuller survival game
(crafting, a day and night cycle with things that come out at night, saving, maybe multiplayer);
see "What's next" in README.md.

## Where things stand: getting the game online (last updated 2026-10-28)

The owner wants to play on their phone through GitHub Pages. That isn't set up yet:

- `main` has the current game.
- The repository (`DaveyXJones/ASCII_Nightmare`) is **private**, and Pages on a private repo needs a
  paid GitHub plan. The owner has decided to make it public instead.
- The repo's default branch is still `claude/ascii-game-character-movement-3rlu42`, the first
  version. GitHub chose it only because it was pushed first. It's already contained in `main`.

Claude can't change repository settings (visibility, Pages, default branch) with its tools, so the
owner does these steps at a computer. GitHub's phone site and app don't show these settings.
**The owner finds GitHub hard to navigate.** Walk them through one step at a time, using the direct
links and exact button names below. If what they see doesn't match, ask them what's on the screen.
Before starting, check which steps are already done: the GitHub `search_repositories` tool with
`repo:DaveyXJones/ASCII_Nightmare` and `minimal_output: false` shows `private`, `has_pages` and
`default_branch`. Skip finished steps, and update this section when things change.

1. **Make the repo public.** Open https://github.com/DaveyXJones/ASCII_Nightmare/settings, scroll
   to the bottom to the red **Danger Zone** box, and next to **Change repository visibility** click
   **Change visibility** → **Change to public**. Confirm each prompt ("I want to make this
   repository public", "I have read and understand these effects"). GitHub may ask for a password or
   a two-factor code. Public means anyone can see the code; nobody can change it without access.
2. **Turn on Pages.** Open https://github.com/DaveyXJones/ASCII_Nightmare/settings/pages. Under
   **Build and deployment**, set **Source** to **Deploy from a branch**. In the **Branch** row pick
   **main** and **/ (root)**, then **Save**. After a minute or two, refresh: a box at the top says
   the site is live at https://daveyxjones.github.io/ASCII_Nightmare/
3. **Make `main` the default branch.** On https://github.com/DaveyXJones/ASCII_Nightmare/settings,
   under **Default branch**, click the two-arrows button, pick **main**, click **Update**, and
   confirm.
4. **Put it on the phone's home screen.** Open the link on the phone, then Safari: Share → **Add to
   Home Screen**, or Chrome: ⋮ → **Add to Home screen**. Opened from the icon, it runs full screen.
   Hold the phone sideways.
5. Optional, and ask first: once `main` is the default, the old
   `claude/ascii-game-character-movement-3rlu42` branch can be deleted.

Once Pages is on, every push to `main` updates the live game within a couple of minutes.

## Hard rules

- **No build step, no dependencies, no ES modules.** Plain `<script>` files loaded in order from
  `index.html`, sharing globals. The game must keep working when `index.html` is opened straight
  from disk (file://), where modules and font loading are blocked. Don't add a bundler, a
  framework, npm packages or `import`/`export`.
- **Load order matters** (see `index.html`): `random → tiles → sprites → objects → world → render →
  input → survival → game`. A file may use globals from files before it at load time, and from any
  file inside functions that run later.
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
| `js/tiles.js` | `TILES`: ground types (glyphs, colors, background shades, `solid`, `animated`, `drink`, `tall`, `raised`). |
| `js/sprites.js` | `SPRITES` (ASCII art for standing things) and `PLAYER_SPRITES`/`PLAYER_INK`. Validated at load by `prepareSprite`. |
| `js/objects.js` | `OBJECTS`: things standing on tiles and what the action button does to them (`action`, `hits`, `gives`, `becomes`, `regrow`, `drink`). |
| `js/world.js` | `generateWorld(seed)`, the `COTTAGE` layout, lookups: `groundAt`, `objectAt`, `blockerAt`, `insideHouse`, `setGround`, `setObject`. |
| `js/render.js` | The renderer: sizing, glyph atlas, sprite images, ground cache, camera, draw order. |
| `js/input.js` | `input` state, `moveVector()`, `actionHeld()`, `takePress()`; floating thumbstick and hold buttons. |
| `js/survival.js` | `ITEMS`, vitals and drain rates, `findTarget`, `useTarget`, `eatBerry`, particles and floating text. |
| `js/game.js` | `state`, player movement and collision, menus, death, HUD updates, the main loop. |
| `css/style.css` | HUD overlay, buttons, menus, the portrait "turn sideways" screen. |
| `fonts/` | DejaVu Sans Mono (regular and bold) as WOFF2, with its license. |
| `manifest.webmanifest`, `icons/` | Home-screen install: full screen, landscape. |

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
