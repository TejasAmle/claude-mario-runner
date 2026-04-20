# claude-mario-runner

A Chrome-dino-style infinite runner that lives in your terminal. Claude Code themed — dodge bugs, merge conflicts, walls, exceptions, and drones.

```
score 0                              tier easy                           best  0

                                                                  ████████
                                                                  #o####o#
                                                                  ########
                                                                  # #  # #
──────────────────────────────────────────────────────────────────────────
```

## Install & run

Requires Node.js ≥ 20.

```bash
git clone https://github.com/TejasAmle/claude-mario-runner.git
cd claude-mario-runner
npm install
npm run build
npm start
```

Or during development (no build step):

```bash
npm run dev
```

## Controls

| Key                 | Action                |
| ------------------- | --------------------- |
| `Space` / `↑` / `W` | Jump                  |
| `↓` / `S`           | Crouch (hold)         |
| `Enter`             | Start / retry         |
| `Q` / `Esc`         | Quit                  |

## Obstacles

| Kind        | Glyph | Size  | Clear by     | Appears in          |
| ----------- | ----- | ----- | ------------ | ------------------- |
| `bug`       | `██`  | 2×1   | Jump         | Easy+               |
| `conflict`  | `▓▓▓` | 3×2   | Jump         | Easy+               |
| `wall`      | `██`  | 2×3   | Jump         | Medium+             |
| `exception` | `▒▒▒` | 3×3   | Jump         | Hard+               |
| `drone`     | `◆`   | 4×10  | **Crouch**   | Medium+             |

Drones are aerial — they hover right through the full jump arc, so jumping won't save you. You have to duck.

## Difficulty tiers

| Tier   | Starts at | Speed | Min gap | Max gap | Aerial prob | Adds       |
| ------ | --------- | ----- | ------- | ------- | ----------- | ---------- |
| easy   | 0 s       | 22    | 30      | 46      | 0%          | bug, conflict |
| medium | 30 s      | 26    | 22      | 34      | 18%         | + wall, drone |
| hard   | 75 s      | 38    | 16      | 26      | 25%         | + exception |
| insane | 120 s     | 52    | 12      | 20      | 32%         | all |

Speed eases smoothly between tiers — no teleport at boundaries.

## Jump physics

Tuned to feel like Chrome's T-Rex dino, with a bias toward longer horizontal glide:

- Peak height ≈ **10 cells** (~2.5× mascot height)
- Airtime ≈ **0.83 s**
- Horizontal reach at easy speed ≈ **18 cells**
- Collision hitbox is **6 wide**; visual sprite is 8 wide (the `# #  # #` leg-gap row is visual only, same trick Chrome dino uses)

While airborne, the mascot is above every ground obstacle — multiple can pass safely under a single jump. Only the drone extends into the jump arc.

## Development

```bash
npm run dev         # run with tsx, no build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest run
npm run test:watch  # vitest
npm run build       # tsup → dist/
npm run format      # prettier --write
```

### Clearability simulation

`scripts/clearability-sim.ts` sweeps every obstacle at every tier speed across every reasonable jump-timing, and reports whether it's jumpable / crouchable / survivable-while-standing. Used to verify the jump tuning whenever physics change.

```bash
npx tsx scripts/clearability-sim.ts
```

### Reproducible runs

Pass a seed to get a deterministic obstacle sequence (useful for debugging):

```bash
npm start -- --seed 42
```

## Architecture

```
src/
├── engine/        # renderer, input, main loop, terminal alt-screen
├── game/          # physics, runner, obstacles, world (tiers + spawning), score
├── assets/        # sprite/glyph definitions
├── app.ts         # state machine: title → playing → gameover
└── index.ts       # entry point
```

- **Fixed 30 Hz timestep** for deterministic physics across terminals
- **Seeded PRNG** (mulberry32) for reproducible obstacle sequences
- **AABB collisions** — hitbox smaller than sprite for forgiving play
- **Time-based tiering** on `elapsedSec`, not distance, so difficulty ramps at real-world seconds regardless of terminal width

## License

MIT © Tejas Amle
