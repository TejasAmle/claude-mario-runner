import { NextResponse } from 'next/server';
import { keys, redis, LB_VERSION } from '@/lib/redis';
import type { LeaderboardEntry, LeaderboardResponse, TierName } from '@/lib/types';

export const runtime = 'nodejs';
// Cached at the edge for 15s, with stale-while-revalidate for 30s. Keeps
// the table fresh without hammering Redis from every page-load.
export const revalidate = 15;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function GET(req: Request): Promise<NextResponse<LeaderboardResponse | { error: string }>> {
  const url = new URL(req.url);
  const limit = clampLimit(url.searchParams.get('limit'));
  const version = url.searchParams.get('version') ?? LB_VERSION;

  // Top-N: member+score pairs, highest-first.
  const raw = await redis.zrange<(string | number)[]>(
    keys.leaderboard(version),
    0,
    limit - 1,
    { rev: true, withScores: true },
  );

  const entries: LeaderboardEntry[] = [];
  if (raw.length === 0) {
    return corsJson({ version, updatedAt: new Date().toISOString(), entries });
  }

  // Upstash returns [member1, score1, member2, score2, ...]
  const pairs: Array<{ username: string; score: number }> = [];
  for (let i = 0; i < raw.length; i += 2) {
    const username = String(raw[i]);
    const score = Number(raw[i + 1]);
    if (Number.isFinite(score)) pairs.push({ username, score });
  }

  // Batch fetch user metadata with pipeline — one round trip.
  const pipe = redis.pipeline();
  for (const { username } of pairs) {
    pipe.hmget(keys.user(username, version), 'best_tier', 'games_played', 'last_seen_ts', 'identity_type');
  }
  const metas = (await pipe.exec()) as Array<Record<string, string | number | null> | null>;

  pairs.forEach(({ username, score }, i) => {
    const meta = metas[i] ?? {};
    entries.push({
      rank: i + 1,
      username,
      score,
      tier: (meta.best_tier as TierName) ?? 'easy',
      identityType: (meta.identity_type as 'local' | 'github') ?? 'local',
      gamesPlayed: toInt(meta.games_played, 0),
      lastSeenTs: toInt(meta.last_seen_ts, 0),
    });
  });

  return corsJson({ version, updatedAt: new Date().toISOString(), entries });
}

function clampLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function toInt(v: string | number | null | undefined, fallback: number): number {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function corsJson<T>(body: T): NextResponse<T> {
  return NextResponse.json(body, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
    },
  });
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
}
