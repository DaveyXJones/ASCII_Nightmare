# ASCII Nightmare

A survival game drawn entirely in text, seen from above and a little in front: a three-quarter
view, like the old top-down adventure games. You wake up in a cottage on a randomly generated
island. Keep yourself fed and watered: pick berries, drink from lakes and the well, chop trees and
break rocks for wood and stone.

```
   ▄▄▄▄                         ▗█▖
  ▟ ♣  ▙     ▲▲                  ☻
 ▐♣  " ♣▌   ▲^^▲     ▗▄▄▖       ▐█▌
 ▐ "♣  "▌  ▲^^^^▲    ▐▄▄▌    "   Π  ʷ
  ▜♣ ♣ ▛    ▲^^▲     ▝▀▀▘  '  "  ,
   ▀▐▌▀    ▲^^^^▲    .   ,   ~~~~~~~~
     .  '   ▐▌    ,    '    ~≈~~~≈~~~
```

Trees, rocks, cliffs and the cottage stand up off the ground and overlap whatever is behind them.
Walk behind a tree or around the back of the cottage and you're hidden, shown as a faint outline.
Step inside the cottage and its roof lifts off.

## Play on your phone

**https://daveyxjones.github.io/ASCII_Nightmare/**

Open that on your phone and hold it sideways. **Add it to your home screen** (Safari: Share → Add
to Home Screen; Chrome: ⋮ → Add to Home screen) and it opens full screen, with no browser bars. On
Android, the **Wake up** button also goes full screen and locks the screen sideways.

GitHub Pages publishes the `main` branch there for free. Anything pushed to `main` shows up at that
address within a couple of minutes (reload the page, or close and reopen the home-screen icon).

**Testing on your phone before pushing:** run a small server on your computer (below), then on a
phone on the same Wi-Fi open `http://<your computer's local IP>:8000`.

## Play on a computer

Start a tiny local server in this folder and open http://localhost:8000:

```sh
python3 -m http.server
```

Opening `index.html` directly by double-clicking works too, but browsers won't load the bundled
font from a file, so some characters may look a little different.

## Controls

| | Phone | Keyboard |
| --- | --- | --- |
| Walk | Put your left thumb down anywhere on the left half of the screen and drag | `W` `A` `S` `D` or the arrow keys |
| Act | The big button on the right. It says what it will do: **Chop**, **Mine**, **Pick**, **Drink**. Hold it to keep going | `Space` or `E` (hold to keep going) |
| Eat a berry | The small button | `F` |
| Menu | ☰ in the top right | `Esc` |

Yellow brackets `[ ]` on the map show what the action button will use.

## Staying alive

- **Food** (orange) and **water** (blue) run down as you go: a full stomach lasts about seven
  minutes, water about five.
- Run out of either and your **health** (red) starts dropping. Keep both up and it slowly comes
  back.
- **Berry bushes** give three berries each and grow back after a minute and a half. Each berry is
  a little food.
- **Drink** at the edge of any lake or the sea, or from the well beside the cottage.
- **Trees** give wood and leave a stump; **boulders** give stone. You can't build anything with them
  yet. That's the next thing to add.

## How it's put together

Plain HTML, CSS and JavaScript, with nothing to install or build.

| File | What it does |
| --- | --- |
| `index.html` | The page: the map, the health bars and pack, the touch controls, the menus. |
| `css/style.css` | Everything that floats over the map, and the layout for phones and computers. |
| `js/random.js` | Seeded random numbers and noise. The same seed always builds the same world. |
| `js/tiles.js` | Every kind of ground: its characters, colors, and whether you can walk on it. |
| `js/sprites.js` | The ASCII art for everything that stands up: trees, rocks, the well, the player. |
| `js/objects.js` | The things standing on the map, and what the action button does to each one. |
| `js/world.js` | Builds the island from two noise maps (elevation and moisture) and places the cottage. |
| `js/render.js` | Draws the world in the three-quarter view, fast enough for a phone. |
| `js/input.js` | The thumbstick, the buttons, and the keyboard. |
| `js/survival.js` | Health, food and water, your pack, and the action button. |
| `js/game.js` | Walking and bumping into things, the main loop, the menus. |
| `fonts/` | DejaVu Sans Mono, so every phone draws the same characters. |
| `.nojekyll` | An empty file that tells GitHub Pages to publish everything exactly as it is. |

The scripts are plain `<script>` files loaded in order (no modules), which is what lets the game
run straight from the file.

## Things to try changing

- **Redraw something.** Every sprite in `js/sprites.js` is two little pictures: `art` (the
  characters) and `paint` (a letter for each character saying which `ink` color to use). Change the
  oak tree's leaves, give the player a different hat, or recolor the berries. If the two pictures
  don't line up, the browser console tells you which row.
- **A new kind of ground.** Add an entry to `TILES` in `js/tiles.js`, then return its name from
  `pickTerrain()` in `js/world.js`.
- **A new thing to gather.** Draw it in `SPRITES`, describe it in `OBJECTS` (what the button says,
  how many hits, what it gives), and place it in `pickTerrain()`. New items go in `ITEMS` in
  `js/survival.js` and the pack in `index.html`.
- **The cottage.** It's drawn as text in `COTTAGE` at the top of `js/world.js`: move the bed, add
  furniture, or make it bigger.
- **How hard survival is.** `FOOD_PER_SECOND`, `WATER_PER_SECOND` and friends at the top of
  `js/survival.js`.
- **Walking speed.** `WALK_SPEED` at the top of `js/game.js`.

## What's next

Roughly in order:

1. **Crafting.** Wood and stone into a campfire, an axe that chops faster, a wall to build.
2. **Night.** A day and night cycle, a ring of light around the player and the campfire, and
   things that come out of the dark. It's called Nightmare for a reason.
3. **Saving.** Keep the world and your pack between visits.
4. **Sound.** Chops, footsteps, rain.
5. **Multiplayer.** Because the world is built from a seed, a server only has to share the seed
   and what's changed, not the whole map.
