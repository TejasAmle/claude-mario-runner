import { Redis } from '@upstash/redis';

/**
 * Upstash Redis client. Credentials are auto-injected by the Vercel
 * Marketplace integration (KV_REST_API_URL / KV_REST_API_TOKEN) and
 * picked up by Redis.fromEnv().
 *
 * Fails fast on cold start if env vars are missing so misconfiguration
 * surfaces in deploy logs instead of as mysterious 500s later.
 */
export const redis = Redis.fromEnv();

/** Namespace key used everywhere — bumped on breaking game-physics changes. */
export const LB_VERSION = process.env.LEADERBOARD_VERSION ?? 'v0';

/** Minimum CLI semver the server will accept scores from. */
export const MIN_CLIENT_VERSION = process.env.MIN_CLIENT_VERSION ?? '0.2.0';

export const keys = {
  leaderboard: (v = LB_VERSION) => `leaderboard:${v}`,
  user: (username: string, v = LB_VERSION) => `users:${v}:${username}`,
  rateIp: (ip: string) => `ratelimit:ip:${ip}`,
  rateUser: (username: string) => `ratelimit:user:${username}`,
  reservedHandles: () => 'reserved_handles',
  githubHandles: (v = LB_VERSION) => `github_handles:${v}`,
};
