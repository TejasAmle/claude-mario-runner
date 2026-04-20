import { type AABB } from './physics.js';

export type ObstacleKind = 'bug' | 'conflict' | 'wall' | 'exception' | 'drone';

export interface ObstacleSpec {
  kind: ObstacleKind;
  w: number;
  h: number;
  label: string;
  aerial: boolean;
}

export const OBSTACLE_SPECS: Record<ObstacleKind, ObstacleSpec> = {
  bug: { kind: 'bug', w: 2, h: 1, label: 'bug', aerial: false },
  conflict: { kind: 'conflict', w: 3, h: 2, label: 'conflict', aerial: false },
  wall: { kind: 'wall', w: 2, h: 3, label: 'wall', aerial: false },
  exception: { kind: 'exception', w: 3, h: 3, label: 'exception', aerial: false },
  drone: { kind: 'drone', w: 4, h: 10, label: 'drone', aerial: true },
};

// Aerial obstacles sit 3 cells above ground with h=10, so rows span
// [groundY-13, groundY-3). This intersects:
//   • standing mascot [groundY-4, groundY)           → collide (must duck)
//   • jumping mascot peak ≈ [groundY-15, groundY-11) → still overlaps groundY-13..-12 → collide
//   • crouched mascot [groundY-2, groundY)           → no overlap → SAFE
// So the drone forces a crouch at every tier speed.
const AERIAL_BOTTOM_ABOVE_GROUND = 3;

export interface Obstacle {
  kind: ObstacleKind;
  box: AABB;
}

export function createObstacle(kind: ObstacleKind, x: number, groundY: number): Obstacle {
  const s = OBSTACLE_SPECS[kind];
  const y = s.aerial ? groundY - AERIAL_BOTTOM_ABOVE_GROUND - s.h : groundY - s.h;
  return { kind, box: { x, y, w: s.w, h: s.h } };
}

export interface SpawnParams {
  minGapCells: number;
  maxGapCells: number;
  difficulty: number;
  aerialProb: number;
  allowedKinds: readonly ObstacleKind[];
}

export function pickNextKind(
  rng: () => number,
  params: Pick<SpawnParams, 'difficulty' | 'aerialProb' | 'allowedKinds'>,
): ObstacleKind {
  const allowed = params.allowedKinds;
  const d = Math.min(1, Math.max(0, params.difficulty));

  // Aerial roll
  if (params.aerialProb > 0 && allowed.includes('drone') && rng() < params.aerialProb) {
    return 'drone';
  }

  const baseWeights: Record<ObstacleKind, number> = {
    bug: 1 - 0.5 * d,
    conflict: 0.6 + 0.3 * d,
    wall: 0.3 + 0.5 * d,
    exception: 0.1 + 0.8 * d,
    drone: 0, // handled above
  };
  const entries: Array<[ObstacleKind, number]> = allowed
    .filter((k) => k !== 'drone')
    .map((k) => [k, baseWeights[k]]);

  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return (allowed[0] ?? 'bug') as ObstacleKind;
  let roll = rng() * total;
  for (const [kind, w] of entries) {
    roll -= w;
    if (roll <= 0) return kind;
  }
  return entries[0]![0];
}

export function pickNextGap(rng: () => number, params: SpawnParams): number {
  const span = params.maxGapCells - params.minGapCells;
  return params.minGapCells + rng() * span;
}
