import {
  initRenderer,
  clearFrame,
  drawString,
  flush,
  setCell,
  invalidateAll,
  getSize,
} from './engine/renderer.js';
import { startInput, type KeyEvent } from './engine/input.js';
import { runLoop } from './engine/loop.js';
import { enterAltScreen, restoreTerminal } from './engine/terminal.js';
import { createRunner, stepRunner, type RunnerState, type RunnerIntent } from './game/runner.js';
import {
  createWorld,
  stepWorld,
  checkCollision,
  mulberry32,
  type WorldState,
} from './game/world.js';
import {
  drawMascot,
  drawObstacle,
  drawGroundLine,
  MASCOT_W,
  COLOR_TEXT,
  COLOR_DIM,
  COLOR_ACCENT,
} from './assets/sprites.js';
import { distanceToScore, loadHighScore, saveHighScore } from './game/score.js';
import { submitScoreInBackground } from './net/leaderboard.js';

type Phase = 'title' | 'playing' | 'gameover';

interface AppState {
  phase: Phase;
  runner: RunnerState;
  world: WorldState;
  jumpQueued: boolean;
  crouchUntilMs: number;
  score: number;
  highScore: number;
  cols: number;
  rows: number;
  groundY: number;
  runnerX: number;
  shouldQuit: boolean;
}

// Terminal key-repeat approximates key-hold: each Down press extends crouch
// window by this many ms.
//
// IMPORTANT: macOS (and most OSes) have a two-stage key repeat:
//   1. Initial delay before repeat starts: typically ~300-500 ms (configurable
//      via System Settings → Keyboard → "Delay until repeat"). Default is
//      ~500 ms; even the fastest user setting is ~250 ms.
//   2. Sustained repeat rate after that: ~30-50 ms.
//
// If this constant is shorter than (1), the crouch expires *before* the first
// auto-repeat lands, so a held ↓ visibly pops back up and re-crouches. We pick
// 550 ms so the window always survives the slowest reasonable initial delay.
// The trade-off: after release, the mascot stays crouched for up to ~550 ms.
// In practice that's fine for a runner — you usually release ↓ a moment
// before the next obstacle anyway.
const CROUCH_HOLD_EXTEND_MS = 550;

const MIN_COLS = 40;
const MIN_ROWS = 12;

function resolveSize(): { cols: number; rows: number } {
  const cols = Math.max(
    MIN_COLS,
    Number(process.env.COLS) || process.stdout.columns || 80,
  );
  const rows = Math.max(
    MIN_ROWS,
    Number(process.env.ROWS) || process.stdout.rows || 24,
  );
  return { cols, rows };
}

// Target seconds from game start to the first obstacle reaching the mascot.
// Combined with easy-tier speed (22) this sets the first-spawn X so that
// (firstSpawnX - runnerX) / 22 ≈ FIRST_OBSTACLE_TARGET_SEC.
const FIRST_OBSTACLE_TARGET_SEC = 3.5;
const RUNNER_X = 10;

function makeState(seed: number): AppState {
  const { cols, rows } = resolveSize();
  const groundY = rows - 2;
  const runnerX = Math.min(RUNNER_X, Math.max(2, cols - 30));
  const runner = createRunner(runnerX, groundY);
  const firstSpawnX = runnerX + Math.round(FIRST_OBSTACLE_TARGET_SEC * 22);
  const world = createWorld(groundY, mulberry32(seed), undefined, firstSpawnX);
  return {
    phase: 'title',
    runner,
    world,
    jumpQueued: false,
    crouchUntilMs: 0,
    score: 0,
    highScore: loadHighScore(),
    cols,
    rows,
    groundY,
    runnerX,
    shouldQuit: false,
  };
}

function resetPlay(s: AppState, seed: number): void {
  s.runner = createRunner(s.runnerX, s.groundY);
  const firstSpawnX = s.runnerX + Math.round(FIRST_OBSTACLE_TARGET_SEC * 22);
  s.world = createWorld(s.groundY, mulberry32(seed), undefined, firstSpawnX);
  s.jumpQueued = false;
  s.crouchUntilMs = 0;
  s.score = 0;
  s.phase = 'playing';
}

function isJumpKey(ev: KeyEvent): boolean {
  return ev.key === 'Space' || ev.key === 'ArrowUp' || ev.key === 'w' || ev.key === 'Enter';
}

function isCrouchKey(ev: KeyEvent): boolean {
  return ev.key === 'ArrowDown' || ev.key === 's';
}

function isQuitKey(ev: KeyEvent): boolean {
  return ev.key === 'q' || (ev.ctrl && ev.key === 'c') || ev.key === 'Escape';
}

function drawTitle(s: AppState): void {
  const cx = Math.floor(s.cols / 2);
  const cy = Math.floor(s.rows / 2) - 3;

  drawGroundLine(s.groundY, s.cols);
  drawMascot(cx - Math.floor(MASCOT_W / 2), s.groundY - 4);

  const title = 'CLAUDE MARIO RUNNER';
  const sub = 'SPACE/↑ jump  •  ↓/S crouch  •  Q quit';
  const prompt = 'press SPACE or ↑ to start';
  const quit = 'difficulty ramps: easy → medium → hard → insane';
  const high = s.highScore > 0 ? `best: ${s.highScore}` : '';

  drawString(cx - Math.floor(title.length / 2), cy, title, COLOR_ACCENT, -1);
  drawString(cx - Math.floor(sub.length / 2), cy + 2, sub, COLOR_DIM, -1);
  drawString(cx - Math.floor(prompt.length / 2), cy + 5, prompt, COLOR_TEXT, -1);
  drawString(cx - Math.floor(quit.length / 2), cy + 6, quit, COLOR_DIM, -1);
  if (high) drawString(cx - Math.floor(high.length / 2), cy + 8, high, COLOR_DIM, -1);
}

