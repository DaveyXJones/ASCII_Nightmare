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
throws your island away. New islands are 768 by 512 tiles, with ruins, camps, standing stones and a
lighthouse to find (see "Places to find" below). Islands started before that keep their size
(192 by 128, or 384 by 256) and have none of those places, so a world you're in never changes under
you. Tap **New world** for the big one. If you die, the island stays as you left it and you wake up the next
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

On Windows, type `python` instead of `python3`.

Opening `index.html` directly by double-clicking works too, but browsers won't load the bundled
font from a file, so some characters may look a little different.

## Controls

| | Phone | Keyboard |
| --- | --- | --- |
| Walk | Put your left thumb down anywhere on the left half of the screen and drag | `W` `A` `S` `D` or the arrow keys |
| Act | The big button on the right. It says what it will do: **Chop**, **Mine**, **Pick**, **Drink**, **Fish**, **Light**, **Fill**, **Dig up**, **Plant**, **Water**, **Harvest**, **Repair**, **Hit**, **Shoot**, **Open**. Hold it to keep going (one shot per tap) | `Space` or `E` (hold to keep going) |
| Eat | The small button: eats the best food you have | `F` |
| Craft | **Craft**, the button above the big one, then a tab (**Tools**, **Build**, **Garden**, **Cook**) and what to make | `C`, then `←` `→` for the tabs and `1` to `9`, `0`, `-`, `=` |
| Build | Face the spot and tap **Build** (or **Plant**, or **Take up** on a floor you laid); tap **Done** to stop. Walking keeps your facing; flick the stick (push and let go) to turn | `Space` builds; tap an arrow key to turn; `C` or `Esc` stops |
| Map | **Map**, under ☰ in the top right; drag to look around, pinch or **−**/**+** to zoom, **@** to find yourself | `M`; arrow keys, `+`/`-`, mouse wheel |
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

Tap **Craft** to see what you can make. It's on four tabs along the top: **Tools**, **Build**,
**Garden** and **Cook**; a dot on a tab means there's something on it you can make right now. Each
card shows what it costs; numbers in red are what you're short of. The game pauses while the panel
is open. The Craft button lights up when there's something you can afford.

| Make | Costs | What it does |
| --- | --- | --- |
| **Stone axe** | 3 wood, 2 stone | Trees fall in half the swings, and shades too. You lose it if you die. |
| **Stone pick** | 2 wood, 3 stone | Boulders break in half the swings. You lose it if you die. |
| **Stone spade** | 2 wood, 2 stone | Digs up picked bushes, picked cotton and tree stumps, and digs garden beds (below). You lose it if you die. |
| **Bucket** | 3 wood | Carries water for the garden: fill it at the water or the well, and it waters four plants. You lose it if you die. |
| **Torch** | 2 wood, 1 cloth | Light it at a campfire to see in the dark (below). You lose it if you die. |
| **Fishing rod** | 2 wood, 1 cloth | Face water and hold the button to fish (below). You lose it if you die. |
| **Campfire** | 4 wood, 3 stone | Stand beside it and your health comes back four times faster (the ♥ glows). |
| **Roof** | 4 wood | Build it over a campfire and rain can't put the fire out (see Weather, below). |
| **Wooden wall** | 2 wood each | A stretch of sharpened stakes. Line them up into a fence. |
| **Wooden door** | 3 wood | Set it in a line of wall. It swings open as you walk up and shuts behind you; shades can't open it. |
| **Stone wall** | 3 stone each | Takes things in the dark three times as long to claw through as wood. Joins up with wooden walls and doors. |
| **Gate** | 3 wood, 2 stone | A door between stone posts that holds out as long as the stone wall. |
| **Spiked barricade** | 3 wood each | Crossed, sharpened stakes. Anything that claws at them, or runs onto them, gets cut. |
| **Wooden floor** | 1 wood a board | Boards laid as the ground itself, so walls and chests stand on it. No grass grows through, so nothing lurks there. |
| **Lamp** | 2 wood, 2 cloth | A lantern on a post. It keeps the dark back like a small fire, and rain can't put it out. It burns five minutes of dark, then needs filling (below). |
| **Chest** | 6 wood | Keeps whatever you put in it, even when you die. It can go inside the cottage. |
| **Bedroll** | 2 cloth, 1 wood | After you die, you wake up on it instead of in the cottage. |
| **Garden bed** | 1 wood | Needs the spade. Dug earth to plant in (see The garden, below). |
| **Plant potato**, **pumpkin**, **berry bush**, **cotton** | 1 potato, pumpkin seed, or cutting | Plants a row of them in garden beds, in build mode. |
| **Rain barrel** | 5 wood | Fills itself when it rains. Drink from it, or fill the bucket at it (see The garden, below). |
| **Cooked berries** | 2 berries | Only beside a campfire. Fills you up more, and heals a little. The panel stays open to cook more. |
| **Cooked fish** | 1 fish | Only beside a campfire. Fills you up the most (45), and heals 15. |
| **Baked potato** | 1 potato | Only beside a campfire. Fills you up (35), and heals 10. |
| **Lamp oil** | 2 fish | Only beside a campfire. Fish boiled down, for the lighthouse's lamp (see Lighting the lighthouse, below). |

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

**Floors.** Pick **Wooden floor** and lay boards in front of you like walls. Walls, doors, chests
and the rest can be built on top. Facing a board you laid, the button says **Take up** instead, and
gives the wood back. Floors don't go inside the cottage (it has one) or under trees and rocks.

**Clearing ground.** Chopping a tree leaves a stump, which you can build over as it is. With a
**spade** you can also **Dig up** a stump (1 wood), a berry bush you've picked bare, or a picked
cotton plant: the tile is clear, and a bush or cotton plant leaves a **cutting** to plant in your
garden. Pick a bush first; a full one says **Pick**. Without a spade nothing can be dug up.

**Repair.** When something in the dark has been clawing at a wall, door, gate or barricade, the
button says **Repair** as you face it: 1 wood (1 stone for a stone wall) wipes out the claw marks,
so it holds out as long again. The fallen heaps of logs in the old cabins say **Repair** too, and
stack back up into the wall for nothing (step off them first). Break the wall again if it's the
wood you want.

**Spikes.** A creature that claws at a spiked barricade cuts itself on every scratch: a shade is
gone after three. Ring your camp with them, or put them where things try to get in.

**Fishing.** With a fishing rod, face water (a lake, a river or the sea) and the button says
**Fish** instead of **Drink** (unless you're thirsty: then it offers a drink first). Hold it: you
kneel, the line goes out and a red bobber floats on the water. After a few seconds something
bites, the bobber goes under, and a moment later you land a fish, or it gets away. Deep water
(the darker blue) loses fewer. Keep holding to cast again; let go or walk off to reel in. Raw
fish can't be eaten: cook it beside a campfire (**Cooked fish** on the craft panel).

Fish and cooked food only show in the pack while you have some, so it fits across a phone.

**The map.** Tap **Map** (under ☰, or `M`) to see the island, drawn in characters. It only shows
land you've seen: by day you take in about 11 tiles around you, at night only what your torch
lights. You (`@`), the cottage, the things you've built (fires, lamps, chests, your bedroll,
walls), the wreck, crates, a gun you dropped and the places you've found (ruined cabins `⌂`, old
camps `Λ`, standing stones `∩`, graves `†`, the lighthouse `♜`) are marked on it, with a key
beside it that grows as you find more kinds of thing. **Drag** it
to look around, **pinch** (or tap **−** and **+**) to zoom, and tap **@** to come back to where you
are. Zoomed out, the whole island fits and each character stands for a block of land; zoomed all
the way in, there's one character for each tile across. It opens centred on you, at the zoom you
used last. On a computer: drag with the mouse, the wheel or `+`/`-` to zoom, the arrow keys to look
around. The game pauses while it's open. You keep what you've seen when you die, and it's saved
with the world.

**Lamps.** A lamp lights the ground around it at night, not as far as a campfire, and things in the
dark keep away from it the way they do from firelight (brutes and lurkers too, which the torch
doesn't stop). It doesn't warm you, and you can't light your torch at it. It burns only in the
dark: a full lamp lasts five minutes of night, about half of one, and dims as it runs low. When it
goes out, face it and tap **Fill** (1 cloth) to light it again; once it's half burnt, the button
offers **Fill** instead of **Take down**, to top it up.

**Chests.** Face a chest and tap **Open**. Your pack is on the left, the chest on the right: tap
something to move all of it across, or **Put all in** (everything but your tools) and **Take all
out**. Tools go in one at a time, so your axe can wait at home for you; a torch put away goes out.
The game pauses while the chest is open. Dying empties your pack, never a chest. A chest is the
one thing you can build inside the cottage (anywhere but the doorway and the spot by the bed). To
move it, empty it and tap **Take down** for some of the wood back.

**Bedrolls.** You walk over a bedroll, and wake up on it after you die, so build one inside your
fence by the fire. If you've made more than one, you wake on the newest (or another, if you've rolled that one up). Face it and **Roll up**
to take it back.

## The garden

1. Make a **spade** (Tools tab), then a **garden bed** (Garden tab) where you want it: dug earth, 1
   wood a bed. Beds stay in build mode, so dig a row.
2. Get something to plant. **Potatoes** and **pumpkin seeds** turn up in the cupboards of the old
   cabins, in tents and in dropped packs. **Cuttings** come from digging up a picked berry bush or
   cotton plant with the spade.
3. Face a bed and tap **Plant**: it plants the same as last time, or whatever you have. To choose,
   or to plant a whole row, use the cards on the Garden tab.
4. **Water it.** A plant only grows while it has water in it. Make a **bucket**, face the water's
   edge or the well and tap **Fill** (if you're thirsty, the button offers a drink first); the
   bucket waters four plants, and the number beside it in the pack says how many are left. Face a
   plant that needs it and tap **Water**. A watering lasts four minutes. **Rain waters everything.**
   A plant that's run dry looks pale and straw-colored, and stops growing; left dry for five minutes,
   it **wilts** and dies (**Clear** it to use the bed again).
5. **Harvest.** Potatoes are ready in about six minutes of watered growing: **Harvest** gives three
   (bake them at a fire to eat them). A pumpkin takes a little longer, and gives a pumpkin to eat and
   two seeds to plant again. A cutting grows into a berry bush or a cotton plant like the wild ones,
   right there in your garden. The game tells you when something's ready, if you're nearby.

You walk through your garden, and nothing gets built over it by mistake. The map marks it `ψ`.

**A rain barrel** saves the walk to the water. Set one out (Garden tab, 5 wood) and it fills whenever
it rains: about two minutes of pouring rain fills it from empty, and most days bring enough. The water
shows at the top, dark when it's low and bright once it's two-thirds full. It holds twelve waterings,
which is three bucketfuls. Face it and tap **Fill** to fill your bucket, or **Drink** if you're thirsty
(each long drink counts as one watering). Once it's empty you can **Take down** the barrel and get 3
wood back. So a garden with a barrel beside it, and a camp with one, need no trip to the river, until
a dry spell.

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

## Guns

There's a **pistol** and a **rifle** on the island, but you can't make them: you have to find
them.

- **The wreck.** A wrecked boat lies on a beach a fair walk from the cottage, with a crate washed
  up beside it. Face the crate and tap **Open**: inside are the pistol and 8 bullets. A second crate
  has washed up on the beach furthest from the cottage, with the rifle and 6 bullets. Both show on
  the map once you've seen them. The boat can be broken up for wood.
- **Shooting.** With a gun, when something from the dark is in front of you, past arm's reach, and
  nothing solid is in the way (trees, walls, rocks; water's fine), the big button says **Shoot**.
  Each tap is one shot; holding the button doesn't keep firing. Up close it says **Hit** instead,
  so you don't spend a bullet on what an axe can reach.
- **Pistol:** reaches 6 tiles, six shots, then a second and a half to reload. Two shots put a shade
  down, one a lurker, three a brute.
- **Rifle:** reaches 14 tiles and hits harder (one shot for a shade or a lurker, two for a brute),
  but it reloads after every shot, which takes two and a half seconds. Carrying both, the game uses
  the pistol when it reaches and the rifle for things further off (or while the pistol reloads).
- **Bullets are scarce.** Both guns take the same bullets (‣ in the pack) and you can't make
  more. Some mornings a tin box with 3 bullets washes up somewhere on a beach, out of sight; never
  more than two lying about at once.
- **The bang carries.** Everything out in the dark nearby hears a shot: lurkers stop waiting in
  the grass and come for you, the next thing comes out of the dark straight away, and the crickets
  go quiet. A gun can get you out of trouble, and into more.
- **If you die**, your guns drop where you fell (a red **!** on the map). Go back and **Pick up**
  them. Bullets are lost with the rest of your pack, so keep spare ones in a chest.

## Places to find

New islands are big (768 by 512 tiles: about three minutes' walk across), and people lived here
before you. Their places are scattered over the island, further out than you'd go on your first
day, and none of them are safe at night.

- **Ruined cabins** stand in clearings, their walls half fallen into heaps of logs, grass growing
  up through the floorboards (and you know what sits in long grass). Each has an old cupboard: face
  it and tap **Search**.
- **The old village**, as far from your cottage as there's room for it: a hall with a strongbox
  (**Pry open**: it takes a few goes), four cabins round a square with a well you can drink from,
  and a graveyard. Walk into a grave to read its stone.
- **Old camps** by lakes and rivers: a torn tent to **Search** (then **Cut up** for cloth), a
  dropped pack, a cold campfire you can light again with a piece of wood, and a log to sit on (or
  break up for wood).
- **Standing stones** up on the hills, in a ring round a flat stone where candles burn every
  night. You didn't light them, and nobody you can see does. Things in the dark keep away from them
  like they do from a fire, so a ring of stones is somewhere to run to at night.
- **The lighthouse**, out on a point with the sea round it, and the keeper's hut beside it. It's
  tall enough to see from anywhere, so it's on your map from the start.

What you find when you search: **tins** of food (◘ in the pack: 35 food and a little health, and
you can eat them anywhere), bullets, cloth, sometimes a tool you haven't got, and **scraps of
map**: each shows the nearest place you haven't been, and puts it on your map. Most places also
hold a **note** from someone who was here before you. The game pauses while you read it. The
notes nearest your cottage come first, so the story goes on the further out you go, and between
them they tell you most of what they learned too late.

A ruined cabin can be yours: its old walls join up with walls you build, so build a wall or a door
into each gap (right over a fallen heap of logs) and it's shelter again. Things in the dark claw at
old walls the same as yours, and the old ones give way sooner.

What's in each cupboard is worked out from the island's seed, and the game saves the moment you've
searched something, so there's no reloading for a second helping.

## Lighting the lighthouse

The lighthouse has stood dark since its keeper ran out of oil, and the notes round the island say
that's when things got bad. You can light it again. Here's how it goes:

1. **Find lamp oil** (⚱ in the pack). Sealed cans of it stand in the keeper's hut, in the old village's
   hall and on the sand by the wreck, 2 oil each. Or catch fish and boil them down at a fire: 2 fish
   make 1 oil (Cook tab). Oil in your pack is lost if you die, like anything else.
2. **Pry the door open.** Face the foot of the tower and hold **Pry open**.
3. **Pour the oil in.** **Fill** pours all you carry into the tank at the foot of the stairs, where it
   stays safe even if you die. It wants 3 oil the first time, and holds 5.
4. **Hold Pump.** It takes about 13 seconds of pumping to send the oil up the pipe to the lamp. The
   first time, *what the keeper wrote about comes down the stairs while you do it*, by day as well as
   by night: shades, and a brute. They'll keep coming until the lamp catches, and then they all burn
   away. Whatever you've pumped stays pumped if you're driven off or killed, so you can come back and
   finish. A lit torch keeps the shades back but not the brute. **A campfire built right by the door
   keeps them all back**, if you think to bring the wood and stone.

While it burns:

- **Two beams sweep round the island at night**, one coming by every twelve seconds. You can see them
  from most of the island, and for a moment you can see the ground they cross. Anything a beam catches
  within 150 tiles of the tower turns and runs.
- **Nothing comes within about 32 tiles of the tower**, so the point is the safest place on the island.
- **Fewer things come out anywhere on the island**: half as many shades and lurkers (rounded up), and
  no brutes at all.
- A horn sounds at nightfall, and the map shows the lighthouse in gold.

**It needs keeping.** It burns about one oil a night, so a full tank is about five nights. Come back and
**Fill** it. At nightfall the game says if it's low. Tap **Look** at the tower to see what's left. If it
runs dry it goes out, and everything comes back. Lighting it again only takes a few strokes of the
pump, and nothing comes down the stairs the second time.

(Only islands with places to find have a lighthouse: if your map doesn't show `♜`, your island is an
older one, and you'd need a new world from the menu to try this.)

## Playing together

*Not online yet: the Play together button only shows on a copy of the game running on your own PC.*

In the menu, **Play together** lets you **Start an island**, which gives you a five-letter code to
share, or type someone's code and **Join**. There's nothing to sign up for. Up to eight people can be on
an island. Your own island stays exactly as it was, and **Back to my own island** returns you to it.
What you do on a shared island is saved on your phone under its code, so you can come back to it.

So far you can see each other walking about, in your own colors with your own torches, and you share
the same time of day, moon and weather. Other people show on your map as a blue `@`.

**Not shared yet:** everything else. If you chop a tree, your friend still sees it standing, and
things in the dark only come for you on your own screen. That's the next stage.

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
| `js/world.js` | Builds the island from two noise maps (elevation and moisture) and places the cottage, the wreck and the crates. |
| `js/places.js` | The places to find: the ruined cabins, the village, camps, standing stones and the lighthouse, what's in them, and the notes. |
| `js/night.js` | Day and night: how long each lasts, the moon, and how dark it gets. |
| `js/weather.js` | Clouds, rain and storms: when they come, and rain putting out campfires. |
| `js/render.js` | Draws the world in the three-quarter view, fast enough for a phone. |
| `js/input.js` | The thumbstick, the buttons, and the keyboard. |
| `js/sound.js` | Every sound, made by the browser on the spot, so there are no sound files. |
| `js/survival.js` | Health, food and water, your pack, and the action button. |
| `js/crafting.js` | What you can craft and what it costs, build mode, and the craft panel. |
| `js/chest.js` | Chests: what's in each one, and the panel for moving things in and out. |
| `js/fishing.js` | Fishing: casting, the bite, and landing a fish (or losing it). |
| `js/garden.js` | The garden: planting, the bucket, watering, plants growing, wilting, and rain barrels. |
| `js/together.js` | Playing together: the Play together panel, the line to the room, and everyone else on the island. |
| `server/` | The rooms for playing together, which run on Cloudflare, not in the game. |
| `js/lighthouse.js` | Lighting the lighthouse: the door, the tank, the pump, what comes down the stairs, and what its beams do. |
| `js/guns.js` | The pistol and rifle: aiming, shooting, reloading, the bang, and bullets washing up. |
| `js/map.js` | The map: which tiles you've seen, and the map panel drawn in characters. |
| `js/creatures.js` | The shades, brutes and lurkers: when they come out, how they find you, what scares them off. |
| `js/save.js` | What the game remembers between visits: your island, your pack, your look. |
| `js/game.js` | Walking and bumping into things, the main loop, the menus. |
| `fonts/` | DejaVu Sans Mono, so every phone draws the same characters. |
| `.nojekyll` | An empty file that tells GitHub Pages to publish everything exactly as it is. |

The scripts are plain `<script>` files loaded in order (no modules), which is what lets the game
run straight from the file. Each one (and the stylesheet) ends in a version number, `?v=12`: raise
it in `index.html` whenever you change the code, so browsers fetch the new files instead of using
old copies they've kept.

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
- **The size of the island.** `WORLD_SIZE` at the top of `js/world.js`, in tiles. It's used for new
  worlds only; a saved world keeps the size it was made with.
- **The places to find.** `PLACES` in `js/places.js`: each kind has its layouts drawn as text,
  like the cottage (`#` a wall, `.` floor, `C` a cupboard, `g` a grave; `PLACE_LEGEND` lists them
  all), and how many to put on an island. Draw a new cabin and it's built on the next new island.
  What's in each kind of cupboard, tent or pack is in `LOOT`, the notes are `NOTES` (in the order
  they're found), and what the graves say is `EPITAPHS`. `WALL_FALLEN` and `WEEDS` are how ruined
  the cabins are.
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

Done lately, 2026-11-01: lighting the lighthouse (find oil, force the door, survive the stairs, then
keep it burning), and a rain barrel. Before that, your list of 2026-10-31 evening: building and gardening. The craft panel on tabs; a
stone wall, a gate, a spiked barricade and wooden floors; **Repair** for clawed walls and fallen
cabin logs; a spade to dig up bushes and stumps; and a garden of potatoes, pumpkins, berry bushes
and cotton that needs watering from a bucket. Before that: an island four times bigger again, with
places to find: ruined cabins, an old
village with a graveyard, camps, standing stones with candles nobody lights, and a lighthouse, with
tins of food, scraps of map and notes in them. Before that: a bigger island and a map you can zoom
and drag. Before that, your list of 2026-10-31: walls that join up (a fence running up the screen is seen
from the side) and turning in place in build mode, an outline round the player, lamps, a map,
fishing, and a pistol and a rifle to find. Before that: weather (clouds, rain, storms, and roofs to
keep campfires burning), lurkers in the long grass, chests, and bedrolls; and before that, your
look, flashing when hurt and falling when you die, the stone pick, doors, cooked berries, brutes,
walls that get clawed down, saving, and sound.

Ideas for next (Claude's suggestions):

- **A book of notes.** Keep the notes you've found, to read again from the menu.
- **Jack-o'-lanterns.** Carve a pumpkin from the garden into a little lantern with a candle in it:
  a lamp that needs no filling, but goes soft and rots after a few nights.
- **Something comes for the light.** On moonless nights, something climbs out of the sea and makes for
  the tower, so walls and spikes round it start to matter.

**Playing together**, in stages. Stage one is built (see Playing together, above), and it isn't online
yet. Then:

2. A shared world: chopping, building and chests all shared, and menus that don't pause the game on a
   shared island.
3. Things in the dark that hunt everyone.
4. An island that goes on while nobody's there: when someone comes back, the game works out what
   happened (plants grown, barrels filled, oil burnt), with no server needed around the clock.
