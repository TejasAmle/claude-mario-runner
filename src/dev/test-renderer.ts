import {
  initRenderer,
  clearFrame,
  setCell,
  drawString,
  flush,
  getSize,
} from '../engine/renderer.js';
import { enterAltScreen, restoreTerminal } from '../engine/terminal.js';

const FRAMES = 60;
const FRAME_MS = 1000 / 30;

export async function runRendererTest(): Promise<void> {
  enterAltScreen();

  const envCols = Number(process.env.COLS);
  const envRows = Number(process.env.ROWS);
  const cols = envCols > 0 ? envCols : process.stdout.columns > 0 ? process.stdout.columns : 80;
  const rows = envRows > 0 ? envRows : process.stdout.rows > 0 ? process.stdout.rows : 24;
  initRenderer(cols, rows);
  const size = getSize();

  for (let f = 0; f < FRAMES; f++) {
    clearFrame();

    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        const dark = (x + y) % 2 === 0;
        setCell(x, y, ' ', -1, dark ? 236 : 239);
      }
    }

    const barY = Math.floor(size.height / 2);
    const barX = f % size.width;
    for (let i = 0; i < 6 && barX + i < size.width; i++) {
      setCell(barX + i, barY, '\u2588', 173, -1);
    }

    drawString(1, 1, `Frame ${f + 1}/${FRAMES}  ${size.width}x${size.height}`, 231, 0);

    flush();
    await sleep(FRAME_MS);
  }

  restoreTerminal();
  process.exit(0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
