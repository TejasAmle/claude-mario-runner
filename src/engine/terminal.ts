const ENTER_ALT_SCREEN = '\x1b[?1049h';
const EXIT_ALT_SCREEN = '\x1b[?1049l';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const RESET_COLORS = '\x1b[0m';
const CLEAR_SCREEN = '\x1b[2J';
const CURSOR_HOME = '\x1b[H';
const DISABLE_AUTOWRAP = '\x1b[?7l';
const ENABLE_AUTOWRAP = '\x1b[?7h';

let entered = false;
let rawModeWasSet = false;

export function enterAltScreen(): void {
  if (entered) return;
  process.stdout.write(
    ENTER_ALT_SCREEN + HIDE_CURSOR + DISABLE_AUTOWRAP + CLEAR_SCREEN + CURSOR_HOME,
  );
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    rawModeWasSet = true;
  }
  entered = true;
}

export function restoreTerminal(): void {
  if (!entered) return;
  entered = false;
  try {
    if (rawModeWasSet && process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
  } catch {
    // stdin may already be closed; best-effort restore continues below
  }
  rawModeWasSet = false;
  try {
    process.stdout.write(RESET_COLORS + ENABLE_AUTOWRAP + SHOW_CURSOR + EXIT_ALT_SCREEN);
  } catch {
    // stdout may already be closed
  }
}

let handlersInstalled = false;

export function installExitHandlers(): void {
  if (handlersInstalled) return;
  handlersInstalled = true;

  const bail = (code: number) => {
    restoreTerminal();
    process.exit(code);
  };

  process.on('SIGINT', () => bail(130));
  process.on('SIGTERM', () => bail(143));
  process.on('SIGHUP', () => bail(129));
  process.on('exit', () => restoreTerminal());
  process.on('uncaughtException', (err) => {
    restoreTerminal();
    process.stderr.write(`\nUnhandled exception: ${err.stack ?? err.message ?? String(err)}\n`);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    restoreTerminal();
    process.stderr.write(`\nUnhandled rejection: ${String(reason)}\n`);
    process.exit(1);
  });
}
