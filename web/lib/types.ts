/**
 * Shared types between the CLI submission client and the leaderboard API.
 *
 * Keep this file tiny and schema-stable — the CLI copies the request shape
 * from here, so a breaking change here needs a CLI release too.
 */

export type TierName = 'easy' | 'medium' | 'hard' | 'insane';

export interface SubmitRequest {
  username: string;
  score: number;
  tier: TierName;
  version: string; // full semver, e.g. "0.2.0"
  playTimeSec: number;
  identityType?: 'local' | 'github';
  githubToken?: string; // optional; if valid, upgrades identity to "github"
}

export interface SubmitResponse {
  ok: true;
  posted: boolean; // false when score was not a new personal best
  rank: number | null;
  personalBest: number;
  prevBest: number;
}

export interface SubmitError {
  ok: false;
  error:
    | 'schema'
    | 'handle'
    | 'version_obsolete'
    | 'implausible'
    | 'reserved'
    | 'rate_limited'
    | 'internal';
  message: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  tier: TierName;
  identityType: 'local' | 'github';
  gamesPlayed: number;
  lastSeenTs: number;
}

export interface LeaderboardResponse {
  version: string;
  updatedAt: string; // ISO-8601
  entries: LeaderboardEntry[];
}
