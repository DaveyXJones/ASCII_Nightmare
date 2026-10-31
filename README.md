# ASCII Nightmare

A survival game drawn entirely in text, seen from above and a little in front: a three-quarter
view, like the old top-down adventure games. You wake up in a cottage on a randomly generated
island. Keep yourself fed and watered: pick berries, drink from lakes and the well, chop trees and
break rocks for wood and stone, then turn them into an axe, a campfire and walls. After eight
minutes the sun goes down, and things with red eyes come out of the dark. You'll want a torch.

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
| Act | The big button on the right. It says what it will do: **Chop**, **Mine**, **Pick**, **Drink**, **Light**, **Hit**. Hold it to keep going | `Space` or `E` (hold to keep going) |
| Eat | The small button: eats the best food you have | `F` |
| Craft | **Craft**, the button above the big one, then tap what to make | `C`, then `1` to `7` |
| Build | Face the spot and tap **Build**; tap **Done** to stop | `Space` builds; `C` or `Esc` stops |
| Menu | ☰ in the top right | `Esc` |

Yellow brackets `[ ]` on the map show what the action button will use.

**Your look.** In the menu, **Your look** lets you pick the colors of your hat, hair, skin, shirt
and trousers. The game remembers them next time.

## Staying alive

- **Food** (orange) and **water** (blue) run down as you go: a full stomach lasts about seven
  minutes, water about five.
- Run out of either and your **health** (red) starts dropping, and you flash red now and then
  while it does. Keep both up and it slowly comes back. When it runs out you sink to your knees
  and fall.
- **Berry bushes** give three berries each and grow back after a minute and a half. Each berry is
  a little food. **Cook** them at a campfire (Craft, while you stand by the fire): two berries make
  one portion of cooked berries, which fills you more than the two raw ones and gives back a little
  health. The Eat button eats cooked berries first.
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
| **Stone axe** | 3 wood, 2 stone | Trees fall in half the swings, and shades too. You lose it if you die. |
| **Stone pick** | 2 wood, 3 stone | Boulders break in half the swings. You lose it if you die. |
| **Torch** | 2 wood, 1 cloth | Light it at a campfire to see in the dark (below). You lose it if you die. |
| **Campfire** | 4 wood, 3 stone | Stand beside it and your health comes back four times faster (the ♥ glows). |
| **Wooden wall** | 2 wood each | A stretch of sharpened stakes. Line them up into a fence. |
| **Wooden door** | 3 wood | Set it in a line of wall. It swings open as you walk up and shuts behind you; shades can't open it. |
| **Cooked berries** | 2 berries | Only beside a campfire. Fills you up more, and heals a little. The panel stays open to cook more. |

Choosing a campfire or a wall starts **build mode**: a see-through copy appears on the tile in
front of you. Yellow brackets mean it can go there, red means it can't (the message says why).
Tap **Build** to put it down. Walls stay in build mode so you can keep going: build, step
sideways, build again. Tap **Done** when you've finished.

Changed your mind? Face the wall or door and **Break** it, or **Put out** the campfire, and you
get the wood or stone back. Things you build stay in the world when you die.

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

## Things in the dark

A little while after nightfall, **shades** come out: hunched shadows with pointed ears and red
eyes. In the dark, their eyes are all you'll see of them. They come out somewhere off in the dark,
find their way to you round trees and rocks, and when they're close they dart in, bite (a chunk of
health) and back off to come again.

- **Light keeps them back.** They won't come into the light of a campfire or your torch. They pace
  round its edge, where you can see them, and as your torch burns low they come closer.
- **They won't come indoors.** The cottage is safe, but the well is outside.
- **Walls stop them.** Build a ring of walls and they gather round it, pressing to get in. Leave
  a gap and they'll find it.
- **Hit back.** When one's in reach the big button says **Hit**. Each hit knocks it back and sends
  it running; three hits (two with the axe) and it comes apart into smoke.
