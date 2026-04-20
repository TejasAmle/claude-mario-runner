import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { SubmitRequest } from './types.js';

/**
 * Offline submit queue. A submission that fails (network error, 5xx,
 * 429) is appended to a JSONL file; on next launch we drain it before
 * the game loop starts.
 *
 * JSONL (one JSON object per line) is deliberately simple: append-only,
 * corrupt lines are skipped individually, and we never lose the whole
 * queue to a single parse error.
 */

const QUEUE_DIR = path.join(os.homedir(), '.claude-mario-runner');
const QUEUE_FILE = path.join(QUEUE_DIR, 'submit-queue.jsonl');

/** Max queue size — beyond this, oldest entries drop. Prevents unbounded growth. */
const MAX_QUEUE = 50;

export interface QueuedSubmit {
  /** Original submission payload. */
  payload: SubmitRequest;
  /** When this submission was first queued (ms epoch). */
  queuedAt: number;
  /** How many retry attempts have happened. */
  attempts: number;
}

export function enqueue(payload: SubmitRequest): void {
  try {
    fs.mkdirSync(QUEUE_DIR, { recursive: true });
    const entry: QueuedSubmit = { payload, queuedAt: Date.now(), attempts: 0 };

    // If we're at cap, we load → drop oldest → rewrite. This is rare enough
    // (50 failed submits deep) that the extra IO is fine.
    const existing = readQueue();
    if (existing.length >= MAX_QUEUE) {
      const trimmed = existing.slice(-(MAX_QUEUE - 1));
      trimmed.push(entry);
      writeQueue(trimmed);
      return;
    }
    fs.appendFileSync(QUEUE_FILE, JSON.stringify(entry) + '\n');
  } catch {
    // best-effort; losing a queued submit is acceptable
  }
}

export function readQueue(): QueuedSubmit[] {
  try {
    const raw = fs.readFileSync(QUEUE_FILE, 'utf8');
    const out: QueuedSubmit[] = [];
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as QueuedSubmit;
        if (parsed && typeof parsed === 'object' && parsed.payload) out.push(parsed);
      } catch {
        // skip corrupt line
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function writeQueue(entries: QueuedSubmit[]): void {
  try {
    fs.mkdirSync(QUEUE_DIR, { recursive: true });
    const tmp = QUEUE_FILE + '.tmp';
    const body = entries.map((e) => JSON.stringify(e)).join('\n') + (entries.length ? '\n' : '');
    fs.writeFileSync(tmp, body);
    fs.renameSync(tmp, QUEUE_FILE);
  } catch {
    // best-effort
  }
}

export function clearQueue(): void {
  try {
    fs.unlinkSync(QUEUE_FILE);
  } catch {
    // nothing to clear
  }
}

export function queueFilePath(): string {
  return QUEUE_FILE;
}
