import { describe, it, expect } from 'vitest';
import {
  createWorld,
  stepWorld,
  checkCollision,
  mulberry32,
  DEFAULT_WORLD_CONFIG,
} from '../src/game/world.js';
import { createRunner } from '../src/game/runner.js';

const STEP = 1000 / 30;

function run(worldWidth = 80, steps = 60, seed = 1) {
  let w = createWorld(20, mulberry32(seed));
  for (let i = 0; i < steps; i++) w = stepWorld(w, STEP, worldWidth);
  return w;
}

describe('world stepping', () => {
  it('advances distance monotonically', () => {
    let w = createWorld(20, mulberry32(1));
    const distances: number[] = [];
    for (let i = 0; i < 30; i++) {
      w = stepWorld(w, STEP, 80);
      distances.push(w.distance);
    }
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]!).toBeGreaterThan(distances[i - 1]!);
    }
  });

  it('spawns obstacles over time', () => {
    const w = run(80, 300, 7);
    expect(w.obstacles.length).toBeGreaterThan(0);
  });

  it('despawns obstacles that scroll off-screen left', () => {
    let w = createWorld(20, mulberry32(3));
    for (let i = 0; i < 1000; i++) w = stepWorld(w, STEP, 80);
    for (const o of w.obstacles) {
      expect(o.box.x + o.box.w).toBeGreaterThan(-1);
    }
  });

  it('progresses through tiers over time', () => {
    let w = createWorld(20, mulberry32(9));
    expect(w.tier).toBe('easy');
    // ~40s of sim
    for (let i = 0; i < 1200; i++) w = stepWorld(w, STEP, 80);
    expect(['medium', 'hard']).toContain(w.tier);
    // ~160s total
    for (let i = 0; i < 3600; i++) w = stepWorld(w, STEP, 80);
    expect(w.tier).toBe('insane');
  });

  it('only spawns ground obstacles during easy tier', () => {
    let w = createWorld(20, mulberry32(13));
    // Simulate just the easy window (~25s).
    for (let i = 0; i < 750; i++) w = stepWorld(w, STEP, 120);
    for (const o of w.obstacles) {
      expect(o.kind).not.toBe('drone');
    }
  });

  it('speed ramps up with distance, capped at maxSpeed', () => {
    let w = createWorld(20, mulberry32(5));
    const s0 = w.speed;
    for (let i = 0; i < 2000; i++) w = stepWorld(w, STEP, 80);
    expect(w.speed).toBeGreaterThan(s0);
    expect(w.speed).toBeLessThanOrEqual(DEFAULT_WORLD_CONFIG.maxSpeed + 1e-6);
  });

  it('spawns at decreasing gaps over time (difficulty ramp)', () => {
    let w = createWorld(20, mulberry32(11));
    const earlyGaps: number[] = [];
    const lateGaps: number[] = [];
    let lastSpawnDist = 0;
    for (let i = 0; i < 200; i++) {
      const beforeCount = w.obstacles.length;
      w = stepWorld(w, STEP, 200);
      if (w.obstacles.length > beforeCount) {
        earlyGaps.push(w.distance - lastSpawnDist);
        lastSpawnDist = w.distance;
      }
    }
    lastSpawnDist = w.distance;
    for (let i = 0; i < 4000; i++) {
      const beforeCount = w.obstacles.length;
      w = stepWorld(w, STEP, 200);
      if (w.obstacles.length > beforeCount) {
        lateGaps.push(w.distance - lastSpawnDist);
        lastSpawnDist = w.distance;
      }
    }
    if (earlyGaps.length >= 3 && lateGaps.length >= 3) {
      const earlyAvg = avg(earlyGaps);
      const lateAvg = avg(lateGaps);
      expect(lateAvg).toBeLessThan(earlyAvg);
    }
  });
});

describe('collision', () => {
  it('returns null when runner is clear of all obstacles', () => {
    const runner = createRunner(10, 20);
    const world = createWorld(20, mulberry32(1));
    expect(checkCollision(runner, world)).toBeNull();
  });

  it('detects collision when boxes overlap', () => {
    const runner = createRunner(10, 20);
    const world = createWorld(20, mulberry32(1));
    world.obstacles.push({
      kind: 'bug',
      box: { x: runner.box.x, y: runner.box.y, w: 2, h: 2 },
    });
    const hit = checkCollision(runner, world);
    expect(hit).not.toBeNull();
    expect(hit?.kind).toBe('bug');
  });

  it('is deterministic with a seeded rng', () => {
    const a = run(80, 300, 42);
    const b = run(80, 300, 42);
    expect(a.obstacles.length).toBe(b.obstacles.length);
    for (let i = 0; i < a.obstacles.length; i++) {
      expect(a.obstacles[i]!.box.x).toBeCloseTo(b.obstacles[i]!.box.x, 5);
      expect(a.obstacles[i]!.kind).toBe(b.obstacles[i]!.kind);
    }
  });
});

function avg(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
