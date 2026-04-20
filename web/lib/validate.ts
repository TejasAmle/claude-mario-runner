import type { SubmitRequest, TierName } from './types';

/** Handle shape: 2–24 chars, lowercase alphanum + dash, must start alphanum. */
export const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,23}$/;

const TIERS = new Set<TierName>(['easy', 'medium', 'hard', 'insane']);

/** Max score per second of play. 300 is ~3× what insane-tier can produce. */
export const MAX_SCORE_PER_SEC = 300;

/** Sanity cap on any single submission. */
export const MAX_SCORE = 10_000_000;

/**
 * Reserved handles (subset). Full list lives in Redis SET `reserved_handles`
 * so it can be updated without a redeploy. This is the baseline seeded on
 * first deploy.
 */
export const DEFAULT_RESERVED_HANDLES = [
  'admin',
  'root',
  'system',
  'anonymous',
  'null',
  'undefined',
  'server',
  'claude',
  'anthropic',
];

export type ValidationResult =
  | { ok: true; body: SubmitRequest }
  | { ok: false; error: 'schema' | 'handle' | 'implausible'; message: string };

/**
 * Structural validation only. Liveness checks (rate limit, version, reserved
 * handle list) happen in the route handler against Redis.
 */
export function validateSubmit(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'schema', message: 'body must be an object' };
  }
  const b = raw as Record<string, unknown>;

  if (typeof b.username !== 'string') {
    return { ok: false, error: 'schema', message: 'username must be string' };
  }
  if (!HANDLE_RE.test(b.username)) {
    return {
      ok: false,
      error: 'handle',
      message: 'handle must be lowercase alphanum + dash, 2–24 chars',
    };
  }

  if (typeof b.score !== 'number' || !Number.isFinite(b.score) || !Number.isInteger(b.score)) {
    return { ok: false, error: 'schema', message: 'score must be integer' };
  }
  if (b.score < 0 || b.score > MAX_SCORE) {
    return { ok: false, error: 'schema', message: `score out of range [0, ${MAX_SCORE}]` };
  }

  if (typeof b.tier !== 'string' || !TIERS.has(b.tier as TierName)) {
    return { ok: false, error: 'schema', message: 'tier must be easy|medium|hard|insane' };
  }

  if (typeof b.version !== 'string' || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(b.version)) {
    return { ok: false, error: 'schema', message: 'version must be semver' };
  }

  if (typeof b.playTimeSec !== 'number' || !Number.isFinite(b.playTimeSec) || b.playTimeSec < 0) {
    return { ok: false, error: 'schema', message: 'playTimeSec must be non-negative number' };
  }

  // A player can score without playing for a *fraction* of a second on very
  // first collision, but at the playtime level we round up to 1s of grace.
  const effectivePlayTime = Math.max(b.playTimeSec, 1);
  if (b.score / effectivePlayTime > MAX_SCORE_PER_SEC) {
    return {
      ok: false,
      error: 'implausible',
      message: `score/playTime > ${MAX_SCORE_PER_SEC}/s`,
    };
  }

  if (b.identityType !== undefined && b.identityType !== 'local' && b.identityType !== 'github') {
    return { ok: false, error: 'schema', message: 'identityType must be local|github' };
  }

  if (b.githubToken !== undefined && typeof b.githubToken !== 'string') {
    return { ok: false, error: 'schema', message: 'githubToken must be string' };
  }

  return {
    ok: true,
    body: {
      username: b.username,
      score: b.score,
      tier: b.tier as TierName,
      version: b.version,
      playTimeSec: b.playTimeSec,
      identityType: (b.identityType as 'local' | 'github' | undefined) ?? 'local',
      githubToken: b.githubToken as string | undefined,
    },
  };
}

/** Compare "0.2.3" ≥ "0.2.0". Only handles basic major.minor.patch. */
export function semverGte(a: string, b: string): boolean {
  const pa = a.split('-')[0]!.split('.').map(Number);
  const pb = b.split('-')[0]!.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const ai = pa[i] ?? 0;
    const bi = pb[i] ?? 0;
    if (ai > bi) return true;
    if (ai < bi) return false;
  }
  return true;
}

/** Extract the major version (e.g. "0.2.0" → "0"). Used for versioned keys. */
export function majorOf(version: string): string {
  return version.split('-')[0]!.split('.')[0]!;
}
