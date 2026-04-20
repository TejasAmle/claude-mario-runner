export type ColorIdx = number;

export interface Cell {
  ch: string;
  fg: ColorIdx;
  bg: ColorIdx;
}

let width = 0;
let height = 0;
let prev: Cell[] = [];
let next: Cell[] = [];

let sgrFg: ColorIdx = -2;
let sgrBg: ColorIdx = -2;

export function initRenderer(cols: number, rows: number): void {
  width = cols;
  height = rows;
  const size = cols * rows;
  prev = new Array(size);
  next = new Array(size);
  for (let i = 0; i < size; i++) {
    prev[i] = { ch: ' ', fg: -1, bg: -1 };
    next[i] = { ch: ' ', fg: -1, bg: -1 };
  }
  sgrFg = -2;
  sgrBg = -2;
}

export function getSize(): { width: number; height: number } {
  return { width, height };
}

export function clearFrame(): void {
  const size = width * height;
  for (let i = 0; i < size; i++) {
    const c = next[i]!;
    c.ch = ' ';
    c.fg = -1;
    c.bg = -1;
  }
}

export function setCell(
  x: number,
  y: number,
  ch: string,
  fg: ColorIdx = -1,
  bg: ColorIdx = -1,
): void {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const c = next[y * width + x]!;
  c.ch = ch;
  c.fg = fg;
  c.bg = bg;
}

export function drawString(
  x: number,
  y: number,
  s: string,
  fg: ColorIdx = -1,
  bg: ColorIdx = -1,
): void {
  for (let i = 0; i < s.length; i++) {
    setCell(x + i, y, s[i]!, fg, bg);
  }
}

export function invalidateAll(): void {
  for (let i = 0; i < prev.length; i++) {
    prev[i]!.ch = '\0';
  }
  sgrFg = -2;
  sgrBg = -2;
}

function sgrFor(fg: ColorIdx, bg: ColorIdx): string {
  let s = '';
  if (fg !== sgrFg) {
    s += fg === -1 ? '\x1b[39m' : `\x1b[38;5;${fg}m`;
    sgrFg = fg;
  }
  if (bg !== sgrBg) {
    s += bg === -1 ? '\x1b[49m' : `\x1b[48;5;${bg}m`;
    sgrBg = bg;
  }
  return s;
}

export function flush(): void {
  let out = '';
  let cursorX = -1;
  let cursorY = -1;
  let dirty = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const n = next[idx]!;
      const p = prev[idx]!;
      if (n.ch === p.ch && n.fg === p.fg && n.bg === p.bg) continue;

      if (cursorX !== x || cursorY !== y) {
        out += `\x1b[${y + 1};${x + 1}H`;
        cursorX = x;
        cursorY = y;
      }

      out += sgrFor(n.fg, n.bg);
      out += n.ch;
      cursorX++;
      dirty = true;

      p.ch = n.ch;
      p.fg = n.fg;
      p.bg = n.bg;
    }
  }

  if (dirty) {
    out += '\x1b[0m';
    sgrFg = -1;
    sgrBg = -1;
    process.stdout.write(out);
  }
}

export function flushBytesForTest(): string {
  let out = '';
  let cursorX = -1;
  let cursorY = -1;
  let dirty = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const n = next[idx]!;
      const p = prev[idx]!;
      if (n.ch === p.ch && n.fg === p.fg && n.bg === p.bg) continue;
      if (cursorX !== x || cursorY !== y) {
        out += `\x1b[${y + 1};${x + 1}H`;
        cursorX = x;
        cursorY = y;
      }
      out += sgrFor(n.fg, n.bg);
      out += n.ch;
      cursorX++;
      dirty = true;
      p.ch = n.ch;
      p.fg = n.fg;
      p.bg = n.bg;
    }
  }
  if (dirty) {
    out += '\x1b[0m';
    sgrFg = -1;
    sgrBg = -1;
  }
  return out;
}
