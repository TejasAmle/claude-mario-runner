export type KeyName =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Enter'
  | 'Space'
  | 'Escape'
  | 'Tab'
  | 'Backspace'
  | string;

export interface KeyEvent {
  key: KeyName;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  raw: string;
}

const ESC_TIMEOUT_MS = 50;

export function parseKeyBytes(buf: Buffer | string): KeyEvent[] {
  const s = typeof buf === 'string' ? buf : buf.toString('utf8');
  const events: KeyEvent[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;

    if (c === '\x1b') {
      if (i + 1 >= s.length) {
        events.push({ key: 'Escape', ctrl: false, shift: false, alt: false, raw: c });
        i++;
        continue;
      }
      const next = s[i + 1];
      if (next === '[' || next === 'O') {
        const seqEnd = findCsiEnd(s, i + 2);
        const seq = s.slice(i, seqEnd + 1);
        const ev = decodeCsi(seq);
        if (ev) events.push(ev);
        i = seqEnd + 1;
        continue;
      }
      const inner = parseKeyBytes(s.slice(i + 1, i + 2));
      for (const ev of inner) events.push({ ...ev, alt: true, raw: '\x1b' + ev.raw });
      i += 2;
      continue;
    }

    if (c === '\r' || c === '\n') {
      events.push({ key: 'Enter', ctrl: false, shift: false, alt: false, raw: c });
      i++;
      continue;
    }
    if (c === '\t') {
      events.push({ key: 'Tab', ctrl: false, shift: false, alt: false, raw: c });
      i++;
      continue;
    }
    if (c === ' ') {
      events.push({ key: 'Space', ctrl: false, shift: false, alt: false, raw: c });
      i++;
      continue;
    }
    if (c === '\x7f' || c === '\x08') {
      events.push({ key: 'Backspace', ctrl: false, shift: false, alt: false, raw: c });
      i++;
      continue;
    }

    const code = c.charCodeAt(0);
    if (code >= 1 && code <= 26 && c !== '\r' && c !== '\n' && c !== '\t') {
      const letter = String.fromCharCode(code + 96);
      events.push({ key: letter, ctrl: true, shift: false, alt: false, raw: c });
      i++;
      continue;
    }

    if (code >= 0x20 && code < 0x7f) {
      const shift = c >= 'A' && c <= 'Z';
      events.push({
        key: shift ? c.toLowerCase() : c,
        ctrl: false,
        shift,
        alt: false,
        raw: c,
      });
      i++;
      continue;
    }

    i++;
  }
  return events;
}

function findCsiEnd(s: string, start: number): number {
  for (let j = start; j < s.length; j++) {
    const code = s.charCodeAt(j);
    if ((code >= 0x40 && code <= 0x7e) || s[j] === '~') return j;
  }
  return s.length - 1;
}

function decodeCsi(seq: string): KeyEvent | null {
  const base = (key: KeyName, shift = false): KeyEvent => ({
    key,
    ctrl: false,
    shift,
    alt: false,
    raw: seq,
  });
  switch (seq) {
    case '\x1b[A':
    case '\x1bOA':
      return base('ArrowUp');
    case '\x1b[B':
    case '\x1bOB':
      return base('ArrowDown');
    case '\x1b[C':
    case '\x1bOC':
      return base('ArrowRight');
    case '\x1b[D':
    case '\x1bOD':
      return base('ArrowLeft');
    case '\x1b[H':
    case '\x1bOH':
      return base('Home');
    case '\x1b[F':
    case '\x1bOF':
      return base('End');
    case '\x1b[3~':
      return base('Delete');
    case '\x1b[2~':
      return base('Insert');
    case '\x1b[5~':
      return base('PageUp');
    case '\x1b[6~':
      return base('PageDown');
    default:
      return null;
  }
}

export type InputListener = (ev: KeyEvent) => void;

interface InputController {
  onKey(listener: InputListener): () => void;
  stop(): void;
}

export function startInput(): InputController {
  const listeners = new Set<InputListener>();
  let pending = '';
  let escTimer: NodeJS.Timeout | null = null;

  const flush = () => {
    if (!pending) return;
    const evs = parseKeyBytes(pending);
    pending = '';
    for (const ev of evs) {
      for (const l of listeners) l(ev);
    }
  };

  const onData = (chunk: Buffer) => {
    const text = chunk.toString('utf8');
    pending += text;
    if (escTimer) {
      clearTimeout(escTimer);
      escTimer = null;
    }
    if (pending === '\x1b') {
      escTimer = setTimeout(flush, ESC_TIMEOUT_MS);
      return;
    }
    flush();
  };

  process.stdin.on('data', onData);
  if (process.stdin.isTTY) process.stdin.resume();

  return {
    onKey(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    stop() {
      if (escTimer) clearTimeout(escTimer);
      process.stdin.off('data', onData);
      listeners.clear();
    },
  };
}
