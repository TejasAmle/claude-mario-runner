import { describe, it, expect } from 'vitest';
import {
  createRunner,
  stepRunner,
  DEFAULT_RUNNER_CONFIG,
  type RunnerIntent,
} from '../src/game/runner.js';

const STEP = 1000 / 30;
const jump: RunnerIntent = { jumpPressed: true };
const noop: RunnerIntent = { jumpPressed: false };

describe('runner physics', () => {
  it('starts grounded at ground level', () => {
    const r = createRunner(10, 20);
    expect(r.onGround).toBe(true);
    expect(r.box.y).toBeCloseTo(20 - DEFAULT_RUNNER_CONFIG.height, 3);
  });

  it('stays grounded with no input', () => {
    let r = createRunner(10, 20);
    for (let i = 0; i < 30; i++) r = stepRunner(r, noop, STEP);
    expect(r.onGround).toBe(true);
    expect(r.box.y).toBeCloseTo(20 - DEFAULT_RUNNER_CONFIG.height, 3);
  });

  it('jumps when ground + jumpPressed', () => {
    let r = createRunner(10, 20);
    r = stepRunner(r, jump, STEP);
    expect(r.onGround).toBe(false);
    expect(r.vy).toBeLessThan(0);
  });

  it('cannot double-jump mid-air', () => {
    let r = createRunner(10, 20);
    r = stepRunner(r, jump, STEP);
    const v1 = r.vy;
    r = stepRunner(r, jump, STEP);
    expect(r.vy).toBeGreaterThan(v1);
  });

  it('lands back on ground after jump arc', () => {
    let r = createRunner(10, 20);
    r = stepRunner(r, jump, STEP);
    for (let i = 0; i < 120; i++) r = stepRunner(r, noop, STEP);
    expect(r.onGround).toBe(true);
    expect(r.box.y).toBeCloseTo(20 - DEFAULT_RUNNER_CONFIG.height, 1);
  });

  it('crouching reduces height and blocks jumping', () => {
    let r = createRunner(10, 20);
    r = stepRunner(r, { jumpPressed: false, crouchHeld: true }, STEP);
    expect(r.crouching).toBe(true);
    expect(r.box.h).toBe(DEFAULT_RUNNER_CONFIG.crouchHeight);
    expect(r.box.y).toBeCloseTo(20 - DEFAULT_RUNNER_CONFIG.crouchHeight, 3);
    r = stepRunner(r, { jumpPressed: true, crouchHeld: true }, STEP);
    expect(r.onGround).toBe(true);
    expect(r.vy).toBe(0);
  });

  it('releasing crouch restores full height', () => {
    let r = createRunner(10, 20);
    r = stepRunner(r, { jumpPressed: false, crouchHeld: true }, STEP);
    r = stepRunner(r, { jumpPressed: false, crouchHeld: false }, STEP);
    expect(r.crouching).toBe(false);
    expect(r.box.h).toBe(DEFAULT_RUNNER_CONFIG.height);
  });

  it('reaches a reasonable jump height (> 2 cells above ground)', () => {
    let r = createRunner(10, 20);
    r = stepRunner(r, jump, STEP);
    let peak = r.box.y;
    for (let i = 0; i < 30; i++) {
      r = stepRunner(r, noop, STEP);
      if (r.box.y < peak) peak = r.box.y;
    }
    const groundTop = 20 - DEFAULT_RUNNER_CONFIG.height;
    expect(groundTop - peak).toBeGreaterThan(2);
  });
});
