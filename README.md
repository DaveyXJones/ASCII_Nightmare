# ASCII Nightmare

A small browser game drawn entirely in text. You are the `@`. You wake up in a cottage on a
randomly generated island of fields, forests, hills, lakes and mountains, and walk around it.

```
 T.,'*.";..^n^^^n.
 .'#########.,n^^^
 ,.#.......#*..n^^
 .*#...@...#.'.^n^
 '.####+####".,..^
 .,.,..:..~~~~~.,.
```

## Play

Open `index.html` in a browser by double-clicking it. There's nothing to install or build.

If your browser won't run it from the file directly, start a tiny local server in this folder and
open http://localhost:8000:

```sh
python3 -m http.server
```

**Controls:** `W` `A` `S` `D` or the arrow keys. Hold a key to keep walking. On a phone or tablet,
use the on-screen arrows. **New world** builds a different island.

## How it's put together

| File | What it does |
| --- | --- |
| `index.html` | The page: title bar, the map canvas, the status strip, the touch pad. |
| `css/style.css` | Colors, fonts and layout of the page around the map. |
| `js/random.js` | Seeded random numbers and noise. The same seed always builds the same world. |
| `js/tiles.js` | Every kind of ground: its characters, colors, and whether you can walk on it. |
| `js/world.js` | Builds the island from two noise maps (elevation and moisture) and places the cottage. |
| `js/game.js` | Keyboard and touch input, movement and collisions, the camera, and drawing. |

The scripts are plain `<script>` files loaded in order (no modules), which is what lets the game
run straight from the file.

## Things to try changing

- **How the world looks.** Edit a tile in `js/tiles.js`: swap `♣` for `T`, or change its colors.
- **A new kind of ground.** Add an entry to `TILES`, then return its name from `pickTerrain()`
  in `js/world.js`. Set `solid: true` to make it block the player.
- **The cottage.** It's drawn as text in `COTTAGE` at the top of `js/world.js`. Add rooms or a
  fence, and map any new character to a tile in `COTTAGE_LEGEND`.
- **The size of the world and the starting island.** Change `WORLD_WIDTH`, `WORLD_HEIGHT` and
  `DEFAULT_SEED` in `js/world.js`.
- **Walking speed.** `MOVE_DELAY_FIRST` and `MOVE_DELAY_REPEAT` at the top of `js/game.js`.

## Toward an ASCII MMORPG

Some next steps, roughly in order of effort:

1. Creatures or villagers that wander the map (each one is just an `x`, `y` and a glyph, drawn
   after the tiles, like the player).
2. Items to pick up and an inventory.
3. A day/night cycle or a light radius around the player.
4. Multiplayer: a small Node.js server using WebSockets that holds the world seed and everyone's
   positions. Because the world is built from a seed, the server only has to send the seed, not the
   whole map.
