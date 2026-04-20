import { aabbOverlap } from './physics.js';
import {
  type Obstacle,
  type ObstacleKind,
  createObstacle,
  pickNextKind,
  pickNextGap,
  type SpawnParams,
} from './obstacles.js';
import { type RunnerState } from './runner.js';

export type TierName = 'easy' | 'medium' | 'hard' | 'insane';

export interface Tier {
  name: TierName;
  untilSec: number;
  speed: number;
  minGap: number;
  maxGap: number;
  aerialProb: number;
  allowedKinds: readonly ObstacleKind[];
}

export const DEFAULT_TIERS: readonly Tier[] = [
  {
    name: 'easy',
    untilSec: 30,
    speed: 22,
    minGap: 30,
    maxGap: 46,
    aerialProb: 0,
    allowedKinds: ['bug', 'conflict'],
  },
  {
    name: 'medium',
    untilSec: 75,
    speed: 26,
    minGap: 22,
    maxGap: 34,
    aerialProb: 0.18,
    allowedKinds: ['bug', 'conflict', 'wall', 'drone'],
  },
  {
    name: 'hard',
    untilSec: 120,
    speed: 38,
    minGap: 16,
    maxGap: 26,
    aerialProb: 0.25,
    allowedKinds: ['bug', 'conflict', 'wall', 'exception', 'drone'],
  },
  {
    name: 'insane',
    untilSec: Infinity,
    speed: 52,
    minGap: 12,
    maxGap: 20,
    aerialProb: 0.32,
    allowedKinds: ['bug', 'conflict', 'wall', 'exception', 'drone'],
  },
];

export interface WorldConfig {
  tiers: readonly Tier[];
  maxSpeed: number;
}

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  tiers: DEFAULT_TIERS,
  maxSpeed: 55,
};

export interface WorldState {
  distance: number;
  elapsedSec: number;
  speed: number;
  obstacles: Obstacle[];
  nextSpawnAtDistance: number;
  groundY: number;
  rng: () => number;
  cfg: WorldConfig;
  tier: TierName;
  // Absolute world-x for the *first* obstacle. Lets the app control the
  // approach time independent of terminal width (spawning at worldWidth+1
  // on a 180-col terminal takes 7+ seconds to reach the mascot).
  firstSpawnX?: number;
  firstSpawnPending: boolean;
}

export function tierAt(tiers: readonly Tier[], sec: number): Tier {
  for (const t of tiers) if (sec < t.untilSec) return t;
  return tiers[tiers.length - 1]!;
}

function prevUntil(tiers: readonly Tier[], current: Tier): number {
  let prev = 0;
  for (const t of tiers) {
    if (t === current) return prev;
    prev = t.untilSec;
  }
  return 0;
}

export function createWorld(
  groundY: number,
  rng: () => number = Math.random,
  cfg: WorldConfig = DEFAULT_WORLD_CONFIG,
  firstSpawnX?: number,
): WorldState {
  const initial = tierAt(cfg.tiers, 0);
  return {
    distance: 0,
    elapsedSec: 0,
    speed: initial.speed,
    obstacles: [],
    nextSpawnAtDistance: 0,
    groundY,
    rng,
    cfg,
    tier: initial.name,
    firstSpawnX,
    firstSpawnPending: true,
  };
}

export function stepWorld(world: WorldState, dtMs: number, worldWidth: number): WorldState {
  const dt = dtMs / 1000;
  const elapsedSec = world.elapsedSec + dt;
  const tier = tierAt(world.cfg.tiers, elapsedSec);

  // Ease speed toward tier.speed (no teleport at tier boundaries).
  const speedTarget = Math.min(world.cfg.maxSpeed, tier.speed);
  const speedDelta = speedTarget - world.speed;
  const speedStep = Math.min(Math.abs(speedDelta), 4 * dt);
  const speed = world.speed + Math.sign(speedDelta) * speedStep;

  const moved = speed * dt;
  const distance = world.distance + moved;

  const obstacles: Obstacle[] = [];
  for (const o of world.obstacles) {
    const newBox = { ...o.box, x: o.box.x - moved };
    if (newBox.x + newBox.w < 0) continue;
    obstacles.push({ ...o, box: newBox });
  }

  const tierFloor = prevUntil(world.cfg.tiers, tier);
  const span = tier.untilSec - tierFloor;
  const difficulty = Number.isFinite(span) ? Math.min(1, (elapsedSec - tierFloor) / span) : 1;

  let nextSpawnAtDistance = world.nextSpawnAtDistance;
  let firstSpawnPending = world.firstSpawnPending;
  if (distance >= nextSpawnAtDistance) {
    const params: SpawnParams = {
      minGapCells: tier.minGap,
      maxGapCells: tier.maxGap,
      difficulty,
      aerialProb: tier.aerialProb,
      allowedKinds: tier.allowedKinds,
    };
    const kind = pickNextKind(world.rng, params);
    const spawnX =
      firstSpawnPending && world.firstSpawnX !== undefined
        ? Math.min(world.firstSpawnX, worldWidth + 1)
        : worldWidth + 1;
    obstacles.push(createObstacle(kind, spawnX, world.groundY));
    nextSpawnAtDistance = distance + pickNextGap(world.rng, params);
    firstSpawnPending = false;
  }

  return {
    ...world,
    distance,
    elapsedSec,
    speed,
    obstacles,
    nextSpawnAtDistance,
    tier: tier.name,
    firstSpawnPending,
  };
}

export function checkCollision(runner: RunnerState, world: WorldState): Obstacle | null {
  for (const o of world.obstacles) {
    if (aabbOverlap(runner.box, o.box)) return o;
  }
  return null;
}

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
