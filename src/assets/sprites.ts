import { setCell } from '../engine/renderer.js';
import { type ObstacleKind } from '../game/obstacles.js';

export const COLOR_MASCOT = 173;
export const COLOR_EYE = 16;
export const COLOR_BUG = 203;
export const COLOR_CONFLICT = 220;
export const COLOR_WALL = 208;
export const COLOR_EXCEPTION = 196;
export const COLOR_DRONE = 51;
export const COLOR_GROUND = 240;
export const COLOR_SKY = -1;
export const COLOR_TEXT = 231;
export const COLOR_DIM = 245;
export const COLOR_ACCENT = 173;

const MASCOT_ROWS: readonly string[] = [
  '########',
  '#o####o#',
  '########',
  '# #  # #',
];

// Crouched: body compressed to 2 rows — eyes on top, legs tucked.
const MASCOT_CROUCH_ROWS: readonly string[] = [
  '#o####o#',
  '##    ##',
];

export const MASCOT_W = 8;
export const MASCOT_H = 4;
export const MASCOT_CROUCH_H = 2;

export function drawMascot(baseX: number, baseY: number, crouching = false): void {
  const rows = crouching ? MASCOT_CROUCH_ROWS : MASCOT_ROWS;
  for (let dy = 0; dy < rows.length; dy++) {
    const row = rows[dy]!;
    for (let dx = 0; dx < row.length; dx++) {
      const c = row[dx]!;
      const x = baseX + dx;
      const y = baseY + dy;
      if (c === '#') setCell(x, y, '\u2588', COLOR_MASCOT, -1);
      else if (c === 'o') setCell(x, y, '\u25AA', COLOR_EYE, COLOR_MASCOT);
    }
  }
}

export function drawGroundLine(y: number, width: number): void {
  for (let x = 0; x < width; x++) {
    setCell(x, y, '\u2500', COLOR_GROUND, -1);
  }
}

export function drawObstacle(kind: ObstacleKind, baseX: number, baseY: number): void {
  const { ch, fg } = obstacleGlyph(kind);
  const { w, h } = obstacleSize(kind);
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setCell(Math.round(baseX) + dx, baseY + dy, ch, fg, -1);
    }
  }
}

function obstacleGlyph(kind: ObstacleKind): { ch: string; fg: number } {
  switch (kind) {
    case 'bug':
      return { ch: '\u2588', fg: COLOR_BUG };
    case 'conflict':
      return { ch: '\u2593', fg: COLOR_CONFLICT };
    case 'wall':
      return { ch: '\u2588', fg: COLOR_WALL };
    case 'exception':
      return { ch: '\u2592', fg: COLOR_EXCEPTION };
    case 'drone':
      return { ch: '\u25C6', fg: COLOR_DRONE };
  }
}

function obstacleSize(kind: ObstacleKind): { w: number; h: number } {
  switch (kind) {
    case 'bug':
      return { w: 2, h: 1 };
    case 'conflict':
      return { w: 3, h: 2 };
    case 'wall':
      return { w: 2, h: 3 };
    case 'exception':
      return { w: 3, h: 3 };
    case 'drone':
      return { w: 4, h: 10 };
  }
}
