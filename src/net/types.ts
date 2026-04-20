/**
 * CLI-side copy of the request shape.
 * MUST match web/lib/types.ts. Duplicated (instead of shared via workspace)
 * because the CLI ships as a standalone npm package and can't reach into web/.
 *
 * When the web types change, bump MIN_CLIENT_VERSION on the server and cut
 * a CLI release with the matching shape.
 */

export type TierName = 'easy' | 'medium' | 'hard' | 'insane';

export interface SubmitRequest {
  username: string;
  score: number;
  tier: TierName;
  version: string;
  playTimeSec: number;
  identityType?: 'local' | 'github';
  githubToken?: string;
}

export interface SubmitResponse {
  ok: true;
  posted: boolean;
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
  updatedAt: string;
  entries: LeaderboardEntry[];
}
