# CLAUDE.md

Context for Claude Code sessions in this repo. Read this first.

## What this is

`claude-mario-runner` — a Chrome-dino-style **infinite runner** that renders to the terminal. Claude Code themed obstacle names (bug, conflict, wall, exception, drone).

## Scope: v1 is a runner, NOT a platformer

Despite the repo name and the `description` in `package.json` ("Terminal platformer — Claude Code themed Mario-style runner"), **v1 is explicitly a Chrome-dino-style runner**, not a Mario-style platformer. No multi-level terrain, no coins, no power-ups. Just: run right, jump/crouch to survive obstacles, game ramps difficulty over time.

Mario/platformer mechanics (pipes, gaps, vertical movement, levels) are deferred to v2. Don't accidentally scope-creep into platforming features.

## Autonomous execution

User prefers self-verification over hand-written manual test plans:
- Run `npm run typecheck`, `npm test`, `npm run build` yourself after changes — don't hand back a "here's how to verify" script.
- If tuning physics/balance, re-run `scripts/clearability-sim.ts` and report the result.

## Project layout

```
src/
├── engine/        # low-level: renderer, input, loop, terminal alt-screen
├── game/          # physics, runner, obstacles, world (tiers), score
├── assets/        # sprite/glyph definitions
├── app.ts         # state machine: title → playing → gameover
└── index.ts       # entry point

tests/             # vitest; 42 tests covering physics/input/loop/runner/world
scripts/           # non-test utilities (e.g. clearability-sim.ts)
```

## Commands

```bash
npm run dev         # run via tsx, no build
npm test            # vitest run
npm run typecheck   # tsc --noEmit
npm run build       # tsup → dist/
npx tsx scripts/clearability-sim.ts   # verify all obstacles clearable
```

## Key design decisions

### Collision hitbox ≠ visual sprite

Mascot renders 8 wide but collides at 6 wide (centered; visual offset `-1` in `drawPlay`). The leg-gap row `# #  # #` is visual only — this is the standard Chrome-dino trick that gives a forgiving hit zone. Don't "fix" the visual offset thinking it's a bug.

### Jump physics (tuned, do not casually change)

`src/game/runner.ts` — `DEFAULT_RUNNER_CONFIG`:

- `jumpImpulse: 50`, `gravity: 120`
- Peak ≈ 10 cells (~2.5× mascot height)
- Airtime ≈ 0.83 s
- Reach at easy speed (22) ≈ 18 cells

This is the result of several tuning iterations. The user twice asked for "more horizontal, not more vertical" — the sweet spot is low gravity + low impulse (long glide, modest peak). **If you must retune, always re-run `scripts/clearability-sim.ts` AND verify the drone still forces a crouch at insane speed (52).**

### Drone forces a crouch at all speeds

Drone is a 4×10 aerial obstacle at rows `[groundY-13, groundY-3)`. Intentionally tall enough that the jump arc always overlaps it in y — jumping alone can't clear it, even at insane speed. Crouched mascot `[groundY-2, groundY)` sits under it safely.

If you shrink the drone or make the jump arc much taller, the sim will show `drone jump=✓` at some tier speed — that breaks the mechanic.

### First obstacle timing independent of terminal width

`app.ts` computes `firstSpawnX = runnerX + round(FIRST_OBSTACLE_TARGET_SEC * 22)` so the first obstacle always takes ~3.5 s to reach the mascot, regardless of whether the terminal is 80 or 200 cols wide. `createWorld` takes this as an optional param; `stepWorld` clamps only the *first* spawn to it.

### Fixed timestep + seeded RNG

- Loop runs at fixed 30 Hz (`STEP_MS = 1000/30`) for deterministic physics.
- `mulberry32` seeded RNG for reproducible obstacle sequences. `--seed <n>` CLI flag for debugging.

### Crouch via key-repeat, not true key-hold

Terminal stdin doesn't reliably report keydown/keyup. We approximate key-hold: each `↓` keypress sets `crouchUntilMs = now + 200ms`. Terminal auto-repeat (typically ~30–50ms interval after first press) keeps extending this window. See `CROUCH_HOLD_EXTEND_MS` in `app.ts`.

### Time-based tiers, not distance-based

`DEFAULT_TIERS` in `src/game/world.ts` uses `untilSec` (wall-clock elapsed game seconds), not distance. Speed eases toward `tier.speed` over time so there's no teleport at tier boundaries.

## Testing conventions

- Vitest, colocated in `tests/` (not alongside source).
- Physics tests use integer-cell fixtures where possible.
- Runner tests include crouch-blocks-jump, releasing-crouch-restores-height.
- World tests include tier progression and kind-restriction-by-tier.

## Gotchas

- `package.json` description still says "Terminal platformer". Don't let that re-scope you; v1 scope is in this doc.
- `drawMascot` is called in two places: title screen (visual only, no offset needed) and `drawPlay` (needs `-1` x offset to align 8-wide sprite over 6-wide hitbox).
- Obstacle sizes are declared in **two places** and must stay in sync:
  - `OBSTACLE_SPECS` in `src/game/obstacles.ts` (collision + spawn logic)
  - `obstacleSize()` in `src/assets/sprites.ts` (rendering)
  - If you change one without the other, visuals and collisions desync.
- Don't add `.env` or secrets; this is a pure local CLI game.

## What NOT to do

- Don't introduce Next.js, React, Vercel, or any web framework. Pure Node.js CLI.
- Don't add network calls, analytics, telemetry.
- Don't amend prior commits — make new ones.
- Don't skip pre-commit hooks (none configured, but if added later, respect them).