- **The moon decides how many** can be out at once: two on the first night's half moon, three on
  a thin moon, four with no moon, one under a full moon.
- **At dawn** they back away and melt into what's left of the dark.

If they get you, the screen says **The dark takes you.**

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
| `js/creatures.js` | The shades: when they come out, how they find you, what scares them off. |
| `js/save.js` | What the game remembers between visits: your look. |
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
- **Restyle the player.** `LOOKS` in `js/sprites.js` holds the colors on the Your look panel: add
  one to a row and it gets its own button. Only the main color is needed; `dressPlayer()` works out
  the lighter and darker shades. `PLAYER_SPRITES` has a picture for each pose in each direction:
  standing, blinking, four steps of walking, the tool raised, the swing, kneeling, and lying on the
  ground. `ACTION_POSES` says which pose and which tool goes with each action, like kneeling to
  drink.
- **A new kind of ground.** Add an entry to `TILES` in `js/tiles.js`, then return its name from
  `pickTerrain()` in `js/world.js`.
- **A new thing to gather.** Draw it in `SPRITES`, describe it in `OBJECTS` (what the button says,
  how many hits, what it gives), and place it in `pickTerrain()`. New items go in `ITEMS` in
  `js/survival.js` and the pack in `index.html`.
- **The cottage.** It's drawn as text in `COTTAGE` at the top of `js/world.js`: move the bed, add
  furniture, or make it bigger.
- **A new recipe.** Add it to `RECIPES` in `js/crafting.js` and it gets its own card. A tool goes in
  `TOOLS` (look at the pick: `power: { Mine: 2 }` makes each swing count twice) and needs a slot in
  the pack in `index.html` like the axe's. To make something you build, draw it in `SPRITES`,
  describe it in `OBJECTS`, and give the recipe `builds:` its name. Something for the pack, like
  cooked berries, uses `gives:`; add `byFire: true` if it needs a campfire.
- **A new food.** Give an item in `ITEMS` (`js/survival.js`) a `food` number, and a `heals` number
  if it should give health back. The Eat button always eats whatever gives the most food.
- **How hard survival is.** `FOOD_PER_SECOND`, `WATER_PER_SECOND` and friends at the top of
  `js/survival.js`.
- **Day and night.** `DAY_SECONDS` and `NIGHT_SECONDS` at the top of `js/night.js` (set
  `DAY_SECONDS` to 30 to see the night straight away). `DARKEST` is how black a moonless night
  gets, and `MOONS` is the moon's shape for each night, in order: add, remove or reorder them.
- **The torch.** `burns` (seconds) and `light` (how far it reaches, in tiles) on the torch in
  `TOOLS` in `js/crafting.js`. A campfire's reach is `light` in `OBJECTS`; give anything a `light`
  and it glows at night.
- **The shades.** `CREATURES` at the top of `js/creatures.js`: how many hits one takes, how hard it
  bites, how fast it creeps and darts. The numbers under it say when they come out, how far off,
  and how close to a light they dare go (`FEAR_SHARE`). How many come out each night is
  `creatures` on each moon in `MOONS` (`js/night.js`). Redraw them as `shade` and `shade2` in
  `js/sprites.js`.
- **Walking speed.** `WALK_SPEED` at the top of `js/game.js`.

## What's next

Roughly in order:

1. **The character.** ~~Pick your own colors, flash when you're hurt and fall over when you
   die~~ (done). Still to decide: a dark outline so you stand out on busy ground.
2. **More to craft.** ~~A pick for stone, a door in a wall, cooking berries over the fire~~ (done).
3. **More in the dark.** Other kinds of creature, shades that claw at walls until they break.
4. **Saving.** Keep the world and your pack between visits.
5. **Sound.** Chops, footsteps, rain.
6. **Multiplayer.** Because the world is built from a seed, a server only has to share the seed
   and what's changed, not the whole map.
