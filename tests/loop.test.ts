import { describe, it, expect } from 'vitest';
import { simulateStep, STEP_MS } from '../src/engine/loop.js';

describe('fixed-timestep accumulator', () => {
  it('runs 0 updates when delta < STEP_MS', () => {
    const r = simulateStep(0, STEP_MS / 2);
    expect(r.updates).toBe(0);
    expect(r.accAfter).toBeCloseTo(STEP_MS / 2, 5);
  });

  it('runs exactly one update when delta == STEP_MS', () => {
    const r = simulateStep(0, STEP_MS);
    expect(r.updates).toBe(1);
    expect(r.accAfter).toBeCloseTo(0, 5);
  });

  it('runs multiple updates when delta is several STEP_MS', () => {
    const r = simulateStep(0, STEP_MS * 3);
    expect(r.updates).toBe(3);
    expect(r.accAfter).toBeCloseTo(0, 5);
  });

  it('preserves accumulator remainder across ticks', () => {
    const a = simulateStep(0, STEP_MS * 1.5);
    expect(a.updates).toBe(1);
    expect(a.accAfter).toBeCloseTo(STEP_MS * 0.5, 5);
    const b = simulateStep(a.accAfter, STEP_MS * 0.6);
    expect(b.updates).toBe(1);
    expect(b.accAfter).toBeCloseTo(STEP_MS * 0.1, 5);
  });

  it('caps catch-up updates (no spiral of death)', () => {
    const r = simulateStep(0, STEP_MS * 1000);
    expect(r.updates).toBeLessThanOrEqual(5);
  });
});
