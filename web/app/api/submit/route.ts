import { NextResponse } from 'next/server';
import { keys, redis, MIN_CLIENT_VERSION } from '@/lib/redis';
import { clientIp, ipLimiter, userLimiter } from '@/lib/ratelimit';
import { resolveGithubLogin } from '@/lib/github';
import { DEFAULT_RESERVED_HANDLES, semverGte, validateSubmit } from '@/lib/validate';
import type { SubmitError, SubmitResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function err(code: SubmitError['error'], message: string, status = 400): NextResponse<SubmitError> {
  return NextResponse.json({ ok: false, error: code, message }, { status });
}

export async function POST(req: Request): Promise<NextResponse<SubmitResponse | SubmitError>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return err('schema', 'invalid JSON');
  }

  const parsed = validateSubmit(raw);
  if (!parsed.ok) return err(parsed.error, parsed.message);
  const body = parsed.body;

  if (!semverGte(body.version, MIN_CLIENT_VERSION)) {
    return err('version_obsolete', `client ${body.version} < ${MIN_CLIENT_VERSION}`, 409);
  }

  // Reserved handle check. DEFAULT list is the baseline; Redis SET can augment
  // at runtime (an operator can `SADD reserved_handles some-word`).
  const isReservedLocal = DEFAULT_RESERVED_HANDLES.includes(body.username);
  const isReservedRemote = await redis.sismember(keys.reservedHandles(), body.username);
  if (isReservedLocal || isReservedRemote) {
    return err('reserved', 'handle is reserved', 403);
  }

  // Rate limits — IP first (cheaper fingerprint), then user.
  const ip = clientIp(req);
  const ipR = await ipLimiter.limit(ip);
  if (!ipR.success) return err('rate_limited', 'too many submissions from this IP', 429);
  const userR = await userLimiter.limit(body.username);
  if (!userR.success) return err('rate_limited', 'too many submissions for this handle', 429);

  // Identity upgrade: if a GH token came along and resolves to the claimed
  // handle, record as verified. Otherwise stay "local".
  let identityType: 'local' | 'github' = 'local';
  if (body.githubToken) {
    const login = await resolveGithubLogin(body.githubToken);
    if (login && login === body.username) {
      identityType = 'github';
      await redis.sadd(keys.githubHandles(), body.username);
    }
  }

  // Read prev best atomically-ish (we don't need strict atomicity — the
  // ZADD GT below is the authoritative best-score enforcer).
  const userKey = keys.user(body.username);
  const prevBestRaw = await redis.hget<number>(userKey, 'best_score');
  const prevBest = typeof prevBestRaw === 'number' ? prevBestRaw : 0;
  const isPB = body.score > prevBest;

  // Always bump activity counters regardless of PB (decision Q-B).
  const now = Math.floor(Date.now() / 1000);
  await redis.hincrby(userKey, 'games_played', 1);
  await redis.hset(userKey, {
    last_seen_ts: now,
    identity_type: identityType,
    // first_seen_ts: set-if-missing via HSETNX-style using separate call
  });
  // Ensure first_seen is only set once.
  await redis.hsetnx(userKey, 'first_seen_ts', now);

  if (!isPB) {
    return NextResponse.json({
      ok: true,
      posted: false,
      rank: null,
      personalBest: prevBest,
      prevBest,
    } satisfies SubmitResponse);
  }

  // New personal best — update leaderboard + user hash.
  // ZADD GT: only replace score if strictly greater. Returns the number of
  // elements updated (0 or 1). We re-read rank after.
  // Upstash ZADD: options come before score/member pairs.
  // { gt: true } → only replace if strictly greater (GT flag).
  await redis.zadd(
    keys.leaderboard(),
    { gt: true },
    { score: body.score, member: body.username },
  );
  await redis.hset(userKey, {
    best_score: body.score,
    best_tier: body.tier,
  });

  // Rank (0-indexed) in descending order. Add 1 for human-friendly.
  const zeroIdxRank = await redis.zrevrank(keys.leaderboard(), body.username);
  const rank = typeof zeroIdxRank === 'number' ? zeroIdxRank + 1 : null;

  return NextResponse.json({
    ok: true,
    posted: true,
    rank,
    personalBest: body.score,
    prevBest,
  } satisfies SubmitResponse);
}

/** Block browser POSTs via lack of CORS. CLI (non-browser) is unaffected. */
export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
