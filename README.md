# ASCII Nightmare

A survival game drawn entirely in text, seen from above and a little in front: a three-quarter
view, like the old top-down adventure games. You wake up in a cottage on a randomly generated
island. Keep yourself fed and watered: pick berries, drink from lakes and the well, chop trees and
break rocks for wood and stone, then turn them into an axe, a campfire and walls. After eight
minutes the sun goes down, and you'll want a torch.

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
| Act | The big button on the right. It says what it will do: **Chop**, **Mine**, **Pick**, **Drink**, **Light**. Hold it to keep going | `Space` or `E` (hold to keep going) |
| Eat a berry | The small button | `F` |
| Craft | **Craft**, the button above the big one, then tap what to make | `C`, then `1` `2` `3` `4` |
| Build | Face the spot and tap **Build**; tap **Done** to stop | `Space` builds; `C` or `Esc` stops |
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
- **Trees** give wood and leave a stump; **boulders** give stone. Craft with them (below).
- **Cotton plants** (white bolls on green stems) give cloth, for a torch. Two grow beside the
  cottage and more in the open fields. They grow back after two minutes.

## Crafting and building

Tap **Craft** to see what you can make. Each card shows what it costs; numbers in red are what
you're short of. The game pauses while the panel is open. The Craft button lights up when there's
something you can afford.

| Make | Costs | What it does |
| --- | --- | --- |
| **Stone axe** | 3 wood, 2 stone | Trees fall in half the swings. You lose it if you die. |
| **Torch** | 2 wood, 1 cloth | Light it at a campfire to see in the dark (below). You lose it if you die. |
| **Campfire** | 4 wood, 3 stone | Stand beside it and your health comes back four times faster (the ♥ glows). |
| **Wooden wall** | 2 wood each | A stretch of sharpened stakes. Line them up into a fence. |

Choosing a campfire or a wall starts **build mode**: a see-through copy appears on the tile in
front of you. Yellow brackets mean it can go there, red means it can't (the message says why).
Tap **Build** to put it down. Walls stay in build mode so you can keep going: build, step
sideways, build again. Tap **Done** when you've finished.

Changed your mind? Face the wall and **Break** it, or **Put out** the campfire, and you get the
wood or stone back. Things you build stay in the world when you die.

## Night

The sun is up for eight minutes. Then it goes down over a minute (the world turns orange, then
dark), **night lasts ten minutes**, and dawn takes another minute. The fourth bar, under water,
shows the sun ☼ and how much daylight is left; at night it shows the moon and how long until
morning.

How dark it gets depends on the moon. Its shape changes every night: the first night has a half
moon, then it thins to nothing (the third night is pitch black), then grows to a full moon that
lights up the whole island, and round again. Through each night the moon rises, is brightest at
midnight and sets, so the darkest hour is just before dawn. Clouds drift across it now and then.

Light pushes the dark back: your **torch**, **campfires**, and the cottage. Its windows glow at
night, and inside, the candle on the table lights the room. With no light at all you can just make
out your own feet.

**The torch.** Once you've made it you carry it all the time, in the hand you don't chop with.
Face a campfire and the big button says **Light**; it then burns for **five minutes**, dims as it
runs low (the game warns you, and the torch in your pack turns red), and goes out. Light it again
at any campfire. Once it's burnt halfway down a fire offers to top it up, so you can set out with a
fresh one.

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
| `js/night.js` | Day and night: how long each lasts, the moon, and how dark it gets. |
| `js/render.js` | Draws the world in the three-quarter view, fast enough for a phone. |
| `js/input.js` | The thumbstick, the buttons, and the keyboard. |
| `js/survival.js` | Health, food and water, your pack, and the action button. |
| `js/crafting.js` | What you can craft and what it costs, build mode, and the craft panel. |
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
- **Restyle the player.** `PLAYER_INK` holds their colors (hat, hair, shirt, trousers): change a
  few and every picture of them changes. `PLAYER_SPRITES` has a picture for each pose in each
  direction: standing, blinking, four steps of walking, the tool raised, the swing, kneeling.
  `ACTION_POSES` says which pose and which tool goes with each action, like kneeling to drink.
- **A new kind of ground.** Add an entry to `TILES` in `js/tiles.js`, then return its name from
  `pickTerrain()` in `js/world.js`.
- **A new thing to gather.** Draw it in `SPRITES`, describe it in `OBJECTS` (what the button says,
  how many hits, what it gives), and place it in `pickTerrain()`. New items go in `ITEMS` in
  `js/survival.js` and the pack in `index.html`.
- **The cottage.** It's drawn as text in `COTTAGE` at the top of `js/world.js`: move the bed, add
  furniture, or make it bigger.
- **A new recipe.** Add it to `RECIPES` in `js/crafting.js` and it gets its own card. For a stone
  pick that breaks rocks faster, add `pick: { name: 'Stone pick', glyph: '⚒', power: { Mine: 2 } }`
  to `TOOLS`, a recipe with `tool: 'pick'`, and a slot in the pack in `index.html` like the axe's.
  To make something you build, draw it in `SPRITES`, describe it in `OBJECTS`, and give the recipe
  `builds:` its name.
- **How hard survival is.** `FOOD_PER_SECOND`, `WATER_PER_SECOND` and friends at the top of
  `js/survival.js`.
- **Day and night.** `DAY_SECONDS` and `NIGHT_SECONDS` at the top of `js/night.js` (set
  `DAY_SECONDS` to 30 to see the night straight away). `DARKEST` is how black a moonless night
  gets, and `MOONS` is the moon's shape for each night, in order: add, remove or reorder them.
- **The torch.** `burns` (seconds) and `light` (how far it reaches, in tiles) on the torch in
  `TOOLS` in `js/crafting.js`. A campfire's reach is `light` in `OBJECTS`; give anything a `light`
  and it glows at night.
- **Walking speed.** `WALK_SPEED` at the top of `js/game.js`.

## What's next

Roughly in order:

1. **Things that come out of the dark.** Night and the torch are in; next is what prowls in the
   dark. It's called Nightmare for a reason. Walls will matter then.
2. **The character.** Pick your own hat and clothes colors, flash when you're hurt and fall over
   when you die, and maybe a dark outline so you stand out on busy ground.
3. **More to craft.** A pick for stone, a door in a wall, cooking berries over the fire.
4. **Saving.** Keep the world and your pack between visits.
5. **Sound.** Chops, footsteps, rain.
6. **Multiplayer.** Because the world is built from a seed, a server only has to share the seed
   and what's changed, not the whole map.
