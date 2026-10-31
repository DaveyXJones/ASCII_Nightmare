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

**It saves as you go**, every few seconds and whenever you open the menu or switch to another app.
Next time, **Carry on** picks up where you left off: the same island, everything you've chopped and
built, your pack, and the time of day. It's saved in that browser on that phone only, and private
browsing or clearing the browser's data forgets it. **New world** asks for a second tap before it
throws your island away. If you die, the island stays as you left it and you wake up the next
morning with an empty pack (in the cottage, or on your bedroll if you've made one), and anything
you put in a chest is still there.

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
| Act | The big button on the right. It says what it will do: **Chop**, **Mine**, **Pick**, **Drink**, **Light**, **Hit**, **Open**. Hold it to keep going | `Space` or `E` (hold to keep going) |
| Eat | The small button: eats the best food you have | `F` |
| Craft | **Craft**, the button above the big one, then tap what to make | `C`, then `1` to `9` and `0` |
| Build | Face the spot and tap **Build**; tap **Done** to stop. Walking keeps your facing; flick the stick (push and let go) to turn | `Space` builds; tap an arrow key to turn; `C` or `Esc` stops |
| Menu | ☰ in the top right | `Esc` |

Yellow brackets `[ ]` on the map show what the action button will use.

**Your look.** In the menu, **Your look** lets you pick the colors of your hat, hair, skin, shirt
and trousers. The game remembers them next time.

**Sound.** Chops, footsteps (different on grass, sand, dirt and floorboards), the wind, birds by
day and crickets at night, a campfire crackling. Listen to the crickets: they go quiet when
something from the dark is close, and growls come from the side the creature is on. **Sound on** /
**Sound off** is in the menu. On an iPhone, the silent switch mutes the game too.

**Outline.** A thin dark edge round you, so you stand out on busy ground and in the long grass.
**Outline on** / **Outline off** in the menu switches it, to compare; the game remembers which.

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
| **Roof** | 4 wood | Build it over a campfire and rain can't put the fire out (see Weather, below). |
| **Wooden wall** | 2 wood each | A stretch of sharpened stakes. Line them up into a fence. |
| **Wooden door** | 3 wood | Set it in a line of wall. It swings open as you walk up and shuts behind you; shades can't open it. |
| **Chest** | 6 wood | Keeps whatever you put in it, even when you die. It can go inside the cottage. |
| **Bedroll** | 2 cloth, 1 wood | After you die, you wake up on it instead of in the cottage. |
| **Cooked berries** | 2 berries | Only beside a campfire. Fills you up more, and heals a little. The panel stays open to cook more. |

Choosing a campfire or a wall starts **build mode**: a see-through copy appears on the tile in
front of you. Yellow brackets mean it can go there, red means it can't (the message says why).
Tap **Build** to put it down. Walls stay in build mode so you can keep going. Tap **Done** when
you've finished.

In build mode you keep facing the same way while you walk, so you can walk along a line and build
beside you: flick the stick toward the side you want (push it and let go quickly) to turn without
walking, then walk up, **Build**, walk up, **Build**. On a keyboard, tap an arrow key to turn and
hold it to walk. Walls join up by themselves: a fence running up the screen is drawn from the side,
one stake behind the next, and a door in it the same way.

Changed your mind? Face the wall or door and **Break** it, or **Put out** the campfire, and you
get the wood or stone back. Things you build stay in the world when you die.

A **roof** goes over a campfire that's already there: face the fire and tap **Build**.

**Chests.** Face a chest and tap **Open**. Your pack is on the left, the chest on the right: tap
something to move all of it across, or **Put all in** (everything but your tools) and **Take all
out**. Tools go in one at a time, so your axe can wait at home for you; a torch put away goes out.
The game pauses while the chest is open. Dying empties your pack, never a chest. A chest is the
one thing you can build inside the cottage (anywhere but the doorway and the spot by the bed). To
move it, empty it and tap **Take down** for some of the wood back.

**Bedrolls.** You walk over a bedroll, and wake up on it after you die, so build one inside your
fence by the fire. If you've made more than one, you wake on the newest (or another, if you've rolled that one up). Face it and **Roll up**
to take it back.

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

## Weather

Now and then clouds roll in. First their shadows drift across the island, then the whole sky
turns grey and it starts to rain: drops slant down the screen and splash on the ground and the
water, and you hear it drumming on the cottage roof. The heaviest rain comes with **thunder and
lightning**, and at night a flash of lightning lights up the island for a moment, showing whatever
is out there with you. It rains about once a day and night, for a few minutes. The first day of a
new world stays dry. While it rains, the sun on the fourth bar turns into an umbrella ☂ (a cloud
☁ when it's just grey).

- **Rain puts out campfires.** A fire out in the open hisses and steams, and after about half a
  minute of heavy rain it goes out, and its light with it, which matters at night. Face a cold
  campfire and the button says **Light**: once the rain stops, a piece of wood gets it going again.
- **A roof keeps it burning.** Craft a **Roof** and build it over the campfire (or over a cold
  one, which lights it again). Rain can't touch a fire under a roof.
- **Your torch** burns down twice as fast out in pouring rain, so get under the cottage roof or
  keep a fire going.
- In the rain the crickets stop singing, so you can't listen for things creeping up. Lightning
  shows them instead.

## Things in the dark

A little while after nightfall, **shades** come out: hunched shadows with pointed ears and red
eyes. In the dark, their eyes are all you'll see of them. They come out somewhere off in the dark,
find their way to you round trees and rocks, and when they're close they dart in, bite (a chunk of
health) and back off to come again.

- **Light keeps them back.** They won't come into the light of a campfire or your torch. They pace
  round its edge, where you can see them, and as your torch burns low they come closer.
