import { installExitHandlers } from './engine/terminal.js';
import { runGame } from './app.js';
import { ensureProfile } from './net/prompt.js';
import { drainQueue } from './net/leaderboard.js';
import { isSubcommand, runSubcommand } from './cli.js';

const HELP = `claude-mario-runner — terminal endless runner

USAGE
  claude-mario [options]
  claude-mario <subcommand> [args]

OPTIONS
  -h, --help       Show this help and exit
  -v, --version    Show version and exit
  --seed <n>       Seed RNG for deterministic obstacles
  --no-color       (reserved) disable color output

SUBCOMMANDS
  login [<handle>]    Set handle, or sign in with GitHub (no arg)
  logout              Clear local profile
  whoami              Show current handle + identity
  leaderboard         Print the global top scores
  submit-disable      Stop auto-submitting scores
  submit-enable       Re-enable auto-submission

CONTROLS
  Space / ↑ / W    Jump
  Q / Esc          Quit

Scores are saved to ~/.claude-mario-runner/scores.json.
Profile: ~/.claude-mario-runner/profile.json.
`;

async function readVersion(): Promise<string> {
  try {
    const url = new URL('../package.json', import.meta.url);
    const { readFile } = await import('node:fs/promises');
    const raw = await readFile(url, 'utf8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes('-h') || argv.includes('--help')) {
    process.stdout.write(HELP);
    return;
  }
  if (argv.includes('-v') || argv.includes('--version')) {
    process.stdout.write((await readVersion()) + '\n');
    return;
  }

  // Subcommand dispatch — stays out of the game terminal mode entirely.
  const first = argv[0];
  if (isSubcommand(first)) {
    const code = await runSubcommand(first, argv.slice(1));
    process.exit(code);
  }

  // First-launch handle prompt MUST happen before alt-screen / exit handlers,
  // since readline expects the normal terminal mode.
  await ensureProfile();

  // Best-effort drain of any queued submits from previous crashed/offline runs.
  // Detached from startup — we don't block the user on stale retries. A
  // 2-second grace gives DNS/TCP time to kick in but won't noticeably delay
  // a launch.
  void Promise.race([
    drainQueue(),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);

  installExitHandlers();

  if (process.env.RENDER_TEST === '1') {
    const { runRendererTest } = await import('./dev/test-renderer.js');
    await runRendererTest();
    return;
  }

  if (process.env.CRASH_TEST === '1') {
    setTimeout(() => {
      throw new Error('Deliberate crash to test uncaughtException handler');
    }, 500);
    return;
  }

  let seed: number | undefined;
  const seedIdx = argv.indexOf('--seed');
  if (seedIdx >= 0 && argv[seedIdx + 1]) {
    const n = Number(argv[seedIdx + 1]);
    if (Number.isFinite(n)) seed = n;
  }

  const noColor = argv.includes('--no-color');

  runGame({ seed, noColor, version: await readVersion() });
}

main();
