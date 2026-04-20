import { applyGravity, type AABB, type PhysicsConfig } from './physics.js';

export interface RunnerConfig {
  jumpImpulse: number;
  physics: PhysicsConfig;
  width: number;
  height: number;
  crouchHeight: number;
}

// Taller Chrome-dino-style arc. Collision width (6) is narrower than the
// visual sprite (8) — the leg gaps `# #  # #` are visual only — so a 2-wide
// bug's hit zone traverses in (6+2)/22 ≈ 0.36 s, well inside airtime.
//
// Lower gravity + lower impulse → shorter peak, longer airtime, bigger reach.
//   peak    = v²/2g ≈ 50² / 240 ≈ 10.4 cells (lower than before)
//   airtime = 2v/g  ≈ 100 / 120 ≈ 0.83 s  (longer than before)
//   reach at speed 22 ≈ 18.3 cells (was 15.4)
//   reach at speed 38 ≈ 31.7 cells (was 26.6)
//
// Drone sits at rows [groundY-7, groundY-3). Peak mascot bottom lands at
// groundY-4-peak_euler ≈ groundY-10.9, so its bottom cell row groundY-6.9
// still overlaps drone's top row — jumping alone cannot clear the drone.
export const DEFAULT_RUNNER_CONFIG: RunnerConfig = {
  jumpImpulse: 50,
  physics: { gravity: 120, maxFallSpeed: 100 },
  width: 6,
  height: 4,
  crouchHeight: 2,
};

export interface RunnerState {
  box: AABB;
  vy: number;
  onGround: boolean;
  groundY: number;
  crouching: boolean;
}

export function createRunner(x: number, groundY: number, cfg = DEFAULT_RUNNER_CONFIG): RunnerState {
  return {
    box: { x, y: groundY - cfg.height, w: cfg.width, h: cfg.height },
    vy: 0,
    onGround: true,
    groundY,
    crouching: false,
  };
}

export interface RunnerIntent {
  jumpPressed: boolean;
  crouchHeld?: boolean;
}

export function stepRunner(
  s: RunnerState,
  intent: RunnerIntent,
  dtMs: number,
  cfg = DEFAULT_RUNNER_CONFIG,
): RunnerState {
  let vy = s.vy;
  let onGround = s.onGround;

  const wantsCrouch = !!intent.crouchHeld && onGround;
  // Cannot jump while crouching; releasing crouch and pressing jump same frame jumps.
  if (intent.jumpPressed && onGround && !wantsCrouch) {
    vy = -cfg.jumpImpulse;
    onGround = false;
  }

  vy = applyGravity(vy, dtMs, cfg.physics);
  const nextH = wantsCrouch ? cfg.crouchHeight : cfg.height;
  let ny = s.box.y + vy * (dtMs / 1000);
  const groundTop = s.groundY - nextH;
  if (onGround || ny >= groundTop) {
    ny = groundTop;
    vy = 0;
    onGround = true;
  }

  return {
    ...s,
    box: { ...s.box, y: ny, h: nextH },
    vy,
    onGround,
    crouching: wantsCrouch,
  };
}