- **They won't come indoors.** The cottage is safe, but the well is outside.
- **Walls stop them, for a while.** Build a ring of walls and they gather round it. Shut out,
  they claw at the wall: it shakes, splinters fly, claw marks show once it's halfway gone, and then
  it breaks. A door in the ring lets you in and out; it never opens for them. Leave a gap and
  they'll find it. By morning the claw marks are gone.
- **Hit back.** When one's in reach the big button says **Hit**, even through a wall. Each hit
  knocks it back and sends it running; three hits (two with the axe) and it comes apart into
  smoke.
- **Brutes.** On the darkest nights (no moon, and the thin moon after it), once the night is a few
  minutes old, something bigger comes: a great shaggy shadow with one amber eye. It's slow, but
  **your torch doesn't scare it**, only a campfire's light does. It bites hard, claws through
  walls quickly, and takes six hits (three with the axe). Outrun it to a fire, or the cottage.
- **Lurkers.** On moonlit nights, something waits in the **long grass**: a low dark shape with
  yellow-green eyes that never blink. It doesn't hunt you. It sits perfectly still, and when you
  walk within a couple of steps it springs out and bites, then slinks off to wait in another patch
  of grass. **A torch doesn't scare it**, so watch the grass for eyes and go round, or hit it (two
  hits, one with the axe). It won't come into a campfire's light.
- **The moon decides how many** can be out at once: two shades on the first night's half moon,
  three on a thin moon, three and a brute with no moon or the thin moon after it, one under a full
  moon. Lurkers come on the brighter nights, when the fields feel safe: one on the first thin
  moon, two on the half and bright moons, three under the full moon.
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
| `js/weather.js` | Clouds, rain and storms: when they come, and rain putting out campfires. |
| `js/render.js` | Draws the world in the three-quarter view, fast enough for a phone. |
| `js/input.js` | The thumbstick, the buttons, and the keyboard. |
| `js/sound.js` | Every sound, made by the browser on the spot, so there are no sound files. |
| `js/survival.js` | Health, food and water, your pack, and the action button. |
| `js/crafting.js` | What you can craft and what it costs, build mode, and the craft panel. |
| `js/chest.js` | Chests: what's in each one, and the panel for moving things in and out. |
| `js/creatures.js` | The shades, brutes and lurkers: when they come out, how they find you, what scares them off. |
| `js/save.js` | What the game remembers between visits: your island, your pack, your look. |
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
- **What things cost.** `cost` on each recipe in `RECIPES` (`js/crafting.js`). What an empty chest
  gives back is `CHEST_GIVES_BACK` at the top of `js/chest.js`.
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
- **Weather.** The numbers at the top of `js/weather.js`: `WEATHER_SECONDS` is about how long a
  spell of weather lasts; lower `RAIN_FROM` and it rains more often; `DOUSE_SECONDS` is how long a
  campfire lasts in the rain. How the rain looks (how many drops, how fast, their colors) is
  `RAIN_DROPS` and its neighbours at the top of `js/render.js`.
- **The torch.** `burns` (seconds) and `light` (how far it reaches, in tiles) on the torch in
  `TOOLS` in `js/crafting.js`. A campfire's reach is `light` in `OBJECTS`; give anything a `light`
  and it glows at night.
- **The shades and brutes.** `CREATURES` at the top of `js/creatures.js`: how many hits each takes,
  how hard it bites, how fast it creeps and darts, how close to a campfire or a torch it dares go
  (`fear`), how hard it claws at walls. The numbers under it say when they come out and how far
  off. How many of each come out each night is `creatures` on each moon in `MOONS`
  (`js/night.js`). How many scratches a wall or door takes is `claws` in `OBJECTS`. Redraw them as
  `shade`/`shade2`, `brute`/`brute2` and `lurker`/`lurker2`/`lurkerLow` (sitting in the grass) in
  `js/sprites.js`. `SPRING_RANGE` is how close you can get to a lurker before it springs.
- **Walking speed.** `WALK_SPEED` at the top of `js/game.js`.
- **Sounds.** `SOUNDS` in `js/sound.js` describes each one as a burst of hiss through a filter
  and/or a tone that slides in pitch. Change the numbers to make a chop deeper or a bite harsher;
  `SOUND_VOLUME` is everything at once. Which sound each thing makes is `sound` and `soundDone` in
  `OBJECTS`, and `sound` in `CREATURES`.

## What's next

Done lately: walls that join up (a fence running up the screen is seen from the side), turning
in place in build mode, and an outline round the player. Before that: weather (clouds, rain, storms, and roofs to keep campfires
burning), lurkers in the long grass, chests, and bedrolls; and before that, your look, flashing
when hurt and falling when you die, the stone pick, doors, cooked berries, brutes, walls that get
clawed down, saving, and sound.

Next, the list you picked (2026-10-31), roughly in this order:

1. **Lamps.** A lantern on a post that keeps the dark back without a campfire, and has to be
   filled now and then.
2. **A map.** The island is big. A map of where you've been, drawn in characters like everything
   else, with your fires, chests and bedroll marked on it.
3. **Fishing.** A rod from wood and cloth, fish in the lakes and the sea, and something better than
   berries to cook at the fire.
4. **A pistol and a rifle.** Something to fight the dark with from a distance, but it changes how
   the nights play, so there are questions to settle first: found or crafted, how scarce the
   bullets are, and whether the bang draws things toward you.

Later: **multiplayer**. Because the world is built from a seed, a server only has to share the seed
and what's changed, not the whole map. GitHub Pages only hosts files, though, so this needs a small
server running somewhere else, and you to pick where.
