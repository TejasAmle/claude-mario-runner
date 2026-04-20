import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Local profile. Stored as JSON in ~/.claude-mario-runner/profile.json
 * alongside scores.json. Deliberately separate file from scores so we can
 * reason about each independently and so one being corrupt doesn't take
 * out the other.
 */
export interface Profile {
  /** Chosen display handle. Empty string = no handle set (never submit). */
  handle: string;
  /** 'local' by default; upgrades to 'github' after successful `login`. */
  identityType: 'local' | 'github';
  /**
   * GitHub OAuth access token. Only set after device-flow login verifies the
   * token resolves to `handle`. Kept on disk unencrypted (same directory as
   * scores) — the token grants only read:user scope, so worst case leak
   * exposes the user's public GH login, which is already public.
   */
  githubToken?: string;
  /** Opt-out switch. When true, CLI never submits. */
  submitDisabled?: boolean;
}

const CONFIG_DIR = path.join(os.homedir(), '.claude-mario-runner');
const PROFILE_FILE = path.join(CONFIG_DIR, 'profile.json');

const DEFAULT_PROFILE: Profile = {
  handle: '',
  identityType: 'local',
};

export function loadProfile(): Profile {
  try {
    const raw = fs.readFileSync(PROFILE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      handle: typeof parsed.handle === 'string' ? parsed.handle : '',
      identityType: parsed.identityType === 'github' ? 'github' : 'local',
      githubToken: typeof parsed.githubToken === 'string' ? parsed.githubToken : undefined,
      submitDisabled: parsed.submitDisabled === true ? true : undefined,
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: Profile): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const tmp = PROFILE_FILE + '.tmp';
  // Restrict to user-only read/write — the file contains an OAuth token.
  fs.writeFileSync(tmp, JSON.stringify(profile, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, PROFILE_FILE);
  try {
    // rename preserves mode on POSIX but some edge cases (e.g. existing file
    // with different perms) mean we force it once more.
    fs.chmodSync(PROFILE_FILE, 0o600);
  } catch {
    // best-effort
  }
}

export function clearProfile(): void {
  try {
    fs.unlinkSync(PROFILE_FILE);
  } catch {
    // nothing to clear
  }
}

export function profileFilePath(): string {
  return PROFILE_FILE;
}
