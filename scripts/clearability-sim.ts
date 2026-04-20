import { createRunner, stepRunner, DEFAULT_RUNNER_CONFIG } from '../src/game/runner.js';
import { OBSTACLE_SPECS, createObstacle, type ObstacleKind } from '../src/game/obstacles.js';
import { aabbOverlap } from '../src/game/physics.js';

const STEP_MS = 1000 / 30;
const GROUND_Y = 20;
const RUNNER_X = 10;

function simulate(kind: ObstacleKind, speed: number, strategy: 'jump' | 'crouch' | 'stand'): {
  cleared: boolean;
  hit: boolean;
} {
  // Place obstacle such that jump timing would be optimal.
  // Start obstacle far enough away; press jump at the right moment.
  // We'll brute-force: try all jump-press frames from 0..60 and see if any clear.
  const spec = OBSTACLE_SPECS[kind];
  const safe = Array.from({ length: 80 }, (_, jumpFrame) => {
    let runner = createRunner(RUNNER_X, GROUND_Y);
    let obstacle = createObstacle(kind, RUNNER_X + 30, GROUND_Y);
    let crouchPressed = false;
    for (let f = 0; f < 300; f++) {
      const jumpPressed = strategy === 'jump' && f === jumpFrame;
      crouchPressed = strategy === 'crouch';
      runner = stepRunner(
        runner,
        { jumpPressed, crouchHeld: crouchPressed },
        STEP_MS,
        DEFAULT_RUNNER_CONFIG,
      );
      const newX = obstacle.box.x - speed * (STEP_MS / 1000);
      obstacle = { ...obstacle, box: { ...obstacle.box, x: newX } };
      if (aabbOverlap(runner.box, obstacle.box)) return false;
      if (obstacle.box.x + obstacle.box.w < runner.box.x) return true;
    }
    return true;
  });
  const anyCleared = safe.some((s) => s);
  return { cleared: anyCleared, hit: !anyCleared };
}

const kinds: ObstacleKind[] = ['bug', 'conflict', 'wall', 'exception', 'drone'];
const speeds = [22, 26, 38, 52];

console.log('Clearability matrix (any jump timing works):');
console.log('');
for (const speed of speeds) {
  console.log(`--- speed ${speed} ---`);
  for (const kind of kinds) {
    const jump = simulate(kind, speed, 'jump');
    const crouch = simulate(kind, speed, 'crouch');
    const stand = simulate(kind, speed, 'stand');
    console.log(
      `  ${kind.padEnd(10)} jump=${jump.cleared ? '✓' : '✗'}  crouch=${crouch.cleared ? '✓' : '✗'}  stand=${stand.cleared ? '✓' : '✗'}`,
    );
  }
}
