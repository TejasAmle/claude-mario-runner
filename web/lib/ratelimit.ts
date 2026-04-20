import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

/**
 * Two independent rate limiters, both sliding-window so burst handling
 * is smoother than fixed windows.
 *
 * Limits intentionally above "enthusiastic legit player" — assume ~1 game
 * per 30s at hardest, and most of those aren't PBs so they just bump
 * last_seen. 30/hr per user is ~1 every 2 minutes, well above realistic.
 */
export const ipLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 h'),
  analytics: false,
  prefix: 'ratelimit:ip',
});

export const userLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 h'),
  analytics: false,
  prefix: 'ratelimit:user',
});

/** Best-effort client IP extraction from Vercel/Next request headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
