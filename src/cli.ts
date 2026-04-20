/**
 * Subcommand dispatcher. Invoked from src/index.ts when argv[2] is a known
 * subcommand (login, logout, whoami, leaderboard, submit-disable, submit-enable).
 * These are non-game operations — they print to stdout and exit.
 */

import { clearProfile, loadProfile, saveProfile } from './net/config.js';
import { checkHandle, handleErrorMessage } from './net/validate.js';
import { pollForToken, requestDeviceCode, resolveLogin } from './net/github.js';
import { fetchLeaderboard } from './net/leaderboard.js';

export const SUBCOMMANDS = [
  'login',
  'logout',
  'whoami',
  'leaderboard',
  'submit-disable',
  'submit-enable',
] as const;
export type Subcommand = (typeof SUBCOMMANDS)[number];

export function isSubcommand(s: string | undefined): s is Subcommand {
  return !!s && (SUBCOMMANDS as readonly string[]).includes(s);
}

export async function runSubcommand(cmd: Subcommand, rest: string[]): Promise<number> {
  switch (cmd) {
    case 'login':
      return loginCmd(rest);
    case 'logout':
      return logoutCmd();
    case 'whoami':
      return whoamiCmd();
    case 'leaderboard':
      return leaderboardCmd();
    case 'submit-disable':
      return toggleSubmit(true);
    case 'submit-enable':
      return toggleSubmit(false);
  }
}

/**
 * `claude-mario login [<handle>]`
 *
 * Two modes:
 *   - `login <handle>`: save handle as-is (local identity, no GitHub verify)
 *   - `login`: start GitHub device flow; on success, save the GH login as
 *     handle and mark identity "github"
 */
async function loginCmd(rest: string[]): Promise<number> {
  const arg = rest[0]?.trim().toLowerCase();
  const profile = loadProfile();

  if (arg) {
    const check = checkHandle(arg);
    if (!check.ok) {
      process.stderr.write(`✗ ${handleErrorMessage(check.reason)}\n`);
      return 1;
    }
    saveProfile({ ...profile, handle: arg, identityType: 'local', githubToken: undefined });
    process.stdout.write(`✓ handle saved: ${arg} (local identity)\n`);
    return 0;
  }

  process.stdout.write('requesting GitHub device code...\n');
  let dev;
  try {
    dev = await requestDeviceCode();
  } catch (err) {
    process.stderr.write(`✗ ${(err as Error).message}\n`);
    return 1;
  }

  process.stdout.write(
    [
      '',
      `  Visit: ${dev.verification_uri}`,
      `  Code:  ${dev.user_code}`,
      '',
      `waiting for authorization (expires in ${Math.round(dev.expires_in / 60)}m)...`,
      '',
    ].join('\n'),
  );

  let token: string;
  try {
    token = await pollForToken(dev);
  } catch (err) {
    process.stderr.write(`✗ ${(err as Error).message}\n`);
    return 1;
  }

  const login = await resolveLogin(token);
  if (!login) {
    process.stderr.write('✗ could not resolve GitHub login from token\n');
    return 1;
  }

  const check = checkHandle(login);
  if (!check.ok) {
    process.stderr.write(
      `✗ your GitHub login "${login}" ${handleErrorMessage(check.reason)}\n` +
        '  tip: use `claude-mario login <handle>` for local identity instead\n',
    );
    return 1;
  }

  saveProfile({ ...profile, handle: login, identityType: 'github', githubToken: token });
  process.stdout.write(`✓ signed in as ${login} (github-verified)\n`);
  return 0;
}

function logoutCmd(): number {
  clearProfile();
  process.stdout.write('✓ profile cleared\n');
  return 0;
}

function whoamiCmd(): number {
  const p = loadProfile();
  if (!p.handle) {
    process.stdout.write('(no handle set — run `claude-mario login <handle>`)\n');
    return 0;
  }
  const tag = p.identityType === 'github' ? 'github-verified' : 'local';
  const submit = p.submitDisabled ? ' (submit disabled)' : '';
  process.stdout.write(`${p.handle} [${tag}]${submit}\n`);
  return 0;
}

async function leaderboardCmd(): Promise<number> {
  const data = await fetchLeaderboard();
  if (!data) {
    process.stderr.write('✗ could not reach leaderboard\n');
    return 1;
  }
  if (data.entries.length === 0) {
    process.stdout.write('(leaderboard is empty — be the first!)\n');
    return 0;
  }
  const maxName = Math.max(6, ...data.entries.map((e) => e.username.length));
  process.stdout.write(
    `${'rank'.padStart(4)}  ${'handle'.padEnd(maxName)}  ${'score'.padStart(8)}  tier\n`,
  );
  for (const e of data.entries) {
    const tag = e.identityType === 'github' ? '✓' : ' ';
    process.stdout.write(
      `${String(e.rank).padStart(4)}  ${e.username.padEnd(maxName)}  ${String(e.score).padStart(8)}  ${e.tier} ${tag}\n`,
    );
  }
  process.stdout.write(`\nleaderboard v${data.version} · updated ${data.updatedAt}\n`);
  return 0;
}

function toggleSubmit(disabled: boolean): number {
  const p = loadProfile();
  saveProfile({ ...p, submitDisabled: disabled || undefined });
  process.stdout.write(
    disabled ? '✓ submission disabled\n' : '✓ submission re-enabled\n',
  );
  return 0;
}
