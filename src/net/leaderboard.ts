import type {
  LeaderboardResponse,
  SubmitError,
  SubmitRequest,
  SubmitResponse,
} from './types.js';
import { resolveEndpoint } from './endpoint.js';
import { enqueue, readQueue, writeQueue, type QueuedSubmit } from './queue.js';
import { loadProfile } from './config.js';

/** Short timeout — the game already exited the play loop, no need to hang. */
const SUBMIT_TIMEOUT_MS = 4000;
const LEADERBOARD_TIMEOUT_MS = 6000;

/**
 * Attempt a submit. On network failure / 5xx / 429, enqueue for later retry.
 * On 4xx non-retriable errors (schema, reserved, version_obsolete), drop —
 * the request is wrong and will never succeed as-is.
 *
 * Returns parsed response, or null on failure. Callers should not throw on
 * null — the offline queue has absorbed the problem.
 */
export async function submitScore(
  payload: SubmitRequest,
): Promise<SubmitResponse | SubmitError | null> {
  const url = `${resolveEndpoint()}/api/submit`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    // 5xx or 429 → retriable, queue it
    if (res.status >= 500 || res.status === 429) {
      enqueue(payload);
      return null;
    }

    const body = (await res.json()) as SubmitResponse | SubmitError;
    return body;
  } catch {
    // Network error, timeout, DNS, offline — retriable
    enqueue(payload);
    return null;
  }
}

/**
 * Fire-and-forget helper used on game-over. Assembles the payload from the
 * local profile, validates there's a handle set, and kicks off the submit
 * without awaiting it — the game's UI thread never blocks.
 *
 * Returns the promise anyway so callers that *do* want to await (e.g. tests,
 * or `claude-mario submit-now` in the future) can.
 */
export function submitScoreInBackground(args: {
  score: number;
  tier: SubmitRequest['tier'];
  version: string;
  playTimeSec: number;
}): Promise<SubmitResponse | SubmitError | null> | null {
  const profile = loadProfile();
  if (!profile.handle || profile.submitDisabled) return null;

  const payload: SubmitRequest = {
    username: profile.handle,
    score: args.score,
    tier: args.tier,
    version: args.version,
    playTimeSec: args.playTimeSec,
    identityType: profile.identityType,
    githubToken: profile.githubToken,
  };

  // Intentionally don't await — caller keeps running.
  return submitScore(payload);
}

/**
 * Drain queued submits. Called on CLI start (best-effort) before the game.
 * Stops early on rate-limit (429) to avoid amplifying backpressure.
 */
export async function drainQueue(): Promise<{ sent: number; dropped: number; kept: number }> {
  const entries = readQueue();
  if (entries.length === 0) return { sent: 0, dropped: 0, kept: 0 };

  let sent = 0;
  let dropped = 0;
  const remaining: QueuedSubmit[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
      const res = await fetch(`${resolveEndpoint()}/api/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(entry.payload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        sent++;
        continue;
      }
      if (res.status === 429) {
        // Keep this one AND everything after — try again next launch.
        remaining.push({ ...entry, attempts: entry.attempts + 1 });
        for (let j = i + 1; j < entries.length; j++) remaining.push(entries[j]!);
        break;
      }
      if (res.status >= 500) {
        remaining.push({ ...entry, attempts: entry.attempts + 1 });
        continue;
      }
      // 4xx non-429: non-retriable, drop
      dropped++;
    } catch {
      // network hiccup — keep
      remaining.push({ ...entry, attempts: entry.attempts + 1 });
    }
  }

  writeQueue(remaining);
  return { sent, dropped, kept: remaining.length };
}

export async function fetchLeaderboard(): Promise<LeaderboardResponse | null> {
  const url = `${resolveEndpoint()}/api/leaderboard`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LEADERBOARD_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as LeaderboardResponse;
  } catch {
    return null;
  }
}
