import { describe, it, expect } from 'vitest';
import { applyGravity, aabbOverlap } from '../src/game/physics.js';

describe('applyGravity', () => {
  it('increases downward velocity over time', () => {
    expect(applyGravity(0, 100, { gravity: 60, maxFallSpeed: 30 })).toBeCloseTo(6, 3);
  });
  it('caps at maxFallSpeed', () => {
    expect(applyGravity(29, 1000, { gravity: 60, maxFallSpeed: 30 })).toBe(30);
  });
  it('passes through negative (rising) velocity', () => {
    expect(applyGravity(-20, 100, { gravity: 60, maxFallSpeed: 30 })).toBeCloseTo(-14, 3);
  });
});

describe('aabbOverlap', () => {
  it('detects overlapping boxes', () => {
    expect(aabbOverlap({ x: 0, y: 0, w: 2, h: 2 }, { x: 1, y: 1, w: 2, h: 2 })).toBe(true);
  });
  it('returns false for disjoint boxes', () => {
    expect(aabbOverlap({ x: 0, y: 0, w: 1, h: 1 }, { x: 2, y: 2, w: 1, h: 1 })).toBe(false);
  });
  it('edge touching is not overlap', () => {
    expect(aabbOverlap({ x: 0, y: 0, w: 1, h: 1 }, { x: 1, y: 0, w: 1, h: 1 })).toBe(false);
  });
});