function drawPlay(s: AppState): void {
  drawGroundLine(s.groundY, s.cols);

  for (const o of s.world.obstacles) {
    drawObstacle(o.kind, o.box.x, o.box.y);
  }

  // Visual sprite is 8 wide; collision box is 6 (centered). Offset -1 to align.
  drawMascot(Math.round(s.runner.box.x) - 1, Math.round(s.runner.box.y), s.runner.crouching);

  const score = `score ${s.score}`;
  const high = `best  ${Math.max(s.highScore, s.score)}`;
  const tier = `tier ${s.world.tier}`;
  drawString(1, 0, score, COLOR_TEXT, -1);
  drawString(Math.floor(s.cols / 2 - tier.length / 2), 0, tier, COLOR_DIM, -1);
  drawString(s.cols - high.length - 1, 0, high, COLOR_DIM, -1);
}

function drawGameOver(s: AppState): void {
  drawPlay(s);
  const cx = Math.floor(s.cols / 2);
  const cy = Math.floor(s.rows / 2) - 2;

  const over = 'GAME OVER';
  const scoreLine = `score: ${s.score}   best: ${s.highScore}`;
  const retry = 'SPACE / ↑ to retry';
  const quit = 'Q or Esc to quit';

  for (let x = 0; x < s.cols; x++) {
    for (let y = cy - 1; y <= cy + 4; y++) {
      setCell(x, y, ' ', -1, 234);
    }
  }
  drawString(cx - Math.floor(over.length / 2), cy, over, COLOR_ACCENT, 234);
  drawString(cx - Math.floor(scoreLine.length / 2), cy + 1, scoreLine, COLOR_TEXT, 234);
  drawString(cx - Math.floor(retry.length / 2), cy + 3, retry, COLOR_TEXT, 234);
  drawString(cx - Math.floor(quit.length / 2), cy + 4, quit, COLOR_DIM, 234);
}

export interface RunOptions {
  seed?: number;
  noColor?: boolean;
  /** CLI semver; passed to the leaderboard submit payload. */
  version?: string;
}

export function runGame(opts: RunOptions = {}): void {
  const seedBase = opts.seed ?? Date.now();
  let seedCounter = 0;
  const nextSeed = () => seedBase + seedCounter++;

  enterAltScreen();

  const { cols, rows } = resolveSize();
  initRenderer(cols, rows);

  const state = makeState(nextSeed());

  const input = startInput();
  const unsub = input.onKey((ev) => {
    if (isQuitKey(ev)) {
      state.shouldQuit = true;
      return;
    }
    if (state.phase === 'title') {
      if (isJumpKey(ev)) resetPlay(state, nextSeed());
    } else if (state.phase === 'playing') {
      if (isJumpKey(ev)) state.jumpQueued = true;
      if (isCrouchKey(ev)) {
        state.crouchUntilMs = performance.now() + CROUCH_HOLD_EXTEND_MS;
      }
    } else if (state.phase === 'gameover') {
      if (isJumpKey(ev)) resetPlay(state, nextSeed());
    }
  });

  const onResize = () => {
    const next = resolveSize();
    state.cols = next.cols;
    state.rows = next.rows;
    state.groundY = next.rows - 2;
    state.runnerX = Math.min(RUNNER_X, Math.max(2, next.cols - 30));
    initRenderer(next.cols, next.rows);
    invalidateAll();
  };
  process.stdout.on('resize', onResize);

  const loop = runLoop({
    update(dt) {
      if (state.shouldQuit) return;
      if (state.phase !== 'playing') {
        state.jumpQueued = false;
        return;
      }
      const crouchHeld = performance.now() < state.crouchUntilMs;
      const intent: RunnerIntent = { jumpPressed: state.jumpQueued, crouchHeld };
      state.jumpQueued = false;
      state.runner = stepRunner(state.runner, intent, dt);
      state.world = stepWorld(state.world, dt, state.cols);
      state.score = distanceToScore(state.world.distance);
      const hit = checkCollision(state.runner, state.world);
      if (hit) {
        state.phase = 'gameover';
        if (state.score > state.highScore) {
          state.highScore = state.score;
          saveHighScore(state.highScore);
        }
        // Fire-and-forget leaderboard submit. No-op if no handle configured.
        // The network call runs detached; it either succeeds, gets parked in
        // the offline queue (retriable failure), or dropped (4xx).
        if (opts.version) {
          void submitScoreInBackground({
            score: state.score,
            tier: state.world.tier,
            version: opts.version,
            playTimeSec: state.world.elapsedSec,
          });
        }
      }
    },
    render() {
      clearFrame();
      if (state.phase === 'title') drawTitle(state);
      else if (state.phase === 'playing') drawPlay(state);
      else drawGameOver(state);
      flush();

      if (state.shouldQuit) {
        loop.stop();
        unsub();
        input.stop();
        process.stdout.off('resize', onResize);
        restoreTerminal();
        process.exit(0);
      }
    },
  });

  void getSize;
  void opts.noColor;
}
