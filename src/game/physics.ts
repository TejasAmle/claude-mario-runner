export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PhysicsConfig {
  gravity: number;
  maxFallSpeed: number;
}

export function applyGravity(vy: number, dtMs: number, cfg: PhysicsConfig): number {
  const v = vy + cfg.gravity * (dtMs / 1000);
  return v > cfg.maxFallSpeed ? cfg.maxFallSpeed : v;
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
