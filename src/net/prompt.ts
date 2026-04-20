import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { checkHandle, handleErrorMessage } from './validate.js';
import { loadProfile, saveProfile, type Profile } from './config.js';

/**
 * First-launch handle prompt. Returns the profile to use for this session.
 *
 * Design:
 * - If a profile with a handle already exists, we don't prompt — just return.
 * - If running non-interactively (no TTY), we skip the prompt entirely and
 *   return a transient profile with an empty handle. Submit will no-op.
 * - If the user just hits Enter (empty), we interpret that as "skip for now"
 *   — still return empty handle, don't persist. They can set it later via
 *   `claude-mario login <handle>` (see src/cli.ts).
 */
export async function ensureProfile(): Promise<Profile> {
  const existing = loadProfile();
  if (existing.handle) return existing;

  if (!input.isTTY || !output.isTTY) return existing;

  const rl = readline.createInterface({ input, output, terminal: true });
  try {
    output.write(
      [
        '',
        'claude-mario-runner · global leaderboard',
        '  Scores auto-submit to https://claude-mario-runner.vercel.app',
        '  Pick a handle (2–24 chars, lowercase letters/digits/dash).',
        '  Leave blank to play offline — you can set one later with `claude-mario login`.',
        '',
      ].join('\n'),
    );
    for (let attempt = 0; attempt < 3; attempt++) {
      const raw = (await rl.question('handle › ')).trim().toLowerCase();
      if (!raw) {
        output.write('  (playing offline — scores will not be submitted)\n\n');
        return existing;
      }
      const check = checkHandle(raw);
      if (check.ok) {
        const next: Profile = { ...existing, handle: raw };
        saveProfile(next);
        output.write(`  ✓ saved as "${raw}"\n\n`);
        return next;
      }
      output.write(`  ✗ ${handleErrorMessage(check.reason)}\n`);
    }
    output.write('  (skipping handle setup for now)\n\n');
    return existing;
  } finally {
    rl.close();
  }
}
